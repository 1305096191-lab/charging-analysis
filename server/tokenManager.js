const { loginWithPhone } = require('./services/authService')
const { logger } = require('./utils/logger')

let token = null
let expireTime = 0   // 简单过期控制（你可以后面升级JWT解析）

// ====== 获取 token ======
function getToken() {
  return token
}

// ====== 判断是否过期 ======
function isExpired() {
  // 提前 5 分钟刷新
  return !token || Date.now() > expireTime - 5 * 60 * 1000
}

// ====== 强制刷新 token ======
async function refreshToken() {
  logger.info('[Token] 正在刷新 token...')

  const result = await loginWithPhone()

  if (!result || !result.success) {
    throw new Error('登录失败，无法获取 token')
  }

  token = result.token || result.data?.token

  // 默认 2小时有效（如果你接口不同，可以改）
  expireTime = Date.now() + 2 * 60 * 60 * 1000

  logger.info('[Token] 刷新成功')
  return token
}

// ====== 自动保证 token 可用 ======
async function ensureToken() {
  if (isExpired()) {
    await refreshToken()
  }
  return token
}

module.exports = {
  getToken,
  ensureToken,
  refreshToken,
}
