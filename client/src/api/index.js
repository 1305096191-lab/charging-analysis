/**
 * Axios 封装 + 拦截器
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器 — 自动注入 Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bearer_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 — Token 失效清除
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bearer_token')
      localStorage.removeItem('username')
    }
    return Promise.reject(err)
  }
)

// ============ API 方法 ============

// 认证
export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  checkStatus: () => api.get('/auth/status'),
}

// 订单
export const orderApi = {
  list: (params) => api.get('/orders', { params }),
  stats: (params) => api.get('/orders/stats', { params }),
}

// 同步
export const syncApi = {
  status: () => api.get('/sync/status'),
  trigger: () => api.post('/sync/trigger'),
}

export default api
