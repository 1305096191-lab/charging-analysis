/**
 * Axios 实例 — 自动 Token 注入 + 防死循环 + 稳定重试版本
 */

const axios = require('axios')
const { ensureToken } = require('../tokenManager')
const { logger } = require('./logger')

const apiClient = axios.create({
  baseURL: 'https://sms.rhecube.com',
  timeout: 60000, // ⬅️ 从20s提升到60s（防Render/网络慢）
})

/**
 * 防止 token 并发刷新风暴
 */
let tokenRefreshing = false
let tokenQueue = []

async function safeEnsureToken() {
  // 如果正在刷新，让请求排队等待
  if (tokenRefreshing) {
    return new Promise((resolve, reject) => {
      tokenQueue.push({ resolve, reject })
    })
  }

  tokenRefreshing = true

  try {
    const token = await ensureToken()

    // 释放队列
    tokenQueue.forEach(p => p.resolve(token))
    tokenQueue = []

    return token
  } catch (err) {
    tokenQueue.forEach(p => p.reject(err))
    tokenQueue = []

    throw err
  } finally {
    tokenRefreshing = false
  }
}

/**
 * 请求拦截器（自动注入 token）
 */
apiClient.interceptors.request.use(async (config) => {
  config._startTime = Date.now()

  try {
    const token = await safeEnsureToken()

    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  } catch (err) {
    // ❗关键：token失败直接阻断请求（防止无效请求风暴）
    logger.error('[apiClient] token获取失败，阻断请求:', err.message)
    return Promise.reject(err)
  }
})

/**
 * 响应拦截器（日志 + 选择性重试）
 */
apiClient.interceptors.response.use(
  (res) => {
    const ms = Date.now() - (res.config._startTime || 0)

    logger.info(
      `[API] ${res.config.method?.toUpperCase()} ${res.config.url} → ${res.status} (${ms}ms)`
    )

    return res
  },

  async (err) => {
    const status = err.response?.status || 0
    const url = err.config?.url || ''

    logger.error(`[API] ${url} 失败 [${status}]: ${err.message}`)

    const config = err.config || {}

    // 初始化重试次数
    config._retries = config._retries || 0

    /**
     * ❗只对“真正可恢复错误”重试
     * 不对 token / 业务错误重试
     */
    const shouldRetry =
      config._retries < 3 &&
      (status === 0 || status === 502 || status === 503 || status === 504)

    if (shouldRetry) {
      config._retries++

      const delay = Math.pow(2, config._retries) * 1000
      logger.warn(`[API] 重试 ${config._retries}/3，等待 ${delay}ms`)

      await new Promise(r => setTimeout(r, delay))

      return apiClient(config)
    }

    // ❗401：token问题，不重试（避免死循环）
    if (status === 401) {
      logger.error('[API] 401 Token失效，不再重试')
    }

    return Promise.reject(err)
  }
)

module.exports = { apiClient }
