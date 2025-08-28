// 视角控制功能的地图逻辑
import { ref } from 'vue'

export function useViewControl() {
  let viewer = null

  // 设置viewer引用
  const setViewer = (cesiumViewer) => {
    viewer = cesiumViewer
  }

  // 飞往北京
  const flyToBeijing = () => {
    if (!viewer) {
      console.warn('Viewer not ready')
      return
    }

    viewer.camera.flyTo({
      destination: window.Cesium.Cartesian3.fromDegrees(116.4074, 39.9042, 10000),
      duration: 3.0,
    })
  }

  // 飞往上海
  const flyToShanghai = () => {
    if (!viewer) {
      console.warn('Viewer not ready')
      return
    }

    viewer.camera.flyTo({
      destination: window.Cesium.Cartesian3.fromDegrees(121.4737, 31.2304, 10000),
      duration: 3.0,
    })
  }

  // 飞往广州
  const flyToGuangzhou = () => {
    if (!viewer) {
      console.warn('Viewer not ready')
      return
    }

    viewer.camera.flyTo({
      destination: window.Cesium.Cartesian3.fromDegrees(113.2644, 23.1291, 10000),
      duration: 3.0,
    })
  }

  return {
    setViewer,
    flyToBeijing,
    flyToShanghai,
    flyToGuangzhou,
  }
}
