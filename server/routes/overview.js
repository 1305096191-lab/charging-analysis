/**
 * 运营大屏接口 — /api/dashboard/overview?period=today|yesterday|year
 */
const express = require('express')
const router = express.Router()
const { dbGet, dbAll } = require('../db/init')

router.get('/overview', async (req, res) => {
  try {
    const period = req.query.period || 'today'
    let dateCondition

    if (period === 'today') {
      dateCondition = "date(created_time)=date('now','localtime')"
    } else if (period === 'month') {
      dateCondition = "date(created_time)>=date('now','localtime','start of month')"
    } else if (period === 'year') {
      dateCondition = "date(created_time)>=date('now','localtime','start of year')"
    } else {
      dateCondition = "date(created_time)=date('now','localtime')"
    }

    // 汇总（充电+换电合计）
    const summary = dbGet(
      `SELECT COUNT(*) as sessions,
              COALESCE(SUM(energy),0) as kwh,
              COALESCE(SUM(receivable),0) as revenue,
              COALESCE(SUM(elec_fee),0) as elec_fee,
              COALESCE(SUM(service_fee),0) as service_fee,
              COALESCE(SUM(CASE WHEN order_type LIKE '%充电%' THEN 1 ELSE 0 END),0) as charge_sessions,
              COALESCE(SUM(CASE WHEN order_type LIKE '%换电%' THEN 1 ELSE 0 END),0) as swap_sessions,
              COUNT(DISTINCT CASE WHEN order_type LIKE '%充电%' AND plate_no != '' THEN plate_no END) as charge_vehicles
       FROM orders WHERE ${dateCondition}`
    )

    // 场站分布
    const stations = dbAll(
      `SELECT station_name, COUNT(*) as sessions, COALESCE(SUM(energy),0) as kwh,
              COALESCE(SUM(receivable),0) as revenue
       FROM orders WHERE ${dateCondition}
       GROUP BY station_name ORDER BY sessions DESC`
    )

    // 状态分布
    const statusDist = dbAll(
      `SELECT status, COUNT(*) as cnt FROM orders WHERE ${dateCondition} GROUP BY status`
    )

    // 最近记录
    const recent = dbAll(
      `SELECT order_id, station_name, status, CAST(energy AS REAL) as energy,
              CAST(receivable AS REAL) as receivable, created_time
       FROM orders ORDER BY created_time DESC LIMIT 8`
    )

    // 累计（全部）
    const total = dbGet(
      `SELECT COUNT(*) as total_orders, COUNT(DISTINCT station_name) as total_stations,
              COALESCE(SUM(energy),0) as total_kwh, COALESCE(SUM(receivable),0) as total_revenue
       FROM orders`
    )

    // 充电桩模拟状态
    const stationStatus = stations.map(s => ({
      name: s.station_name.replace('福建厦门','').replace('1号',''),
      sessions: s.sessions, kwh: s.kwh, revenue: s.revenue,
      totalPiles: Math.max(2, Math.floor(s.sessions * 0.6) + 2),
      charging: Math.max(0, Math.floor(s.sessions * 0.35)),
      idle: Math.max(1, Math.floor(s.sessions * 0.25) + 1),
      offline: Math.floor(Math.random() * 2),
    }))

    res.json({
      code: 0,
      data: {
        period,
        summary: summary || {},
        stations: stationStatus,
        statusDist,
        recent,
        total: total || {},
        updateTime: new Date().toLocaleString('zh-CN'),
      },
      message: 'ok',
    })
  } catch (err) {
    res.json({ code: -1, data: null, message: err.message })
  }
})

// GET /api/dashboard/ranking?period=today|yesterday|7days
router.get('/ranking', async (req, res) => {
  try {
    const period = req.query.period || 'today'
    let cond
    if (period === 'today') cond = "date(created_time)=date('now','localtime')"
    else if (period === 'month') cond = "date(created_time)>=date('now','localtime','start of month')"
    else if (period === '7days') cond = "date(created_time)>=date('now','localtime','-7 days')"

    // 按 station_name 区分充/换电站
    const chargeStations = dbAll(`SELECT DISTINCT station_name as name FROM orders WHERE station_name!='' AND station_name NOT LIKE '%换电站%'`)
    const swapStations = dbAll(`SELECT DISTINCT station_name as name FROM orders WHERE station_name!='' AND station_name LIKE '%换电站%'`)

    // 充电站排名（按场站名区分）
    const chargeData = dbAll(
      `SELECT station_name as name, COUNT(DISTINCT plate_no) as vehicles,
              COUNT(*) as sessions, COALESCE(SUM(energy),0) as kwh
       FROM orders WHERE ${cond} AND station_name!='' AND station_name NOT LIKE '%换电站%'
       GROUP BY station_name`
    )
    const cmap = {}; chargeData.forEach(r => { cmap[r.name] = r })
    const chargeRank = chargeStations.map(s => cmap[s.name] || { name:s.name,vehicles:0,sessions:0,kwh:0 }).sort((a,b)=>b.kwh-a.kwh)

    // 换电站排名（按场站名区分）
    const swapData = dbAll(
      `SELECT station_name as name, COUNT(DISTINCT plate_no) as vehicles,
              COUNT(*) as sessions, COALESCE(SUM(energy),0) as kwh
       FROM orders WHERE ${cond} AND station_name!='' AND station_name LIKE '%换电站%'
       GROUP BY station_name`
    )
    const smap = {}; swapData.forEach(r => { smap[r.name] = r })
    const swapRank = swapStations.map(s => smap[s.name] || { name:s.name,vehicles:0,sessions:0,kwh:0 }).sort((a,b)=>b.kwh-a.kwh)

    // 显示时截短名称
    chargeRank.forEach(r => { r.name = r.name.replace('福建厦门','').replace('1号','') })
    swapRank.forEach(r => { r.name = r.name.replace('福建厦门','').replace('1号','') })

    res.json({ code: 0, data: { chargeRank, swapRank }, message: 'ok-v3' })
  } catch (err) {
    res.json({ code: -1, data: null, message: err.message })
  }
})

module.exports = router
