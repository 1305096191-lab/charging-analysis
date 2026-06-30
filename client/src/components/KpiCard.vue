<template>
  <div class="kpi-card" :style="{ borderLeftColor: color }">
    <div class="kpi-label">{{ label }}</div>
    <div class="kpi-value" :style="{ color }">{{ displayValue }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: Number, default: 0 },
  unit: { type: String, default: '' },
  color: { type: String, default: '#4DB6AC' },
})

function fmtNum(n) {
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(2) + '万'
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

function fmtMoney(n) {
  if (Math.abs(n) >= 100000000) return (n / 100000000).toFixed(2) + '亿'
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(2) + '万'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const displayValue = computed(() => {
  const v = props.value || 0
  if (props.unit === 'kWh') return fmtNum(v) + ' kWh'
  if (props.unit === '元') return '¥' + fmtMoney(v)
  if (props.unit === '%') return (v * 100).toFixed(1) + '%'
  if (props.unit === '个') return v.toLocaleString('zh-CN')
  return fmtNum(v) + (props.unit ? ' ' + props.unit : '')
})
</script>

<style scoped>
.kpi-card {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 14px 16px;
  border-left: 4px solid;
}
.kpi-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.kpi-value { font-size: 20px; font-weight: 700; }
</style>
