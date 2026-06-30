/**
 * Axios 实例封装 — 重试 + Bearer/Cookie 双认证 + Token失效自动重登
 */
const axios = require('axios')
const { config } = require('../config')
const { logger } = require('./logger')

// 尝试加载 axios-retry
let applyRetry = null
try { applyRetry = require('axios-retry').default } catch (_) {}

// ---- 运行时状态 ----
let currentToken = config.bearerToken || ''
let cookieJar = ''  // 存储登录返回的 Cookie

function getToken() { return currentToken }
function setToken(token) {
  currentToken = token
  // 持久化到 .env
  const fs = require('fs'), path = require('path')
  const envPath = path.resolve(__dirname, '..', '..', '.env')
  try {
    let content = fs.readFileSync(envPath, 'utf-8')
    if (content.includes('BEARER_TOKEN=')) {
      content = content.replace(/BEARER_TOKEN=.*/, `BEARER_TOKEN=${token}`)
    } else {
      content += `\nBEARER_TOKEN=${token}`
    }
    fs.writeFileSync(envPath, content)
    logger.info('[apiClient] Token 已持久化')
  } catch (err) { logger.warn('[apiClient] Token 持久化失败:', err.message) }
}

function setCookies(cookies) {
  if (Array.isArray(cookies)) {
    cookieJar = cookies.map(c => c.split(';')[0]).join('; ')
  } else if (typeof cookies === 'string') {
    cookieJar = cookies
  }
  if (cookieJar) logger.info('[apiClient] Cookie 已保存')
}

// ---- Axios 实例 ----
const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器
apiClient.interceptors.request.use((reqConfig) => {
  reqConfig._startTime = Date.now()
  // Bearer Token 优先
  if (currentToken) {
    reqConfig.headers.Authorization = `Bearer ${currentToken}`
  }
  // Cookie 备选
  if (cookieJar) {
    reqConfig.headers.Cookie = cookieJar
  }
  logger.info(`[API] ${reqConfig.method?.toUpperCase()} ${reqConfig.baseURL}${reqConfig.url}`)
  return reqConfig
})

// 响应拦截器
apiClient.interceptors.response.use(
  (res) => {
    logger.info(`[API] ${res.config.method?.toUpperCase()} ${res.config.url} → ${res.status} (${Date.now() - (res.config._startTime || 0)}ms)`)
    // 捕获 set-cookie
    const sc = res.headers['set-cookie']
    if (sc) setCookies(sc)
    return res
  },
  async (err) => {
    const status = err.response?.status || 0
    const url = err.config?.url || ''
    logger.error(`[API] 请求失败 ${url} [${status}]: ${err.message}`)

    // 401 → 自动重新登录
    if (status === 401 && !err.config._retryLogin) {
      err.config._retryLogin = true
      logger.warn('[API] Token 失效，尝试自动重新登录...')
      try {
        const { refreshToken } = require('../services/authService')
        const result = await refreshToken()
        if (result.success) {
          // 重试原请求
          err.config.headers.Authorization = `Bearer ${currentToken}`
          return apiClient(err.config)
        }
      } catch (reloginErr) {
        logger.error('[API] 自动重登失败:', reloginErr.message)
      }
    }
    return Promise.reject(err)
  }
)

// 配置重试（如果可用）
if (applyRetry) {
  applyRetry(apiClient, {
    retries: 3,
    retryDelay: (c) => Math.pow(2, c - 1) * 1000,
    retryCondition: (err) => {
      const s = err.response?.status || 0
      if (s === 401) return false
      if (s >= 400 && s < 500) return false
      return true
    },
  })
}

// ---- 原始 Axios 实例（用于登录，不触发拦截器循环） ----
const rawAxios = axios.create({ timeout: 15000 })

module.exports = { apiClient, rawAxios, getToken, setToken, setCookies, getCookies: () => cookieJar }
