<template>
  <div class="rank-wrap">
    <div class="rank-header">
      <span class="rank-title">充电站排名</span>
      <div class="rank-tabs">
        <span :class="{ active: period==='today' }" @click="switchP('today')">今日</span>
        <span :class="{ active: period==='7days' }" @click="switchP('7days')">近七日</span>
        <span :class="{ active: period==='month' }" @click="switchP('month')">本月</span>
      </div>
    </div>
    <div class="rank-table">
      <div class="rt-row rt-head">
        <span class="rt-col rt-rank">#</span><span class="rt-col rt-name">电站名称</span>
        <span class="rt-col rt-num">充电车辆</span><span class="rt-col rt-num">充电次数</span><span class="rt-col rt-num">充电量</span>
      </div>
      <div v-for="(s,i) in data?.chargeRank||[]" :key="s.name" class="rt-row" :class="{ top3:i<3 }">
        <span class="rt-col rt-rank" :class="'r'+i">{{ i+1 }}</span>
        <span class="rt-col rt-name">{{ s.name }}</span>
        <span class="rt-col rt-num">{{ s.vehicles||0 }}</span>
        <span class="rt-col rt-num">{{ (s.sessions||0).toLocaleString() }}</span>
        <span class="rt-col rt-num">{{ fmtNum(s.kwh||0) }}kWh</span>
      </div>
    </div>

    <!-- 换电站排名 -->
    <div class="rank-header" style="margin-top:18px">
      <span class="rank-title">换电站排名</span>
    </div>
    <div class="rank-table">
      <div class="rt-row rt-head">
        <span class="rt-col rt-rank">#</span><span class="rt-col rt-name">电站名称</span>
        <span class="rt-col rt-num">类型</span><span class="rt-col rt-num">换电次数</span><span class="rt-col rt-num">订单电量</span>
      </div>
      <div v-for="(s,i) in data?.swapRank||[]" :key="s.name" class="rt-row" :class="{ top3:i<3 }">
        <span class="rt-col rt-rank" :class="'r'+i">{{ i+1 }}</span>
        <span class="rt-col rt-name">{{ s.name }}</span>
        <span class="rt-col rt-num">{{ s.type }}</span>
        <span class="rt-col rt-num">{{ (s.sessions||0).toLocaleString() }}</span>
        <span class="rt-col rt-num">{{ fmtNum(s.kwh||0) }}kWh</span>
      </div>
      <div v-if="!data?.swapRank?.length" class="rt-empty">暂无换电数据</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const data = ref(null)
const period = ref('today')

function fmtNum(n) { return n>=10000?(n/10000).toFixed(1)+'万':n.toLocaleString('zh-CN',{maximumFractionDigits:0}) }

async function load() {
  try {
    const r = await axios.get('/api/dashboard/ranking', { params: { period: period.value } })
    if (r.data?.code===0) data.value = r.data.data
  } catch (_) {}
}
function switchP(p) { period.value=p; load() }

onMounted(load)
</script>

<style scoped>
.rank-wrap { background: #fff; border-radius: 10px; margin: 10px 0; padding: 14px; }
.rank-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.rank-title { font-size: 14px; font-weight: 600; color: #333; }
.rank-tabs { display: flex; gap: 4px; }
.rank-tabs span { padding: 3px 10px; font-size: 11px; border-radius: 4px; color: #999; cursor: pointer; background: #f5f5f5; user-select: none; }
.rank-tabs span.active { background: var(--primary); color: #fff; }

.rt-row { display: flex; align-items: center; padding: 7px 0; border-bottom: 1px solid #f5f5f5; }
.rt-head { color: #999; font-size: 11px; padding: 5px 0; }
.rt-col { text-align: center; font-size: 12px; }
.rt-rank { width: 24px; color: #999; }
.r0,.r1,.r2 { font-weight: 700; color: #FF9800; }
.rt-name { flex: 1; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rt-num { width: 58px; }
.top3 { background: #FAFAFA; }
.rt-empty { text-align: center; color: #ccc; padding: 16px 0; font-size: 13px; }
</style>
