// 舰船轨迹功能的地图逻辑
import { ref } from 'vue'

export function useShipTrajectory() {
  const shipTrajectories = ref([])
  const timelineStatus = ref('停止')
  let viewer = null

  // 设置viewer引用
  const setViewer = (cesiumViewer) => {
    viewer = cesiumViewer
  }

  // 初始化时间轴
  const initializeTimeline = (cesiumViewer, Cesium) => {
    // 设置时间轴范围（当前时间前后各1小时）
    const start = Cesium.JulianDate.fromDate(new Date(Date.now() - 3600000)) // 1小时前
    const stop = Cesium.JulianDate.fromDate(new Date(Date.now() + 3600000)) // 1小时后

    cesiumViewer.clock.startTime = start.clone()
    cesiumViewer.clock.stopTime = stop.clone()
    cesiumViewer.clock.currentTime = start.clone()
    cesiumViewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP
    cesiumViewer.clock.multiplier = 60 // 60倍速

    // 监听时间轴状态变化
    cesiumViewer.clock.onTick.addEventListener(() => {
      if (cesiumViewer.clock.shouldAnimate) {
        timelineStatus.value = '播放中'
      } else {
        timelineStatus.value = '暂停'
      }
    })
  }

  // 计算两点间的航向角（弧度）
  const calculateHeading = (fromLon, fromLat, toLon, toLat) => {
    const dLon = ((toLon - fromLon) * Math.PI) / 180
    const lat1 = (fromLat * Math.PI) / 180
    const lat2 = (toLat * Math.PI) / 180

    const y = Math.sin(dLon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

    let heading = Math.atan2(y, x)
    return heading
  }

  // 生成舰船轨迹数据
  const generateTrajectoryData = () => {
    if (!viewer) return []

    const trajectoryPoints = []
    const startTime = viewer.clock.startTime
    const stopTime = viewer.clock.stopTime
    const totalSeconds = window.Cesium.JulianDate.secondsDifference(stopTime, startTime)

    // 生成轨迹路径点（模拟舰船在海上的航行）
    const startLon = 120.0 + Math.random() * 10 // 东海区域
    const startLat = 30.0 + Math.random() * 10
    const numPoints = 20 // 轨迹点数量

    for (let i = 0; i < numPoints; i++) {
      const progress = i / (numPoints - 1)
      const time = window.Cesium.JulianDate.addSeconds(
        startTime,
        totalSeconds * progress,
        new window.Cesium.JulianDate(),
      )

      // 模拟舰船航行路径（螺旋形或波浪形）
      const lon = startLon + Math.sin(progress * Math.PI * 2) * 2 + progress * 5
      const lat = startLat + Math.cos(progress * Math.PI * 3) * 1 + progress * 2
      const height = 0 // 海面高度

      trajectoryPoints.push({
        time: time,
        position: window.Cesium.Cartesian3.fromDegrees(lon, lat, height),
        longitude: lon,
        latitude: lat,
        height: height,
      })
    }

    return trajectoryPoints
  }

  // 创建舰船轨迹实体
  const createShipEntity = (trajectoryData, shipId) => {
    const Cesium = window.Cesium

    // 创建位置属性（SampledPositionProperty）
    const positionProperty = new Cesium.SampledPositionProperty()

    // 创建旋转属性（SampledProperty for billboard rotation）
    const rotationProperty = new Cesium.SampledProperty(Number)

    // 添加轨迹点到位置和旋转属性
    for (let i = 0; i < trajectoryData.length; i++) {
      const point = trajectoryData[i]
      positionProperty.addSample(point.time, point.position)

      // 计算航向角
      let heading = 0
      if (i < trajectoryData.length - 1) {
        const nextPoint = trajectoryData[i + 1]
        heading = calculateHeading(
          point.longitude,
          point.latitude,
          nextPoint.longitude,
          nextPoint.latitude,
        )
      } else if (i > 0) {
        const prevPoint = trajectoryData[i - 1]
        heading = calculateHeading(
          prevPoint.longitude,
          prevPoint.latitude,
          point.longitude,
          point.latitude,
        )
      }

      // 将航向角转换为billboard旋转角度
      const billboardRotation = heading - Math.PI / 2
      rotationProperty.addSample(point.time, billboardRotation)
    }

    // 设置插值算法
    positionProperty.setInterpolationOptions({
      interpolationDegree: 2,
      interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
    })

    return {
      id: shipId,
      position: positionProperty,
      billboard: {
        image: '/icons/airport.svg',
        scale: 1.2,
        color: '#FF6B35',
        rotation: rotationProperty,
        alignedAxis: Cesium.Cartesian3.ZERO, // 允许任意旋转
      },
      path: {
        show: true,
        leadTime: 0,
        trailTime: 3600, // 显示1小时的轨迹
        width: 3,
        resolution: 120,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.3,
          color: Cesium.Color.YELLOW,
        }),
      },
      label: {
        text: `舰船-${shipId}`,
        font: '12pt sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -50),
        showBackground: true,
        backgroundColor: new Cesium.Color(0, 0, 0, 0.7),
      },
    }
  }

  // 生成舰船轨迹
  const generateShipTrajectory = () => {
    if (!viewer) {
      console.warn('Viewer not ready')
      return
    }

    const shipId = `ship_${Date.now()}`
    const trajectoryData = generateTrajectoryData()
    const shipEntity = createShipEntity(trajectoryData, shipId)

    shipTrajectories.value.push(shipEntity)

    console.log(`生成舰船轨迹: ${shipId}`, {
      轨迹点数量: trajectoryData.length,
      起始时间: viewer.clock.startTime,
      结束时间: viewer.clock.stopTime,
      航向计算: '基于相邻轨迹点计算',
      方向控制: 'Billboard旋转',
    })
  }

  // 开始动画
  const startAnimation = () => {
    if (!viewer) return
    viewer.clock.shouldAnimate = true
    timelineStatus.value = '播放中'
  }

  // 暂停动画
  const pauseAnimation = () => {
    if (!viewer) return
    viewer.clock.shouldAnimate = false
    timelineStatus.value = '暂停'
  }

  // 清除所有舰船
  const clearShips = () => {
    shipTrajectories.value = []
    timelineStatus.value = '停止'
  }

  return {
    shipTrajectories,
    timelineStatus,
    setViewer,
    initializeTimeline,
    generateShipTrajectory,
    startAnimation,
    pauseAnimation,
    clearShips,
  }
}
