/**
 * 认证路由 — POST /api/auth/login, GET /api/auth/status
 */
const express = require('express')
const router = express.Router()
const { login, checkTokenStatus } = require('../services/authService')
const { getToken } = require('../utils/apiClient')
const { logger } = require('../utils/logger')

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}

  if (!username || !password) {
    return res.json({
      code: -1,
      data: null,
      message: '用户名和密码不能为空',
    })
  }

  const result = await login(username, password)

  if (result.success) {
    return res.json({
      code: 0,
      data: { token: result.token },
      message: result.message,
    })
  }

  return res.json({
    code: -1,
    data: result.rawData || null,
    message: result.message,
  })
})

// GET /api/auth/status
router.get('/status', async (_req, res) => {
  const result = await checkTokenStatus()
  res.json({
    code: result.valid ? 0 : -1,
    data: { token: result.token ? `${result.token.slice(0, 10)}...` : null },
    message: result.message,
  })
})

module.exports = router
