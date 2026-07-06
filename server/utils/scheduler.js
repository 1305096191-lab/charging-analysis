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

  // 每10分钟：校验Token + 确保数据最新
  const CHECK_MS = 10 * 60 * 1000
  logger.info('[Scheduler] 每10分钟校验 Token 和数据')
  tokenInterval = setInterval(async () => {
    try {
      const { ensureToken } = require('../tokenManager')
      const token = await ensureToken()
      if (!token) {
        logger.warn('[Scheduler] Token 无效，触发 Puppeteer 登录...')
        const { getTokenByBrowser } = require('../services/puppeteerLogin')
        const result = await getTokenByBrowser()
        if (result.success) {
          logger.info('[Scheduler] Puppeteer 登录成功，Token 已更新')
        }
      }
      // 触发一次同步
      const { runSync } = require('../services/syncService')
      await runSync()
    } catch (err) {
      logger.error('[Scheduler] 10分钟校验异常:', err.message)
    }
  }, CHECK_MS)
}

function stopScheduler() {
  if (syncInterval) { clearInterval(syncInterval); logger.info('[Scheduler] 数据同步已停止') }
  if (tokenInterval) { clearInterval(tokenInterval); logger.info('[Scheduler] Token 刷新已停止') }
}

module.exports = { startScheduler, stopScheduler }
