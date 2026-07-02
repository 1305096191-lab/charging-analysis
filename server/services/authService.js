/**
 * 认证服务 — loginWithPhone 返回 { success, token }
 */

const axios = require('axios')
const { config } = require('../config')
const { logger } = require('../utils/logger')

const DEBUG = process.env.DEBUG_AUTH === 'true'

function debugLog(...args) {
  if (DEBUG) console.log(...args)
}

/**
 * 提取 token
 */
function extractToken(data, headers) {
  try {
    if (typeof data === 'string' && data.startsWith('eyJ') && data.length > 50) {
      return data
    }

    function deep(obj, d) {
      if (!obj || typeof obj !== 'object' || d > 6) return null

      for (const k of Object.keys(obj)) {
        const v = obj[k]

        if (typeof v === 'string' && v.startsWith('eyJ') && v.length > 50) {
          return v
        }

        if (typeof v === 'object') {
          const r = deep(v, d + 1)
          if (r) return r
        }
      }

      return null
    }

    const t = deep(data, 0)
    if (t) return t

    if (headers) {
      for (const h of ['authorization', 'Authorization']) {
        const v = headers[h]
        if (v) {
          const m = v.match(/Bearer\s+(.+)/i)
          if (m) return m[1]
        }
      }
    }

    return null
  } catch (e) {
    debugLog('[Auth][extractToken error]', e.message)
    return null
  }
}

/**
 * 登录
 */
async function loginWithPhone(uname, pwd) {
  const u = uname || config.username
  const p = pwd || config.password

  console.log('[AUTH] loginWithPhone START')

  if (!u || !p) {
    return { success: false, message: '未配置账号密码', token: null }
  }

  if (config.bearerToken && config.bearerToken.length > 100) {
    logger.info('[Auth] 使用环境 Token')
    return { success: true, token: config.bearerToken }
  }

  const loginUrl = config.apiBaseUrl + config.loginPath

  const attempts = [
    { n: 'mainPartId+appId', body: { mainPartId: 1000010164, applicationId: 1000003, phone: u, password: p } },
    { n: 'phone+password', body: { phone: u, password: p } },
    { n: 'username+password', body: { username: u, password: p } },
    { n: 'phone+password+type', body: { phone: u, password: p, type: 1, loginType: 2 } },
    { n: 'grant_type=password', body: { phone: u, password: p, grant_type: 'password', client_id: 'test' } },
  ]

  for (const a of attempts) {
    try {
      console.log(`[AUTH] trying: ${a.n}`)

      const resp = await axios.post(loginUrl, a.body, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Referer': config.apiBaseUrl + '/'
        },
        timeout: 15000,
        validateStatus: s => s < 500
      })

      debugLog(`[AUTH][${a.n}] response:`, resp.data)

      const token = extractToken(resp.data, resp.headers)

      if (token) {
        console.log(`[AUTH] SUCCESS: ${a.n}`)
        return { success: true, token }
      }

      console.log(`[AUTH] FAIL: no token -> ${a.n}`)

    } catch (err) {
      const msg =
        err.code === 'ECONNABORTED'
          ? 'timeout'
          : err.code || err.message

      console.log(`[AUTH] ERROR ${a.n}:`, msg)
    }
  }

  return {
    success: false,
    message: '所有登录方式失败或无token',
    token: null
  }
}

/**
 * token 校验
 */
async function checkTokenStatus() {
  const t = config.bearerToken
  if (!t) return { valid: false, message: '未设置 Token' }

  try {
    const resp = await axios.post(
      config.apiBaseUrl + config.orderPath,
      { currentPage: 1, pageSize: 1 },
      {
        headers: { Authorization: 'Bearer ' + t },
        timeout: 10000
      }
    )

    if (resp.data?.code === 40061) {
      return { valid: false, message: 'Token过期' }
    }

    return { valid: true, message: 'Token有效' }

  } catch (err) {
    return { valid: false, message: err.message }
  }
}

/**
 * Render启动环境检查
 */
console.log('[ENV CHECK]', {
  username: config.username ? 'OK' : 'MISSING',
  password: config.password ? 'OK' : 'MISSING',
  apiBaseUrl: config.apiBaseUrl
})

module.exports = {
  loginWithPhone,
  checkTokenStatus,
  getToken: () => config.bearerToken
}