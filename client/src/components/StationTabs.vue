<template>
  <div class="station-container">
    <div class="station-title">各场站统计</div>
    <van-tabs v-model:active="activeTab" type="card" color="#1989fa">
      <van-tab v-for="item in data" :key="item.station_name" :title="item.station_name || '未知'">
        <div class="station-detail">
          <div class="detail-row">
            <span class="detail-label">订单数</span>
            <span class="detail-value">{{ (item.count || 0).toLocaleString() }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">金额</span>
            <span class="detail-value detail-amount">¥{{ (item.amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
          </div>
        </div>
      </van-tab>
    </van-tabs>
    <div v-if="!hasData" class="station-empty">暂无场站数据</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
})

const activeTab = ref(0)
const hasData = computed(() => props.data && props.data.length > 0)
</script>

<style scoped>
.station-container {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.station-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #323233;
}
.station-detail {
  padding: 16px 0;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 8px;
  border-bottom: 1px solid #f5f5f5;
}
.detail-row:last-child {
  border-bottom: none;
}
.detail-label {
  font-size: 14px;
  color: #7d7e80;
}
.detail-value {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}
.detail-amount {
  color: #ee0a24;
}
.station-empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
  font-size: 14px;
}
</style>
