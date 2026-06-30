/**
 * 数据同步服务 — 每10秒拉取企业订单接口
 * MyBatis-Plus 分页: { current, size }
 */
const { apiClient } = require('../utils/apiClient')
const { config } = require('../config')
const { logger, logSync } = require('../utils/logger')
const { batchInsertOrders, createSyncLog, updateSyncLog } = require('../db/queries')

let isSyncing = false

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

async function runSync() {
  if (isSyncing) { return { success: true, message: 'skipped-concurrent' } }
  isSyncing = true

  const startedAt = new Date().toISOString().replace('T', ' ').slice(0, 19)
  let syncLogId
  try { syncLogId = await createSyncLog({ startedAt, status: 'running' }) } catch (_) {}

  logSync('开始', { syncLogId })

  // 从最后一页开始拉（最旧的数据），避免遗漏历史数据
  let totalNew = 0, totalAll = 0
  const pageSize = 50
  const firstResp = await apiClient.post(config.orderPath, {
    currentPage: 1, pageSize,
    orderNoOrPlateNo: '', stationCodeIndex: [], deviceOrgCodeIndex: [], ownerCompanyIdList: [], ownerCompanyIdIndex: [], startTypes: [],
  })
  const totalPages = firstResp.data?.data?.orderList?.pages || 1
  logger.info(`[Sync] 总页数: ${totalPages}`)

  // 正向逐页同步全部数据
  let page = 1
  try {
    while (page <= totalPages) {
      const resp = await apiClient.post(config.orderPath, {
        currentPage: page, pageSize,
        orderNoOrPlateNo: '', stationCodeIndex: [], deviceOrgCodeIndex: [], ownerCompanyIdList: [], ownerCompanyIdIndex: [], startTypes: [],
      })
      const d = resp.data?.data
      let records = []
      if (d?.orderList?.records && Array.isArray(d.orderList.records)) {
        records = d.orderList.records
      }
      if (!records.length) break

      const mapped = records.map(mapOrder)
      totalAll += mapped.length
      const n = await batchInsertOrders(mapped)
      totalNew += n

      if (page % 20 === 0 || page === totalPages) {
        logger.info(`[Sync] 页${page}/${totalPages}: ${mapped.length}条, 新增${n}, 累计${totalNew}/${totalAll}`)
      }
      page++
    }

    if (syncLogId) await updateSyncLog(syncLogId, { status: 'success', newCount: totalNew, totalCount: totalAll })
    logSync('完成', { newCount: totalNew, totalCount: totalAll })
    isSyncing = false
    return { success: true, newCount: totalNew, totalCount: totalAll }
  } catch (err) {
    const msg = err.message || JSON.stringify(err).slice(0, 200) || String(err)
    logger.error(`[Sync] 失败(页${page}): ${msg}`)
    if (syncLogId) await updateSyncLog(syncLogId, { status: 'failed', newCount: totalNew, errorMessage: msg }).catch(() => {})
    isSyncing = false
    return { success: false, message: msg, newCount: totalNew }
  }
}

module.exports = { runSync }
