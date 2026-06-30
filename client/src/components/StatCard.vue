<template>
  <div class="stat-card" :style="{ background: bgColor }">
    <div class="stat-icon">{{ icon }}</div>
    <div class="stat-info">
      <div class="stat-label">{{ label }}</div>
      <div class="stat-value">{{ displayValue }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: { type: String, default: '📊' },
  label: { type: String, default: '' },
  value: { type: [Number, String], default: 0 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  bgColor: { type: String, default: 'linear-gradient(135deg, #667eea, #764ba2)' },
})

const displayValue = computed(() => {
  const v = props.value
  if (typeof v === 'number') {
    if (props.prefix === '¥') {
      return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return `${props.prefix}${v.toLocaleString('zh-CN')}${props.suffix}`
  }
  return `${props.prefix}${v}${props.suffix}`
})
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  color: #fff;
  min-height: 80px;
}

.stat-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 12px;
  opacity: 0.85;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
