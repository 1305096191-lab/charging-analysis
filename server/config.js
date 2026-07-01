/**
 * 配置中心 — 读取并校验 .env 环境变量（Render 生产稳定版）
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

const config = {
  // API 基地址
  apiBaseUrl: process.env.API_BASE_URL || 'https://sms.rhecube.com',

  // 外部接口路径
  loginPath: process.env.LOGIN_PATH || '/api/jupiter-auth-server/login/phone/password',
  orderPath: process.env.ORDER_PATH || '/api/ecube-manage-server/ecube/manage/station/order/get/order/data/permit',

  // 登录凭证（⭐关键）
  username: process.env.USERNAME?.trim() || '',
  password: process.env.PASSWORD?.trim() || '',

  // Bearer Token
  bearerToken: process.env.BEARER_TOKEN?.trim() || '',

  // 服务端口（Render 必须用 process.env.PORT）
  port: parseInt(process.env.PORT, 10) || 10000,

  // 数据库路径
  dbPath: path.resolve(__dirname, '..', process.env.DB_PATH || './data/orders.db'),

  // 日志目录
  logDir: path.resolve(__dirname, '..', process.env.LOG_DIR || './logs'),

  // 同步间隔（秒）
  syncIntervalSeconds: parseInt(process.env.SYNC_INTERVAL_SECONDS, 10) || 10,
}

// ===============================
// 启动配置校验（增强版）
// ===============================
function validate() {
  const warnings = []

  if (!config.username) warnings.push('❌ USERNAME 未配置（Render 环境变量缺失）')
  if (!config.password) warnings.push('❌ PASSWORD 未配置（Render 环境变量缺失）')

  if (!config.apiBaseUrl) warnings.push('❌ API_BASE_URL 缺失')

  if (!config.bearerToken) {
    warnings.push('⚠️ BEARER_TOKEN 为空：系统将自动登录获取 token')
  }

  if (warnings.length) {
    console.warn('\n[Config] 配置检查警告:')
    warnings.forEach(w => console.warn(' - ' + w))
    console.warn('')
  } else {
    console.log('[Config] ✅ 配置检查通过')
  }

  // ⭐关键调试信息（Render 必看）
  console.log('[Config] ENV CHECK:', {
    username: config.username ? 'OK' : 'MISSING',
    password: config.password ? 'OK' : 'MISSING',
    apiBaseUrl: config.apiBaseUrl
  })
}

module.exports = { config, validate }
