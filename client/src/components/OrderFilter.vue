<template>
  <div class="filter-bar">
    <van-dropdown-menu active-color="#1989fa">
      <van-dropdown-item
        v-model="localStatus"
        :options="statusOptions"
        @change="onStatusChange"
        title="状态"
      />
      <van-dropdown-item
        v-model="localStation"
        :options="stationOptions"
        @change="onStationChange"
        title="场站"
      />
    </van-dropdown-menu>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['update:status', 'update:station'])

const props = defineProps({
  status: { type: String, default: '' },
  station: { type: String, default: '' },
  stations: { type: Array, default: () => [] },
})

const localStatus = ref(props.status)
const localStation = ref(props.station)

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '已完成', value: '已完成' },
  { text: '进行中', value: '进行中' },
  { text: '已取消', value: '已取消' },
]

const stationOptions = computed(() => [
  { text: '全部场站', value: '' },
  ...props.stations.map((s) => ({ text: s, value: s })),
])

function onStatusChange(value) {
  emit('update:status', value)
}

function onStationChange(value) {
  emit('update:station', value)
}
</script>

<style scoped>
.filter-bar {
  background: #fff;
}
</style>
