<template>
  <div class="chart-section">
    <div class="chart-tabs">
      <div v-for="t in tabs" :key="t.key" class="chart-tab" :class="{ active: activeTab === t.key }" @click="switchTab(t.key)">{{ t.label }}</div>
    </div>
    <div v-if="activeTab === 'trend'" class="metric-chips">
      <div class="m-chip" :class="{ active: showEnergy }" @click="toggleMetric('energy')">电量</div>
      <div class="m-chip" :class="{ active: showElecFee }" @click="toggleMetric('elecFee')">电费</div>
      <div class="m-chip" :class="{ active: showServFee }" @click="toggleMetric('servFee')">服务费</div>
      <div class="m-chip" :class="{ active: showAR }" @click="toggleMetric('ar')">应收</div>
    </div>
    <div class="chart-container">
      <canvas ref="chartCanvas"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import Chart from 'chart.js/auto'

const props = defineProps({
  monthlyTrend: { type: Array, default: () => [] },
  byStation: { type: Array, default: () => [] },
  byOperator: { type: Array, default: () => [] },
})

const chartCanvas = ref(null)
const activeTab = ref('trend')
const showEnergy = ref(true)
const showElecFee = ref(true)
const showServFee = ref(true)
const showAR = ref(true)

const tabs = [
  { key: 'trend', label: '月度趋势' },
  { key: 'station', label: '电站对比' },
  { key: 'operator', label: '运营方排名' },
]

let chart = null
let lastDataKey = ''

function getDataKey() {
  return JSON.stringify({ t: activeTab.value, e: showEnergy.value, ef: showElecFee.value, sf: showServFee.value, ar: showAR.value, mt: props.monthlyTrend, bs: props.byStation, bo: props.byOperator })
}

function destroyChart() { if (chart) { chart.destroy(); chart = null } }

function renderChart() {
  const key = getDataKey()
  if (key === lastDataKey) return // 数据未变，跳过
  lastDataKey = key

  if (!chartCanvas.value) return
  destroyChart()
  const ctx = chartCanvas.value.getContext('2d')

  if (activeTab.value === 'trend') drawTrend(ctx)
  else if (activeTab.value === 'station') drawStation(ctx)
  else drawOperator(ctx)
}

function drawTrend(ctx) {
  const data = props.monthlyTrend || []
  if (!data.length) return
  const labels = data.map(d => d.month)
  const ds = []
  if (showEnergy.value) ds.push({ label:'电量(kWh)', data: data.map(d=>d.energy||0), borderColor:'#4DB6AC', backgroundColor:'rgba(77,182,172,0.06)', fill:true, tension:0.3, yAxisID:'y' })
  if (showElecFee.value) ds.push({ label:'电费(元)', data: data.map(d=>d.elec_fee||0), borderColor:'#64B5F6', backgroundColor:'rgba(100,181,246,0.04)', fill:true, tension:0.3, yAxisID:'y1' })
  if (showServFee.value) ds.push({ label:'服务费(元)', data: data.map(d=>d.service_fee||0), borderColor:'#F5B86E', backgroundColor:'rgba(245,184,110,0.04)', fill:true, tension:0.3, yAxisID:'y1' })
  if (showAR.value) ds.push({ label:'应收(元)', data: data.map(d=>d.receivable||0), borderColor:'#BA9FE8', borderDash:[6,3], tension:0.3, yAxisID:'y1' })
  if (!ds.length) return
  chart = new Chart(ctx, {
    type:'line', data:{labels,datasets:ds},
    options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false},
      plugins:{ legend:{ position:'bottom', labels:{ boxWidth:12, padding:16, font:{size:11} } } },
      scales:{ y:{ type:'linear', position:'left', title:{ display:true, text:'kWh', font:{size:10} }, ticks:{font:{size:10}} },
        y1:{ type:'linear', position:'right', title:{ display:true, text:'元', font:{size:10} }, grid:{ drawOnChartArea:false }, ticks:{font:{size:10}} },
        x:{ ticks:{ font:{size:10}, maxRotation:45 } } }
    }
  })
}

function drawStation(ctx) {
  const data = (props.byStation || []).slice(0, 10)
  if (!data.length) return
  const names = data.map(s=>(s.station_name||'').replace('福建厦门','').replace('1号','').slice(0,8))
  chart = new Chart(ctx, {
    type:'bar', data:{ labels:names, datasets:[
      { label:'电费', data:data.map(s=>s.elec_fee||0), backgroundColor:'#4DB6AC', borderRadius:4 },
      { label:'服务费', data:data.map(s=>s.service_fee||0), backgroundColor:'#F5B86E', borderRadius:4 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ boxWidth:12, font:{size:11} } } },
      scales:{ x:{ stacked:true, ticks:{font:{size:9},maxRotation:45} }, y:{ stacked:true, ticks:{font:{size:10}} } } }
  })
}

function drawOperator(ctx) {
  const data = (props.byOperator || []).slice(0, 15).reverse()
  if (!data.length) return
  const names = data.map(o=>(o.operator||'未知').slice(0,10))
  const colors = data.map((_,i)=>`rgba(139,92,246,${1-i*0.05})`)
  chart = new Chart(ctx, {
    type:'bar', data:{ labels:names, datasets:[{ label:'应收(元)', data:data.map(o=>o.receivable||0), backgroundColor:colors, borderRadius:4 }] },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
      scales:{ x:{ ticks:{font:{size:10}} }, y:{ ticks:{font:{size:10}} } } }
  })
}

function switchTab(key) { activeTab.value = key; nextTick(renderChart) }
function toggleMetric(k) {
  if (k==='energy') showEnergy.value=!showEnergy.value
  if (k==='elecFee') showElecFee.value=!showElecFee.value
  if (k==='servFee') showServFee.value=!showServFee.value
  if (k==='ar') showAR.value=!showAR.value
  nextTick(renderChart)
}

onMounted(() => { nextTick(renderChart) })
onBeforeUnmount(destroyChart)
</script>

<style scoped>
.chart-section { background:var(--card-bg); border-radius:var(--radius); padding:14px; margin-bottom:10px; }
.chart-tabs { display:flex; justify-content:space-evenly; margin-bottom:10px; border-bottom:2px solid var(--divider); }
.chart-tab { flex:1; text-align:center; padding:8px 4px; font-size:13px; cursor:pointer; color:var(--text-secondary); border-bottom:2px solid transparent; margin-bottom:-2px; }
.chart-tab.active { color:var(--primary); border-bottom-color:var(--primary); font-weight:600; }
.metric-chips { display:flex; justify-content:space-evenly; margin-bottom:10px; }
.m-chip { flex:1; text-align:center; padding:4px 8px; border-radius:14px; font-size:12px; background:var(--primary-light); cursor:pointer; margin:0 2px; }
.m-chip.active { background:var(--primary); color:#fff; }
.chart-container { position:relative; height:260px; }
.chart-container canvas { width:100%!important; }
</style>
