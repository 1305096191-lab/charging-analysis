/**
 * Token Manager — 自动管理（Puppeteer 兜底）
 */
const axios = require('axios')
const { loginWithPhone } = require('./services/authService')
const { config } = require('./config')
const { logger } = require('./utils/logger')

let token = config.bearerToken || null
let expireTime = 0
let refreshingPromise = null

function getToken() { return token }

function isExpired() {
  return !token || Date.now() > expireTime - 5 * 60 * 1000
}

async function validateToken(t) {
  try {
    const resp = await axios.post(config.apiBaseUrl + config.orderPath,
      { currentPage: 1, pageSize: 1, orderNoOrPlateNo: '', stationCodeIndex: [], deviceOrgCodeIndex: [], ownerCompanyIdList: [], ownerCompanyIdIndex: [], startTypes: [] },
      { headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, timeout: 10000 }
    )
    if (resp.data?.code === 40061) return false
    return true
  } catch (err) { return false }
}

async function refreshToken() {
  logger.info('[Token] 正在刷新...')

  // 1. 检查 .env Token
  if (config.bearerToken && config.bearerToken !== token) {
    if (await validateToken(config.bearerToken)) {
      token = config.bearerToken
      expireTime = Date.now() + 2 * 60 * 60 * 1000
      logger.info('[Token] .env Token 有效')
      return token
    }
  }

  // 2. 尝试 API 自动登录
  try {
    const result = await loginWithPhone()
    if (result?.success && result.token && await validateToken(result.token)) {
      token = result.token
      expireTime = Date.now() + 2 * 60 * 60 * 1000
      logger.info('[Token] API 登录成功')
      return token
    }
  } catch (_) {}

  // 3. ⭐ Puppeteer 模拟浏览器登录
  try {
    const { getTokenByBrowser } = require('./services/puppeteerLogin')
    const browserResult = await getTokenByBrowser()
    if (browserResult?.success && browserResult.token && await validateToken(browserResult.token)) {
      token = browserResult.token
      expireTime = Date.now() + 2 * 60 * 60 * 1000
      logger.info('[Token] Puppeteer 登录成功')
      // 持久化到 .env
      const fs = require('fs'), path = require('path')
      const envPath = path.resolve(__dirname, '..', '.env')
      let content = fs.readFileSync(envPath, 'utf-8')
      content = content.replace(/BEARER_TOKEN=.*/, 'BEARER_TOKEN=' + token)
      fs.writeFileSync(envPath, content)
      return token
    }
  } catch (err) {
    logger.warn('[Token] Puppeteer 登录失败:', err.message)
  }

  // 4. 现有 Token 仍有效
  if (token && await validateToken(token)) {
    expireTime = Date.now() + 2 * 60 * 60 * 1000
    return token
  }

  // 彻底失败
  logger.error('[Token] 所有方式均无法获取 Token')
  token = null; expireTime = 0
  throw new Error('Token 已过期且无法自动获取')
}

async function ensureToken() {
  if (!isExpired()) return token
  if (refreshingPromise) return refreshingPromise

  refreshingPromise = (async () => {
    try { return await refreshToken() }
    catch (err) {
      token = null; expireTime = 0
      throw err
    } finally { refreshingPromise = null }
  })()

  return refreshingPromise
}

module.exports = { getToken, ensureToken, refreshToken }
