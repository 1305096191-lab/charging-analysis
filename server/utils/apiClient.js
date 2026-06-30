/**
 * Axios 实例 — 自动 Token 注入 + 重试
 */
const axios = require('axios')
const { ensureToken } = require('../tokenManager')
const { logger } = require('./logger')

const apiClient = axios.create({
  baseURL: 'https://sms.rhecube.com',
  timeout: 20000,
})

// 请求拦截器（自动加 token）
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await ensureToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (err) {
    logger.warn('[apiClient] ensureToken 失败:', err.message)
  }
  config._startTime = Date.now()
  return config
})

// 响应拦截器（日志 + 重试）
apiClient.interceptors.response.use(
  (res) => {
    const ms = Date.now() - (res.config._startTime || 0)
    logger.info(`[API] ${res.config.method?.toUpperCase()} ${res.config.url?.replace('/api/','/')} → ${res.status} (${ms}ms)`)
    return res
  },
  async (err) => {
    const status = err.response?.status || 0
    const url = err.config?.url || ''
    logger.error(`[API] ${url} 失败 [${status}]: ${err.message}`)

    // 重试（最多3次）
    err.config._retries = err.config._retries || 0
    if (err.config._retries < 3 && (status >= 500 || status === 0)) {
      err.config._retries++
      const delay = Math.pow(2, err.config._retries) * 1000
      logger.warn(`[API] 重试 ${err.config._retries}/3，等待 ${delay}ms`)
      await new Promise(r => setTimeout(r, delay))
      return apiClient(err.config)
    }

    return Promise.reject(err)
  }
)

module.exports = { apiClient }
