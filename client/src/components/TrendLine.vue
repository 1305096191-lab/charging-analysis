<template>
  <div class="trend-container">
    <div class="trend-title">近7日订单趋势</div>
    <div ref="chartRef" class="trend-chart"></div>
    <div v-if="!hasData" class="trend-empty">暂无数据</div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: { type: Array, default: () => [] },
})

const chartRef = ref(null)
let chart = null
const hasData = computed(() => props.data && props.data.length > 0)

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  updateChart()
}

function updateChart() {
  if (!chart || !hasData.value) return

  const dates = props.data.map((d) => d.date || '')
  const counts = props.data.map((d) => d.count || 0)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => `${params[0].axisValue}<br/>订单数: ${params[0].value}`,
    },
    grid: { left: 12, right: 12, top: 16, bottom: 24 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { fontSize: 11, rotate: dates.length > 5 ? 30 : 0 },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: 'line',
        data: counts,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#1989fa', width: 2.5 },
        itemStyle: { color: '#1989fa' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(25,137,250,0.3)' },
            { offset: 1, color: 'rgba(25,137,250,0.02)' },
          ]),
        },
      },
    ],
  })
}

watch(() => props.data, updateChart, { deep: true })

onMounted(() => {
  setTimeout(initChart, 100)
})

onBeforeUnmount(() => {
  chart?.dispose()
})
</script>

<style scoped>
.trend-container {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.trend-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #323233;
}
.trend-chart {
  width: 100%;
  height: 220px;
}
.trend-empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
  font-size: 14px;
}
</style>
