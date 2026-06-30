/**
 * 实时订单数据分析系统 — 后端入口（增强生产版）
 */
const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')

const { config, validate } = require('./config')
const { logger } = require('./utils/logger')
const { initDatabase } = require('./db/init')
const { startScheduler } = require('./utils/scheduler')

const { loginWithPhone } = require('./services/authService')
const { runSync } = require('./services/syncService')

const authMiddleware = require('./middleware/auth')

// 路由
const authRoutes = require('./routes/auth')
const orderRoutes = require('./routes/orders')
const syncRoutes = require('./routes/sync')
const overviewRoutes = require('./routes/overview')
const stationRoutes = require('./routes/stations')

const app = express()

// ============ 中间件 ============
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 请求日志
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// ============ 路由 ============
app.use('/api/auth', authRoutes)
app.use('/api/orders', authMiddleware, orderRoutes)
app.use('/api/sync', authMiddleware, syncRoutes)
app.use('/api/dashboard', overviewRoutes)
app.use('/api/stations', stationRoutes)

// ============ 静态前端 ============
const clientDistPath = path.resolve(__dirname, '..', 'client', 'dist')
app.use(express.static(clientDistPath))

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ code: -1, message: '接口不存在' })
  }

  const indexPath = path.join(clientDistPath, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.json({
      code: 0,
      message: 'API Running',
      endpoints: [
        '/api/auth/login',
        '/api/orders',
        '/api/sync/trigger'
      ],
    })
  }
})

// ============ 错误处理 ============
app.use((err, req, res, _next) => {
  logger.error(`[Error] ${req.method} ${req.path}`, err.message)
  res.status(500).json({
    code: -1,
    message: '服务器错误',
  })
})

// ============ ⭐ 核心增强：启动函数 ============
async function bootstrap() {
  validate()

  // 1️⃣ 初始化数据库
  try {
    await initDatabase()
  } catch (err) {
    logger.error('数据库初始化失败:', err.message)
    process.exit(1)
  }

  // 2️⃣ Token 检查
  if (config.bearerToken) {
    logger.info('[Startup] Token 已配置 (长度: ' + config.bearerToken.length + ')')
  } else {
    logger.warn('[Startup] 未配置 Token，将自动登录获取')
  }

  // ⭐ 启动时自动登录
  const { refreshToken } = require('./tokenManager')
  try {
    await refreshToken()
    logger.info('[Startup] Token 刷新完成')
  } catch (err) {
    logger.error('[Startup] Token 刷新失败:', err.message)
  }

  // 4️⃣ 启动定时同步
  try {
    startScheduler()

    // ⭐ 再加一个兜底同步（防 scheduler 卡死）
    setInterval(async () => {
      try {
        await runSync()
      } catch (e) {
        logger.error('[Sync] 自动同步失败:', e.message)
      }
    }, 10000)

  } catch (err) {
    logger.error('定时任务启动失败:', err.message)
  }

  // 5️⃣ 公网监听（关键修复）
  const PORT = process.env.PORT || config.port || 3000

  app.listen(PORT, '0.0.0.0', () => {
    logger.info('========================================')
    logger.info('  🚀 实时订单系统已启动（生产版）')
    logger.info(`  📡 Port: ${PORT}`)
    logger.info(`  🌍 Local: http://localhost:${PORT}`)
    logger.info('========================================')
  })
}

// ============ 全局异常 ============
process.on('uncaughtException', (err) => {
  logger.error('[Crash] uncaughtException:', err.message)
})

process.on('unhandledRejection', (reason) => {
  logger.error('[Crash] unhandledRejection:', reason)
})

// 启动
bootstrap()