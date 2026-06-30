/**
 * 定时调度器 — 数据同步(10秒) + Token刷新(每7天)
 */
const { config } = require('../config')
const { logger } = require('./logger')
const { runSync } = require('../services/syncService')

let syncInterval = null
let tokenInterval = null

function startScheduler() {
  const seconds = config.syncIntervalSeconds || 10

  // 数据同步 — 每10秒
  logger.info(`[Scheduler] 数据同步启动，间隔 ${seconds} 秒`)
  runSync().then(r => logger.info(`[Scheduler] 初始同步: ${r.success ? '成功' : '失败'}`, { newCount: r.newCount }))
  syncInterval = setInterval(async () => {
    try {
      const r = await runSync()
      if (r.newCount > 0) logger.info(`[Scheduler] 同步: +${r.newCount} 条新数据`)
    } catch (err) {
      logger.error('[Scheduler] 同步异常:', err.message)
    }
  }, seconds * 1000)

  // Token 刷新 — 每天
  const DAY_MS = 24 * 60 * 60 * 1000
  logger.info('[Scheduler] Token 自动刷新已启动（每天）')
  tokenInterval = setInterval(async () => {
    try {
      const { refreshToken } = require('../services/authService')
      const result = await refreshToken()
      if (result.success) {
        logger.info('[Scheduler] Token 已自动刷新')
      } else {
        logger.warn('[Scheduler] Token 刷新失败:', result.message)
      }
    } catch (err) {
      logger.error('[Scheduler] Token 刷新异常:', err.message)
    }
  }, DAY_MS)
}

function stopScheduler() {
  if (syncInterval) { clearInterval(syncInterval); logger.info('[Scheduler] 数据同步已停止') }
  if (tokenInterval) { clearInterval(tokenInterval); logger.info('[Scheduler] Token 刷新已停止') }
}

module.exports = { startScheduler, stopScheduler }
