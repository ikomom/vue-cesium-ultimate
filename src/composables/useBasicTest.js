// 基础测试功能的地图逻辑
import { ref } from 'vue'

export function useBasicTest() {
  const testEntities = ref([])
  const testLines = ref([])

  // 添加随机点
  const addRandomPoint = () => {
    const id = `point_${Date.now()}`
    const longitude = (Math.random() - 0.5) * 360
    const latitude = (Math.random() - 0.5) * 180

    testEntities.value.push({
      id,
      position: [longitude, latitude, 0],
      point: {
        pixelSize: 10,
        color: 'yellow',
        outlineColor: 'black',
        outlineWidth: 2,
        heightReference: 1,
      },
      label: {
        text: `测试点 ${testEntities.value.length + 1}`,
        font: '12pt sans-serif',
        fillColor: 'white',
        outlineColor: 'black',
        outlineWidth: 2,
        style: 0,
        pixelOffset: [0, -40],
      },
    })
  }

  // 添加随机线
  const addRandomLine = () => {
    const id = `line_${Date.now()}`
    const startLon = (Math.random() - 0.5) * 360
    const startLat = (Math.random() - 0.5) * 180
    const endLon = startLon + (Math.random() - 0.5) * 20
    const endLat = startLat + (Math.random() - 0.5) * 20

    testLines.value.push({
      id,
      polyline: {
        positions: [
          [startLon, startLat, 0],
          [endLon, endLat, 0],
        ],
        width: 3,
        material: {
          fabric: {
            type: 'Color',
            uniforms: {
              color: [Math.random(), Math.random(), Math.random(), 1.0],
            },
          },
        },
        clampToGround: true,
      },
    })
  }

  // 清除所有测试实体
  const clearAllBasicTest = () => {
    testEntities.value = []
    testLines.value = []
  }

  return {
    testEntities,
    testLines,
    addRandomPoint,
    addRandomLine,
    clearAllBasicTest
  }
}