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

    <!-- 测试控制面板 -->
    <TestControlPanel
      :viewer="viewer"
      :cesium="cesium"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElButton } from 'element-plus'
import TestControlPanel from '@/components/test-components/TestControlPanel.vue'
import { useBasicTest } from '@/composables/useBasicTest'
import { useShipTrajectory } from '@/composables/useShipTrajectory'

// 响应式数据
const viewerRef = ref(null)
const viewer = ref(null)
const cesium = ref(null)

// 使用composables获取实体数据
const { testEntities, testLines } = useBasicTest()
const { shipTrajectories } = useShipTrajectory()

// 地图就绪回调
const onViewerReady = ({ Cesium, viewer: cesiumViewer }) => {
  viewer.value = cesiumViewer
  cesium.value = Cesium
  window.viewer = cesiumViewer // 全局引用

  // 设置初始视角（中国中心）
  cesiumViewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(104.0, 35.0, 10000000),
  })

  console.log('测试地图页面初始化完成')
}

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
  height: 40px;
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

</style>
