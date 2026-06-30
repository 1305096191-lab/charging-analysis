import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Dashboard', component: () => import('../pages/Dashboard.vue'), meta: { title: '首页' } },
  { path: '/area', name: 'Area', component: () => import('../pages/Area.vue'), meta: { title: '区域' } },
  { path: '/orders', name: 'OrderList', component: () => import('../pages/OrderList.vue'), meta: { title: '订单' } },
  { path: '/station/:id', name: 'StationDetail', component: () => import('../pages/StationDetail.vue'), meta: { title: '场站详情' } },
]

const router = createRouter({ history: createWebHashHistory(), routes })
router.beforeEach((to) => { document.title = to.meta.title || '充电订单分析' })
export default router
