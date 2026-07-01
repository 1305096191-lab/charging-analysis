/**
 * Token Manager — 稳定版（防并发刷新 + 防死循环 + 容错）
 */

const { loginWithPhone } = require('./services/authService')
const { logger } = require('./utils/logger')

let token = null
let expireTime = 0

// ====== 并发控制 ======
let refreshingPromise = null

// ====== 获取 token ======
function getToken() {
  return token
}

// ====== 判断是否过期（提前5分钟刷新） ======
function isExpired() {
  return !token || Date.now() > expireTime - 5 * 60 * 1000
}

/**
 * ====== 真正刷新 token ======
 */
async function refreshToken() {
  logger.info('[Token] 正在刷新 token...')

  const result = await loginWithPhone()

  if (!result || !result.success) {
    throw new Error('登录失败，无法获取 token')
  }

  const newToken = result.token || result.data?.token

  if (!newToken) {
    throw new Error('登录成功但未返回 token')
  }

  token = newToken

  // 默认2小时有效（可后续改成解析JWT）
  expireTime = Date.now() + 2 * 60 * 60 * 1000

  logger.info('[Token] 刷新成功')
  return token
}

/**
 * ====== 核心：保证单线程刷新（防止并发风暴） ======
 */
async function ensureToken() {
  // 如果未过期，直接返回
  if (!isExpired()) {
    return token
  }

  // 如果正在刷新，让所有请求等待同一个 Promise
  if (refreshingPromise) {
    return refreshingPromise
  }

  // 创建刷新任务
  refreshingPromise = (async () => {
    try {
      const newToken = await refreshToken()
      return newToken
    } catch (err) {
      logger.error('[Token] 刷新失败:', err.message)

      // ❗关键：失败后清空token，避免“假可用状态”
      token = null
      expireTime = 0

      throw err
    } finally {
      refreshingPromise = null
    }
  })()

  return refreshingPromise
}

module.exports = {
  getToken,
  ensureToken,
  refreshToken,
}