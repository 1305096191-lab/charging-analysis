/**
 * 数据库查询封装 — 基于 sql.js
 */
const { dbRun, dbAll, dbGet, getRawDb, saveToFile } = require('./init')
const { logger } = require('../utils/logger')

// ==================== 订单查询 ====================

function getOrders({ page = 1, size = 20, status = '', station = '', operator = '', month = '' }) {
  const conditions = []
  const params = []

  if (status) { conditions.push('status = ?'); params.push(status) }
  if (station) { conditions.push('station_name LIKE ?'); params.push(`%${station}%`) }
  if (operator) { conditions.push('operator LIKE ?'); params.push(`%${operator}%`) }
  if (month) { conditions.push("strftime('%Y-%m', created_time) = ?"); params.push(month) }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const countRow = dbGet(`SELECT COUNT(*) as total FROM orders ${whereClause}`, params)
  const total = countRow?.total || 0
  const offset = (page - 1) * size

  const list = dbAll(
    `SELECT * FROM orders ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, size, offset]
  )

  return { list, total, page, size, totalPages: Math.ceil(total / size) }
}

// ==================== 统计数据 ====================

function getStats({ months = [], stations = [], operators = [] } = {}) {
  const conditions = []
  const params = []

  if (months.length > 0) {
    conditions.push(`strftime('%Y-%m', created_time) IN (${months.map(() => '?').join(',')})`)
    params.push(...months)
  }
  if (stations.length > 0) {
    conditions.push(`station_name IN (${stations.map(() => '?').join(',')})`)
    params.push(...stations)
  }
  if (operators.length > 0) {
    conditions.push(`operator IN (${operators.map(() => '?').join(',')})`)
    params.push(...operators)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // KPI 汇总
  const summary = dbGet(`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(energy), 0) as total_energy,
      COALESCE(SUM(elec_fee), 0) as total_elec_fee,
      COALESCE(SUM(service_fee), 0) as total_service_fee,
      COALESCE(SUM(receivable), 0) as total_receivable,
      COALESCE(SUM(amount), 0) as total_amount
    FROM orders ${whereClause}
  `, params)

  // 各状态分布
  const byStatus = dbAll(
    `SELECT status, COUNT(*) as count FROM orders ${whereClause} GROUP BY status ORDER BY count DESC`,
    params
  )

  const hasWhere = conditions.length > 0

  // 各场站统计
  const stationExtra = hasWhere ? 'AND station_name != ?' : 'WHERE station_name != ?'
  const byStation = dbAll(
    `SELECT station_name, COUNT(*) as count, SUM(energy) as energy, SUM(elec_fee) as elec_fee, SUM(service_fee) as service_fee, SUM(receivable) as receivable FROM orders ${whereClause} ${stationExtra} GROUP BY station_name ORDER BY receivable DESC`,
    [...params, '']
  )

  // 各运营方统计
  const opExtra = hasWhere ? 'AND operator != ?' : 'WHERE operator != ?'
  const byOperator = dbAll(
    `SELECT operator, COUNT(*) as count, SUM(energy) as energy, SUM(elec_fee) as elec_fee, SUM(service_fee) as service_fee, SUM(receivable) as receivable FROM orders ${whereClause} ${opExtra} GROUP BY operator ORDER BY receivable DESC`,
    [...params, '']
  )

  // 月度趋势
  const monthlyTrend = dbAll(
    `SELECT strftime('%Y-%m', created_time) as month, COUNT(*) as count, SUM(energy) as energy, SUM(elec_fee) as elec_fee, SUM(service_fee) as service_fee, SUM(receivable) as receivable FROM orders ${whereClause} GROUP BY month ORDER BY month ASC`,
    params
  )

  // 筛选元数据
  const filterMonths = dbAll("SELECT DISTINCT strftime('%Y-%m', created_time) as month FROM orders WHERE created_time != '' ORDER BY month DESC")
  const filterStations = dbAll("SELECT DISTINCT station_name FROM orders WHERE station_name != '' ORDER BY station_name")
  const filterOperators = dbAll("SELECT DISTINCT operator FROM orders WHERE operator != '' ORDER BY operator")

  return {
    summary: summary || { total_orders: 0, total_energy: 0, total_elec_fee: 0, total_service_fee: 0, total_receivable: 0, total_amount: 0 },
    byStatus,
    byStation,
    byOperator,
    monthlyTrend,
    filterMeta: {
      months: filterMonths.map(r => r.month),
      stations: filterStations.map(r => r.station_name),
      operators: filterOperators.map(r => r.operator),
    },
  }
}

// ==================== 批量插入 ====================

function batchInsertOrders(orders) {
  const d = getRawDb()
  if (!d) throw new Error('数据库未初始化')

  let newCount = 0
  const stmt = d.prepare(
    `INSERT INTO orders (order_id, station_name, station_abbr, operator, status, energy, elec_fee, service_fee, receivable, amount, refund_amount, plate_no, order_type, created_time, synced_at, raw_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  let firstError = null
  for (const o of orders) {
    const orderId = String(o.order_id || o.orderId || o.id || '')
    try {
      if (!orderId) { logger.warn('[DB] 跳过空 order_id 的记录'); continue }

      stmt.run([
        orderId,
        o.station_name || '',
        o.station_abbr || '',
        o.operator || '',
        o.status || '',
        parseFloat(o.energy || 0),
        parseFloat(o.elec_fee || 0),
        parseFloat(o.service_fee || 0),
        parseFloat(o.receivable || 0),
        parseFloat(o.amount || 0),
        parseFloat(o.refund_amount || 0),
        o.plate_no || '',
        o.order_type || '',
        o.created_time || o.createdTime || o.createTime || '',
        now,
        JSON.stringify(o._raw || o),
      ])
      newCount++
    } catch (err) {
      if (!firstError) {
        firstError = err.message
        logger.error(`[DB] 首个INSERT错误: ${err.message} | order_id="${orderId}" | station="${(o.station_name||'').slice(0,20)}"`)
      }
      if (err.message?.includes('UNIQUE') || err.message?.includes('constraint')) continue
      stmt.free()
      throw err
    }
  }
  if (newCount === 0 && firstError) {
    logger.warn(`[DB] 所有 ${orders.length} 条均插入失败。首个错误: ${firstError}`)
    logger.info(`[DB] 示例记录: ${JSON.stringify(orders[0]).slice(0, 300)}`)
  }
  stmt.free()
  saveToFile()
  return newCount
}

// ==================== 同步日志 ====================

function createSyncLog({ startedAt, status = 'running' }) {
  const now = startedAt || new Date().toISOString().replace('T', ' ').slice(0, 19)
  dbRun('INSERT INTO sync_logs (started_at, status) VALUES (?, ?)', [now, status])
  const row = dbGet('SELECT last_insert_rowid() as id')
  return row?.id || 0
}

function updateSyncLog(id, { status, newCount, totalCount, errorMessage }) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  dbRun(
    'UPDATE sync_logs SET finished_at = ?, status = ?, new_count = ?, total_count = ?, error_message = ? WHERE id = ?',
    [now, status, newCount ?? 0, totalCount ?? 0, errorMessage || '', id]
  )
}

function getRecentSyncLogs(limit = 10) {
  return dbAll('SELECT * FROM sync_logs ORDER BY id DESC LIMIT ?', [limit])
}

module.exports = {
  getOrders,
  getStats,
  batchInsertOrders,
  createSyncLog,
  updateSyncLog,
  getRecentSyncLogs,
}
