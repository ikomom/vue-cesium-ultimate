<template>
  <div class="map-info-panel">
    <h3>地图信息</h3>
    <div class="info-grid">
      <div class="info-item">
        <span class="label">当前层级:</span>
        <span class="value">{{ mapInfo.level }}</span>
      </div>
      <div class="info-item">
        <span class="label">相机高度:</span>
        <span class="value">{{ mapInfo.height.toLocaleString() }} m</span>
      </div>
      <div class="info-item">
        <span class="label">经度:</span>
        <span class="value">{{ mapInfo.longitude }}°</span>
      </div>
      <div class="info-item">
        <span class="label">纬度:</span>
        <span class="value">{{ mapInfo.latitude }}°</span>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, onUnmounted } from 'vue'
import { useMapInfo } from '@/composables/useMapInfo'

export default {
  name: 'MapInfoPanel',
  props: {
    viewer: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    const {
      mapInfo,
      setViewer,
      startMapInfoUpdates,
      stopMapInfoUpdates
    } = useMapInfo()

    onMounted(() => {
      if (props.viewer) {
        setViewer(props.viewer)
        startMapInfoUpdates()
      }
    })

    onUnmounted(() => {
      stopMapInfoUpdates()
    })

    // 监听viewer变化
    const updateViewer = (newViewer) => {
      if (newViewer) {
        setViewer(newViewer)
        startMapInfoUpdates()
      } else {
        stopMapInfoUpdates()
      }
    }

    // 暴露方法供父组件调用
    const handleViewerChange = (viewer) => {
      updateViewer(viewer)
    }

    return {
      mapInfo,
      handleViewerChange
    }
  }
}
</script>

<style scoped>
.map-info-panel h4 {
  margin: 0 0 10px 0;
  color: #409eff;
}

.map-info-panel p {
  margin: 5px 0;
  font-size: 12px;
  color: #666;
}
</style>
