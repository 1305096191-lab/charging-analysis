<template>
  <div class="pie-container">
    <div class="pie-title">订单状态分布</div>
    <div ref="chartRef" class="pie-chart"></div>
    <div v-if="!hasData" class="pie-empty">暂无数据</div>
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

  const names = props.data.map((d) => d.status || '未知')
  const values = props.data.map((d) => d.count || 0)

  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
        },
        data: names.map((name, i) => ({ name, value: values[i] })),
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
.pie-container {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.pie-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #323233;
}
.pie-chart {
  width: 100%;
  height: 220px;
}
.pie-empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
  font-size: 14px;
}
</style>
