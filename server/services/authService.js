/**
 * 认证服务 — loginWithPhone 返回 { success, token }
 */
const axios = require('axios')
const { config } = require('../config')
const { logger } = require('../utils/logger')

function extractToken(data, headers) {
  if (typeof data === 'string' && data.startsWith('eyJ') && data.length > 50) return data

  function deep(obj, d) {
    if (!obj || typeof obj !== 'object' || d > 6) return null
    for (const k of Object.keys(obj)) {
      const v = obj[k]
      if (typeof v === 'string' && v.startsWith('eyJ') && v.length > 50) return v
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
}

/**
 * phone+password 登录 — 返回 { success: true, token }
 */
async function loginWithPhone(uname, pwd) {
  const u = uname || config.username
  const p = pwd || config.password

  if (config.bearerToken && config.bearerToken.length > 100) {
    logger.info('[Auth] 使用 .env 中的 Token')
    return { success: true, token: config.bearerToken }
  }

  if (!u || !p) {
    return { success: false, message: '未配置账号密码', token: null }
  }

  logger.info('[Auth] ====== phone+password 登录 ======')

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
      logger.info(`[Auth] 尝试: ${a.n}`)

      const resp = await axios.post(loginUrl, a.body, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139.0.0.0',
          'Referer': config.apiBaseUrl + '/',
        },
        timeout: 10000,
        validateStatus: s => s < 500,
      })

      // ⭐⭐⭐ 关键：打印完整返回
      console.log(`[Auth] ${a.n} response data:`, JSON.stringify(resp.data, null, 2))
      console.log(`[Auth] ${a.n} response headers:`, resp.headers)

      const t = extractToken(resp.data, resp.headers)

      if (t) {
        logger.info(`[Auth] ✅ ${a.n} 登录成功`)
        return { success: true, token: t }
      } else {
        logger.warn(`[Auth] ❌ ${a.n} 未提取到 token`)
      }

    } catch (err) {
      logger.error(`[Auth] ${a.n} → 请求错误: ${err.message}`)
    }
  }

  return {
    success: false,
    message: '所有登录格式均失败（或未返回token）',
    token: null
  }
}

async function checkTokenStatus() {
  const t = config.bearerToken
  if (!t) return { valid: false, message: '未设置 Token' }

  try {
    const resp = await axios.post(
      config.apiBaseUrl + config.orderPath,
      {
        currentPage: 1,
        pageSize: 1,
        orderNoOrPlateNo: '',
        stationCodeIndex: [],
        deviceOrgCodeIndex: [],
        ownerCompanyIdList: [],
        ownerCompanyIdIndex: [],
        startTypes: []
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + t
        },
        timeout: 10000
      }
    )

    if (resp.data?.code === 40061) {
      return { valid: false, message: 'Token 已过期' }
    }

    return { valid: true, message: 'Token 有效' }

  } catch (err) {
    return { valid: false, message: err.message }
  }
}

module.exports = {
  loginWithPhone,
  checkTokenStatus,
  getToken: () => config.bearerToken
}