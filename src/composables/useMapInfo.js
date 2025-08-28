// 地图信息功能的地图逻辑
import { ref } from 'vue'

export function useMapInfo() {
  const mapInfo = ref({
    level: 0,
    height: 0,
    longitude: 0,
    latitude: 0,
  })

  let viewer = null

  // 设置viewer引用
  const setViewer = (cesiumViewer) => {
    viewer = cesiumViewer
  }

  // 更新地图信息
  const updateMapInfo = () => {
    if (!viewer) return

    const camera = viewer.camera
    const cartographic = camera.positionCartographic

    if (cartographic) {
      mapInfo.value = {
        level: Math.round(Math.log2(40075017 / (camera.positionCartographic.height / 1000)) - 8),
        height: Math.round(cartographic.height),
        longitude: parseFloat(((cartographic.longitude * 180) / Math.PI).toFixed(6)),
        latitude: parseFloat(((cartographic.latitude * 180) / Math.PI).toFixed(6)),
      }
    }
  }

  // 开始监听地图变化
  const startMapInfoUpdates = () => {
    if (!viewer) return

    // 监听相机移动事件
    viewer.camera.moveEnd.addEventListener(updateMapInfo)
    viewer.camera.changed.addEventListener(updateMapInfo)

    // 初始更新
    updateMapInfo()
  }

  // 停止监听地图变化
  const stopMapInfoUpdates = () => {
    if (!viewer) return

    viewer.camera.moveEnd.removeEventListener(updateMapInfo)
    viewer.camera.changed.removeEventListener(updateMapInfo)
  }

  return {
    mapInfo,
    setViewer,
    updateMapInfo,
    startMapInfoUpdates,
    stopMapInfoUpdates,
  }
}
