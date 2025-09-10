<template>
  <div class="circle-connector-demo">
    <div class="demo-header">
      <h2>源点A、B直接连接演示</h2>
      <p>展示两个点之间的直接连线功能</p>
    </div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-group">
        <label>连线宽度:</label>
        <input v-model.number="lineWidth" type="range" min="1" max="10" step="1" />
        <span>{{ lineWidth }}px</span>
      </div>

      <div class="control-group">
        <label>连线颜色:</label>
        <input v-model="lineColor" type="color" />
      </div>

      <div class="control-group">
        <label>圆环半径 (km):</label>
        <input v-model.number="ringRadius" type="range" min="10" max="200" step="10" />
        <span>{{ ringRadius }}km</span>
      </div>

      <div class="control-group">
        <label>虚拟节点数量:</label>
        <input v-model.number="nodeCount" type="range" min="3" max="12" step="1" />
        <span>{{ nodeCount }}个</span>
      </div>

      <div class="control-group">
        <label>显示设置:</label>
        <label class="checkbox-label">
          <input v-model="showDirectConnection" type="checkbox" />
          显示连线
        </label>
        <label class="checkbox-label">
          <input v-model="showConnectionLabel" type="checkbox" />
          显示标签
        </label>
        <label class="checkbox-label">
          <input v-model="showPoints" type="checkbox" />
          显示点位
        </label>
        <label class="checkbox-label">
          <input v-model="showCircleRing" type="checkbox" />
          显示圆环
        </label>
        <label class="checkbox-label">
          <input v-model="showVirtualNodes" type="checkbox" />
          显示虚拟节点
        </label>
        <label class="checkbox-label">
          <input v-model="showVirtualConnections" type="checkbox" />
          显示虚拟节点连线
        </label>
      </div>
    </div>

    <!-- Cesium 视图容器 -->
    <div class="cesium-container">
      <vc-viewer
        ref="vcViewer"
        :animation="false"
        :base-layer-picker="false"
        :fullscreen-button="false"
        :geocoder="false"
        :home-button="false"
        :info-box="false"
        :navigation-help-button="false"
        :navigation-instructions-initially-visible="false"
        :scene-mode-picker="false"
        :selection-indicator="false"
        :timeline="false"
        :credit-container="undefined"
        @ready="onViewerReady"
      >
        <!-- 基础影像图层 -->
        <vc-layer-imagery>
          <vc-imagery-provider-osm />
        </vc-layer-imagery>

        <!-- 源点A -->
        <vc-entity
          v-if="showPoints"
          id="point-a"
          :position="demoPoints[0].position"
          @click="onPointClick(demoPoints[0])"
          @dblclick="handlePointDoubleClick(demoPoints[0])"
        >
          <vc-graphics-billboard
            :image="demoPoints[0].billboard.image"
            :scale="demoPoints[0].billboard.scale"
            :vertical-origin="demoPoints[0].billboard.verticalOrigin"
            :height-reference="demoPoints[0].billboard.heightReference"
          />
          <vc-graphics-label
            :text="demoPoints[0].label.text"
            :font="demoPoints[0].label.font"
            :fill-color="demoPoints[0].label.fillColor"
            :outline-color="demoPoints[0].label.outlineColor"
            :outline-width="demoPoints[0].label.outlineWidth"
            :pixel-offset="demoPoints[0].label.pixelOffset"
            :show-background="demoPoints[0].label.showBackground"
            :background-color="demoPoints[0].label.backgroundColor"
          />
        </vc-entity>

        <!-- 源点B -->
        <vc-entity
          v-if="showPoints"
          id="point-b"
          :position="demoPoints[1].position"
          @click="onPointClick(demoPoints[1])"
        >
          <vc-graphics-billboard
            :image="demoPoints[1].billboard.image"
            :scale="demoPoints[1].billboard.scale"
            :vertical-origin="demoPoints[1].billboard.verticalOrigin"
            :height-reference="demoPoints[1].billboard.heightReference"
          />
          <vc-graphics-label
            :text="demoPoints[1].label.text"
            :font="demoPoints[1].label.font"
            :fill-color="demoPoints[1].label.fillColor"
            :outline-color="demoPoints[1].label.outlineColor"
            :outline-width="demoPoints[1].label.outlineWidth"
            :pixel-offset="demoPoints[1].label.pixelOffset"
            :show-background="demoPoints[1].label.showBackground"
            :background-color="demoPoints[1].label.backgroundColor"
          />
        </vc-entity>

        <!-- 直接连线 -->
        <vc-entity v-if="showDirectConnection" id="direct-connection">
          <vc-graphics-polyline
            :positions="[demoPoints[0].position, demoPoints[1].position]"
            :width="lineWidth"
            :material="lineColor"
            :clamp-to-ground="false"
          />
        </vc-entity>

        <!-- 连线标签 -->
        <vc-entity
          v-if="showDirectConnection && showConnectionLabel"
          id="connection-label"
          :position="[
            (demoPoints[0].position[0] + demoPoints[1].position[0]) / 2,
            (demoPoints[0].position[1] + demoPoints[1].position[1]) / 2,
            50000,
          ]"
        >
          <vc-graphics-label
            text="A ↔ B 直接连接"
            font="14pt sans-serif"
            fill-color="#ffffff"
            outline-color="#000000"
            :outline-width="2"
            :show-background="true"
            background-color="rgba(0,0,0,0.7)"
          />
        </vc-entity>

        <!-- 源点A周围的圆环 -->
        <vc-entity v-if="showCircleRing" id="circle-ring" :position="demoPoints[0].position">
          <vc-graphics-ellipse
            :semi-major-axis="ringRadius * 1000"
            :semi-minor-axis="ringRadius * 1000"
            :height="10000"
            :material="'rgba(0, 255, 255, 0.3)'"
            :outline="true"
            :outline-color="'#00ffff'"
            :outline-width="2"
          />
        </vc-entity>

        <!-- 虚拟节点 -->
        <template v-if="showVirtualNodes">
          <vc-entity
            v-for="node in virtualNodes"
            :key="node.id"
            :id="node.id"
            :position="node.position"
            @click="onVirtualNodeClick(node)"
          >
            <vc-graphics-point
              :pixel-size="8"
              :color="'#ff6b35'"
              :outline-color="'#ffffff'"
              :outline-width="2"
              :height-reference="0"
            />
            <vc-graphics-label
              :text="node.name"
              font="10pt sans-serif"
              fill-color="#ffffff"
              outline-color="#000000"
              :outline-width="1"
              :pixel-offset="[0, -20]"
              :show-background="true"
              background-color="rgba(255,107,53,0.7)"
            />
          </vc-entity>
        </template>

        <!-- 虚拟节点到雷达站B的连线 -->
        <template v-if="showVirtualConnections && showVirtualNodes">
          <vc-entity
            v-for="node in virtualNodes"
            :key="`connection-${node.id}`"
            :id="`connection-${node.id}`"
          >
            <vc-graphics-polyline
              :positions="[node.position, demoPoints[1].position]"
              :width="2"
              :material="'#ff6b35'"
              :clamp-to-ground="false"
            />
          </vc-entity>
        </template>
      </vc-viewer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Cesium viewer 实例
const viewer = ref(null)

// 控制参数
const lineWidth = ref(3) // 连线宽度
const lineColor = ref('#00ff00') // 连线颜色
const showDirectConnection = ref(true) // 显示直接连线
const showConnectionLabel = ref(true) // 显示连线标签
const showPoints = ref(true) // 显示点位
const ringRadius = ref(50) // 圆环半径(km)
const nodeCount = ref(6) // 虚拟节点数量
const showCircleRing = ref(false) // 显示圆环
const showVirtualNodes = ref(false) // 显示虚拟节点
const showVirtualConnections = ref(false) // 显示虚拟节点连线

// 计算虚拟节点位置
const virtualNodes = computed(() => {
  if (!demoPoints.value[0]) return []

  const centerLon = demoPoints.value[0].longitude
  const centerLat = demoPoints.value[0].latitude
  const radiusInMeters = ringRadius.value * 1000 // 转换为米

  const nodes = []
  for (let i = 0; i < nodeCount.value; i++) {
    const angle = (i * 2 * Math.PI) / nodeCount.value

    // 使用更精确的地理计算
    const earthRadius = 6371000 // 地球半径(米)
    const latRad = (centerLat * Math.PI) / 180
    const lonRad = (centerLon * Math.PI) / 180

    // 计算新的纬度
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(radiusInMeters / earthRadius) +
        Math.cos(latRad) * Math.sin(radiusInMeters / earthRadius) * Math.cos(angle),
    )

    // 计算新的经度
    const newLonRad =
      lonRad +
      Math.atan2(
        Math.sin(angle) * Math.sin(radiusInMeters / earthRadius) * Math.cos(latRad),
        Math.cos(radiusInMeters / earthRadius) - Math.sin(latRad) * Math.sin(newLatRad),
      )

    const lon = (newLonRad * 180) / Math.PI
    const lat = (newLatRad * 180) / Math.PI

    nodes.push({
      id: `virtual-node-${i}`,
      name: `虚拟节点${i + 1}`,
      longitude: lon,
      latitude: lat,
      altitude: 15000, // 提高高度避免被圆环覆盖
      position: [lon, lat, 15000],
      angle: angle,
    })
  }

  return nodes
})

// 演示数据点
const demoPoints = ref([
  {
    id: 'point_a',
    name: '源点A',
    type: 'communication',
    longitude: 116.3974,
    latitude: 39.9093,
    altitude: 15000, // 提高高度避免被圆环覆盖
    position: [116.3974, 39.9093, 15000],
    billboard: {
      image: '/icons/communication.svg',
      scale: 1.2,
      verticalOrigin: 1,
      heightReference: 0,
    },
    label: {
      text: '通信站A',
      font: '12pt sans-serif',
      fillColor: '#ffffff',
      outlineColor: '#000000',
      outlineWidth: 2,
      pixelOffset: [0, -40],
      showBackground: true,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
  },
  {
    id: 'point_b',
    name: '目标点B',
    type: 'radar',
    longitude: 121.4737,
    latitude: 31.2304,
    altitude: 0,
    position: [121.4737, 31.2304, 0],
    billboard: {
      image: '/icons/radar.svg',
      scale: 1.2,
      verticalOrigin: 1,
      heightReference: 0,
    },
    label: {
      text: '雷达站B',
      font: '12pt sans-serif',
      fillColor: '#ffffff',
      outlineColor: '#000000',
      outlineWidth: 2,
      pixelOffset: [0, -40],
      showBackground: true,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
  },
])

// 事件处理函数
function onViewerReady(cesiumInstance) {
  console.log('Cesium viewer ready:', cesiumInstance)
  viewer.value = cesiumInstance.viewer

  // 设置初始视角
  if (viewer.value) {
    viewer.value.camera.setView({
      destination: window.Cesium.Cartesian3.fromDegrees(118.9, 35.6, 1000000),
      orientation: {
        heading: 0.0,
        pitch: -window.Cesium.Math.PI_OVER_TWO,
        roll: 0.0,
      },
    })
  }
}

// 点击事件处理
function onPointClick(point) {
  console.log('点击点位:', point.name)
  // 可以在这里添加点击点位的处理逻辑
}

// 虚拟节点点击事件处理
function onVirtualNodeClick(node) {
  console.log('点击虚拟节点:', node.name, '位置:', node.position)
  // 可以在这里添加点击虚拟节点的处理逻辑
}

// 双击事件处理
function handlePointDoubleClick(point) {
  console.log('双击点位:', point.name)
  if (point.id === 'point_a') {
    // 双击通信站A时切换圆环、虚拟节点和连线的显示状态
    const isCurrentlyVisible =
      showCircleRing.value || showVirtualNodes.value || showVirtualConnections.value

    if (isCurrentlyVisible) {
      // 如果当前有任何元素显示，则全部隐藏
      showCircleRing.value = false
      showVirtualNodes.value = false
      showVirtualConnections.value = false
      showDirectConnection.value = true
    } else {
      // 如果当前全部隐藏，则全部显示
      showCircleRing.value = true
      showVirtualNodes.value = true
      showVirtualConnections.value = true
      showDirectConnection.value = false
    }
  }
}

onMounted(() => {
  console.log('源点A、B直接连接演示页面加载完成')
})
</script>

<style scoped>
.circle-connector-demo {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a1a;
  color: #ffffff;
}

.demo-header {
  padding: 20px;
  background: #2d2d2d;
  border-bottom: 1px solid #444;
}

.demo-header h2 {
  margin: 0 0 10px 0;
  color: #00ffff;
}

.demo-header p {
  margin: 0;
  color: #ccc;
}

.control-panel {
  display: flex;
  gap: 20px;
  padding: 15px 20px;
  background: #333;
  border-bottom: 1px solid #444;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-group label {
  font-size: 14px;
  color: #ccc;
  white-space: nowrap;
}

.control-group input[type='range'] {
  width: 120px;
}

.control-group input[type='checkbox'] {
  margin-right: 5px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  font-size: 12px !important;
  margin-left: 10px;
}

.control-group select {
  padding: 4px 8px;
  background: #444;
  color: #fff;
  border: 1px solid #666;
  border-radius: 4px;
}

.control-group span {
  font-size: 12px;
  color: #00ffff;
  min-width: 50px;
}

.cesium-container {
  flex: 1;
  position: relative;
}
</style>
