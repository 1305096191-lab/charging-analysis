<template>
  <div class="detail-page">
    <div class="sd-header">
      <span class="sd-back" @click="$router.back()">‹</span>
      <span class="sd-title">{{ station?.name || '场站详情' }}</span>
    </div>

    <div v-if="station" class="sd-content">
      <!-- 今日数据 -->
      <div class="sd-section">
        <div class="sd-section-title">今日运营数据</div>
        <div class="sd-today-grid" :class="{ 'cols-2': !hasSwap }">
          <div class="sd-today-item">
            <div class="sti-val">{{ station.today?.orders || 0 }}</div>
            <div class="sti-label">订单数</div>
          </div>
          <div class="sd-today-item">
            <div class="sti-val">{{ fmtNum(station.today?.chargeKwh || 0) }}<small> kWh</small></div>
            <div class="sti-label">充电量</div>
          </div>
          <div class="sd-today-item" v-if="hasSwap">
            <div class="sti-val">{{ fmtNum(station.today?.swapKwh || 0) }}<small> kWh</small></div>
            <div class="sti-label">换电量</div>
          </div>
        </div>
      </div>

      <!-- 累计数据 -->
      <div class="sd-section">
        <div class="sd-section-title">累计运营数据</div>
        <div class="sd-total-grid">
          <div class="sd-total-item">
            <span class="sti-label">累计订单</span>
            <span class="sti-val-sm">{{ (station.total?.orders || 0).toLocaleString() }} 单</span>
          </div>
          <div class="sd-total-item">
            <span class="sti-label">订单总电量</span>
            <span class="sti-val-sm">{{ fmtNum(station.total?.kwh || 0) }} kWh</span>
          </div>
          <div class="sd-total-item">
            <span class="sti-label">平均充电量</span>
            <span class="sti-val-sm">{{ station.total?.avgDuration || 0 }} kWh/单</span>
          </div>
          <div class="sd-total-item">
            <span class="sti-label">累计服务费收入</span>
            <span class="sti-val-sm">¥{{ fmtMoney(station.total?.serviceFee || 0) }}</span>
          </div>
        </div>
      </div>

      <!-- 图表 -->
      <div class="sd-section">
        <div class="sd-section-title">
          <span>运营分析</span>
          <div class="chart-tabs">
            <span :class="{ active: chartDays === 7 }" @click="switchChart(7)">近7日</span>
            <span :class="{ active: chartDays === 30 }" @click="switchChart(30)">近30日</span>
          </div>
        </div>
        <div class="sd-chart-container">
          <canvas ref="chartCanvas"></canvas>
        </div>
      </div>

      <!-- 地址 -->
      <div class="sd-addr">📍 {{ station.address }}</div>
    </div>

    <van-loading v-else class="sd-loading" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import Chart from 'chart.js/auto'

const route = useRoute()
const station = ref(null)
const chartDays = ref(7)
const hasSwap = computed(() => (station.value?.today?.swapKwh || 0) > 0 || station.value?.type?.includes('换电'))
const chartCanvas = ref(null)
let chart = null

function fmtNum(n) { return n >= 10000 ? (n/10000).toFixed(2)+'万' : n.toLocaleString('zh-CN',{maximumFractionDigits:0}) }
function fmtMoney(n) { return n >= 10000 ? (n/10000).toFixed(2)+'万' : n.toLocaleString('zh-CN',{minimumFractionDigits:0}) }

async function loadDetail() {
  try {
    const r = await axios.get('/api/stations/' + route.params.id)
    if (r.data?.code === 0) station.value = r.data.data
  } catch (_) {}
}

async function loadChart() {
  try {
    const r = await axios.get(`/api/stations/${route.params.id}/chart?days=${chartDays.value}`)
    if (r.data?.code === 0) renderChart(r.data.data.chart)
  } catch (_) {}
}

function renderChart(data) {
  if (!chartCanvas.value) return
  if (chart) chart.destroy()
  const ctx = chartCanvas.value.getContext('2d')

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.date),
      datasets: [
        { label: '订单数', data: data.map(d => d.orders), backgroundColor: '#4DB6AC', borderRadius: 4, order: 2, yAxisID: 'y' },
        { label: '电量(kWh)', data: data.map(d => d.kwh), borderColor: '#F5B86E', backgroundColor: 'rgba(245,184,110,0.1)', borderWidth: 2, type: 'line', tension: 0.3, fill: true, order: 1, yAxisID: 'y1' },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } } },
      scales: {
        y: { type: 'linear', position: 'left', title: { display: true, text: '订单数', font: { size: 10 } }, ticks: { font: { size: 10 } } },
        y1: { type: 'linear', position: 'right', title: { display: true, text: 'kWh', font: { size: 10 } }, grid: { drawOnChartArea: false }, ticks: { font: { size: 10 } } },
        x: { ticks: { font: { size: 10 }, maxRotation: 45 } },
      },
    },
  })
}

function switchChart(d) { chartDays.value = d; loadChart() }

onMounted(async () => { await loadDetail(); await loadChart() })
onBeforeUnmount(() => { if (chart) chart.destroy() })
</script>

<style scoped>
.detail-page { min-height: 100vh; background: var(--page-bg); padding-bottom: 30px; }
.sd-header {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; background: #fff;
  border-bottom: 1px solid #f0f0f0;
}
.sd-back { font-size: 28px; color: #666; cursor: pointer; line-height: 1; }
.sd-title { font-size: 16px; font-weight: 600; color: #333; }

.sd-content { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.sd-section { background: #fff; border-radius: 10px; padding: 14px; }
.sd-section-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }

/* 今日 */
.sd-today-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px,1fr)); gap: 10px; }
.sd-today-grid.cols-2 { grid-template-columns: 1fr 1fr; }
.sd-today-item { text-align: center; }
.sti-val { font-size: 20px; font-weight: 700; color: #222; }
.sti-val small { font-size: 11px; font-weight: 400; color: #999; }
.sti-label { font-size: 11px; color: #999; margin-top: 2px; }
.sti-val-sm { font-size: 15px; font-weight: 600; color: #333; }

/* 累计 */
.sd-total-grid { display: flex; flex-direction: column; gap: 8px; }
.sd-total-item { display: flex; justify-content: space-between; font-size: 13px; }

/* 图表 */
.chart-tabs { display: flex; gap: 4px; }
.chart-tabs span { padding: 3px 10px; font-size: 12px; border-radius: 4px; color: #999; cursor: pointer; background: #f5f5f5; }
.chart-tabs span.active { background: var(--primary); color: #fff; }
.sd-chart-container { height: 260px; position: relative; }

.sd-addr { font-size: 12px; color: #999; text-align: center; }
.sd-loading { display: flex; justify-content: center; padding: 60px 0; }
</style>
