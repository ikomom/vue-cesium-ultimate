<template>
  <!-- 圆环节点连接器组件 -->
  <template v-if="visible && sourcePoint && targetPoint">
    <!-- 圆环 -->
    <vc-entity
      :id="`circle-ring-${sourcePoint.id}`"
      :position="sourcePoint.position"
      :show="visible"
    >
      <vc-graphics-ellipse
        :semi-major-axis="ringRadius"
        :semi-minor-axis="ringRadius"
        :height="0"
        :material="ringMaterial"
        :outline="true"
        :outline-color="ringOutlineColor"
        :outline-width="2"
      />
    </vc-entity>

    <!-- 圆环中心的真实源点 (放在圆环后面渲染，确保显示在上层) -->
    <!-- 注意：中心点始终显示，不受圆环显示状态影响 -->
    <vc-entity
      :id="`center-point-${sourcePoint.id}`"
      :position="sourcePoint.position"
      :show="true"
      @click="onCenterPointClick(sourcePoint, $event)"
      @mouseover="onCenterPointHover(sourcePoint, $event)"
      @mouseout="onCenterPointLeave(sourcePoint, $event)"
    >
      <vc-graphics-point
        :pixel-size="centerPointSize"
        :color="centerPointColor"
        :outline-color="centerPointOutlineColor"
        :outline-width="3"
        :height-reference="0"
        :disable-depth-test-distance="Number.POSITIVE_INFINITY"
      />
      <vc-graphics-label
        v-if="showCenterLabel"
        :text="sourcePoint.name || sourcePoint.label || '中心点'"
        :font="'14pt sans-serif'"
        :fill-color="'#ffffff'"
        :outline-color="'#000000'"
        :outline-width="2"
        :pixel-offset="[0, -35]"
        :show-background="true"
        :background-color="'rgba(0,0,0,0.7)'"
        :background-padding="[8, 4]"
        :disable-depth-test-distance="Number.POSITIVE_INFINITY"
      />
    </vc-entity>

    <!-- 圆环上的节点 -->
    <vc-entity
      v-for="node in ringNodes"
      :key="node.id"
      :id="node.id"
      :position="node.position"
      :show="visible"
      @click="onNodeClick(node, $event)"
      @mouseover="onNodeHover(node, $event)"
      @mouseout="onNodeLeave(node, $event)"
    >
      <vc-graphics-point
        :pixel-size="nodeSize"
        :color="nodeColor"
        :outline-color="nodeOutlineColor"
        :outline-width="2"
        :height-reference="0"
      />
      <vc-graphics-label
        v-if="showNodeLabels"
        :text="`虚拟节点${node.index + 1}`"
        :font="'10pt sans-serif'"
        :fill-color="'#cccccc'"
        :outline-color="'#000000'"
        :outline-width="1"
        :pixel-offset="[0, -20]"
        :show-background="true"
        :background-color="'rgba(0,0,0,0.6)'"
        :background-padding="[4, 2]"
      />
    </vc-entity>

    <!-- 从节点到目标点的连线 -->
    <line-with-label
      v-for="connection in nodeConnections"
      :key="connection.id"
      :show="visible && showConnections"
      :positions="connection.positions"
      :width="connectionWidth"
      :material="connectionMaterial"
      :show-label="showConnectionLabels"
      :label-style="connection.labelStyle"
      :curve-config="connection.curveConfig"
      @click="onConnectionClick(connection, $event)"
      @mouseover="onConnectionHover(connection, $event)"
      @mouseout="onConnectionLeave(connection, $event)"
    />
  </template>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import LineWithLabel from './LineWithLabel.vue'
import { getMaterialProperty } from './material'
import { MATERIAL_TYPES } from './constanst'

// Props定义
const props = defineProps({
  // Cesium viewer 实例
  viewer: {
    type: Object,
    required: true
  },
  // 基础属性
  visible: {
    type: Boolean,
    default: true
  },
  sourcePoint: {
    type: Object,
    required: true
  },
  targetPoint: {
    type: Object,
    required: true
  },
  
  // 圆环配置
  ringRadius: {
    type: Number,
    default: 50000 // 50km
  },
  ringMaterial: {
    type: String,
    default: 'rgba(0, 255, 255, 0.3)'
  },
  ringOutlineColor: {
    type: String,
    default: '#00ffff'
  },
  
  // 中心点配置
  showCenterLabel: {
    type: Boolean,
    default: true
  },
  centerPointSize: {
    type: Number,
    default: 12
  },
  centerPointColor: {
    type: String,
    default: '#00ff00'
  },
  centerPointOutlineColor: {
    type: String,
    default: '#ffffff'
  },
  
  // 虚拟节点配置
  nodeCount: {
    type: Number,
    default: 6
  },
  nodeSize: {
    type: Number,
    default: 6
  },
  nodeColor: {
    type: String,
    default: '#ff6b35'
  },
  nodeOutlineColor: {
    type: String,
    default: '#ffffff'
  },
  showNodeLabels: {
    type: Boolean,
    default: true
  },
  
  // 连线配置
  showConnections: {
    type: Boolean,
    default: true
  },
  connectionWidth: {
    type: Number,
    default: 2
  },
  connectionMaterial: {
    type: String,
    default: MATERIAL_TYPES.POLYLINE_DYNAMIC_TEXTURE
  },
  showConnectionLabels: {
    type: Boolean,
    default: false
  },
  
  // 动画配置
  enableAnimation: {
    type: Boolean,
    default: true
  },
  animationSpeed: {
    type: Number,
    default: 1.0
  }
})

// Emits定义
const emit = defineEmits([
  'centerPointClick',
  'centerPointHover',
  'centerPointLeave',
  'nodeClick',
  'nodeHover',
  'nodeLeave',
  'connectionClick',
  'connectionHover',
  'connectionLeave'
])

// 计算圆环上的节点位置
const ringNodes = computed(() => {
  if (!props.sourcePoint || !props.nodeCount || !window.Cesium) return []
  
  const nodes = []
  const angleStep = (2 * Math.PI) / props.nodeCount
  
  // 获取源点的经纬度
  const sourceLon = props.sourcePoint.longitude || props.sourcePoint.position[0]
  const sourceLat = props.sourcePoint.latitude || props.sourcePoint.position[1]
  const sourceHeight = props.sourcePoint.altitude || props.sourcePoint.position[2] || 0
  
  // 将源点转换为笛卡尔坐标
  const sourceCartesian = window.Cesium.Cartesian3.fromDegrees(sourceLon, sourceLat, sourceHeight)
  
  for (let i = 0; i < props.nodeCount; i++) {
    const angle = i * angleStep
    
    // 使用Cesium的地理坐标系统进行准确计算
    // 在源点的切平面上计算圆环节点位置
    const eastNorthUp = window.Cesium.Transforms.eastNorthUpToFixedFrame(sourceCartesian)
    
    // 在ENU坐标系中计算节点的相对位置
    const localX = props.ringRadius * Math.cos(angle) // 东向
    const localY = props.ringRadius * Math.sin(angle) // 北向
    const localZ = 1000 // 稍微抬高避免重叠
    
    const localPosition = new window.Cesium.Cartesian3(localX, localY, localZ)
    
    // 将局部坐标转换为世界坐标
    const worldPosition = window.Cesium.Matrix4.multiplyByPoint(eastNorthUp, localPosition, new window.Cesium.Cartesian3())
    
    // 转换回经纬度坐标
    const cartographic = window.Cesium.Cartographic.fromCartesian(worldPosition)
    const nodeLon = window.Cesium.Math.toDegrees(cartographic.longitude)
    const nodeLat = window.Cesium.Math.toDegrees(cartographic.latitude)
    const nodeHeight = cartographic.height
    
    nodes.push({
      id: `ring-node-${props.sourcePoint.id}-${i}`,
      index: i,
      position: [nodeLon, nodeLat, nodeHeight],
      angle: angle,
      label: `节点${i + 1}`
    })
  }
  
  return nodes
})

// 计算从节点到目标点的连线
const nodeConnections = computed(() => {
  if (!props.targetPoint || !ringNodes.value.length) return []
  
  const connections = []
  const targetPos = props.targetPoint.position || [
    props.targetPoint.longitude,
    props.targetPoint.latitude,
    props.targetPoint.altitude || 0
  ]
  
  ringNodes.value.forEach((node, index) => {
    const material = getMaterialProperty(
      props.connectionMaterial,
      {
        color: props.nodeColor,
        speed: props.animationSpeed,
        percent: 0.3,
        alpha: 0.8
      }
    )
    
    connections.push({
      id: `connection-${node.id}-to-${props.targetPoint.id}`,
      positions: [node.position, targetPos],
      material: material,
      labelStyle: {
        text: `连接${index + 1}`,
        font: '10pt sans-serif',
        fillColor: '#ffffff',
        outlineColor: '#000000',
        outlineWidth: 1,
        pixelOffset: [0, -15],
        showBackground: true,
        backgroundColor: 'rgba(0,0,0,0.5)'
      },
      curveConfig: {
        enabled: true,
        height: 20000 // 20km弧高
      },
      sourceNode: node,
      targetPoint: props.targetPoint
    })
  })
  
  return connections
})

// 事件处理函数
// 中心点事件处理
function onCenterPointClick(centerPoint, event) {
  emit('centerPointClick', { centerPoint, event })
}

function onCenterPointHover(centerPoint, event) {
  document.body.style.cursor = 'pointer'
  emit('centerPointHover', { centerPoint, event })
}

function onCenterPointLeave(centerPoint, event) {
  document.body.style.cursor = 'auto'
  emit('centerPointLeave', { centerPoint, event })
}

// 虚拟节点事件处理
function onNodeClick(node, event) {
  emit('nodeClick', { node, event, sourcePoint: props.sourcePoint })
}

function onNodeHover(node, event) {
  document.body.style.cursor = 'pointer'
  emit('nodeHover', { node, event, sourcePoint: props.sourcePoint })
}

function onNodeLeave(node, event) {
  document.body.style.cursor = 'auto'
  emit('nodeLeave', { node, event, sourcePoint: props.sourcePoint })
}

function onConnectionClick(connection, event) {
  emit('connectionClick', { connection, event })
}

function onConnectionHover(connection, event) {
  document.body.style.cursor = 'pointer'
  emit('connectionHover', { connection, event })
}

function onConnectionLeave(connection, event) {
  document.body.style.cursor = 'auto'
  emit('connectionLeave', { connection, event })
}

// 监听属性变化，重新计算节点位置
watch(
  [() => props.sourcePoint, () => props.nodeCount, () => props.ringRadius],
  () => {
    // 节点位置会自动重新计算（computed属性）
    console.log('圆环节点连接器配置更新', {
      sourcePoint: props.sourcePoint,
      targetPoint: props.targetPoint,
      nodeCount: props.nodeCount,
      ringRadius: props.ringRadius
    })
  },
  { deep: true }
)
</script>

<style scoped>
/* 组件样式 */
</style>