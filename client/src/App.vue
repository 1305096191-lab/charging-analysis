<template>
  <div id="app-container">
    <router-view />
    <van-tabbar v-model="activeTab" route :fixed="true" active-color="#4DB6AC" inactive-color="#7C9A92">
      <van-tabbar-item icon="home-o" to="/" replace>首页</van-tabbar-item>
      <van-tabbar-item icon="location-o" to="/area" replace>区域</van-tabbar-item>
      <van-tabbar-item icon="records-o" to="/orders" replace>订单</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const activeTab = computed(() => route.path === '/orders' ? 1 : 0)
</script>

<style>
:root {
  --primary: #4DB6AC;
  --primary-light: #E8F6F3;
  --primary-dark: #3A9E95;
  --page-bg: #F5FAF8;
  --card-bg: #FFFFFF;
  --text-primary: #2C3E50;
  --text-secondary: #7C9A92;
  --text-muted: #A8C4BC;
  --divider: #E8F0ED;
  --kwh: #4DB6AC;
  --elec: #5EC09E;
  --serv: #F5B86E;
  --ar: #BA9FE8;
  --paid: #6CB4EE;
  --due: #F4947C;
  --radius: 8px;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; font-size: 14px; }
#app-container { min-height: 100vh; background: var(--page-bg); padding-bottom: 50px; }
@media (min-width: 768px) {
  #app-container { max-width: 480px; margin: 0 auto; box-shadow: 0 0 30px rgba(0,0,0,0.06); min-height: 100vh; }
}
</style>
