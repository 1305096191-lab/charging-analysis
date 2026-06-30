import { defineStore } from 'pinia'
import { ref } from 'vue'
import { orderApi } from '../api'

export const useOrderStore = defineStore('order', () => {
  const list = ref([])
  const total = ref(0)
  const page = ref(1)
  const totalPages = ref(0)
  const loading = ref(false)

  // 统计数据
  const stats = ref(null)
  const statsLoading = ref(false)

  // 筛选
  const filterMeta = ref({ months: [], stations: [], operators: [] })
  const selectedMonths = ref([])
  const selectedStations = ref([])
  const selectedOperators = ref([])

  async function fetchOrders(params = {}) {
    loading.value = true
    try {
      const q = { page: params.page || 1, size: params.size || 20, ...params }
      const { data } = await orderApi.list(q)
      if (data.code === 0) {
        list.value = data.data.list || []
        total.value = data.data.total || 0
        page.value = data.data.page || 1
        totalPages.value = data.data.totalPages || 0
      }
      return data
    } finally { loading.value = false }
  }

  async function fetchStats(filters = {}) {
    statsLoading.value = true
    try {
      const params = {}
      if (filters.station) params.station = filters.station
      if (filters.operator) params.operator = filters.operator
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate
      const { data } = await orderApi.stats(params)
      if (data.code === 0) {
        stats.value = data.data
        if (data.data.filterMeta) {
          filterMeta.value = data.data.filterMeta
        }
      }
      return data
    } finally { statsLoading.value = false }
  }

  return {
    list, total, page, totalPages, loading,
    stats, statsLoading, filterMeta, selectedMonths, selectedStations, selectedOperators,
    fetchOrders, fetchStats,
  }
})
