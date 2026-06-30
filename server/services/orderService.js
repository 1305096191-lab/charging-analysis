const { getOrders, getStats } = require('../db/queries')

function listOrders({ page, size, status, station, operator, month }) {
  return getOrders({ page, size, status, station, operator, month })
}

async function getOrderStats(filters = {}) {
  return getStats(filters)
}

module.exports = { listOrders, getOrderStats }
