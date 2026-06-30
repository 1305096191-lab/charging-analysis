import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('bearer_token') || '')
  const username = ref(localStorage.getItem('username') || '')
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  async function login(uname, pwd) {
    loading.value = true
    try {
      const { data } = await authApi.login(uname, pwd)
      if (data.code === 0 && data.data?.token) {
        token.value = data.data.token
        username.value = uname
        localStorage.setItem('bearer_token', data.data.token)
        localStorage.setItem('username', uname)
        return { success: true }
      }
      return { success: false, message: data.message || '登录失败' }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message || '网络错误' }
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = ''
    username.value = ''
    localStorage.removeItem('bearer_token')
    localStorage.removeItem('username')
  }

  return { token, username, loading, isLoggedIn, login, logout }
})
