const express = require('express')
const router = express.Router()
const { dbAll, dbGet } = require('../db/init')
const { logger } = require('../utils/logger')

// GET /api/orders — 筛选+分页+汇总
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const size = Math.min(parseInt(req.query.size) || 20, 100)
    const { station, operator, startDate, endDate, status } = req.query

    const conditions = []
    const params = []

    if (station) { conditions.push('station_name LIKE ?'); params.push(`%${station}%`) }
    if (operator) {
      conditions.push('operator LIKE ?')
      params.push(`%${operator}%`)
    }
    if (startDate) {
      conditions.push("date(created_time) >= ?")
      params.push(startDate)
    }
    if (endDate) {
      conditions.push("date(created_time) <= ?")
      params.push(endDate)
    }
    if (status) {
      conditions.push('status = ?')
      params.push(status)
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

    // 汇总
    const summary = dbGet(
      `SELECT COALESCE(SUM(amount),0) as total_amount, COALESCE(SUM(energy),0) as total_energy,
              COALESCE(SUM(CASE WHEN order_type LIKE '%换电%' THEN 1 ELSE 0 END),0) as swap_count,
              COALESCE(SUM(CASE WHEN order_type LIKE '%充电%' THEN 1 ELSE 0 END),0) as charge_count
       FROM orders ${where}`, params
    )

    // 总数
    const countRow = dbGet(`SELECT COUNT(*) as total FROM orders ${where}`, params)
    const total = countRow?.total || 0
    const offset = (page - 1) * size

    // 列表
    const list = dbAll(
      `SELECT id, order_id, station_abbr, station_name, order_type, energy, amount, refund_amount, plate_no, operator, status, created_time
       FROM orders ${where} ORDER BY created_time DESC LIMIT ? OFFSET ?`,
      [...params, size, offset]
    )

    // 筛选器可用值
    const filterStations = dbAll("SELECT DISTINCT station_abbr FROM orders WHERE station_abbr != '' ORDER BY station_abbr")
    const filterOperators = dbAll("SELECT DISTINCT operator FROM orders WHERE operator != '' ORDER BY operator")
    const filterStatuses = dbAll("SELECT DISTINCT status FROM orders WHERE status != '' ORDER BY status")

    res.json({
      code: 0,
      data: {
        list,
        total,
        page,
        size,
        totalPages: Math.ceil(total / size),
        summary: summary || {},
        filterOptions: {
          stations: filterStations.map(r => r.station_abbr),
          operators: filterOperators.map(r => r.operator),
          statuses: filterStatuses.map(r => r.status),
        },
      },
      message: 'ok',
    })
  } catch (err) {
    logger.error('[Orders] 查询失败:', err.message)
    res.json({ code: -1, data: null, message: err.message })
  }
})

// GET /api/orders/stats — 支持筛选
router.get('/stats', async (req, res) => {
  try {
    const { station, operator, startDate, endDate } = req.query
    const conds = []; const params = []
    if (station) { conds.push('station_name LIKE ?'); params.push(`%${station}%`) }
    if (operator) { conds.push('operator LIKE ?'); params.push(`%${operator}%`) }
    if (startDate) { conds.push('date(created_time) >= ?'); params.push(startDate) }
    if (endDate) { conds.push('date(created_time) <= ?'); params.push(endDate) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''

    const summary = dbGet(`SELECT COUNT(*) as total_orders, COALESCE(SUM(energy),0) as total_energy, COALESCE(SUM(elec_fee),0) as total_elec_fee, COALESCE(SUM(service_fee),0) as total_service_fee, COALESCE(SUM(receivable),0) as total_receivable FROM orders ${where}`, params)
    const addWhere = conds.length ? 'AND' : 'WHERE'
    const byStation = dbAll(`SELECT station_name, COUNT(*) as count, SUM(energy) as energy, SUM(elec_fee) as elec_fee, SUM(service_fee) as service_fee, SUM(receivable) as receivable FROM orders ${where} ${addWhere} station_name!='' GROUP BY station_name ORDER BY receivable DESC`, params)
    const byOperator = dbAll(`SELECT operator, COUNT(*) as count, SUM(energy) as energy, SUM(elec_fee) as elec_fee, SUM(service_fee) as service_fee, SUM(receivable) as receivable FROM orders ${where} ${addWhere} operator!='' GROUP BY operator ORDER BY receivable DESC`, params)
    const monthlyTrend = dbAll(`SELECT strftime('%Y-%m', created_time) as month, COUNT(*) as count, SUM(energy) as energy, SUM(elec_fee) as elec_fee, SUM(service_fee) as service_fee, SUM(receivable) as receivable FROM orders ${where} GROUP BY month ORDER BY month ASC`, params)
    const filterStations = dbAll("SELECT DISTINCT station_abbr FROM orders WHERE station_abbr!='' ORDER BY station_abbr")
    const filterOperators = dbAll("SELECT DISTINCT operator FROM orders WHERE operator!='' ORDER BY operator")

    res.json({ code: 0, data: { summary: summary||{}, byStation, byOperator, monthlyTrend, filterMeta: { stations: filterStations.map(r=>r.station_abbr), operators: filterOperators.map(r=>r.operator) } }, message: 'ok' })
  } catch (err) {
    res.json({ code: -1, data: null, message: err.message })
  }
})

module.exports = router
