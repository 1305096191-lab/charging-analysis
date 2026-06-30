<template>
  <div class="dashboard">
    <div class="nav-bar"><span class="nav-title">充换电数据运营看板</span></div>

    <!-- 运营大屏 -->
    <BigScreen />

    <!-- 充电站排名 -->
    <StationRank />

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="fb-item" :class="{ on: fStation }" @click="toggleFilter('station')">
        <span class="fb-label">{{ fStation || '全部电站' }}</span>
        <span class="fb-arrow">▾</span>
      </div>
      <div class="fb-item" :class="{ on: fOperator }" @click="toggleFilter('operator')">
        <span class="fb-label">{{ fOperator || '全部运营方' }}</span>
        <span class="fb-arrow">▾</span>
      </div>
      <div class="fb-item" :class="{ on: fStartDate || fEndDate }" @click="toggleFilter('date')">
        <span class="fb-label">{{ dateLabel || '全部时间' }}</span>
        <span class="fb-arrow">▾</span>
      </div>

      <!-- 下拉面板 -->
      <teleport to="body">
        <div v-if="openFilter" class="fb-overlay" @click="openFilter=null"></div>
        <div v-if="openFilter" class="fb-panel">
          <div class="fb-panel-hd">
            <span>{{ panelTitle }}</span>
            <span class="fb-close" @click="openFilter=null">✕</span>
          </div>
          <div class="fb-panel-bd">
            <template v-if="openFilter==='station'">
              <div class="fb-chip" :class="{ sel: !fStation }" @click="fStation='';openFilter=null;doFilter()">全部电站</div>
              <div v-for="s in filterOptions.stations" :key="s" class="fb-chip" :class="{ sel: fStation===s }" @click="fStation=s;openFilter=null;doFilter()">{{ s }}</div>
            </template>
            <template v-if="openFilter==='operator'">
              <div class="fb-chip" :class="{ sel: !fOperator }" @click="fOperator='';openFilter=null;doFilter()">全部运营方</div>
              <div v-for="o in filterOptions.operators" :key="o" class="fb-chip" :class="{ sel: fOperator===o }" @click="fOperator=o;openFilter=null;doFilter()">{{ o }}</div>
            </template>
            <template v-if="openFilter==='date'">
              <div class="fb-date-row">
                <input type="date" v-model="fStartDate" class="fb-date">
                <span>至</span>
                <input type="date" v-model="fEndDate" class="fb-date">
              </div>
              <div class="fb-confirm" @click="openFilter=null;doFilter()">确定</div>
            </template>
          </div>
        </div>
      </teleport>
    </div>

    <div class="content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <!-- KPI 卡片 -->
        <div class="kpi-grid">
          <KpiCard label="总电量" :value="summary.total_energy || 0" unit="kWh" color="#4DB6AC" />
          <KpiCard label="总电费" :value="summary.total_elec_fee || 0" unit="元" color="#5EC09E" />
          <KpiCard label="总服务费" :value="summary.total_service_fee || 0" unit="元" color="#F5B86E" />
          <KpiCard label="应收金额" :value="summary.total_receivable || 0" unit="元" color="#BA9FE8" />
        </div>

        <!-- 图表 -->
        <ChartSection
          :monthly-trend="recentMonths"
          :by-station="stats?.byStation || []"
          :by-operator="stats?.byOperator || []"
        />

        <div v-if="!stats && !statsLoading" class="empty-state">
          <van-empty description="暂无数据" />
        </div>
      </van-pull-refresh>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useOrderStore } from '../stores/order'
import KpiCard from '../components/KpiCard.vue'
import BigScreen from '../components/BigScreen.vue'
import StationRank from '../components/StationRank.vue'
import ChartSection from '../components/ChartSection.vue'

const orderStore = useOrderStore()
const { stats, statsLoading, filterMeta } = storeToRefs(orderStore)

const refreshing = ref(false)
const fStation = ref(''), fOperator = ref(''), fStartDate = ref(''), fEndDate = ref('')
const openFilter = ref(null) // 'station'|'operator'|'date'
const filterOptions = reactive({ stations:[], operators:[] })

function toggleFilter(k) { openFilter.value = openFilter.value===k ? null : k }
const panelTitle = computed(() => openFilter.value==='station'?'选择电站':openFilter.value==='operator'?'选择运营方':'选择时间')
const dateLabel = computed(() => {
  if (fStartDate.value && fEndDate.value) return fStartDate.value + '~' + fEndDate.value
  if (fStartDate.value) return fStartDate.value + '起'
  if (fEndDate.value) return '至' + fEndDate.value
  return ''
})

const summary = computed(() => stats.value?.summary || {})

const avgPrice = computed(() => {
  const e = summary.value.total_energy || 0
  const ef = summary.value.total_elec_fee || 0
  return e ? '¥' + (ef / e).toFixed(2) + '/kWh' : '--'
})

const recentMonths = computed(() => (stats.value?.monthlyTrend || []).slice(-6))

async function loadData() {
  await orderStore.fetchStats({
    station: fStation.value, operator: fOperator.value,
    startDate: fStartDate.value, endDate: fEndDate.value,
  })
  // 更新筛选器选项
  if (stats.value?.filterMeta) {
    filterOptions.stations = stats.value.filterMeta.stations || []
    filterOptions.operators = stats.value.filterMeta.operators || []
  }
}

function doFilter() { loadData() }
function onRefresh() { refreshing.value = true; loadData().finally(() => { refreshing.value = false }) }

let interval
onMounted(() => { loadData(); interval = setInterval(loadData, 5 * 60 * 1000) })
onBeforeUnmount(() => clearInterval(interval))
</script>

<style scoped>
.dashboard { min-height: 100vh; background: var(--page-bg); }
.nav-bar {
  position: sticky; top: 0; z-index: 10;
  display: flex; justify-content: center; align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #4DB6AC, #3A9E95);
  color: #fff;
}
.nav-title { font-size: 16px; font-weight: 700; }
.content { padding: 10px; }
.kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.overview-bar {
  display: flex; justify-content: space-evenly;
  background: var(--card-bg); border-radius: var(--radius);
  padding: 12px 0; margin-bottom: 10px;
}
.overview-item { flex: 1; text-align: center; }
.ov-label { font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 2px; }
.ov-value { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.empty-state { padding: 60px 0; }

/* 筛选栏 */
.filter-bar { display: flex; gap: 8px; padding: 10px 14px; }
.fb-item { flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; background: #f5f7f8; border-radius: 8px; font-size: 13px; color: #666; cursor: pointer; }
.fb-item.on { background: #E8F6F3; color: #4DB6AC; font-weight: 500; }
.fb-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fb-arrow { font-size: 10px; margin-left: 4px; }

/* 面板 */
.fb-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.2); }
.fb-panel { position: fixed; bottom: 0; left: 0; right: 0; z-index: 1001; background: #fff; border-radius: 16px 16px 0 0; max-height: 50vh; display: flex; flex-direction: column; }
.fb-panel-hd { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600; }
.fb-close { font-size: 20px; color: #aaa; cursor: pointer; }
.fb-panel-bd { padding: 14px; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 8px; }
.fb-chip { padding: 8px 16px; border-radius: 20px; font-size: 13px; background: #f5f5f5; color: #555; cursor: pointer; }
.fb-chip.sel { background: #4DB6AC; color: #fff; }
.fb-date-row { width: 100%; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.fb-date { flex: 1; padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13px; }
.fb-confirm { width: 100%; text-align: center; padding: 12px; background: #4DB6AC; color: #fff; border-radius: 24px; font-size: 15px; cursor: pointer; }
</style>
