<template>
  <div class="test-map-container">
    <!-- 导航栏 -->
    <div class="nav-bar">
      <h1>测试地图页面</h1>
      <div class="nav-buttons">
        <el-button @click="$router.push('/')" type="primary">返回首页</el-button>
        <el-button @click="$router.push('/demo')" type="info">组件演示</el-button>
      </div>
    </div>

    <!-- 地图容器 -->
    <div class="map-wrapper">
      <vc-viewer
        ref="viewerRef"
        :animation="true"
        :timeline="true"
        :fullscreenButton="false"
        :vrButton="false"
        :homeButton="false"
        :sceneModePicker="false"
        :baseLayerPicker="false"
        :navigationHelpButton="false"
        :geocoder="false"
        @ready="onViewerReady"
        class="cesium-viewer"
      >
        <!-- 地形 -->
        <vc-terrain-provider-cesium></vc-terrain-provider-cesium>

        <!-- 影像图层 -->
        <vc-layer-imagery>
          <vc-imagery-provider-osm></vc-imagery-provider-osm>
        </vc-layer-imagery>

        <!-- 测试实体 -->
        <vc-entity
          v-for="entity in testEntities"
          :key="entity.id"
          :position="entity.position"
          :point="entity.point"
          :label="entity.label"
        >
        </vc-entity>

        <!-- 测试线条 -->
        <vc-entity v-for="line in testLines" :key="line.id" :polyline="line.polyline"> </vc-entity>

        <!-- 舰船轨迹实体 -->
        <vc-entity
          v-for="ship in shipTrajectories"
          :key="ship.id"
          :position="ship.position"
          :billboard="ship.billboard"
          :path="ship.path"
          :label="ship.label"
        >
        </vc-entity>
      </vc-viewer>
    </div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <el-card class="control-card">
        <template #header>
          <span>测试控制面板</span>
        </template>

        <div class="control-section">
          <h4>地图信息</h4>
          <p>当前层级: {{ currentZoomLevel }}</p>
          <p>相机高度: {{ cameraHeight.toFixed(2) }} 米</p>
          <p>经度: {{ cameraPosition.longitude.toFixed(6) }}°</p>
          <p>纬度: {{ cameraPosition.latitude.toFixed(6) }}°</p>
        </div>

        <el-divider></el-divider>

        <div class="control-section">
          <h4>测试功能</h4>
          <el-button @click="addRandomPoint" type="primary" size="small"> 添加随机点 </el-button>
          <el-button @click="addRandomLine" type="success" size="small"> 添加随机线 </el-button>
          <el-button @click="clearAll" type="danger" size="small"> 清除所有 </el-button>
        </div>

        <el-divider></el-divider>

        <div class="control-section">
          <h4>舰船轨迹</h4>
          <p>当前舰船数量: {{ shipTrajectories.length }}</p>
          <p>时间轴状态: {{ timelineStatus }}</p>
          <el-button @click="generateShipTrajectory" type="primary" size="small">
            生成舰船轨迹
          </el-button>
          <el-button @click="startAnimation" type="success" size="small"> 开始动画 </el-button>
          <el-button @click="pauseAnimation" type="warning" size="small"> 暂停动画 </el-button>
          <el-button @click="clearShips" type="danger" size="small"> 清除舰船 </el-button>
        </div>

        <el-divider></el-divider>

        <div class="control-section">
          <h4>视角控制</h4>
          <el-button @click="flyToBeijing" size="small">飞到北京</el-button>
          <el-button @click="flyToShanghai" size="small">飞到上海</el-button>
          <el-button @click="flyToGuangzhou" size="small">飞到广州</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { getCurrentZoomLevel, getCameraHeight, getCameraPosition, onZoomLevelChange } from '@/utils'
import { ElButton, ElCard, ElDivider } from 'element-plus'

// 响应式数据
const viewerRef = ref(null)
const viewer = ref(null)
const currentZoomLevel = ref(0)
const cameraHeight = ref(0)
const cameraPosition = reactive({ longitude: 0, latitude: 0 })
const testEntities = ref([])
const testLines = ref([])
const shipTrajectories = ref([])
const timelineStatus = ref('停止')

// 监听器
let removeZoomListener = null

// 地图就绪回调
const onViewerReady = ({ Cesium, viewer: cesiumViewer }) => {
  viewer.value = cesiumViewer
  window.viewer = cesiumViewer // 全局引用

  // 初始化地图信息
  updateMapInfo()

  // 监听层级变化
  removeZoomListener = onZoomLevelChange(cesiumViewer, (info) => {
    currentZoomLevel.value = info.zoomLevel
    cameraHeight.value = info.height
    cameraPosition.longitude = info.position.longitude
    cameraPosition.latitude = info.position.latitude
  })

  // 设置初始视角（中国中心）
  cesiumViewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(104.0, 35.0, 10000000),
  })

  // 初始化时间轴
  initializeTimeline(cesiumViewer, Cesium)

  console.log('测试地图页面初始化完成')
}

// 更新地图信息
const updateMapInfo = () => {
  if (!viewer.value) return

  currentZoomLevel.value = getCurrentZoomLevel(viewer.value)
  cameraHeight.value = getCameraHeight(viewer.value)
  const pos = getCameraPosition(viewer.value)
  cameraPosition.longitude = pos.longitude
  cameraPosition.latitude = pos.latitude
}

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
const clearAll = () => {
  testEntities.value = []
  testLines.value = []
  shipTrajectories.value = []
}

// ==================== 舰船轨迹功能 ====================

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
  const trajectoryPoints = []
  const startTime = viewer.value.clock.startTime
  const stopTime = viewer.value.clock.stopTime
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
    // Billboard的旋转是相对于屏幕的，需要调整角度
    // 航向角0度表示正北，billboard旋转0度表示向右，所以需要减去π/2
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
  if (!viewer.value) {
    console.warn('Viewer not ready')
    return
  }

  const shipId = `ship_${Date.now()}`
  const trajectoryData = generateTrajectoryData()
  const shipEntity = createShipEntity(trajectoryData, shipId)

  shipTrajectories.value.push(shipEntity)

  console.log(`生成舰船轨迹: ${shipId}`, {
    轨迹点数量: trajectoryData.length,
    起始时间: viewer.value.clock.startTime,
    结束时间: viewer.value.clock.stopTime,
    航向计算: '基于相邻轨迹点计算',
    方向控制: 'Quaternion四元数',
  })
}

// 开始动画
const startAnimation = () => {
  if (!viewer.value) return
  viewer.value.clock.shouldAnimate = true
  timelineStatus.value = '播放中'
}

// 暂停动画
const pauseAnimation = () => {
  if (!viewer.value) return
  viewer.value.clock.shouldAnimate = false
  timelineStatus.value = '暂停'
}

// 清除所有舰船
const clearShips = () => {
  shipTrajectories.value = []
  timelineStatus.value = '停止'
}

// 飞到指定城市
const flyToBeijing = () => {
  if (!viewer.value) return
  viewer.value.camera.flyTo({
    destination: window.Cesium.Cartesian3.fromDegrees(116.4074, 39.9042, 500000),
  })
}

const flyToShanghai = () => {
  if (!viewer.value) return
  viewer.value.camera.flyTo({
    destination: window.Cesium.Cartesian3.fromDegrees(121.4737, 31.2304, 500000),
  })
}

const flyToGuangzhou = () => {
  if (!viewer.value) return
  viewer.value.camera.flyTo({
    destination: window.Cesium.Cartesian3.fromDegrees(113.2644, 23.1291, 500000),
  })
}

// 生命周期
onMounted(() => {
  console.log('测试地图页面挂载')
})

onUnmounted(() => {
  if (removeZoomListener) {
    removeZoomListener()
  }
  console.log('测试地图页面卸载')
})

/*
==================== 舰船轨迹生成原理说明 ====================

1. 时间轴系统 (Timeline System):
   - 使用 Cesium.Clock 管理时间轴，设置 startTime、stopTime 和 currentTime
   - clockRange 设置为 LOOP_STOP，实现循环播放
   - multiplier 控制播放速度（60倍速）
   - 通过 onTick 事件监听时间轴状态变化

2. 轨迹数据生成 (Trajectory Data Generation):
   - generateTrajectoryData() 生成时间序列的轨迹点
   - 每个轨迹点包含：时间戳、3D位置、经纬度坐标
   - 使用数学函数模拟真实的舰船航行路径（螺旋形/波浪形）
   - 轨迹点在时间轴范围内均匀分布

3. 航向计算 (Heading Calculation):
   - calculateHeading() 基于球面几何计算两点间的航向角
   - 使用 atan2() 函数处理方位角计算，避免象限问题
   - 航向角以弧度为单位，符合 Cesium 的角度系统
   - 公式基于大圆航行的球面三角学

4. 方向控制 (Billboard Rotation Control):
   - 使用 Cesium.SampledProperty(Number) 存储旋转角度数据
   - billboard.rotation 属性控制图标的屏幕旋转
   - 航向角需要转换为billboard旋转角度（减去π/2调整坐标系差异）
   - alignedAxis设置为ZERO允许任意角度旋转

5. 位置插值 (Position Interpolation):
   - SampledPositionProperty 管理时间-位置采样点
   - LagrangePolynomialApproximation 提供平滑的插值算法
   - interpolationDegree: 2 使用二次插值，平衡性能和精度
   - Cesium 自动处理地球曲率的插值计算

6. 实体属性配置 (Entity Properties):
   - position: 动态位置属性，随时间变化
   - billboard: 图标配置，包含rotation动态旋转属性控制朝向
   - billboard.rotation: 动态旋转属性，控制图标朝向
   - path: 轨迹线配置，显示历史和未来路径
   - label: 标签显示舰船信息

7. 核心技术要点:
   - 时间同步：所有动画基于统一的时间轴
   - 空间坐标：使用 WGS84 地理坐标系
   - 插值算法：确保平滑的运动效果
   - 角度旋转：billboard使用简单角度旋转控制朝向
   - 坐标系转换：航向角到屏幕旋转角的转换
   - 采样频率：平衡精度和性能

8. 扩展功能:
   - 可添加速度、加速度等物理属性
   - 支持多种插值算法选择
   - 可集成真实的 AIS 数据
   - 支持碰撞检测和路径规划
   - 可添加环境因素（风、流等）影响

使用示例:
1. 点击"生成舰船轨迹"创建新的舰船
2. 点击"开始动画"播放轨迹动画
3. 使用时间轴控件手动控制时间
4. 观察舰船模型的方向变化和轨迹路径
*/
</script>

<style scoped>
.test-map-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.nav-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 1000;
}

.nav-bar h1 {
  margin: 0;
  font-size: 20px;
}

.nav-buttons {
  display: flex;
  gap: 10px;
}

.map-wrapper {
  width: 100%;
  height: 100%;
  padding-top: 60px;
}

.cesium-viewer {
  width: 100%;
  height: calc(100vh - 60px);
}

.control-panel {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 280px;
  z-index: 1000;
  overflow: auto;
  height: 80vh;
}

.control-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.control-section {
  margin-bottom: 10px;
}

.control-section h4 {
  margin: 0 0 10px 0;
  color: #409eff;
}

.control-section p {
  margin: 5px 0;
  font-size: 12px;
  color: #666;
}

.control-section .el-button {
  margin: 5px 5px 5px 0;
}
</style>
