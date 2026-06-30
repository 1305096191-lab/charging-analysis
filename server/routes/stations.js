/**
 * 场站路由 — /api/stations
 */
const express = require('express')
const router = express.Router()
const { dbGet, dbAll } = require('../db/init')

/**
 * 百度BD-09坐标 → WGS-84坐标转换
 */
function bd09ToWgs84(bdLng, bdLat) {
  // BD-09 → GCJ-02
  const x = bdLng - 0.0065
  const y = bdLat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * Math.PI)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * Math.PI)
  let gcjLng = z * Math.cos(theta)
  let gcjLat = z * Math.sin(theta)
  // GCJ-02 → WGS-84 (简化逆变换)
  const dLng = gcjLng - bdLng + 0.0065
  const dLat = gcjLat - bdLat + 0.006
  return { lat: bdLat - dLat - 0.0005, lng: bdLng - dLng - 0.001 }
}

// 三个场站定义（坐标：百度BD-09 → WGS-84）
const STATIONS = [
  {
    id: 'gaoqi',
    name: '福建省厦门高崎机场1号充换电站',
    dbNames: ['福建厦门高崎机场1号充电站', '福建厦门高崎机场1号换电站'],
    lat: 24.5470, lng: 118.1285,
    address: '福建省厦门市湖里区园区北二路湖里区翔义混凝土公司旁',
    type: '充换电站',
  },
  {
    id: 'fengnan',
    name: '福建厦门凤南路1号充电站',
    dbNames: ['福建厦门凤南路1号充电站'],
    lat: 24.6668, lng: 118.0385,
    address: '福建省厦门市集美区福昆线辅路市政集美基地',
    type: '充电站',
  },
  {
    id: 'neicuo',
    name: '福建厦门内厝1号充换电站',
    dbNames: ['福建厦门内厝1号充电站', '福建厦门内厝1号换电站'],
    lat: 24.6767, lng: 118.2888,
    address: '福建省厦门市翔安区内厝镇G324(福昆线)',
    type: '充换电站',
  },
]

// GET /api/stations — 场站列表
router.get('/', (_req, res) => {
  res.json({ code: 0, data: STATIONS, message: 'ok' })
})

// GET /api/stations/:id — 场站详情
router.get('/:id', async (req, res) => {
  const st = STATIONS.find(s => s.id === req.params.id)
  if (!st) return res.json({ code: -1, data: null, message: '场站不存在' })

  try {
    const placeholders = st.dbNames.map(() => '?').join(',')
    const params = st.dbNames

    // 今日数据
    const today = dbGet(
      `SELECT COUNT(*) as orders, COALESCE(SUM(energy),0) as kwh
       FROM orders WHERE station_name IN (${placeholders})
       AND date(created_time)=date('now','localtime')`,
      params
    )

    // 今日换电量（仅换电站）
    const swapKwh = dbGet(
      `SELECT COALESCE(SUM(energy),0) as kwh FROM orders
       WHERE station_name LIKE '%换电站%'
       AND station_name IN (${placeholders})
       AND date(created_time)=date('now','localtime')`,
      params
    )

    // 充电量（排除换电站）
    const chargeKwh = dbGet(
      `SELECT COALESCE(SUM(energy),0) as kwh FROM orders
       WHERE station_name NOT LIKE '%换电站%'
       AND station_name IN (${placeholders})
       AND date(created_time)=date('now','localtime')`,
      params
    )

    // 累计数据
    const total = dbGet(
      `SELECT COUNT(*) as orders, COALESCE(SUM(energy),0) as kwh,
              COALESCE(SUM(service_fee),0) as service_fee,
              COUNT(DISTINCT date(created_time)) as active_days
       FROM orders WHERE station_name IN (${placeholders})`,
      params
    )

    // 平均充电时长（如果有相关字段）
    const avgDuration = total.active_days > 0
      ? Math.round(total.kwh / total.orders * 10) / 10
      : 0

    res.json({
      code: 0,
      data: {
        ...st,
        today: {
          orders: today?.orders || 0,
          chargeKwh: chargeKwh?.kwh || 0,
          swapKwh: swapKwh?.kwh || 0,
          totalKwh: (chargeKwh?.kwh || 0) + (swapKwh?.kwh || 0),
        },
        total: {
          orders: total?.orders || 0,
          kwh: total?.kwh || 0,
          serviceFee: total?.service_fee || 0,
          avgDuration: avgDuration,
        },
      },
      message: 'ok',
    })
  } catch (err) {
    res.json({ code: -1, data: null, message: err.message })
  }
})

// GET /api/stations/:id/chart?days=7|30
router.get('/:id/chart', async (req, res) => {
  const st = STATIONS.find(s => s.id === req.params.id)
  if (!st) return res.json({ code: -1, data: null, message: '场站不存在' })

  const days = parseInt(req.query.days) || 7
  const placeholders = st.dbNames.map(() => '?').join(',')
  const params = [...st.dbNames]

  try {
    const data = dbAll(
      `SELECT date(created_time) as date, COUNT(*) as orders, COALESCE(SUM(energy),0) as kwh
       FROM orders WHERE station_name IN (${placeholders})
       AND date(created_time) >= date('now','localtime','-${days} days')
       GROUP BY date(created_time) ORDER BY date ASC`,
      params
    )

    res.json({ code: 0, data: { days, chart: data }, message: 'ok' })
  } catch (err) {
    res.json({ code: -1, data: null, message: err.message })
  }
})

module.exports = router
