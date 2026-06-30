<template>
  <div class="order-card">
    <div class="order-head">
      <span class="order-station">{{ order.station_name || '--' }}</span>
      <van-tag :type="statusType" size="small" round>{{ order.status || '未知' }}</van-tag>
    </div>
    <div class="order-body">
      <div class="order-metric">
        <span class="om-label">电量</span>
        <span class="om-value">{{ fmtNum(order.energy || 0) }} kWh</span>
      </div>
      <div class="order-metric">
        <span class="om-label">电费</span>
        <span class="om-value">¥{{ fmtMoney(order.elec_fee || 0) }}</span>
      </div>
      <div class="order-metric">
        <span class="om-label">服务费</span>
        <span class="om-value">¥{{ fmtMoney(order.service_fee || 0) }}</span>
      </div>
      <div class="order-metric">
        <span class="om-label">应收</span>
        <span class="om-value" style="color:#BA9FE8">¥{{ fmtMoney(order.receivable || 0) }}</span>
      </div>
    </div>
    <div class="order-foot">
      <span v-if="order.operator" class="order-operator">{{ order.operator }}</span>
      <span class="order-id">#{{ order.order_id || '--' }}</span>
      <span v-if="order.created_time" class="order-time">{{ order.created_time }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ order: { type: Object, default: () => ({}) } })

const statusType = computed(() => {
  const s = (props.order.status || '').toLowerCase()
  if (s.includes('完成') || s.includes('成功') || s === 'completed') return 'success'
  if (s.includes('进行') || s.includes('充电') || s === 'pending') return 'warning'
  if (s.includes('失败') || s.includes('取消')) return 'danger'
  return 'primary'
})

function fmtNum(n) { return n >= 10000 ? (n / 10000).toFixed(2) + '万' : n.toLocaleString('zh-CN') }
function fmtMoney(n) { return n >= 10000 ? (n / 10000).toFixed(2) + '万' : n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
</script>

<style scoped>
.order-card {
  background: #fff; border-radius: 8px; padding: 12px; margin-bottom: 8px;
}
.order-head {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
}
.order-station { font-size: 14px; font-weight: 600; color: #2C3E50; }
.order-body { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
.order-metric { display: flex; justify-content: space-between; font-size: 12px; }
.om-label { color: #7C9A92; }
.om-value { color: #2C3E50; font-weight: 500; }
.order-foot { display: flex; justify-content: space-between; font-size: 11px; color: #A8C4BC; }
.order-operator { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
