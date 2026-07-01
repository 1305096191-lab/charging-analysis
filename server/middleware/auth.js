/**
 * Bearer Token 软验证中间件
 * 无 Token 时不报错，仅标记 req.isAuthenticated = false
 */
const { getToken } = require('../tokenManager')

function authMiddleware(req, res, next) {
  // 登录接口无需认证
  if (req.path === '/api/auth/login') {
    return next()
  }

  // 检查请求头中的 Bearer Token
  const authHeader = req.headers.authorization
  const requestToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const serverToken = getToken()

  if (requestToken && serverToken && requestToken === serverToken) {
    req.isAuthenticated = true
  } else {
    req.isAuthenticated = false
  }

  // 无论是否认证都放行，由具体路由决定如何处理
  next()
}

module.exports = authMiddleware
