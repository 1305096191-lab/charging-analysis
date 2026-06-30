import { defineStore } from 'pinia'
import { ref } from 'vue'
import { syncApi } from '../api'

export const useSyncStore = defineStore('sync', () => {
  const recentLogs = ref([])
  const lastSync = ref(null)
  const loading = ref(false)
  const triggering = ref(false)

  async function fetchStatus() {
    loading.value = true
    try {
      const { data } = await syncApi.status()
      if (data.code === 0) {
        recentLogs.value = data.data.recentLogs || []
        lastSync.value = data.data.lastSync || null
      }
      return data
    } finally {
      loading.value = false
    }
  }

  async function triggerSync() {
    triggering.value = true
    try {
      const { data } = await syncApi.trigger()
      // 触发后刷新列表
      await fetchStatus()
      return data
    } finally {
      triggering.value = false
    }
  }

  return { recentLogs, lastSync, loading, triggering, fetchStatus, triggerSync }
})
