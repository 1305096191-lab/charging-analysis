/**
 * 数据库初始化 — 使用 sql.js (WebAssembly, 无需编译)
 * 可独立运行：node server/db/init.js
 */
const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')
const { config } = require('../config')
const { logger } = require('../utils/logger')

// 确保 data 目录存在
const dataDir = path.dirname(config.dbPath)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

let db = null
let SQL = null

async function getDb() {
  if (db) return db
  SQL = await initSqlJs()
  if (fs.existsSync(config.dbPath)) {
    const buffer = fs.readFileSync(config.dbPath)
    db = new SQL.Database(buffer)
    logger.info(`[DB] 从文件加载数据库: ${config.dbPath}`)
  } else {
    db = new SQL.Database()
    logger.info(`[DB] 创建新数据库`)
  }
  return db
}

function dbRun(sql, params = []) {
  if (!db) throw new Error('数据库未初始化')
  db.run(sql, params)
  saveToFile()
}

function dbAll(sql, params = []) {
  if (!db) throw new Error('数据库未初始化')
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

function dbGet(sql, params = []) {
  const rows = dbAll(sql, params)
  return rows.length > 0 ? rows[0] : null
}

function dbExec(sql) {
  if (!db) throw new Error('数据库未初始化')
  db.exec(sql)
  saveToFile()
}

function saveToFile() {
  if (!db) return
  const data = db.export()
  fs.writeFileSync(config.dbPath, Buffer.from(data))
}

/**
 * 安全地添加列（如果不存在）
 */
function safeAddColumn(table, column, definition) {
  try {
    dbExec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    logger.info(`[DB] 添加列: ${table}.${column}`)
  } catch (err) {
    // 列已存在，忽略
    if (!err.message?.includes('duplicate')) {
      logger.info(`[DB] 列 ${table}.${column} 已存在，跳过`)
    }
  }
}

async function initDatabase() {
  logger.info('[DB] 开始初始化数据库...')

  try {
    await getDb()

    // ---- orders 表 ----
    const tableCheck = dbGet("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'")
    if (!tableCheck) {
      dbRun(`
        CREATE TABLE orders (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id      TEXT UNIQUE NOT NULL,
          station_name  TEXT DEFAULT '',
          station_abbr  TEXT DEFAULT '',
          operator      TEXT DEFAULT '',
          status        TEXT DEFAULT '',
          energy        REAL DEFAULT 0,
          elec_fee      REAL DEFAULT 0,
          service_fee   REAL DEFAULT 0,
          receivable    REAL DEFAULT 0,
          amount        REAL DEFAULT 0,
          refund_amount REAL DEFAULT 0,
          plate_no      TEXT DEFAULT '',
          order_type    TEXT DEFAULT '',
          created_time  TEXT DEFAULT '',
          synced_at     TEXT DEFAULT (datetime('now','localtime')),
          raw_data      TEXT DEFAULT ''
        )
      `)
      logger.info('[DB] orders 表已创建')
    } else {
      // 迁移：添加新列
      safeAddColumn('orders', 'operator', "TEXT DEFAULT ''")
      safeAddColumn('orders', 'energy', 'REAL DEFAULT 0')
      safeAddColumn('orders', 'elec_fee', 'REAL DEFAULT 0')
      safeAddColumn('orders', 'service_fee', 'REAL DEFAULT 0')
      safeAddColumn('orders', 'receivable', 'REAL DEFAULT 0')
      safeAddColumn('orders', 'plate_no', "TEXT DEFAULT ''")
      safeAddColumn('orders', 'refund_amount', 'REAL DEFAULT 0')
      safeAddColumn('orders', 'order_type', "TEXT DEFAULT ''")
      safeAddColumn('orders', 'plate_no', "TEXT DEFAULT ''")
      safeAddColumn('orders', 'refund_amount', 'REAL DEFAULT 0')
      safeAddColumn('orders', 'station_abbr', "TEXT DEFAULT ''")
      logger.info('[DB] orders 表已存在，列迁移完成')
    }

    // ---- sync_logs 表 ----
    const logTableCheck = dbGet("SELECT name FROM sqlite_master WHERE type='table' AND name='sync_logs'")
    if (!logTableCheck) {
      dbRun(`
        CREATE TABLE sync_logs (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at    TEXT,
          finished_at   TEXT,
          status        TEXT DEFAULT 'pending',
          new_count     INTEGER DEFAULT 0,
          total_count   INTEGER DEFAULT 0,
          error_message TEXT DEFAULT ''
        )
      `)
      logger.info('[DB] sync_logs 表已创建')
    } else {
      logger.info('[DB] sync_logs 表已存在，跳过')
    }

    // 索引
    dbExec('CREATE INDEX IF NOT EXISTS idx_orders_station ON orders(station_name)')
    dbExec('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)')
    dbExec('CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_time)')
    dbExec('CREATE INDEX IF NOT EXISTS idx_orders_operator ON orders(operator)')

    saveToFile()
    logger.info('[DB] 数据库初始化完成')
  } catch (err) {
    logger.error('[DB] 初始化失败:', err.message)
    throw err
  }
}

if (require.main === module) {
  initDatabase()
    .then(() => { console.log('[DB] 初始化脚本执行完毕'); process.exit(0) })
    .catch((err) => { console.error(err); process.exit(1) })
}

function getRawDb() { return db }

module.exports = { getDb, getRawDb, dbRun, dbAll, dbGet, dbExec, saveToFile, initDatabase }
