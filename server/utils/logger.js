/**
 * Winston 日志系统 — console + 按日切割文件
 */
const path = require('path')
const winston = require('winston')
require('winston-daily-rotate-file')
const { config } = require('../config')

const logDir = config.logDir

// 通用日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`
  })
)

// 控制台输出（带颜色）
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    logFormat
  ),
})

// 应用日志按日切割
const appFileTransport = new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  level: 'info',
  format: logFormat,
})

// 错误日志按日切割
const errorFileTransport = new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  level: 'error',
  format: logFormat,
})

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [consoleTransport, appFileTransport, errorFileTransport],
})

// 请求专用日志
function logRequest(method, url, statusCode, durationMs) {
  logger.info(`${method} ${url}`, { statusCode, durationMs: `${durationMs}ms` })
}

// 同步专用日志
function logSync(action, detail = {}) {
  logger.info(`[Sync] ${action}`, detail)
}

module.exports = { logger, logRequest, logSync }
