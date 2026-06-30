/**
 * 数据同步服务 — 无人值守生产稳定版（增强版）
 */
const { apiClient } = require('../utils/apiClient')
const { config } = require('../config')
const { logger, logSync } = require('../utils/logger')
const { batchInsertOrders, createSyncLog, updateSyncLog } = require('../db/queries')

let isSyncing = false

// ====== 防止卡死：超时控制 ======
function timeoutPromise(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), ms)
    )
  ])
}

// ====== 数据映射 ======
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

// ====== 自动重试请求 ======
async function fetchPage(payload, retry = 3) {
  for (let i = 0; i < retry; i++) {
    try {
      return await timeoutPromise(
        apiClient.post(config.orderPath, payload),
        20000
      )
    } catch (err) {
      logger.warn(`[Sync] 请求失败重试 ${i + 1}/${retry}: ${err.message}`)
      if (i === retry - 1) throw err
    }
  }
}

// ====== 核心同步 ======
async function runSync() {
  if (isSyncing) {
    return { success: true, message: 'skipped-concurrent' }
  }

  isSyncing = true

  const startedAt = new Date().toISOString().replace('T', ' ').slice(0, 19)
  let syncLogId

  try {
    syncLogId = await createSyncLog({ startedAt, status: 'running' })
  } catch (_) {}

  logSync('开始', { syncLogId })

  let totalNew = 0
  let totalAll = 0
  const pageSize = 50

  try {
    // ====== 第一步：获取总页数 ======
    const firstResp = await fetchPage({
      currentPage: 1,
      pageSize,
      orderNoOrPlateNo: '',
      stationCodeIndex: [],
      deviceOrgCodeIndex: [],
      ownerCompanyIdList: [],
      ownerCompanyIdIndex: [],
      startTypes: [],
    })

    const totalPages =
      firstResp.data?.data?.orderList?.pages || 1

    logger.info(`[Sync] 总页数: ${totalPages}`)

    // ====== 第二步：逐页同步 ======
    for (let page = 1; page <= totalPages; page++) {
      const resp = await fetchPage({
        currentPage: page,
        pageSize,
        orderNoOrPlateNo: '',
        stationCodeIndex: [],
        deviceOrgCodeIndex: [],
        ownerCompanyIdList: [],
        ownerCompanyIdIndex: [],
        startTypes: [],
      })

      const d = resp.data?.data
      let records = d?.orderList?.records || []

      if (!Array.isArray(records) || records.length === 0) {
        logger.warn(`[Sync] 第${page}页无数据`)
        continue
      }

      const mapped = records.map(mapOrder)

      totalAll += mapped.length

      const inserted = await batchInsertOrders(mapped)
      totalNew += inserted

      // ====== 进度日志 ======
      if (page % 10 === 0 || page === totalPages) {
        logger.info(
          `[Sync] ${page}/${totalPages} | 本页:${mapped.length} | 新增:${inserted} | 累计:${totalNew}`
        )
      }
    }

    // ====== 成功 ======
    if (syncLogId) {
      await updateSyncLog(syncLogId, {
        status: 'success',
        newCount: totalNew,
        totalCount: totalAll,
      })
    }

    logSync('完成', { newCount: totalNew, totalCount: totalAll })

    isSyncing = false

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

    isSyncing = false

    return {
      success: false,
      message: msg,
      newCount: totalNew,
    }
  }
}

module.exports = { runSync }