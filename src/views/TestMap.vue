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
        :animation="false"
        :timeline="false"
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
        <vc-entity
          v-for="line in testLines"
          :key="line.id"
          :polyline="line.polyline"
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
          <el-button @click="addRandomPoint" type="primary" size="small">
            添加随机点
          </el-button>
          <el-button @click="addRandomLine" type="success" size="small">
            添加随机线
          </el-button>
          <el-button @click="clearAll" type="danger" size="small">
            清除所有
          </el-button>
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
    destination: Cesium.Cartesian3.fromDegrees(104.0, 35.0, 10000000)
  })

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
      heightReference: 1
    },
    label: {
      text: `测试点 ${testEntities.value.length + 1}`,
      font: '12pt sans-serif',
      fillColor: 'white',
      outlineColor: 'black',
      outlineWidth: 2,
      style: 0,
      pixelOffset: [0, -40]
    }
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
        [endLon, endLat, 0]
      ],
      width: 3,
      material: {
        fabric: {
          type: 'Color',
          uniforms: {
            color: [Math.random(), Math.random(), Math.random(), 1.0]
          }
        }
      },
      clampToGround: true
    }
  })
}

// 清除所有测试实体
const clearAll = () => {
  testEntities.value = []
  testLines.value = []
}

// 飞到指定城市
const flyToBeijing = () => {
  if (!viewer.value) return
  viewer.value.camera.flyTo({
    destination: window.Cesium.Cartesian3.fromDegrees(116.4074, 39.9042, 500000)
  })
}

const flyToShanghai = () => {
  if (!viewer.value) return
  viewer.value.camera.flyTo({
    destination: window.Cesium.Cartesian3.fromDegrees(121.4737, 31.2304, 500000)
  })
}

const flyToGuangzhou = () => {
  if (!viewer.value) return
  viewer.value.camera.flyTo({
    destination: window.Cesium.Cartesian3.fromDegrees(113.2644, 23.1291, 500000)
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
