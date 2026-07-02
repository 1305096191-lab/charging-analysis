/**
 * 实时订单数据分析系统 — 后端入口（生产稳定修复版）
 */
const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')

const { config, validate } = require('./config')
const { logger } = require('./utils/logger')
const { initDatabase } = require('./db/init')
const { startScheduler } = require('./utils/scheduler')

const { runSync } = require('./services/syncService')
const authMiddleware = require('./middleware/auth')

// 路由
const authRoutes = require('./routes/auth')
const orderRoutes = require('./routes/orders')
const syncRoutes = require('./routes/sync')
const overviewRoutes = require('./routes/overview')
const stationRoutes = require('./routes/stations')

const app = express()

// ================= 中间件 =================
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// ================= 路由 =================
app.use('/api/auth', authRoutes)
app.use('/api/orders', authMiddleware, orderRoutes)
// ===== Render 网络测试接口 =====
app.get('/test-render', async (req, res) => {
  try {
    res.json({
      ok: true,
      message: 'Render is working',
      time: new Date().toISOString(),
      env: process.env.NODE_ENV
    })
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e.message
    })
  }
})
app.use('/api/sync', authMiddleware, syncRoutes)
app.use('/api/dashboard', overviewRoutes)
app.use('/api/stations', stationRoutes)

// ================= 静态前端 =================
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

// ================= 错误处理 =================
app.use((err, req, res, _next) => {
  logger.error(`[Error] ${req.method} ${req.path}`, err.message)
  res.status(500).json({
    code: -1,
    message: '服务器错误',
  })
})

// ================= 启动函数 =================
async function bootstrap() {
  validate()

  // 1️⃣ 初始化数据库
  try {
    await initDatabase()
    logger.info('[Startup] 数据库初始化完成')
  } catch (err) {
    logger.error('数据库初始化失败:', err.message)
    process.exit(1)
  }

  // 2️⃣ Token 状态提示（不阻塞）
  if (config.bearerToken) {
    logger.info('[Startup] 已配置 Token')
  } else {
    logger.warn('[Startup] 未配置 Token，将使用自动登录')
  }

  // ================= ⭐ 核心修复：异步刷新 token（不阻塞启动） =================
  const { refreshToken } = require('./tokenManager')

  setTimeout(async () => {
    try {
      await refreshToken()
      logger.info('[Startup] Token 初始化完成')
    } catch (err) {
      logger.error('[Startup] Token 初始化失败（不影响服务运行）:', err.message)
    }
  }, 1000)

  // ================= ⭐ 启动定时任务 =================
  try {
    startScheduler()

    setInterval(async () => {
      try {
        const { getToken } = require('./tokenManager')
        const token = getToken()

        if (!token) {
          logger.warn('[Sync] 无 token，跳过本轮同步')
          return
        }

        await runSync()
      } catch (e) {
        logger.error('[Sync] 自动同步失败:', e.message)
      }
    }, 10000)

    logger.info('[Startup] 定时任务启动成功')

  } catch (err) {
    logger.error('定时任务启动失败:', err.message)
  }

  // ================= 监听端口 =================
  const PORT = process.env.PORT || config.port || 3000

  app.listen(PORT, '0.0.0.0', () => {
    logger.info('========================================')
    logger.info('  🚀 实时订单系统已启动（生产版）')
    logger.info(`  📡 Port: ${PORT}`)
    logger.info(`  🌍 URL: http://localhost:${PORT}`)
    logger.info('========================================')
  })

  // ================= 可选：网络测试（排查 Render 是否能访问外网） =================
  setTimeout(async () => {
    try {
      const axios = require('axios')
      const r = await axios.get('https://www.baidu.com', { timeout: 5000 })
      logger.info('[NET TEST] 外网访问正常:', r.status)
    } catch (e) {
      logger.error('[NET TEST] 外网访问失败:', e.message)
    }
  }, 2000)
}

// ================= 全局异常 =================
process.on('uncaughtException', (err) => {
  logger.error('[Crash] uncaughtException:', err.message)
})

process.on('unhandledRejection', (reason) => {
  logger.error('[Crash] unhandledRejection:', reason)
})

// ================= 启动 =================
bootstrap()