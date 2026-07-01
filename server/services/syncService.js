/**
 * 数据同步服务 — Render稳定无人值守增强版
 */

const { apiClient } = require('../utils/apiClient')
const { config } = require('../config')
const { logger, logSync } = require('../utils/logger')
const {
  batchInsertOrders,
  createSyncLog,
  updateSyncLog
} = require('../db/queries')

let isSyncing = false

// ======================
// 数据映射
// ======================
function mapOrder(raw) {
  const qty = parseFloat(raw.quantity) || parseFloat(raw.eleAmount) || 0

  let operator = raw.deviceOrgName || ''
  if (!operator && raw.autoTeamName) {
    operator = raw.autoTeamName.replace('车队', '').trim()
  }

  return {
    order_id: String(raw.orderNo || raw.id || ''),
    station_name: raw.stationName || '',
    station_abbr: raw.stationAbbr || '',
    operator,
    status: raw.orderStatusStr || String(raw.orderStatus) || '',
    energy: qty,
    elec_fee: parseFloat(raw.eleAmount) || 0,
    service_fee: parseFloat(raw.serviceAmount) || 0,
    receivable: parseFloat(raw.payAmount) || parseFloat(raw.totalAmount) || 0,
    amount: parseFloat(raw.totalAmount) || parseFloat(raw.payAmount) || parseFloat(raw.orderAmount) || 0,
    refund_amount: parseFloat(raw.refundAmount) || 0,
    plate_no: raw.deviceName || '',
    order_type: raw.orderTypeStr || '',
    created_time: raw.createTime || raw.businessStartTime || '',
    _raw: raw,
  }
}

// ======================
// API请求（稳定重试版）
// ======================
async function fetchPage(payload, retry = 3) {
  for (let i = 0; i < retry; i++) {
    try {
      const res = await apiClient.post(config.orderPath, payload)
      return res
    } catch (err) {
      const msg = err.message || ''

      logger.warn(`[Sync] 请求失败 ${i + 1}/${retry}: ${msg}`)

      // ❗只有网络/5xx才重试
      const status = err.response?.status

      const shouldRetry =
        status === 0 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        !status

      if (i === retry - 1 || !shouldRetry) {
        throw err
      }

      const delay = 1000 * (i + 1)
      await new Promise(r => setTimeout(r, delay))
    }
  }
}

// ======================
// 主同步逻辑
// ======================
async function runSync() {
  if (isSyncing) {
    return { success: true, message: 'skipped-concurrent' }
  }

  isSyncing = true

  const startedAt = new Date().toISOString().replace('T', ' ').slice(0, 19)

  let syncLogId = null
  let totalNew = 0
  let totalAll = 0

  try {
    syncLogId = await createSyncLog({
      startedAt,
      status: 'running'
    })

    logSync('开始', { syncLogId })

    // ======================
    // 第一步：第一页
    // ======================
    const firstResp = await fetchPage({
      currentPage: 1,
      pageSize: 50,
      orderNoOrPlateNo: '',
      stationCodeIndex: [],
      deviceOrgCodeIndex: [],
      ownerCompanyIdList: [],
      ownerCompanyIdIndex: [],
      startTypes: [],
    })

    const data = firstResp.data?.data
    const totalPages = data?.orderList?.pages || 1

    logger.info(`[Sync] 总页数: ${totalPages}`)

    // ======================
    // 第二步：分页
    // ======================
    for (let page = 1; page <= totalPages; page++) {
      try {
        const resp = await fetchPage({
          currentPage: page,
          pageSize: 50,
          orderNoOrPlateNo: '',
          stationCodeIndex: [],
          deviceOrgCodeIndex: [],
          ownerCompanyIdList: [],
          ownerCompanyIdIndex: [],
          startTypes: [],
        })

        const records = resp.data?.data?.orderList?.records || []

        if (!records.length) {
          logger.warn(`[Sync] 第${page}页无数据`)
          continue
        }

        const mapped = records.map(mapOrder)

        totalAll += mapped.length
        const inserted = await batchInsertOrders(mapped)
        totalNew += inserted

        if (page % 10 === 0 || page === totalPages) {
          logger.info(
            `[Sync] ${page}/${totalPages} | 新增:${inserted} | 累计:${totalNew}`
          )
        }

      } catch (pageErr) {
        logger.error(`[Sync] 第${page}页失败: ${pageErr.message}`)
        // ❗单页失败不影响整体
        continue
      }
    }

    // ======================
    // 成功
    // ======================
    if (syncLogId) {
      await updateSyncLog(syncLogId, {
        status: 'success',
        newCount: totalNew,
        totalCount: totalAll,
      })
    }

    logSync('完成', { newCount: totalNew, totalCount: totalAll })

    return {
      success: true,
      newCount: totalNew,
      totalCount: totalAll,
    }

  } catch (err) {
    const msg = err.message || String(err)

    logger.error(`[Sync] 失败: ${msg}`)

    if (syncLogId) {
      await updateSyncLog(syncLogId, {
        status: 'failed',
        newCount: totalNew,
        errorMessage: msg,
      }).catch(() => {})
    }

    return {
      success: false,
      message: msg,
      newCount: totalNew,
    }

  } finally {
    // ❗关键：避免 Render 卡死
    isSyncing = false
  }
}

module.exports = { runSync }
