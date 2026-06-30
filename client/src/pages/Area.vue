<template>
  <div class="area-page">
    <!-- 地图容器 -->
    <div id="map" class="map-container"></div>

    <!-- 场站列表 -->
    <div class="station-list">
      <div v-for="st in stations" :key="st.id" class="station-card" @click="$router.push('/station/' + st.id)">
        <div class="sc-left">
          <div class="sc-name">{{ st.name }}</div>
          <div class="sc-addr">{{ st.address }}</div>
        </div>
        <div class="sc-right">
          <span class="sc-type">{{ st.type }}</span>
          <span class="sc-arrow">›</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'

const stations = ref([])
let map = null

onMounted(async () => {
  // 加载场站数据
  try {
    const r = await axios.get('/api/stations')
    if (r.data?.code === 0) stations.value = r.data.data
  } catch (_) {}

  // 初始化地图
  map = L.map('map', { zoomControl: false, attributionControl: false }).setView([24.60, 118.15], 10)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
  }).addTo(map)

  // 自定义标记图标
  const markerIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div style="width:14px;height:14px;background:#4DB6AC;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  })

  stations.value.forEach(st => {
    const marker = L.marker([st.lat, st.lng], { icon: markerIcon })
      .addTo(map)
      .bindPopup(`<b style="color:#333">${st.name}</b><br><span style="color:#999;font-size:12px">${st.address}</span>`)
    marker.on('click', () => map.setView([st.lat, st.lng], 14))
  })

  // 缩放到显示所有标记
  if (stations.value.length > 1) {
    const bounds = stations.value.map(s => [s.lat, s.lng])
    map.fitBounds(bounds, { padding: [30, 30] })
  }
})

onBeforeUnmount(() => { if (map) map.remove() })
</script>

<style scoped>
.area-page { min-height: 100vh; background: var(--page-bg); padding-bottom: 50px; }
.map-container { width: 100%; height: 300px; z-index: 1; }

.station-list { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.station-card {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; border-radius: 10px; padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04); cursor: pointer;
  transition: all 0.15s;
}
.station-card:active { background: #f9fafb; }
.sc-name { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 4px; }
.sc-addr { font-size: 12px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.sc-type { font-size: 11px; background: var(--primary-light); color: var(--primary); padding: 3px 8px; border-radius: 4px; }
.sc-arrow { font-size: 20px; color: #ccc; }
</style>
