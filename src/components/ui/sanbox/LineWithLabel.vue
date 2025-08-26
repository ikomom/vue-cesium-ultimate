<template>
  <vc-entity
    :id="entityId"
    :show="show"
    :position="labelPosition"
    @click="handleClick"
    @mouseover="handleMouseover"
    @mouseout="handleMouseout"
  >
    <!-- 关系连线 -->
    <vc-graphics-polyline
      :positions="positions"
      :distance-display-condition="distanceDisplayCondition"
      :width="width"
      :material="material"
    />
    <!-- 文字标签 -->
    <vc-graphics-label v-if="showLabel" v-bind="labelStyle" />
  </vc-entity>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { generateCurve } from './utils/map'
import { useVueCesium } from 'vue-cesium'

// Props定义
const props = defineProps({
  // 基础属性
  id: {
    type: String,
  },
  show: {
    type: Boolean,
  },
  distanceDisplayCondition: {
    type: Object,
    default: () => null,
  },
  // 线条属性
  positions: {
    type: [Array, Object], // 支持数组或Cesium.CallbackProperty
    default: () => [],
  },
  width: {
    type: Number,
    default: 2,
  },
  material: {
    type: [Object, String],
    default: 'blue',
  },
  // 标签属性
  showLabel: {
    type: Boolean,
    default: true,
  },
  labelStyle: {
    type: Object,
    default: () => ({
      font: '12pt sans-serif',
      fillColor: window.Cesium?.Color?.WHITE || '#FFFFFF',
      outlineColor: window.Cesium?.Color?.BLACK || '#000000',
      outlineWidth: 2,
      style: window.Cesium?.LabelStyle?.FILL_AND_OUTLINE || 3,
      pixelOffset: new (window.Cesium?.Cartesian2 || class {})(0, -20),
      showBackground: true,
      backgroundColor: window.Cesium?.Color?.BLACK?.withAlpha?.(0.7) || 'rgba(0,0,0,0.7)',
      backgroundPadding: new (window.Cesium?.Cartesian2 || class {})(8, 4),
      distanceDisplayCondition: null,
      horizontalOrigin: window.Cesium?.HorizontalOrigin?.CENTER || 0,
      verticalOrigin: window.Cesium?.VerticalOrigin?.BOTTOM || 1,
    }),
  },

  // 曲线配置
  curveConfig: {
    type: Object,
    default: () => ({
      enabled: false,
      height: 100000, // 曲线高度
      segments: 50, // 曲线分段数
    }),
  },

  // 源点和目标点（用于计算标签位置）
  sourcePosition: {
    type: [Array, Object],
    default: null,
  },
  targetPosition: {
    type: [Array, Object],
    default: null,
  },

  // 新增：智能位置计算开关
  enableSmartPositioning: {
    type: Boolean,
    default: true,
  },
})

// Emits定义
const emit = defineEmits(['click', 'mouseover', 'mouseout'])

// 获取Cesium viewer实例
const { viewer } = useVueCesium()

// 响应式变量用于触发标签位置重新计算
const viewerUpdateTrigger = ref(0)

// 缓存已找到的可见标签位置
const lastVisiblePosition = ref(null)

// 标签是否可见的状态
const isLabelVisible = ref(false)

// 动态位置缓存
const lastDynamicPosition = ref(null)
const lastDynamicTime = ref(null)

// 计算实体ID
const entityId = computed(() => props.id)

// 计算标签位置
const labelPosition = computed(() => {
  // 触发重新计算（依赖viewerUpdateTrigger）
  viewerUpdateTrigger.value

  // 如果智能位置计算被禁用，使用默认中点计算
  if (!props.enableSmartPositioning) {
    return getDefaultPosition()
  }

  // 对于动态位置（CallbackProperty），需要特殊处理
  if (props.positions && typeof props.positions.getValue === 'function') {
    // 如果已有缓存的动态位置，直接返回（避免重复创建CallbackProperty）
    if (lastVisiblePosition.value && typeof lastVisiblePosition.value.getValue === 'function') {
      return lastVisiblePosition.value
    }

    // 创建新的动态位置（只创建一次，使用组件级缓存优化）
    const newPosition = new window.Cesium.CallbackProperty((time, result) => {
      const positions = props.positions.getValue(time)
      if (positions && positions.length >= 2) {
        // 检查时间是否变化，如果时间相同则返回缓存位置（使用秒级精度）
        const currentTimeSeconds = window.Cesium.JulianDate.toDate(time).getTime()

        if (lastDynamicTime.value === currentTimeSeconds && lastDynamicPosition.value) {
          return lastDynamicPosition.value
        }

        // 计算新位置并缓存
        const newPos = calculateVisibleMidPosition(positions)
        lastDynamicPosition.value = newPos
        lastDynamicTime.value = currentTimeSeconds
        return newPos
      }
      return window.Cesium.Cartesian3.ZERO
    }, false)

    lastVisiblePosition.value = newPosition
    isLabelVisible.value = true
    return newPosition
  }

  // 对于静态位置，检查缓存（优化：避免重复可见性检测）
  if (lastVisiblePosition.value && isLabelVisible.value) {
    // 直接返回缓存位置，不再进行可见性检测
    // 可见性状态会在视角变化时通过debounceUpdate重置
    return lastVisiblePosition.value
  }

  // 重新计算最佳位置
  const newPosition = getOptimalPosition()

  // 更新缓存的位置和可见状态
  lastVisiblePosition.value = newPosition
  isLabelVisible.value = isPositionVisible(newPosition)

  return newPosition
})

// 获取默认位置（不进行智能计算）
function getDefaultPosition() {
  // 如果positions是CallbackProperty，创建动态标签位置
  if (props.positions && typeof props.positions.getValue === 'function') {
    return new window.Cesium.CallbackProperty((time, result) => {
      const positions = props.positions.getValue(time)
      if (positions && positions.length >= 2) {
        return calculateMidPosition(positions)
      }
      return window.Cesium.Cartesian3.ZERO
    }, false)
  }

  // 静态位置计算
  if (Array.isArray(props.positions) && props.positions.length >= 2) {
    return calculateMidPosition(props.positions)
  }

  // 如果有源点和目标点，直接计算中点
  if (props.sourcePosition && props.targetPosition) {
    const sourcePos = Array.isArray(props.sourcePosition)
      ? window.Cesium.Cartesian3.fromDegrees(...props.sourcePosition)
      : props.sourcePosition
    const targetPos = Array.isArray(props.targetPosition)
      ? window.Cesium.Cartesian3.fromDegrees(...props.targetPosition)
      : props.targetPosition

    if (props.curveConfig.enabled) {
      // 对于曲线，计算曲线中点
      const curvePositions = generateCurve(sourcePos, targetPos, props.curveConfig.height)
      return calculateMidPosition(curvePositions)
    } else {
      // 直线中点
      const positions = [sourcePos, targetPos]
      return calculateMidPosition(positions)
    }
  }

  return window.Cesium.Cartesian3.ZERO
}

// 获取最佳位置（进行智能计算）
function getOptimalPosition() {
  // 如果positions是CallbackProperty，创建动态标签位置
  if (props.positions && typeof props.positions.getValue === 'function') {
    return new window.Cesium.CallbackProperty((time, result) => {
      const positions = props.positions.getValue(time)
      if (positions && positions.length >= 2) {
        return calculateVisibleMidPosition(positions)
      }
      return window.Cesium.Cartesian3.ZERO
    }, false)
  }

  // 静态位置计算
  if (Array.isArray(props.positions) && props.positions.length >= 2) {
    return calculateVisibleMidPosition(props.positions)
  }

  // 如果有源点和目标点，直接计算中点
  if (props.sourcePosition && props.targetPosition) {
    const sourcePos = Array.isArray(props.sourcePosition)
      ? window.Cesium.Cartesian3.fromDegrees(...props.sourcePosition)
      : props.sourcePosition
    const targetPos = Array.isArray(props.targetPosition)
      ? window.Cesium.Cartesian3.fromDegrees(...props.targetPosition)
      : props.targetPosition

    if (props.curveConfig.enabled) {
      // 对于曲线，计算曲线中点
      const curvePositions = generateCurve(sourcePos, targetPos, props.curveConfig.height)
      return calculateVisibleMidPosition(curvePositions)
    } else {
      // 直线中点
      const positions = [sourcePos, targetPos]
      return calculateVisibleMidPosition(positions)
    }
  }

  return window.Cesium.Cartesian3.ZERO
}

// 检查位置是否可见
function isPositionVisible(position) {
  if (!viewer || !viewer.camera || !viewer.scene || !position) {
    return false
  }

  try {
    // 使用Cesium的可见性检测
    const occluder = new window.Cesium.EllipsoidalOccluder(
      window.Cesium.Ellipsoid.WGS84,
      viewer.camera.position,
    )
    const isVisible = occluder.isPointVisible(position)

    if (!isVisible) return false

    // 检查是否在视锥体内
    const windowPosition = viewer.scene.cartesianToCanvasCoordinates(position)
    if (!windowPosition) return false

    // 检查是否在屏幕范围内
    const margin = 20
    return (
      windowPosition.x >= margin &&
      windowPosition.x <= viewer.canvas.clientWidth - margin &&
      windowPosition.y >= margin &&
      windowPosition.y <= viewer.canvas.clientHeight - margin
    )
  } catch (error) {
    console.warn('Position visibility check failed:', error)
    return false
  }
}

/**
 * 计算位置数组的中点
 * @param {Array} positions - 位置数组
 * @returns {Cesium.Cartesian3} 中点位置
 */
function calculateMidPosition(positions) {
  if (!positions || positions.length === 0) {
    return window.Cesium.Cartesian3.ZERO
  }

  // 如果是经纬度数组格式，转换为Cartesian3
  const cartesianPositions = positions.map((pos) => {
    if (Array.isArray(pos)) {
      return window.Cesium.Cartesian3.fromDegrees(pos[0], pos[1], pos[2] || 0)
    }
    return pos
  })

  // 计算中点索引
  const midIndex = Math.floor(cartesianPositions.length / 2)

  // 如果是偶数个点，取中间两点的平均值
  if (cartesianPositions.length % 2 === 0 && midIndex > 0) {
    const pos1 = cartesianPositions[midIndex - 1]
    const pos2 = cartesianPositions[midIndex]
    return window.Cesium.Cartesian3.lerp(pos1, pos2, 0.5, new window.Cesium.Cartesian3())
  }

  // 奇数个点，直接取中点
  return cartesianPositions[midIndex]
}

/**
 * 根据当前视角计算最适合显示标签的位置
 * @param {Array} positions - 位置数组
 * @returns {Cesium.Cartesian3} 最佳标签位置
 */
function calculateVisibleMidPosition(positions) {
  if (!positions || positions.length === 0) {
    return window.Cesium.Cartesian3.ZERO
  }

  // 如果viewer不可用，使用默认中点计算
  if (!viewer || !viewer.camera || !viewer.scene) {
    return calculateMidPosition(positions)
  }

  // 转换为Cartesian3格式
  const cartesianPositions = positions.map((pos) => {
    if (Array.isArray(pos)) {
      return window.Cesium.Cartesian3.fromDegrees(pos[0], pos[1], pos[2] || 0)
    }
    return pos
  })

  if (cartesianPositions.length < 2) {
    return cartesianPositions[0] || window.Cesium.Cartesian3.ZERO
  }

  const scene = viewer.scene
  const camera = viewer.camera
  const canvas = viewer.canvas

  // 收集所有候选位置
  const candidatePositions = []

  // 为每个线段生成多个采样点
  for (let i = 0; i < cartesianPositions.length - 1; i++) {
    const segmentStart = cartesianPositions[i]
    const segmentEnd = cartesianPositions[i + 1]

    // 在线段上生成5个采样点（包括两端点和中点）
    for (let j = 0; j <= 4; j++) {
      const t = j / 4 // 0, 0.25, 0.5, 0.75, 1
      const samplePoint = window.Cesium.Cartesian3.lerp(
        segmentStart,
        segmentEnd,
        t,
        new window.Cesium.Cartesian3(),
      )
      candidatePositions.push(samplePoint)
    }
  }

  // 如果是单线段，额外添加更多采样点
  if (cartesianPositions.length === 2) {
    const start = cartesianPositions[0]
    const end = cartesianPositions[1]

    // 在线段上生成更密集的采样点
    for (let i = 1; i <= 9; i++) {
      const t = i / 10 // 0.1, 0.2, ..., 0.9
      const samplePoint = window.Cesium.Cartesian3.lerp(
        start,
        end,
        t,
        new window.Cesium.Cartesian3(),
      )
      candidatePositions.push(samplePoint)
    }
  }

  // 添加整体中点作为备选
  candidatePositions.push(calculateMidPosition(positions))

  // 找到最佳可见位置
  let bestPosition = null
  let bestScore = -1

  for (const position of candidatePositions) {
    // 使用Cesium的可见性检测
    const occluder = new window.Cesium.EllipsoidalOccluder(
      window.Cesium.Ellipsoid.WGS84,
      camera.position,
    )
    const isVisible = occluder.isPointVisible(position)

    if (!isVisible) continue

    // 检查是否在视锥体内
    const windowPosition = scene.cartesianToCanvasCoordinates(position)
    if (!windowPosition) continue

    // 检查是否在屏幕范围内（留一些边距）
    const margin = 50 // 50像素边距
    const inScreen =
      windowPosition.x >= margin &&
      windowPosition.x <= canvas.clientWidth - margin &&
      windowPosition.y >= margin &&
      windowPosition.y <= canvas.clientHeight - margin

    if (!inScreen) continue

    // 计算评分：距离屏幕中心越近越好，距离相机适中
    const centerX = canvas.clientWidth / 2
    const centerY = canvas.clientHeight / 2
    const distanceToCenter = Math.sqrt(
      Math.pow(windowPosition.x - centerX, 2) + Math.pow(windowPosition.y - centerY, 2),
    )
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)
    const centerScore = 1 - distanceToCenter / maxDistance

    // 距离相机的评分（不要太近也不要太远）
    const cameraDistance = window.Cesium.Cartesian3.distance(camera.position, position)
    const optimalDistance = 10000 // 理想距离10km
    const distanceScore = Math.exp(-Math.abs(cameraDistance - optimalDistance) / optimalDistance)

    // 综合评分
    const score = centerScore * 0.7 + distanceScore * 0.3

    if (score > bestScore) {
      bestScore = score
      bestPosition = position
    }
  }

  // 如果没有找到合适的可见位置，使用备用策略
  if (!bestPosition) {
    // 备用策略1：选择距离相机最近的候选位置
    let closestPosition = null
    let minDistance = Infinity

    for (const position of candidatePositions) {
      const distance = window.Cesium.Cartesian3.distance(camera.position, position)
      if (distance < minDistance) {
        minDistance = distance
        closestPosition = position
      }
    }

    if (closestPosition) {
      // 将最近的位置稍微向相机方向偏移，提高可见性
      const direction = window.Cesium.Cartesian3.subtract(
        camera.position,
        closestPosition,
        new window.Cesium.Cartesian3(),
      )
      window.Cesium.Cartesian3.normalize(direction, direction)
      const offset = window.Cesium.Cartesian3.multiplyByScalar(
        direction,
        minDistance * 0.1,
        new window.Cesium.Cartesian3(),
      )
      return window.Cesium.Cartesian3.add(closestPosition, offset, new window.Cesium.Cartesian3())
    }

    // 备用策略2：返回默认中点
    return calculateMidPosition(positions)
  }

  return bestPosition
}

// 事件处理函数
const handleClick = (event) => {
  emit('click', event)
}

const handleMouseover = (event) => {
  emit('mouseover', event)
}

const handleMouseout = (event) => {
  emit('mouseout', event)
}

// 视角变化监听器
let cameraChangeListener = null
let debounceTimer = null

// 防抖函数，避免频繁更新
function debounceUpdate() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    // 清除所有缓存的位置，强制重新计算
    lastVisiblePosition.value = null
    isLabelVisible.value = false
    lastDynamicPosition.value = null
    lastDynamicTime.value = null

    viewerUpdateTrigger.value++
  }, 50) // 50ms防抖延迟
}

// 组件挂载时添加视角变化监听
onMounted(() => {
  if (viewer && viewer.camera) {
    // 监听相机移动事件
    cameraChangeListener = viewer.camera.changed.addEventListener(() => {
      // console.log('相机移动事件触发');

      // 使用防抖触发标签位置重新计算
      debounceUpdate()
    })
  }
})

// 组件卸载时移除监听器
onUnmounted(() => {
  if (cameraChangeListener && viewer && viewer.camera) {
    cameraChangeListener()
    cameraChangeListener = null
  }

  // 清理防抖定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
})
</script>

<style scoped>
/* 组件样式 */
</style>
