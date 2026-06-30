/**
 * 认证服务 — 完整自动登录 + Token 刷新
 * 模拟浏览器流程：先获取会话 Cookie，再登录
 */
const axios = require('axios')
const { apiClient, getToken, setToken, setCookies, getCookies } = require('../utils/apiClient')
const { config } = require('../config')
const { logger } = require('../utils/logger')

/**
 * Step 1: 获取浏览器会话（acw_tc 反爬 Cookie）
 */
async function getSessionCookies() {
  logger.info('[Auth] 获取浏览器会话...')
  try {
    const resp = await axios.get(config.apiBaseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139.0.0.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 10000,
      maxRedirects: 3,
    })
    const sc = resp.headers['set-cookie']
    if (sc) {
      setCookies(sc)
      logger.info('[Auth] 会话 Cookie 已获取')
      return true
    }
    logger.warn('[Auth] 未获取到会话 Cookie')
    return false
  } catch (err) {
    logger.warn('[Auth] 获取会话失败:', err.message)
    return false
  }
}

/**
 * Step 2: 用 phone + password 登录获取 Token
 */
async function loginWithPhone(uname, pwd) {
  const u = uname || config.username
  const p = pwd || config.password
  if (!u || !p) return { success: false, message: '未配置账号密码' }

  logger.info('[Auth] ====== phone+password 登录 ======')

  // 先获取会话
  await getSessionCookies()

  const loginUrl = config.apiBaseUrl + config.loginPath
  const cookieJar = getCookies()

  // 尝试多种格式
  const attempts = [
    // 真实格式：mainPartId + applicationId（不需Bearer，首次登录）
    { n: 'mainPartId+appId', body: { mainPartId: 1000010164, applicationId: 1000003, phone: u, password: p } },
    // phone+password 直接
    { n: 'phone+password', body: { phone: u, password: p } },
    { n: 'username+password', body: { username: u, password: p } },
    // 加 type
    { n: 'phone+password+type', body: { phone: u, password: p, type: 1, loginType: 2 } },
    // grant_type OAuth 风格
    { n: 'grant_type=password', body: { phone: u, password: p, grant_type: 'password', client_id: 'test' } },
  ]

  for (const a of attempts) {
    try {
      logger.info(`[Auth] 尝试: ${a.n}`)
      const resp = await axios.post(loginUrl, a.body, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139.0.0.0',
          'Referer': config.apiBaseUrl + '/',
          'Cookie': cookieJar || '',
        },
        timeout: 10000,
        validateStatus: s => s < 500,
      })

      logger.info(`[Auth] ${a.n} → HTTP ${resp.status}`)
      logger.info(`[Auth] 响应: ${JSON.stringify(resp.data).slice(0, 300)}`)

      // 检查响应头有没有新 Token
      const sc = resp.headers['set-cookie']
      if (sc) setCookies(sc)

      // 提取 Token
      const t = extractToken(resp.data, resp.headers)
      if (t) {
        setToken(t)
        logger.info(`[Auth] ✅ ${a.n} 成功获取 Token!`)
        return { success: true, token: t }
      }

      // 业务成功
      if (resp.data?.code === 200 || resp.data?.code === 0 || resp.data?.success === true) {
        const newT = extractToken(resp.data, resp.headers)
        if (newT) {
          setToken(newT)
          return { success: true, token: newT }
        }
        return { success: true, token: null }
      }

      // 特定错误
      if (resp.data?.code === 500) {
        logger.info(`[Auth] ${a.n} → 业务错误，继续...`)
        continue
      }
    } catch (err) {
      logger.info(`[Auth] ${a.n} → 网络错误: ${err.message}`)
    }
  }

  return { success: false, message: '所有登录格式均失败' }
}

/**
 * Token 刷新 — 用 mainPartId + applicationId + 旧 Bearer
 */
async function refreshToken() {
  const token = getToken()
  if (!token) {
    logger.warn('[Auth] 无 Token，尝试完整登录...')
    return loginWithPhone()
  }

  logger.info('[Auth] 尝试刷新 Token...')
  try {
    const resp = await axios.post(config.apiBaseUrl + config.loginPath,
      { mainPartId: 1000010164, applicationId: 1000003 },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 Chrome/139.0.0.0',
        },
        timeout: 10000,
        validateStatus: s => s < 500,
      }
    )

    const newToken = extractToken(resp.data, resp.headers)
    if (newToken && newToken !== token) {
      setToken(newToken)
      logger.info('[Auth] Token 已刷新')
      return { success: true, token: newToken }
    }

    if (resp.data?.code === 200 || resp.data?.code === 0 || resp.data?.success === true) {
      return { success: true, token }
    }

    logger.warn('[Auth] 刷新响应异常:', JSON.stringify(resp.data).slice(0, 200))
    // 刷新失败，尝试完整登录
    logger.info('[Auth] 刷新失败，回退到完整登录...')
    return loginWithPhone()
  } catch (err) {
    logger.warn('[Auth] 刷新请求失败:', err.message)
    return loginWithPhone()
  }
}

function extractToken(data, headers) {
  if (typeof data === 'string' && data.startsWith('eyJ') && data.length > 50) return data
  function deep(obj, d) {
    if (!obj || typeof obj !== 'object' || d > 6) return null
    for (const k of Object.keys(obj)) {
      const v = obj[k]
      if (typeof v === 'string' && v.startsWith('eyJ') && v.length > 50) return v
      if (typeof v === 'object') { const r = deep(v, d + 1); if (r) return r }
    }
    return null
  }
  const t = deep(data, 0)
  if (t) return t
  if (headers) {
    for (const h of ['authorization', 'Authorization']) {
      const v = headers[h]
      if (v) { const m = v.match(/Bearer\s+(.+)/i); if (m) return m[1] }
    }
  }
  return null
}

async function checkTokenStatus() {
  const t = getToken()
  if (!t) return { valid: false, token: null, message: '未设置 Token' }
  try {
    const axios = require('axios')
    const resp = await axios.post(config.apiBaseUrl + config.orderPath,
      { currentPage: 1, pageSize: 1, orderNoOrPlateNo: '', stationCodeIndex: [], deviceOrgCodeIndex: [], ownerCompanyIdList: [], ownerCompanyIdIndex: [], startTypes: [] },
      { headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, timeout: 10000 }
    )
    // 检查业务状态码
    if (resp.data?.code === 40061) {
      logger.info('[Auth] Token 已过期 (code=40061)，尝试自动刷新...')
      const result = await refreshToken()
      if (result.success && result.token) {
        return { valid: true, token: result.token, message: 'Token 已自动刷新' }
      }
      return { valid: false, token: null, message: 'Token 刷新失败，请手动登录获取新Token' }
    }
    return { valid: true, token: t, message: 'Token 有效' }
  } catch (err) {
    if (err.response?.status === 401) {
      logger.info('[Auth] Token 失效 (401)，尝试自动刷新...')
      const result = await refreshToken()
      if (result.success && result.token) {
        return { valid: true, token: result.token, message: 'Token 已自动刷新' }
      }
      return { valid: false, token: null, message: 'Token 刷新失败' }
    }
    return { valid: true, token: t, message: 'Token 可能有效' }
  }
}

module.exports = { refreshToken, checkTokenStatus, getToken, loginWithPhone }
