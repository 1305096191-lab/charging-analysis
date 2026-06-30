<template>
  <div class="big-screen">
    <div class="bs-top-row">
      <span class="bs-title">{{ title }}</span>
      <div class="bs-tabs">
        <span class="bs-tab" :class="{ active: period === 'today' }" @click="switchPeriod('today')">今日</span>
        <span class="bs-tab" :class="{ active: period === 'month' }" @click="switchPeriod('month')">本月累计</span>
        <span class="bs-tab" :class="{ active: period === 'year' }" @click="switchPeriod('year')">本年累计</span>
      </div>
    </div>

    <!-- 第一行 -->
    <div class="bs-kpi-row">
      <div class="bs-kpi">
        <div class="bs-kpi-label">充电量</div>
        <div class="bs-kpi-val">{{ fmtNum(data?.summary?.kwh || 0) }}<span class="unit"> kWh</span></div>
      </div>
      <div class="bs-kpi">
        <div class="bs-kpi-label">充电次数</div>
        <div class="bs-kpi-val">{{ (data?.summary?.charge_sessions || 0).toLocaleString() }}<span class="unit"> 次</span></div>
      </div>
      <div class="bs-kpi">
        <div class="bs-kpi-label">换电次数</div>
        <div class="bs-kpi-val">{{ (data?.summary?.swap_sessions || 0).toLocaleString() }}<span class="unit"> 次</span></div>
      </div>
      <div class="bs-kpi">
        <div class="bs-kpi-label">充电车辆</div>
        <div class="bs-kpi-val">{{ (data?.summary?.charge_vehicles || 0).toLocaleString() }}<span class="unit"> 辆</span></div>
      </div>
    </div>
    <!-- 第二行: 横向卡片 -->
    <div class="bs-amount-row">
      <div class="bs-amount-item">
        <span class="bs-amount-label">营业金额</span>
        <span class="bs-amount-val">¥{{ fmtMoney(data?.summary?.revenue || 0) }}</span>
      </div>
      <div class="bs-amount-divider"></div>
      <div class="bs-amount-item">
        <span class="bs-amount-label">服务费收入</span>
        <span class="bs-amount-val">¥{{ fmtMoney(data?.summary?.service_fee || 0) }}</span>
      </div>
      <div class="bs-amount-divider"></div>
      <div class="bs-amount-item">
        <span class="bs-amount-label">电费收入</span>
        <span class="bs-amount-val">¥{{ fmtMoney(data?.summary?.elec_fee || 0) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'

const data = ref(null)
const period = ref('today')
let timer = null

const title = computed(() => {
  if (period.value === 'month') return '本月运营数据'
  if (period.value === 'year') return '本年累计运营数据'
  return '今日运营数据'
})

function fmtNum(n) { return n >= 10000 ? (n/10000).toFixed(2)+'万' : n.toLocaleString('zh-CN',{maximumFractionDigits:0}) }
function fmtMoney(n) { return n >= 10000 ? (n/10000).toFixed(2)+'万' : n.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}) }

async function fetchData() {
  try {
    const r = await axios.get('/api/dashboard/overview', { params: { period: period.value } })
    if (r.data?.code === 0) data.value = r.data.data
  } catch (_) {}
}

function switchPeriod(p) { period.value = p; fetchData() }

onMounted(() => { fetchData(); timer = setInterval(fetchData, 10000) })
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.big-screen {
  margin: 0 0 10px 0; background: #fff;
  border-radius: 0 0 12px 12px; padding: 14px 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.bs-top-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0;
}
.bs-title { font-size: 15px; font-weight: 600; color: #333; }
.bs-tabs { display: flex; gap: 2px; background: #f5f5f5; border-radius: 6px; padding: 2px; }
.bs-tab { padding: 5px 14px; font-size: 12px; cursor: pointer; border-radius: 4px; color: #999; user-select: none; }
.bs-tab.active { background: #fff; color: #333; font-weight: 500; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

.bs-kpi-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; }
.bs-kpi { text-align: center; }
.bs-kpi-label { font-size: 11px; color: #999; margin-bottom: 6px; }
.bs-kpi-val { font-size: 19px; font-weight: 700; color: #222; }
.bs-kpi-val .unit { font-size: 11px; font-weight: 400; color: #aaa; }

/* 金额行 */
.bs-amount-row {
  display: flex; align-items: center; justify-content: space-evenly;
  margin-top: 14px; padding: 12px 0;
  background: #f9fafb; border-radius: 8px;
}
.bs-amount-item { text-align: center; flex: 1; }
.bs-amount-label { display: block; font-size: 11px; color: #999; margin-bottom: 4px; }
.bs-amount-val { font-size: 16px; font-weight: 600; color: #333; }
.bs-amount-divider { width: 1px; height: 30px; background: #e8e8e8; }
</style>
