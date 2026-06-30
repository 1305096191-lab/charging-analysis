/**
 * 同步路由 — GET /api/sync/status, POST /api/sync/trigger
 * 未认证时返回空数据
 */
const express = require('express')
const router = express.Router()
const { runSync } = require('../services/syncService')
const { getRecentSyncLogs } = require('../db/queries')
const { logger } = require('../utils/logger')

// GET /api/sync/status
router.get('/status', async (req, res) => {
  // 未认证时返回空记录
  if (!req.isAuthenticated) {
    return res.json({
      code: 0,
      data: { lastSync: null, recentLogs: [] },
      message: '请先登录以查看同步状态',
    })
  }

  try {
    const logs = await getRecentSyncLogs(10)
    const lastSync = logs.length > 0 ? logs[0] : null
    res.json({ code: 0, data: { lastSync, recentLogs: logs }, message: 'ok' })
  } catch (err) {
    logger.error('[Sync] 查询状态失败:', err.message)
    res.json({ code: -1, data: null, message: `查询同步状态失败: ${err.message}` })
  }
})

// POST /api/sync/trigger
router.post('/trigger', async (req, res) => {
  // 未认证时禁止手动同步
  if (!req.isAuthenticated) {
    return res.json({ code: -1, data: null, message: '请先登录后再触发同步' })
  }

  try {
    logger.info('[Sync] 手动触发同步...')
    const result = await runSync()
    res.json({ code: result.success ? 0 : -1, data: result, message: result.success ? '同步完成' : result.message })
  } catch (err) {
    logger.error('[Sync] 手动同步异常:', err.message)
    res.json({ code: -1, data: null, message: `同步异常: ${err.message}` })
  }
})

module.exports = router
