<template>
  <div class="order-page">
    <div class="nav-bar"><span class="nav-title">订单列表</span></div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <select v-model="fStation" @change="search" class="sel">
        <option value="">全部场站</option>
        <option v-for="s in filterOptions.stations" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="fOperator" @change="search" class="sel">
        <option value="">全部运营方</option>
        <option v-for="o in filterOptions.operators" :key="o" :value="o">{{ o.length>8?o.slice(0,8)+'…':o }}</option>
      </select>
      <input type="date" v-model="fStartDate" @change="search" class="sel" placeholder="开始日期">
      <input type="date" v-model="fEndDate" @change="search" class="sel" placeholder="结束日期">
      <select v-model="fStatus" @change="search" class="sel">
        <option value="">全部状态</option>
        <option v-for="s in filterOptions.statuses" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <!-- 汇总行 -->
    <div class="summary-bar">
      <div class="sb-item">总金额 <b>¥{{ fmtMoney(summary.total_amount||0) }}</b></div>
      <div class="sb-item">总电量 <b>{{ fmtNum(summary.total_energy||0) }}kWh</b></div>
      <div class="sb-item">充电 <b>{{ summary.charge_count||0 }}单</b></div>
      <div class="sb-item">换电 <b>{{ summary.swap_count||0 }}单</b></div>
    </div>

    <!-- 订单表格 -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>序号</th><th>场站</th><th>类型</th><th>电量</th><th>金额</th><th>退款</th><th>车牌</th><th>运营方</th><th>状态</th><th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(o,i) in list" :key="o.order_id">
            <td>{{ (page-1)*size + i + 1 }}</td>
            <td class="td-station">{{ o.station_abbr || o.station_name }}</td>
            <td><span class="tag" :class="o.order_type?.includes('换电')?'swap':'charge'">{{ o.order_type }}</span></td>
            <td>{{ o.energy||0 }}kWh</td>
            <td>¥{{ (o.amount||0).toFixed(0) }}</td>
            <td class="td-refund">{{ o.refund_amount>0?'¥'+(o.refund_amount).toFixed(0):'-' }}</td>
            <td>{{ o.plate_no||'-' }}</td>
            <td class="td-op">{{ o.operator?o.operator.slice(0,6):'-' }}</td>
            <td><span class="tag" :class="stClass(o.status)">{{ o.status }}</span></td>
            <td class="td-time">{{ (o.created_time||'').slice(5,16) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pager" v-if="totalPages > 1">
      <button :disabled="page<=1" @click="go(page-1)">上页</button>
      <span>{{ page }}/{{ totalPages }}</span>
      <button :disabled="page>=totalPages" @click="go(page+1)">下页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

const list = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const totalPages = ref(0)
const summary = ref({})
const filterOptions = reactive({ stations:[], operators:[], statuses:[] })

const fStation = ref(''), fOperator = ref(''), fStartDate = ref(''), fEndDate = ref(''), fStatus = ref('')

function fmtNum(n) { return n>=10000?(n/10000).toFixed(2)+'万':n.toLocaleString('zh-CN',{maximumFractionDigits:0}) }
function fmtMoney(n) { return n>=10000?(n/10000).toFixed(2)+'万':n.toLocaleString('zh-CN',{minimumFractionDigits:0}) }
function stClass(s) { return s?.includes('已支付')||s?.includes('完成')?'ok':s?.includes('待')?'warn':s?.includes('取消')?'fail':'' }

async function loadData() {
  try {
    const params = { page: page.value, size: size.value }
    if (fStation.value) params.station = fStation.value
    if (fOperator.value) params.operator = fOperator.value
    if (fStartDate.value) params.startDate = fStartDate.value
    if (fEndDate.value) params.endDate = fEndDate.value
    if (fStatus.value) params.status = fStatus.value
    const r = await axios.get('/api/orders', { params })
    if (r.data?.code === 0) {
      list.value = r.data.data.list || []
      total.value = r.data.data.total
      totalPages.value = r.data.data.totalPages
      summary.value = r.data.data.summary || {}
      if (!filterOptions.stations.length) {
        filterOptions.stations = r.data.data.filterOptions?.stations || []
        filterOptions.operators = r.data.data.filterOptions?.operators || []
        filterOptions.statuses = r.data.data.filterOptions?.statuses || []
      }
    }
  } catch (_) {}
}

function search() { page.value = 1; loadData() }
function go(p) { page.value = p; loadData() }

onMounted(loadData)
</script>

<style scoped>
.order-page { min-height: 100vh; background: var(--page-bg); padding-bottom: 60px; }
.nav-bar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: center; padding: 12px; background: linear-gradient(135deg,#4DB6AC,#3A9E95); color: #fff; }
.nav-title { font-size: 16px; font-weight: 700; }

/* 筛选 */
.filter-bar { display: flex; gap: 6px; padding: 12px 10px; background: #fff; flex-wrap: wrap; border-bottom: 1px solid #f0f0f0; }
.sel { flex: 1; min-width: 70px; padding: 10px 6px; font-size: 13px; border: 1px solid #ddd; border-radius: 6px; background: #fff; color: #333; }

/* 汇总 */
.summary-bar { display: flex; justify-content: space-around; padding: 16px 12px; background: linear-gradient(135deg, #E8F6F3, #F5FAF8); border-bottom: 2px solid #4DB6AC; }
.sb-item { font-size: 13px; color: #555; font-weight: 500; }
.sb-item b { color: #333; margin-left: 4px; font-size: 15px; }

/* 表格 */
.table-wrap { overflow-x: auto; padding: 0; }
table { width: 100%; border-collapse: collapse; font-size: 11px; white-space: nowrap; }
th { padding: 8px 4px; background: #f5f5f5; color: #666; font-weight: 500; position: sticky; top: 0; }
td { padding: 7px 4px; border-bottom: 1px solid #f0f0f0; text-align: center; }
.td-station { max-width: 80px; overflow: hidden; text-overflow: ellipsis; }
.td-op { max-width: 60px; overflow: hidden; text-overflow: ellipsis; }
.td-refund { color: #ee0a24; }
.td-time { font-size: 10px; color: #999; }

.tag { padding: 1px 5px; border-radius: 3px; font-size: 10px; }
.tag.charge { background: #E8F6F3; color: #4DB6AC; }
.tag.swap { background: #FFF3E0; color: #F5B86E; }
.tag.ok { background: #E8F6F3; color: #4DB6AC; }
.tag.warn { background: #FFF8E1; color: #F9A825; }
.tag.fail { background: #FFEBEE; color: #EE0A24; }

/* 分页 */
.pager { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 14px; }
.pager button { padding: 6px 16px; border: 1px solid #ddd; border-radius: 4px; background: #fff; font-size: 13px; cursor: pointer; }
.pager button:disabled { opacity: 0.4; }
</style>
