<template>
  <div class="filter-bar">
    <!-- 月份 -->
    <div class="filter-dropdown">
      <button class="filter-btn" :class="{ open: openDropdown === 'month' }" @click.stop="toggle('month')">
        <span class="filter-label-text">月份</span>
        <span class="filter-summary">{{ monthSummary }}</span>
      </button>
      <div class="filter-dropdown-panel" :class="{ show: openDropdown === 'month' }">
        <div class="filter-chips">
          <span class="filter-chip all-chip" :class="{ selected: allMonths }" @click="toggleAll('month')">全部</span>
          <span v-for="m in filterMeta.months" :key="m" class="filter-chip" :class="{ selected: selectedMonths.includes(m) }" @click="toggleOne('month',m)">{{ m }}</span>
        </div>
      </div>
    </div>

    <!-- 电站 -->
    <div class="filter-dropdown">
      <button class="filter-btn" :class="{ open: openDropdown === 'station' }" @click.stop="toggle('station')">
        <span class="filter-label-text">电站</span>
        <span class="filter-summary">{{ stationSummary }}</span>
      </button>
      <div class="filter-dropdown-panel" :class="{ show: openDropdown === 'station' }">
        <div class="filter-chips">
          <span class="filter-chip all-chip" :class="{ selected: allStations }" @click="toggleAll('station')">全部</span>
          <span v-for="s in filterMeta.stations" :key="s" class="filter-chip" :class="{ selected: selectedStations.includes(s) }" @click="toggleOne('station',s)">{{ s.length>10?s.slice(0,10)+'…':s }}</span>
        </div>
      </div>
    </div>

    <!-- 运营方 -->
    <div class="filter-dropdown">
      <button class="filter-btn" :class="{ open: openDropdown === 'operator' }" @click.stop="toggle('operator')">
        <span class="filter-label-text">运管方</span>
        <span class="filter-summary">{{ operatorSummary }}</span>
      </button>
      <div class="filter-dropdown-panel" :class="{ show: openDropdown === 'operator' }">
        <div class="filter-chips">
          <span class="filter-chip all-chip" :class="{ selected: allOperators }" @click="toggleAll('operator')">全部</span>
          <span v-for="o in filterMeta.operators" :key="o" class="filter-chip" :class="{ selected: selectedOperators.includes(o) }" @click="toggleOne('operator',o)">{{ o.length>10?o.slice(0,10)+'…':o }}</span>
        </div>
      </div>
    </div>

    <!-- 重置 -->
    <button class="btn-reset" @click="$emit('reset')">重置</button>

    <!-- 遮罩层 -->
    <div v-if="openDropdown" class="filter-overlay" @click="$emit('close')"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  filterMeta: { type: Object, default: () => ({ months:[], stations:[], operators:[] }) },
  selectedMonths: { type: Array, default: () => [] },
  selectedStations: { type: Array, default: () => [] },
  selectedOperators: { type: Array, default: () => [] },
  openDropdown: { type: String, default: null },
})

const emit = defineEmits(['update:selectedMonths','update:selectedStations','update:selectedOperators','reset','toggle','close'])

function toggle(name) {
  emit('toggle', name)
}

const monthSummary = computed(() => props.selectedMonths.length === props.filterMeta.months.length ? '全部' : `${props.selectedMonths.length}个已选`)
const stationSummary = computed(() => props.selectedStations.length === props.filterMeta.stations.length ? '全部' : `${props.selectedStations.length}个已选`)
const operatorSummary = computed(() => props.selectedOperators.length === props.filterMeta.operators.length ? '全部' : `${props.selectedOperators.length}个已选`)

const allMonths = computed(() => props.selectedMonths.length === props.filterMeta.months.length)
const allStations = computed(() => props.selectedStations.length === props.filterMeta.stations.length)
const allOperators = computed(() => props.selectedOperators.length === props.filterMeta.operators.length)

function getKey(type) {
  return { month:'selectedMonths', station:'selectedStations', operator:'selectedOperators' }[type]
}
function getMeta(type) {
  return { month:'months', station:'stations', operator:'operators' }[type]
}

function toggleAll(type) {
  const key = getKey(type)
  const metaKey = getMeta(type)
  const all = props.filterMeta[metaKey]
  const cur = props[key]
  emit('update:' + key, cur.length === all.length ? [] : [...all])
}

function toggleOne(type, item) {
  const key = getKey(type)
  const cur = props[key]
  const idx = cur.indexOf(item)
  emit('update:' + key, idx >= 0 ? cur.filter(x => x !== item) : [...cur, item])
}
</script>

<style scoped>
/* ── 完全参照参考项目样式 ── */
.filter-bar {
  margin: 8px 0;
  display: flex;
  gap: 6px;
  align-items: flex-start;
  position: relative;
  z-index: 50;
}

.filter-dropdown { position: relative; flex: 1; min-width: 0; }

.filter-btn {
  width: 100%;
  padding: 9px 6px;
  border-radius: 8px;
  font-size: 12px;
  border: 1px solid var(--divider);
  background: var(--card-bg);
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
  text-align: center;
  transition: all 0.15s;
  outline: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  font-family: inherit;
}

.filter-btn:hover { border-color: #c0c8d4; }
.filter-btn:active { background: #f8f9fa; }

.filter-btn.open {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(77,182,172,0.15);
}

.filter-label-text { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
.filter-btn.open .filter-label-text { color: var(--primary); }

.filter-summary {
  font-size: 11px;
  color: var(--text-primary);
  font-weight: 500;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.filter-btn.open .filter-summary { color: var(--primary); }

.filter-dropdown-panel {
  display: none;
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 220px;
  background: var(--card-bg);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.1);
  z-index: 60;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--divider);
}
.filter-dropdown-panel.show { display: block; }

.filter-chips { display: flex; flex-wrap: wrap; gap: 5px; }

.filter-chip {
  padding: 5px 10px; border-radius: 4px; font-size: 11px;
  border: 1px solid var(--divider); background: #fff; color: var(--text-primary);
  cursor: pointer; white-space: nowrap; transition: all 0.12s; user-select: none;
}
.filter-chip:active { background: #f0f2f5; }
.filter-chip.selected { background: var(--primary); color: #fff; border-color: var(--primary); }
.filter-chip.all-chip { font-weight: 600; color: var(--primary); border-color: var(--primary); }
.filter-chip.all-chip.selected { background: var(--primary); color: #fff; }

.btn-reset {
  padding: 10px 8px;
  border-radius: 8px;
  font-size: 12px;
  border: 1px solid var(--divider);
  background: var(--card-bg);
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  flex-shrink: 0;
}
.btn-reset:hover { border-color: #c0c8d4; }

.filter-overlay {
  position: fixed; inset: 0; z-index: 45; background: rgba(0,0,0,0.08);
}
</style>
