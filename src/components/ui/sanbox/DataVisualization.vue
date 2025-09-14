<template>
  <template>
    <!-- 目标点位 -->
    <vc-entity
      v-for="target in renderPoints"
      :key="target.id"
      :id="target.id"
      :show="visible && showPoints"
      :position="target.position"
      :billboard="target.billboard"
      :model="target.model"
      :label="target.label"
      :point="target.point"
      :ellipse="target.ellipse"
      @click="onTargetClick(target, $event)"
      @dblclick="onTargetDblClick(target, $event)"
      @mouseover="onTargetHover(target, $event)"
      @mouseout="onTargetLeave(target, $event)"
    />
  </template>
  <template>
    <!-- 关系连线 -->
    <line-with-label
      v-for="relation in renderRelations"
      :key="relation.id"
      :show="visible && showRelation"
      :positions="relation.positions"
      :width="relation.width"
      :distance-display-condition="relation.distanceDisplayCondition"
      :material="relation.material"
      :show-label="false"
      :label-style="relation.labelStyle"
      :curve-config="relation.curveConfig"
      @click="onRelationClick(relation, $event)"
      @mouseover="onRelationHover(relation, $event)"
      @mouseout="onRelationLeave(relation, $event)"
    />
  </template>
  <template>
    <!-- 轨迹实体 -->
    <vc-entity
      v-for="trajectory in renderTrajectory"
      :key="trajectory.id"
      :id="trajectory.id"
      :show="visible && showTrajectory"
      :position="trajectory.position"
      :billboard="trajectory.billboard"
      :model="trajectory.model"
      :label="trajectory.label"
      :path="trajectory.path"
      @click="onTrajectoryClick(trajectory, $event)"
      @dblclick="onTrajectoryDblClick(trajectory, $event)"
      @mouseover="onTrajectoryHover(trajectory, $event)"
      @mouseout="onTrajectoryLeave(trajectory, $event)"
    />
  </template>
  <template>
    <!-- 事件实体 -->
    <line-with-label
      v-for="event in renderEvents"
      :key="event.id"
      :show="visible && showEvents"
      :positions="event.positions"
      :width="event.width"
      :distance-display-condition="event.distanceDisplayCondition"
      :material="event.material"
      :show-label="true"
      :label-style="event.labelStyle"
      :curve-config="event.curveConfig"
      @click="onEventClick(event, $event)"
      @mouseover="onEventHover(event, $event)"
      @mouseout="onEventLeave(event, $event)"
    />
  </template>

  <!-- 动态圆环渲染 -->
  <template v-for="[ringId, ringConfig] in activeRings" :key="ringId">
    <vc-entity
      :id="ringConfig.id"
      :position="ringConfig.position"
      :selectable="false"
      @dblclick="onTargetDblClick(ringConfig.target, $event)"
    >
      <vc-graphics-ellipse
        :semi-major-axis="ringConfig.radius"
        :semi-minor-axis="ringConfig.radius"
        :height="ringConfig.height || 0"
        :material="ringConfig.material"
        :outline="true"
        :outline-color="ringConfig.outlineColor"
        :outline-width="2"
      />
    </vc-entity>
  </template>

  <!-- 虚拟节点渲染 -->
  <template v-for="[nodesId, nodes] in virtualNodes" :key="nodesId">
    <template v-for="node in nodes" :key="node.id">
      <vc-entity
        :id="node.id"
        :position="node.position"
        :billboard="node.billboard"
        :label="node.label"
        :point="node.point"
        @click="onVirtualNodeClick(node)"
      />
    </template>
  </template>

  <!-- 虚拟节点连线渲染 -->
  <template v-for="[relationsId, relations] in virtualRelations" :key="relationsId">
    <template v-for="relation in relations" :key="relation.id">
      <LineWithLabel
        :id="relation.id"
        :show="true"
        :positions="relation.positions"
        :width="relation.width"
        :material="relation.material"
        :show-label="relation.showLabel"
        :label-style="relation.labelStyle"
        :source-position="relation.sourcePosition"
        :target-position="relation.targetPosition"
      />
    </template>
  </template>

  <!-- 虚拟节点事件渲染 -->
  <template v-for="[eventsId, events] in virtualEvents" :key="eventsId">
    <template v-for="event in events" :key="event.id">
      <LineWithLabel
        :id="event.id"
        :show="true"
        :positions="event.positions"
        :width="event.width"
        :material="event.material"
        :availability="event.availability"
        :show-label="event.showLabel"
        :label-style="event.labelStyle"
        :source-position="event.sourcePosition"
        :target-position="event.targetPosition"
      />
    </template>
  </template>
</template>

<script setup>
import {
  watch,
  watchEffect,
  ref,
  shallowRef,
  toRefs,
  computed,
  toRaw,
  nextTick,
  onMounted,
  readonly,
} from 'vue'
import { debounce } from 'lodash-es'
import { DataManagerFactory } from '@/components/ui/sanbox/manager'
import {
  getRelationStyleConfig,
  getTargetIconConfig,
  getDistanceConfigs,
  getEventStatusStyleConfig,
  getTargetStatusStyleConfig,
  getStatusConfigByPriority,
  getHealthLevelColor,
  getAffiliationColor,
} from './config/visualConfig'
import { getMaterialProperty } from './material'
import { MATERIAL_TYPES } from './constanst'
import { generateCurve } from './utils/map'
import { useVueCesium } from 'vue-cesium'
import { animationManager } from './utils/animationEffects'
import LineWithLabel from './LineWithLabel.vue'

// Props定义
const props = defineProps({
  viewer: {
    type: Object,
    default: null,
  },
  dataManager: {
    type: DataManagerFactory,
    default: () => new DataManagerFactory(),
  },
  layerId: {
    type: String,
    default: '',
  },
  layerName: {
    type: String,
    default: '',
  },
  visible: {
    type: Boolean,
    default: true,
  },
  points: {
    type: Array,
    default: () => [],
  },
  targets: {
    type: Array,
    default: () => [],
  },
  relations: {
    type: Array,
    default: () => [],
  },
  trajectories: {
    type: Object,
    default: () => ({}),
  },
  events: {
    type: Array,
    default: () => [],
  },
  targetStatus: {
    type: Array,
    default: () => [],
  },
  showPoints: {
    type: Boolean,
    default: true,
  },
  showRelation: {
    type: Boolean,
    default: true,
  },
  showTrajectory: {
    type: Boolean,
    default: true,
  },
  showEvents: {
    type: Boolean,
    default: true,
  },
  showTargetStatus: {
    type: Boolean,
    default: true,
  },
})

// 使用传入的viewer或者useVueCesium的viewer作为备选
const { viewer: vueCesiumViewer } = useVueCesium()
const viewer = computed(() => props.viewer || (vueCesiumViewer && vueCesiumViewer.value))
const { layerId, layerName } = toRefs(props)
const { dataManager } = props

// Emits定义
const emit = defineEmits([
  'targetClick',
  'targetDblClick',
  'relationClick',
  'targetHover',
  'targetLeave',
  'relationHover',
  'relationLeave',
  'trajectoryClick',
  'trajectoryHover',
  'trajectoryLeave',
  'eventClick',
  'eventHover',
  'eventLeave',
])

// 使用shallowRef优化性能，避免深度响应式
const renderPoints = shallowRef([])
const renderRelations = shallowRef([])
const renderTrajectory = shallowRef([])
const renderEvents = shallowRef([])

// 圆环状态管理
const activeRings = ref(new Map()) // 存储活跃的圆环实体
const virtualNodes = ref(new Map()) // 存储虚拟节点
const virtualRelations = ref(new Map()) // 虚拟节点上的连线
const virtualEvents = ref(new Map()) // 虚拟节点上的事件

// 轨迹时间记录管理
const trajectoryTimeLog = ref(new Map()) // 存储每个轨迹的开始时间和消失时间

// 缓存配置对象，避免重复计算
const distanceConfigs = getDistanceConfigs()

// 创建日志前缀，统一日志样式
const createLogPrefix = (type) => {
  const layerInfo = layerName.value ? `[${layerName.value}]` : `[Layer-${layerId.value}]`
  return `%c🎯 图层 ${layerInfo} - ${type} %c`
}

const logStyles = {
  primary:
    'color: #409eff; font-weight: bold; background: #f0f9ff; padding: 2px 6px; border-radius: 3px;',
  secondary: 'color: #666; font-weight: normal;',
}

function logFuncWrap(func, type) {
  return (...args) => {
    // console.group(createLogPrefix(type), logStyles.primary, logStyles.secondary, ...args)
    func(...args)
    // console.groupEnd()
  }
}

// 初始化日志
console.log(createLogPrefix('初始化'), logStyles.primary, logStyles.secondary, {
  dataManager,
  layerId: props.layerId,
  layerName: props.layerName,
})

function setPointer(cursor = 'auto') {
  document.body.style.cursor = cursor
}

// 防抖处理，避免频繁更新
const debounceUpdate = debounce((callback) => {
  callback()
}, 300)

// 图像缓存对象
const imageCache = new Map()

/**
 * 使用canvas重绘图像并在右上角添加颜色圆点
 * @param {string} baseImageUrl - 原始图像URL
 * @param {string} affiliationColor - affiliation颜色（十六进制）
 * @returns {Promise<string>} 返回canvas生成的data URL的Promise
 */
function createImageWithAffiliationDot(baseImageUrl, affiliationColor) {
  const cacheKey = `${baseImageUrl}_${affiliationColor}`

  // 检查缓存
  if (imageCache.has(cacheKey)) {
    return Promise.resolve(imageCache.get(cacheKey))
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    // 设置跨域属性
    img.crossOrigin = 'anonymous'

    img.onload = function () {
      try {
        // 设置canvas尺寸
        canvas.width = img.width
        canvas.height = img.height

        // 绘制原始图像
        ctx.drawImage(img, 0, 0)

        // 计算圆点位置和大小
        const dotRadius = Math.max(img.width * 0.12, 6) // 圆点半径为图像宽度的12%，最小6像素
        const padding = 2 // 边距，确保圆点不会被裁切
        const dotX = img.width - dotRadius - padding // 右上角位置，确保圆点完全在canvas内
        const dotY = dotRadius + padding // 上边距，确保圆点完全在canvas内

        // 绘制圆点背景（白色边框）
        ctx.beginPath()
        ctx.arc(dotX, dotY, dotRadius + 1, 0, 2 * Math.PI)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()

        // 绘制affiliation颜色圆点
        ctx.beginPath()
        ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI)
        // 确保affiliationColor有效，否则使用默认蓝色
        ctx.fillStyle = affiliationColor || '#0000FF'
        ctx.fill()

        // 添加圆点边框（细一点，避免覆盖颜色）
        ctx.beginPath()
        ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI)
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 0.5
        ctx.stroke()

        // 生成data URL并缓存
        const dataUrl = canvas.toDataURL('image/png')
        imageCache.set(cacheKey, dataUrl)
        resolve(dataUrl)
      } catch (error) {
        console.warn('Canvas drawing error:', error)
        resolve(baseImageUrl)
      }
    }

    img.onerror = function () {
      console.warn('Failed to load image for affiliation dot:', baseImageUrl)
      resolve(baseImageUrl)
    }

    // 开始加载图像
    img.src = baseImageUrl
  })
}

/**
 * 同步版本的图像处理函数，用于CallbackProperty
 * @param {string} baseImageUrl - 原始图像URL
 * @param {string} affiliationColor - affiliation颜色（十六进制）
 * @returns {string} 返回处理后的图像URL或原始URL
 */
function getImageWithAffiliationDot(baseImageUrl, affiliationColor) {
  const cacheKey = `${baseImageUrl}_${affiliationColor}`

  // 如果缓存中有处理好的图像，直接返回
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)
  }

  // 如果缓存中没有，启动异步处理，但先返回原始图像
  createImageWithAffiliationDot(baseImageUrl, affiliationColor).then(() => {
    // 异步处理完成后，触发场景更新
    if (viewer.value && viewer.value.scene) {
      viewer.value.scene.requestRender()
    }
  })

  return baseImageUrl
}
/**
 * 获取两点之间的位置数组
 * @param {Object|Cesium.Cartesian3} source - 源点位置,可以是经纬度对象或Cartesian3对象
 * @param {Object|Cesium.Cartesian3} target - 目标点位置,可以是经纬度对象或Cartesian3对象
 * @param {Object} styleConfig - 样式配置对象,包含curve相关配置
 * @param {Boolean} isCartesian3 - 输入是否为Cartesian3格式
 * @returns {Array} 返回位置数组,如果启用曲线则返回曲线点数组,否则返回起终点数组
 */
function getPosition(source, target, styleConfig, isCartesian3 = false) {
  return styleConfig.curve.enabled
    ? generateCurve(
        isCartesian3
          ? source
          : Cesium.Cartesian3.fromDegrees(source.longitude, source.latitude, source.height),
        isCartesian3
          ? target
          : Cesium.Cartesian3.fromDegrees(target.longitude, target.latitude, target.height),
        styleConfig.curve.height,
      )
    : [
        isCartesian3 ? source : [source.longitude, source.latitude, source.height],
        isCartesian3 ? target : [target.longitude, target.latitude, target.height],
      ]
}
/**
 * 根据实体ID数组查找第一个匹配的实体
 * @param {Array<string>} entityIds - 实体ID数组,可以包含多个ID
 * @returns {Cesium.Entity|null} 返回找到的第一个实体,如果都未找到则返回null
 * @example
 * // 查找单个实体
 * const entity = getEntityByIds(['entityId1'])
 *
 * // 查找多个实体中的第一个
 * const entity = getEntityByIds(['entityId1', 'entityId2'])
 */
function getEntityByIds(entityIds = []) {
  // console.log('viewer.value?.entities', viewer.value?.entities)
  // 遍历实体ID数组,返回第一个找到的实体
  for (const entityId of entityIds) {
    const entity = viewer.value?.entities?.getById(entityId)
    if (entity) {
      return entity
    }
  }
  return null
}

function getSourceTarget(data, styleConfig) {
  const linkTrajectorySource = dataManager.trajectoryManager.findById(data.source_id)
  const linkTrajectoryTarget = dataManager.trajectoryManager.findById(data.target_id)
  const islinkTrajectory = !!(linkTrajectorySource || linkTrajectoryTarget)

  const source = dataManager.targetLocationManager.findById(data.source_id)
  const target = dataManager.targetLocationManager.findById(data.target_id)

  if ((!source || !target) && !islinkTrajectory) {
    console.warn(`缺少源或目标点`, { data })
    return null
  }

  const positions = islinkTrajectory
    ? new Cesium.CallbackProperty((time, result) => {
        const linkSource = getEntityByIds([
          data.source_id + '@trajectory@' + layerId.value,
          data.source_id + '@point@' + layerId.value,
        ])?.position?.getValue(time)
        const linkTarget = getEntityByIds([
          data.target_id + '@trajectory@' + layerId.value,
          data.target_id + '@point@' + layerId.value,
        ])?.position?.getValue(time)
        if (linkSource && linkTarget) {
          return getPosition(linkSource, linkTarget, styleConfig, true)
        }
        return []
      }, false)
    : getPosition(source, target, styleConfig)

  return {
    source,
    target,
    positions,
    islinkTrajectory,
    linkTrajectoryTarget,
    linkTrajectorySource,
  }
}

// 处理点数据
const processPoint = logFuncWrap(() => {
  console.log('🎯 processPoint被调用 - props.points:', props.points)

  // 检查Cesium是否可用
  if (!window.Cesium) {
    console.warn('Cesium is not available yet, skipping processPoint')
    return
  }

  // 首先处理props.points数据，将其添加到dataManager
  if (props.points && props.points.length > 0) {
    // console.log('🎯 DataVisualization - 处理props.points数据:', props.points.length, '个点')
    // console.log('🎯 props.points详细内容:', JSON.stringify(props.points, null, 2))
    props.points.forEach((point) => {
      // 检查是否已存在，避免重复添加
      const existingLocation = dataManager.targetLocationManager.findById(point.id)
      const existingBase = dataManager.targetBaseManager.findById(point.id)

      if (!existingLocation) {
        // 将点数据添加到位置管理器
        dataManager.targetLocationManager.addItem(point)
        console.log('🎯 添加位置数据:', point.id, point.name)
      }

      if (!existingBase) {
        // 同时将基础信息添加到基础管理器
        const baseInfo = {
          id: point.id,
          name: point.name || point.id,
          type: point.type || 'unknown',
          description: point.description || '',
          status: point.status || 'active',
        }
        dataManager.targetBaseManager.addItem(baseInfo)
        console.log('🎯 添加基础数据:', baseInfo.id, baseInfo.name)
      }
    })
  }

  const allPoint = dataManager.targetLocationManager.getAll()
  // console.log('🎯 从targetLocationManager获取的所有点数据:', allPoint)
  // console.log('🎯 targetLocationManager内部状态:', dataManager.targetLocationManager)

  if (!allPoint || allPoint.length === 0) {
    // console.log(
    //   createLogPrefix('点数据'),
    //   logStyles.primary,
    //   logStyles.secondary,
    //   '没有点数据需要处理',
    // )
    renderPoints.value = []
    return
  }

  // console.log('🎯 DataVisualization - 从dataManager获取到的点数据:', allPoint.length, '个点')
  // console.log('🎯 allPoint详细内容:', JSON.stringify(allPoint, null, 2))
  // 这样可以确保源点在所有模式下都能正确显示

  renderPoints.value = allPoint
    .map((target) => {
      const base = dataManager.targetBaseManager.findById(target.id)
      if (!base) {
        console.error(
          createLogPrefix('点数据错误'),
          logStyles.primary,
          logStyles.secondary,
          `缺少目标基础信息 - ID: ${target.id}`,
          target,
        )
        return null
      }

      // 获取目标的所有状态数据并确保按时间排序（用于二分查找优化）
      const allTargetStatus = (dataManager.targetStatusManager?.findById(target.id) || []).sort(
        (a, b) => a.startTime.localeCompare(b.startTime),
      )

      // 性能优化：状态缓存机制 - 避免重复计算
      // 由于 CallbackProperty 会频繁调用，缓存可以显著提升性能
      let statusCache = {
        lastTime: null,
        lastTimeStr: null,
        cachedStatus: null,
      }

      // 根据时间获取当前有效状态的函数（性能优化版本）
      // 优化策略：
      // 1. 缓存机制：避免相同时间的重复计算
      // 2. 二分查找：将时间复杂度从 O(n) 降低到 O(log n)
      // 3. 数据预排序：确保二分查找的正确性
      const getCurrentStatus = (currentTime) => {
        if (!allTargetStatus.length) return null

        // 性能优化1：检查缓存是否有效（时间相同则直接返回缓存结果）
        if (
          statusCache.lastTime &&
          window.Cesium.JulianDate.equals(currentTime, statusCache.lastTime)
        ) {
          return statusCache.cachedStatus
        }

        // 将当前时间转换为ISO字符串进行比较
        const currentTimeStr = window.Cesium.JulianDate.toIso8601(currentTime)

        // 性能优化2：如果时间字符串相同，也直接返回缓存结果
        if (statusCache.lastTimeStr === currentTimeStr) {
          return statusCache.cachedStatus
        }

        // 性能优化3：使用二分查找替代线性搜索
        // 原来的 O(n) 线性搜索在状态数据较多时会造成性能瓶颈
        // 二分查找将复杂度降低到 O(log n)，显著提升性能
        let validStatus = null
        let left = 0
        let right = allTargetStatus.length - 1

        // 二分查找：找到最后一个开始时间 <= 当前时间的状态
        while (left <= right) {
          const mid = Math.floor((left + right) / 2)
          const status = allTargetStatus[mid]

          if (status.startTime <= currentTimeStr) {
            validStatus = status
            left = mid + 1 // 继续查找更晚的状态
          } else {
            right = mid - 1
          }
        }

        const result = validStatus || allTargetStatus[0] // 如果没找到，返回第一个状态

        // 更新缓存
        statusCache.lastTime = window.Cesium.JulianDate.clone(currentTime)
        statusCache.lastTimeStr = currentTimeStr
        statusCache.cachedStatus = result

        return result
      }

      const iconConfig = getTargetIconConfig(base.type)

      // 创建动态状态配置属性
      const statusVisualConfigProperty = new window.Cesium.CallbackProperty((time, result) => {
        const currentStatus = getCurrentStatus(time)

        if (!currentStatus) return {}

        const statusConfig = getTargetStatusStyleConfig(currentStatus.status_type)
        const priorityConfig = getStatusConfigByPriority(currentStatus.priority)

        const healthColor = currentStatus.metadata?.healthLevel
          ? getHealthLevelColor(currentStatus.metadata.healthLevel)
          : null
        const affiliationColor = currentStatus.metadata?.affiliation
          ? getAffiliationColor(currentStatus.metadata.affiliation)
          : null

        return {
          statusType: currentStatus.status_type,
          statusName: currentStatus.status_name,
          color: currentStatus.colorCode,
          priority: currentStatus.priority,
          description: currentStatus.description,
          animationEffect: currentStatus.animationEffect,
          iconState: currentStatus.iconState,
          healthColor: healthColor,
          affiliationColor: affiliationColor,
          visualProperties: statusConfig.visualProperties,
          priorityConfig: priorityConfig,
          startTime: currentStatus.startTime,
          metadata: currentStatus.metadata,
        }
      }, false)

      // 创建动态属性
      const dynamicBillboard = {
        ...distanceConfigs,
        ...iconConfig.billboard,
        image: new window.Cesium.CallbackProperty((time) => {
          const currentStatus = getCurrentStatus(time)

          if (!currentStatus) return iconConfig.billboard.image

          const statusConfig = getTargetStatusStyleConfig(currentStatus.status_type)
          const baseImage = statusConfig.billboard?.image || iconConfig.billboard.image

          // 获取affiliation颜色
          const affiliationColor = currentStatus.metadata?.affiliation
            ? getAffiliationColor(currentStatus.metadata.affiliation)
            : null

          // 如果有affiliation颜色，使用canvas重绘图像添加右上角圆点
          if (affiliationColor) {
            return getImageWithAffiliationDot(baseImage, affiliationColor)
          }

          return baseImage
        }, false),
        scale: new window.Cesium.CallbackProperty((time) => {
          const currentStatus = getCurrentStatus(time)
          if (!currentStatus) return iconConfig.billboard.scale || 1.0

          const statusConfig = getTargetStatusStyleConfig(currentStatus.status_type)
          const priorityConfig = getStatusConfigByPriority(currentStatus.priority)
          let baseScale =
            (statusConfig.billboard?.scale || iconConfig.billboard.scale || 1.0) *
            (priorityConfig.scale || 1.0)

          // 应用动画效果
          if (statusConfig.visualProperties) {
            const animationEffects = animationManager.getAnimationEffects(
              statusConfig.visualProperties,
            )
            if (animationEffects.scaleAnimation) {
              baseScale = animationEffects.scaleAnimation(time, baseScale)
            }
          }

          return baseScale
        }, false),
        color: new window.Cesium.CallbackProperty((time) => {
          const currentStatus = getCurrentStatus(time)
          if (!currentStatus)
            return (
              window.Cesium.Color.fromCssColorString(iconConfig.billboard.color) ||
              window.Cesium.Color.WHITE
            )

          const statusConfig = getTargetStatusStyleConfig(currentStatus.status_type)

          // 如果使用了affiliation圆点，则使用白色避免颜色混合
          const affiliationColor = currentStatus.metadata?.affiliation
            ? getAffiliationColor(currentStatus.metadata.affiliation)
            : null

          if (affiliationColor) {
            return window.Cesium.Color.WHITE
          }

          let color = currentStatus.colorCode
            ? window.Cesium.Color.fromCssColorString(currentStatus.colorCode)
            : window.Cesium.Color.fromCssColorString(
                statusConfig.billboard?.color || iconConfig.billboard.color,
              )

          // 应用视觉属性
          if (statusConfig.visualProperties) {
            const visualProps = statusConfig.visualProperties

            // 应用透明度
            let opacity = visualProps.opacity !== undefined ? visualProps.opacity : color.alpha

            // 应用动画效果
            const animationEffects = animationManager.getAnimationEffects(visualProps)
            if (animationEffects.opacityAnimation) {
              opacity = animationEffects.opacityAnimation(time, opacity)
            }

            color = color.withAlpha(opacity)

            // 应用亮度调整
            if (visualProps.brightness !== undefined && visualProps.brightness !== 1.0) {
              color = new window.Cesium.Color(
                Math.min(1.0, color.red * visualProps.brightness),
                Math.min(1.0, color.green * visualProps.brightness),
                Math.min(1.0, color.blue * visualProps.brightness),
                color.alpha,
              )
            }

            // 应用发光效果
            if (visualProps.glowEffect) {
              const glowEffect = animationManager.createGlowEffect(true, 1.0)
              if (glowEffect) {
                color = glowEffect(time, color)
              }
            }
          }

          return color
        }, false),
        // 添加旋转动画支持
        rotation: new window.Cesium.CallbackProperty((time) => {
          const currentStatus = getCurrentStatus(time)
          if (!currentStatus) return 0

          const statusConfig = getTargetStatusStyleConfig(currentStatus.status_type)
          if (statusConfig.visualProperties) {
            const animationEffects = animationManager.getAnimationEffects(
              statusConfig.visualProperties,
            )
            if (animationEffects.rotationAnimation) {
              // console.log('animationEffects.rotationAnimation(time)', animationEffects.rotationAnimation(time));

              return animationEffects.rotationAnimation(time)
            }
          }
          return 0
        }, false),
        // 添加像素偏移支持（用于震动效果）
        pixelOffset: new window.Cesium.CallbackProperty((time) => {
          const currentStatus = getCurrentStatus(time)
          if (!currentStatus) return new window.Cesium.Cartesian2(0, 0)

          const statusConfig = getTargetStatusStyleConfig(currentStatus.status_type)
          if (statusConfig.visualProperties && statusConfig.visualProperties.shakeIntensity) {
            const shakeEffect = animationManager.createShakeEffect(
              statusConfig.visualProperties.shakeIntensity,
            )
            if (shakeEffect) {
              return shakeEffect(time)
            }
          }
          return new window.Cesium.Cartesian2(0, 0)
        }, false),
      }

      const dynamicLabel = {
        ...distanceConfigs,
        ...iconConfig.label,
        text: new window.Cesium.CallbackProperty((time) => {
          const currentStatus = getCurrentStatus(time)
          return (
            target.name +
            (currentStatus ? ` [${currentStatus.status_name || currentStatus.statusName}]` : '')
          )
        }, false),
        fillColor: new window.Cesium.CallbackProperty((time) => {
          const currentStatus = getCurrentStatus(time)
          if (!currentStatus) return window.Cesium.Color(iconConfig.label.fillColor || '#FFFFFF')

          const statusConfig = getTargetStatusStyleConfig(currentStatus.status_type)
          const fillColor = statusConfig.label?.fillColor || iconConfig.label.fillColor

          return fillColor
            ? window.Cesium.Color.fromCssColorString(fillColor)
            : window.Cesium.Color.WHITE
        }, false),
      }

      const dynamicModel = {
        ...distanceConfigs,
        ...iconConfig.model,
        uri: new window.Cesium.CallbackProperty((time) => {
          const currentStatus = getCurrentStatus(time)
          if (!currentStatus) return iconConfig.model.uri

          const statusConfig = getTargetStatusStyleConfig(currentStatus.status_type)
          return statusConfig.model?.uri || iconConfig.model.uri
        }, false),
      }

      // 创建基于healthLevel的动态圆圈
      const dynamicEllipse = {
        semiMajorAxis: new window.Cesium.CallbackProperty((time) => {
          const currentStatus = getCurrentStatus(time)
          if (!currentStatus || !currentStatus.metadata?.healthLevel) return 0

          // 获取相机高度，用于层级缩放
          const cameraHeight = viewer.value?.camera?.positionCartographic?.height || 10000
          const heightFactor = Math.max(0.1, Math.min(10, cameraHeight / 10000)) // 高度因子范围：0.1-10

          // 获取图标的scale配置
          const statusConfig = getTargetStatusStyleConfig(currentStatus.status_type)
          const priorityConfig = getStatusConfigByPriority(currentStatus.priority)
          let iconScale =
            (statusConfig.billboard?.scale || iconConfig.billboard.scale || 1.0) *
            (priorityConfig.scale || 1.0)

          // 基础图标大小（像素），转换为米
          const baseIconSizeInMeters = 32 * iconScale * heightFactor

          // 圆圈半径比图标稍大一些（1.5-3倍），根据healthLevel调整
          const healthLevel = currentStatus.metadata.healthLevel
          const radiusMultiplier = 1.5 + (healthLevel / 100) * 1.5 // 1.5-3倍范围

          return baseIconSizeInMeters * radiusMultiplier
        }, false),
        semiMinorAxis: new window.Cesium.CallbackProperty((time) => {
          const currentStatus = getCurrentStatus(time)
          if (!currentStatus || !currentStatus.metadata?.healthLevel) return 0

          // 获取相机高度，用于层级缩放
          const cameraHeight = viewer.value?.camera?.positionCartographic?.height || 10000
          const heightFactor = Math.max(0.1, Math.min(10, cameraHeight / 10000)) // 高度因子范围：0.1-10

          // 获取图标的scale配置
          const statusConfig = getTargetStatusStyleConfig(currentStatus.status_type)
          const priorityConfig = getStatusConfigByPriority(currentStatus.priority)
          let iconScale =
            (statusConfig.billboard?.scale || iconConfig.billboard.scale || 1.0) *
            (priorityConfig.scale || 1.0)

          // 基础图标大小（像素），转换为米
          const baseIconSizeInMeters = 32 * iconScale * heightFactor

          // 圆圈半径比图标稍大一些（1.5-3倍），根据healthLevel调整
          const healthLevel = currentStatus.metadata.healthLevel
          const radiusMultiplier = 1.5 + (healthLevel / 100) * 1.5 // 1.5-3倍范围

          return baseIconSizeInMeters * radiusMultiplier
        }, false),
        material: new window.Cesium.ColorMaterialProperty(
          new window.Cesium.CallbackProperty((time) => {
            const currentStatus = getCurrentStatus(time)
            if (!currentStatus || !currentStatus.metadata?.healthLevel) {
              return window.Cesium.Color.TRANSPARENT
            }

            const healthColor = getHealthLevelColor(currentStatus.metadata.healthLevel)
            const color = window.Cesium.Color.fromCssColorString(healthColor)

            // 设置透明度，使圆圈半透明
            return color.withAlpha(0.3)
          }, false),
        ),
        outline: true,
        outlineColor: new window.Cesium.CallbackProperty((time) => {
          const currentStatus = getCurrentStatus(time)
          if (!currentStatus || !currentStatus.metadata?.healthLevel) {
            return window.Cesium.Color.TRANSPARENT
          }

          const healthColor = getHealthLevelColor(currentStatus.metadata.healthLevel)
          return window.Cesium.Color.fromCssColorString(healthColor)
        }, false),
        outlineWidth: 2,
        height: 0, // 贴地显示
        show: new window.Cesium.CallbackProperty((time) => {
          const currentStatus = getCurrentStatus(time)
          // 只有当存在healthLevel时才显示圆圈
          return currentStatus && currentStatus.metadata?.healthLevel !== undefined
        }, false),
      }

      return {
        id: target.id + '@point@' + layerId.value,
        origin: { ...target },
        originTarget: base, // 源target
        name: target.name,
        type: target.type,
        ringRadius: target.ringRadius || '',
        ringMaterial: target.ringMaterial || '',
        ringOutlineColor: target.ringOutlineColor || '',
        nodeConnections: target.nodeConnections || [],
        position: [target.longitude, target.latitude, target.height],
        billboard: dynamicBillboard,
        model: dynamicModel,
        label: dynamicLabel,
        ellipse: dynamicEllipse, // 添加基于healthLevel的圆圈
        // 状态相关属性（动态）
        targetStatus: new window.Cesium.CallbackProperty((time) => getCurrentStatus(time), false),
        statusVisualConfig: statusVisualConfigProperty,
        // 动态显示控制 - 默认显示，只有明确设置forceDisplay为false时才隐藏
        show: new window.Cesium.CallbackProperty((time) => {
          const currentStatus = getCurrentStatus(time)
          // 如果没有状态数据，默认显示
          if (!currentStatus) return true
          // 如果有状态数据，检查forceDisplay设置
          return currentStatus?.priorityConfig?.forceDisplay !== false
        }, false),
      }
    })
    .filter(Boolean)
  // console.log('点数据', { renderPoints: toRaw(renderPoints.value) })
}, '点位数据')

// 处理关系数据
const processRelation = logFuncWrap(() => {
  const allRelation = dataManager.relationManager.getAll()

  console.log('关系数据1111111111111111', allRelation)

  if (!allRelation || allRelation.length === 0) {
    console.log('没有关系数据需要处理')
    renderRelations.value = []
    return
  }

  renderRelations.value = allRelation
    .map((relation) => {
      const styleConfig = getRelationStyleConfig(relation.type)
      const sourceTarget = getSourceTarget(relation, styleConfig)
      if (!sourceTarget) return null
      const { source, target, positions } = sourceTarget

      const material = getMaterialProperty(styleConfig.material, styleConfig.materialProps)
      // 标签文本优先级：描述 > 名称 > 类型
      const labelText = relation.description || relation.name || relation.type || '关系线'

      return {
        id: relation.id + '@relation@' + layerId.value,
        name: relation.name,
        type: relation.type,
        target,
        source,
        // RelationLine组件属性
        positions,
        width: styleConfig.width,
        material: material,
        distanceDisplayCondition: distanceConfigs.distanceDisplayCondition,
        labelStyle: {
          ...distanceConfigs,
          text: labelText,
          font: '8pt sans-serif',
          fillColor: '#fff',
          outlineColor: '#000000',
          showBackground: true,
          backgroundColor: 'rgba(233,211,0,0.3)',
          outlineWidth: 2,
          pixelOffset: [0, -20],
          verticalOrigin: 1,
        },
        curveConfig: {
          enabled: styleConfig.curve?.enabled || false,
          height: styleConfig.curve?.height || 100000,
        },
        materialType: styleConfig.material,
      }
    })
    .filter(Boolean)
  console.log('关系数据', { renderRelations: toRaw(renderRelations.value) })
}, '关系数据')

// 处理轨迹数据
const processTrajectory = logFuncWrap(() => {
  const allTrajectory = dataManager.trajectoryManager.getAll()

  // 检查是否有轨迹数据
  if (!allTrajectory || allTrajectory.length === 0) {
    console.log('没有轨迹数据需要处理')
    renderTrajectory.value = []
    return
  }

  renderTrajectory.value = allTrajectory
    .map((trajectory) => {
      const base = dataManager.targetBaseManager.findById(trajectory.target_id)
      if (!base) {
        return null
      }

      if (!trajectory.trajectory || trajectory.trajectory.length === 0) {
        return null
      }
      const iconConfig = getTargetIconConfig(base.type)
      // 创建时间-位置样本点
      const positionSamples = []
      const timePositionProperty = new window.Cesium.SampledPositionProperty()

      // 轨迹ID
      const trajectoryId = trajectory.target_id

      trajectory.trajectory.forEach((point, index) => {
        // 确保timestamp是字符串格式
        const timestampStr =
          typeof point.timestamp === 'string' ? point.timestamp : String(point.timestamp)

        try {
          const time = window.Cesium.JulianDate.fromIso8601(timestampStr)
          const position = window.Cesium.Cartesian3.fromDegrees(
            point.longitude,
            point.latitude,
            point.altitude || point.height || 0,
          )

          timePositionProperty.addSample(time, position)
          positionSamples.push({
            time: timestampStr,
            position: [point.longitude, point.latitude, point.altitude || point.height || 0],
            speed: point.speed,
            status: point.status,
          })

          // 记录轨迹时间范围（只在第一个和最后一个点时记录）
          if (index === 0) {
            // 记录轨迹开始时间
            if (!trajectoryTimeLog.value.has(trajectoryId)) {
              trajectoryTimeLog.value.set(trajectoryId, {
                trajectoryId: trajectoryId,
                startTime: timestampStr,
                endTime: null,
                isVisible: false,
              })
            }
          }

          if (index === trajectory.trajectory.length - 1) {
            // 记录轨迹结束时间
            const timeRecord = trajectoryTimeLog.value.get(trajectoryId)
            if (timeRecord) {
              timeRecord.endTime = timestampStr
            }
          }
        } catch (error) {
          console.warn(`轨迹时间错误 时间格式转换失败: ${timestampStr}`, error)
        }
      })

      // 设置插值算法
      timePositionProperty.setInterpolationOptions({
        interpolationDegree: 1,
        interpolationAlgorithm: window.Cesium.LagrangePolynomialApproximation,
      })

      // 计算轨迹的时间范围
      const trajectoryTimes = positionSamples
        .map((sample) => sample.time)
        .sort((a, b) => window.Cesium.JulianDate.compare(a, b))
      const startTime = trajectoryTimes[0]
      const endTime = trajectoryTimes[trajectoryTimes.length - 1]

      // 创建时间可用性区间
      const availability = new window.Cesium.TimeIntervalCollection([
        new window.Cesium.TimeInterval({
          start: startTime,
          stop: endTime,
        }),
      ])

      return {
        id: trajectory.target_id + '@trajectory@' + layerId.value,
        name: trajectory.target_id,
        originTarget: base, // 源target
        // 设置时间可用性
        availability: availability,
        // 动态位置属性（随时间变化）
        position: timePositionProperty,
        // 轨迹路径
        // path: {
        //   show: true,
        //   material: window.Cesium.Color.YELLOW.withAlpha(0.8),
        //   width: 3,
        //   leadTime: 0,
        //   trailTime: 3600, // 显示1小时的轨迹尾迹
        //   resolution: 60, // 每60秒一个采样点
        // },
        // 目标标记
        billboard: {
          ...distanceConfigs,
          ...iconConfig.billboard,
        },
        // 标签
        model: {
          ...distanceConfigs,
          ...iconConfig.model,
        },
        label: {
          ...distanceConfigs,
          ...iconConfig.label,
          text: base.name,
        },
        // 原始轨迹数据
        trajectoryData: trajectory,
        positionSamples: positionSamples,
      }
    })
    .filter(Boolean)
  // console.log('轨迹数据', { renderTrajectory: toRaw(renderTrajectory.value) })
}, '轨迹数据')

/**
 * 更新轨迹的可见性状态
 * @param {string} trajectoryId - 轨迹ID
 * @param {boolean} isVisible - 是否可见
 * @param {string} currentTime - 当前时间（ISO8601格式）
 */
const updateTrajectoryVisibility = (trajectoryId, isVisible, currentTime) => {
  const timeRecord = trajectoryTimeLog.value.get(trajectoryId)
  if (!timeRecord) {
    return
  }

  const wasVisible = timeRecord.isVisible

  // 如果可见性发生变化，记录变化
  if (wasVisible !== isVisible) {
    timeRecord.isVisible = isVisible

    console.log(
      `轨迹可见性变化: ${trajectoryId} ${wasVisible ? '可见' : '不可见'} -> ${isVisible ? '可见' : '不可见'} at ${currentTime}`,
    )

    // // 如果轨迹被隐藏，同时隐藏对应的activeRings、virtualNodes、virtualRelations、virtualEvents
    // if (!isVisible) {
    //   const ringId = `ring-${trajectoryId}`
    //   const nodesId = `nodes-${trajectoryId}`

    //   // 移除对应的圆环、虚拟节点、虚拟连线和虚拟事件
    //   if (activeRings.value.has(ringId)) {
    //     activeRings.value.delete(ringId)
    //     console.log(`隐藏轨迹时移除圆环: ${ringId}`)
    //   }

    //   if (virtualNodes.value.has(nodesId)) {
    //     virtualNodes.value.delete(nodesId)
    //     console.log(`隐藏轨迹时移除虚拟节点: ${nodesId}`)
    //   }

    //   if (virtualRelations.value.has(nodesId)) {
    //     virtualRelations.value.delete(nodesId)
    //     console.log(`隐藏轨迹时移除虚拟连线: ${nodesId}`)
    //   }

    //   if (virtualEvents.value.has(nodesId)) {
    //     virtualEvents.value.delete(nodesId)
    //     console.log(`隐藏轨迹时移除虚拟事件: ${nodesId}`)
    //   }
    // }
  }
}

/**
 * 获取轨迹的时间记录
 * @param {string} trajectoryId - 轨迹ID
 * @returns {Object|null} 轨迹时间记录对象
 */
const getTrajectoryTimeRecord = (trajectoryId) => {
  return trajectoryTimeLog.value.get(trajectoryId) || null
}

/**
 * 获取所有轨迹的时间记录
 * @returns {Map} 所有轨迹时间记录
 */
const getAllTrajectoryTimeRecords = () => {
  return trajectoryTimeLog.value
}

/**
 * 检查轨迹在指定时间是否应该可见
 * @param {string} trajectoryId - 轨迹ID
 * @param {string} currentTime - 当前时间（ISO8601格式）
 * @returns {boolean} 是否应该可见
 */
const isTrajectoryVisibleAtTime = (trajectoryId, currentTime) => {
  const timeRecord = getTrajectoryTimeRecord(trajectoryId)
  if (!timeRecord || !timeRecord.startTime || !timeRecord.endTime) {
    return false
  }

  return currentTime >= timeRecord.startTime && currentTime <= timeRecord.endTime
}

// 处理事件数据
const processEvent = logFuncWrap(() => {
  const allEvent = dataManager.eventManager.getAll()

  if (!allEvent || allEvent.length === 0) {
    console.log('没有事件数据需要处理')
    renderEvents.value = []
    return
  }

  renderEvents.value = allEvent.map((event) => {
    const styleConfig = getEventStatusStyleConfig(event.type)
    const sourceTarget = getSourceTarget(event, styleConfig)
    if (!sourceTarget) return null
    const { source, target, positions } = sourceTarget
    const material = getMaterialProperty(styleConfig.material, styleConfig.materialProps)
    // 标签文本优先级：描述 > 名称 > 类型
    const labelText = event.description || '事件'

    // 创建事件时间可用性区间
    let availability = null
    if (event.startTime) {
      const startTime = window.Cesium.JulianDate.fromIso8601(event.startTime)
      let endTime = startTime

      // 如果有结束时间，使用结束时间；否则使用开始时间加上持续时间或默认持续时间
      if (event.endTime) {
        endTime = window.Cesium.JulianDate.fromIso8601(event.endTime)
      } else if (event.duration) {
        // duration是分钟数，转换为秒
        endTime = window.Cesium.JulianDate.addSeconds(
          startTime,
          event.duration * 60,
          new window.Cesium.JulianDate(),
        )
      } else {
        // 默认事件持续1小时
        endTime = window.Cesium.JulianDate.addSeconds(
          startTime,
          3600,
          new window.Cesium.JulianDate(),
        )
      }

      availability = new window.Cesium.TimeIntervalCollection([
        new window.Cesium.TimeInterval({
          start: startTime,
          stop: endTime,
        }),
      ])
    }

    return {
      id: event.id + '@event@' + layerId.value,
      name: event.name,
      type: event.type,
      target,
      source,
      // 设置时间可用性
      availability: availability,
      // EventLine组件属性
      positions,
      width: styleConfig.width,
      material: material,
      distanceDisplayCondition: distanceConfigs.distanceDisplayCondition,
      labelStyle: {
        ...distanceConfigs,
        text: labelText,
        font: '8pt sans-serif',
        fillColor: '#fff',
        outlineColor: '#000000',
        showBackground: true,
        backgroundColor: 'rgba(113,211,0,0.3)',
        outlineWidth: 2,
        pixelOffset: [0, -20],
        verticalOrigin: 1,
      },
      curveConfig: {
        enabled: styleConfig.curve?.enabled || false,
        height: styleConfig.curve?.height || 100000,
      },
      materialType: styleConfig.material,
      // 原始事件数据
      eventData: event,
    }
  })
  // console.log('事件数据', { renderEvents: toRaw(renderEvents.value) })
}, '事件数据')

// 优化watch监听器，减少不必要的深度监听
watch(
  () => props.points,
  (newPoints) => {
    // 立即处理初始数据，后续变化使用防抖
    if (newPoints && newPoints.length > 0) {
      processPoint()
    } else {
      debounceUpdate(() => {
        processPoint()
      })
    }
  },
  { immediate: true },
)

watch(
  () => props.relations,
  (newRelations) => {
    // 立即处理初始数据，后续变化使用防抖
    if (newRelations && newRelations.length > 0) {
      processRelation()
    } else {
      debounceUpdate(() => {
        processRelation()
      })
    }
  },
  { immediate: true },
)

watch(
  () => props.trajectories,
  (newTrajectory) => {
    // 立即处理初始数据，后续变化使用防抖
    if (newTrajectory && Object.keys(newTrajectory).length > 0) {
      processTrajectory()
      // 轨迹更新后需要重新处理关系，因为可能有动态连线
      nextTick(() => processRelation())
    } else {
      debounceUpdate(() => {
        processTrajectory()
        // 轨迹更新后需要重新处理关系，因为可能有动态连线
        nextTick(() => processRelation())
      })
    }
  },
  { immediate: true },
)

// 监听显示状态变化，优化渲染性能
watch(
  [
    () => props.visible,
    () => props.showPoints,
    () => props.showRelation,
    () => props.showTrajectory,
  ],
  () => {
    // 当显示状态改变时，不需要重新处理数据，只需要触发重新渲染
  },
  { immediate: false },
)
watch(
  () => props.events,
  (newEvents) => {
    // 立即处理初始数据，后续变化使用防抖
    if (newEvents && newEvents.length > 0) {
      processEvent()
    } else {
      debounceUpdate(() => {
        processEvent()
      })
    }
  },
  { immediate: true },
)

// 监听目标状态数据变化
watch(
  () => props.targetStatus,
  (newTargetStatus) => {
    // 状态数据变化时重新处理点数据
    if (newTargetStatus && newTargetStatus.length > 0) {
      processPoint()
    } else {
      debounceUpdate(() => {
        processPoint()
      })
    }
  },
  { immediate: true },
)

// 防抖函数用于事件处理
const debounceEvent = (fn, delay = 100) => debounce(fn, delay)

// 事件处理函数
const onTargetClick = (target, event) => {
  // console.log('🎯 DataVisualization - onTargetClick 被触发:', target.id, target)
  // console.log('🎯 DataVisualization - 事件对象:', event)
  emit('targetClick', target, event)
  // console.log('🎯 DataVisualization - targetClick 事件已发射')
}

// 生成轨迹动态虚拟节点函数
const generateTrajectoryVirtualNodes = (trajectory) => {
  const { originTarget, trajectoryData } = trajectory
  console.log('轨迹虚拟节点 - originTarget:', originTarget)

  // 检查轨迹数据有效性，防止轨迹消失时出现数组长度错误
  if (!trajectoryData || !trajectoryData.trajectory || trajectoryData.trajectory.length === 0) {
    console.warn('轨迹数据无效或已消失，跳过虚拟节点生成:', trajectory.id)
    return []
  }

  // 检查originTarget和virtualNodes的有效性
  if (!originTarget || !originTarget.virtualNodes || !Array.isArray(originTarget.virtualNodes)) {
    console.warn('轨迹目标缺少虚拟节点配置，跳过虚拟节点生成:', trajectory.id)
    return []
  }

  const nodes = []
  const nodeCount = originTarget.virtualNodes.length || 0

  // 如果节点数量为0，直接返回空数组
  if (nodeCount === 0) {
    return []
  }

  const radius = originTarget.ringRadius || 50000

  for (let i = 0; i < nodeCount; i++) {
    const angle = (i * 360) / nodeCount
    const radian = (angle * Math.PI) / 180

    // 为轨迹虚拟节点创建动态位置
    const dynamicNodePosition = new window.Cesium.CallbackProperty((time) => {
      try {
        // 首先检查轨迹数据在当前时间是否有效
        if (!trajectoryData || !trajectoryData.trajectory || trajectoryData.trajectory.length === 0) {
          return null // 轨迹数据无效时返回null，让Cesium处理
        }

        const viewer = window.viewer || window.cesiumViewer
        if (viewer) {
          const trajectoryEntity = viewer.entities.getById(trajectory.id)

          if (trajectoryEntity && trajectoryEntity.position) {
            const realTimePosition = trajectoryEntity.position.getValue(time)
            if (realTimePosition) {
              // 将Cartesian3转换为经纬度作为中心点
              const cartographic = window.Cesium.Cartographic.fromCartesian(realTimePosition)
              const centerLng = window.Cesium.Math.toDegrees(cartographic.longitude)
              const centerLat = window.Cesium.Math.toDegrees(cartographic.latitude)
              const centerHeight = cartographic.height

              // 使用球面几何学计算虚拟节点位置
              const earthRadius = 6371000 // 地球半径(米)
              const latRad = (centerLat * Math.PI) / 180
              const lonRad = (centerLng * Math.PI) / 180

              // 计算新的纬度
              const newLatRad = Math.asin(
                Math.sin(latRad) * Math.cos(radius / earthRadius) +
                  Math.cos(latRad) * Math.sin(radius / earthRadius) * Math.cos(radian),
              )

              // 计算新的经度
              const newLonRad =
                lonRad +
                Math.atan2(
                  Math.sin(radian) * Math.sin(radius / earthRadius) * Math.cos(latRad),
                  Math.cos(radius / earthRadius) - Math.sin(latRad) * Math.sin(newLatRad),
                )

              const nodeLng = (newLonRad * 180) / Math.PI
              const nodeLat = (newLatRad * 180) / Math.PI

              return window.Cesium.Cartesian3.fromDegrees(nodeLng, nodeLat, centerHeight)
            }
          }
        }
      } catch (error) {
        console.warn('获取轨迹虚拟节点位置失败:', error)
        // 当轨迹在时间轴移动时消失，返回null让Cesium隐藏节点
        return null
      }
      // 如果轨迹实体不存在或位置无效，返回null让Cesium处理
      return null
    }, false)

    // 获取对应的virtualNode配置数据
    const virtualNodeData =
      trajectory.virtualNodes && trajectory.virtualNodes[i] ? trajectory.virtualNodes[i] : null
    const nodeName = virtualNodeData ? virtualNodeData.name : `轨迹节点${i + 1}`
    const nodeIcon = virtualNodeData ? virtualNodeData.icon : '/icons/communication.svg'
    const nodeColor = virtualNodeData ? virtualNodeData.color : '#ff6b35'

    // 获取当前节点对应的连接目标
    // const connectionTarget =
    //   trajectory.nodeConnections && trajectory.nodeConnections[i]
    //     ? trajectory.nodeConnections[i].target_id
    //     : trajectory.id
    // console.log(`轨迹节点${i}: 原trajectory.id=${trajectory.id}, 连接目标=${connectionTarget}`)

    // 创建轨迹虚拟节点配置
    const node = {
      id: `${trajectory.id}-trajectory-node-${i}`,
      name: nodeName,
      type: virtualNodeData ? virtualNodeData.type : 'trajectory_virtual_node',
      position: dynamicNodePosition, // 使用动态位置
      // targetId: connectionTarget,
      angle: angle,
      virtualNodeData: virtualNodeData,
      originNode: originTarget.virtualNodes ? originTarget.virtualNodes[i] : null,
      // 添加billboard配置
      billboard: {
        image: nodeIcon,
        scale: 0.8,
        verticalOrigin: window.Cesium?.VerticalOrigin?.BOTTOM || 0,
        horizontalOrigin: window.Cesium?.HorizontalOrigin?.CENTER || 0,
        pixelOffset: new (window.Cesium?.Cartesian2 || Object)(0, 0),
        heightReference: window.Cesium?.HeightReference?.NONE || 0,
        ...distanceConfigs,
      },
      // 添加label配置
      label: {
        text: nodeName,
        font: '10pt sans-serif',
        fillColor: window.Cesium?.Color?.WHITE || '#ffffff',
        outlineColor: window.Cesium?.Color?.BLACK || '#000000',
        outlineWidth: 1,
        style: window.Cesium?.LabelStyle?.FILL_AND_OUTLINE || 0,
        pixelOffset: new (window.Cesium?.Cartesian2 || Object)(0, -30),
        heightReference: window.Cesium?.HeightReference?.NONE || 0,
        ...distanceConfigs,
      },
      // 添加point配置作为备选显示方式
      point: {
        pixelSize: 8,
        color: window.Cesium?.Color?.fromCssColorString?.(nodeColor) || nodeColor,
        outlineColor: window.Cesium?.Color?.WHITE || '#ffffff',
        outlineWidth: 2,
        heightReference: window.Cesium?.HeightReference?.NONE || 0,
        ...distanceConfigs,
      },
    }

    nodes.push(node)
  }

  return nodes
}

// 生成虚拟节点函数
const generateVirtualNodes = (target) => {
  const { originTarget } = target
  console.log('originTarget:', originTarget)

  const nodes = []
  const nodeCount = originTarget.virtualNodes.length

  const radius = originTarget.ringRadius || 50000
  const centerLng = target.position[0]
  const centerLat = target.position[1]
  const centerHeight = target.position[2] || 0

  for (let i = 0; i < nodeCount; i++) {
    const angle = (i * 360) / nodeCount
    const radian = (angle * Math.PI) / 180

    // 使用球面几何学的精确计算方法
    const earthRadius = 6371000 // 地球半径(米)
    const latRad = (centerLat * Math.PI) / 180
    const lonRad = (centerLng * Math.PI) / 180

    // 计算新的纬度
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(radius / earthRadius) +
        Math.cos(latRad) * Math.sin(radius / earthRadius) * Math.cos(radian),
    )

    // 计算新的经度
    const newLonRad =
      lonRad +
      Math.atan2(
        Math.sin(radian) * Math.sin(radius / earthRadius) * Math.cos(latRad),
        Math.cos(radius / earthRadius) - Math.sin(latRad) * Math.sin(newLatRad),
      )

    const nodeLng = (newLonRad * 180) / Math.PI
    const nodeLat = (newLatRad * 180) / Math.PI

    // 获取对应的virtualNode配置数据
    const virtualNodeData =
      target.virtualNodes && target.virtualNodes[i] ? target.virtualNodes[i] : null
    const nodeName = virtualNodeData ? virtualNodeData.name : `节点${i + 1}`
    const nodeIcon = virtualNodeData ? virtualNodeData.icon : '/icons/communication.svg'
    const nodeColor = virtualNodeData ? virtualNodeData.color : '#ff6b35'

    // 获取当前节点对应的连接目标
    const connectionTarget =
      target.nodeConnections && target.nodeConnections[i]
        ? target.nodeConnections[i].target_id
        : target.id
    // console.log(`节点${i}: 原target.id=${target.id}, 连接目标=${connectionTarget}`)

    // 参考DataVisualization.vue中renderPoints的结构，创建完整的节点配置
    const node = {
      id: `${target.id}-node-${i}`,
      name: nodeName,
      type: virtualNodeData ? virtualNodeData.type : 'virtual_node',
      position: [nodeLng, nodeLat, centerHeight],
      targetId: connectionTarget,
      angle: angle,
      virtualNodeData: virtualNodeData, // 保存原始数据用于连线匹配
      originNode: originTarget.virtualNodes[i],
      // 添加billboard配置，包含自适应缩放
      billboard: {
        image: nodeIcon,
        scale: 0.8,
        verticalOrigin: window.Cesium?.VerticalOrigin?.BOTTOM || 0,
        horizontalOrigin: window.Cesium?.HorizontalOrigin?.CENTER || 0,
        pixelOffset: new (window.Cesium?.Cartesian2 || Object)(0, 0),
        heightReference: window.Cesium?.HeightReference?.NONE || 0,
        // 添加自适应缩放配置
        ...distanceConfigs,
      },
      // 添加label配置，包含自适应缩放
      label: {
        text: nodeName,
        font: '10pt sans-serif',
        fillColor: window.Cesium?.Color?.WHITE || '#ffffff',
        outlineColor: window.Cesium?.Color?.BLACK || '#000000',
        outlineWidth: 1,
        style: window.Cesium?.LabelStyle?.FILL_AND_OUTLINE || 0,
        pixelOffset: new (window.Cesium?.Cartesian2 || Object)(0, 25),
        showBackground: true,
        backgroundColor:
          window.Cesium?.Color?.fromCssColorString?.('rgba(0,0,0,0.7)') || 'rgba(0,0,0,0.7)',
        // 添加自适应缩放配置
        ...distanceConfigs,
      },
      // 添加point配置，包含自适应缩放
      point: {
        pixelSize: 8,
        color: window.Cesium?.Color?.fromCssColorString?.(nodeColor) || nodeColor,
        outlineColor: window.Cesium?.Color?.WHITE || '#ffffff',
        outlineWidth: 2,
        heightReference: window.Cesium?.HeightReference?.NONE || 0,
        // 添加自适应缩放配置
        ...distanceConfigs,
      },
    }

    nodes.push(node)
  }

  return nodes
}

// 轨迹位置插值函数
const interpolateTrajectoryPosition = (trajectory, targetTimeStr) => {
  if (!trajectory || trajectory.length === 0) {
    return null
  }

  // 如果只有一个点，直接返回该点
  if (trajectory.length === 1) {
    return {
      longitude: trajectory[0].longitude,
      latitude: trajectory[0].latitude,
      height: trajectory[0].altitude || trajectory[0].height || 0,
    }
  }

  const targetTime = new Date(targetTimeStr).getTime()

  // 查找时间范围
  let beforeIndex = -1
  let afterIndex = -1

  for (let i = 0; i < trajectory.length - 1; i++) {
    const currentTime = new Date(trajectory[i].timestamp).getTime()
    const nextTime = new Date(trajectory[i + 1].timestamp).getTime()

    if (currentTime <= targetTime && nextTime >= targetTime) {
      beforeIndex = i
      afterIndex = i + 1
      break
    }
  }

  // 如果目标时间在轨迹范围之外
  if (beforeIndex === -1 || afterIndex === -1) {
    // 如果目标时间早于轨迹开始时间，返回第一个点
    if (targetTime < new Date(trajectory[0].timestamp).getTime()) {
      return {
        longitude: trajectory[0].longitude,
        latitude: trajectory[0].latitude,
        height: trajectory[0].altitude || trajectory[0].height || 0,
      }
    }
    // 如果目标时间晚于轨迹结束时间，返回最后一个点
    if (targetTime > new Date(trajectory[trajectory.length - 1].timestamp).getTime()) {
      const lastPoint = trajectory[trajectory.length - 1]
      return {
        longitude: lastPoint.longitude,
        latitude: lastPoint.latitude,
        height: lastPoint.altitude || lastPoint.height || 0,
      }
    }
    return null
  }

  const beforePoint = trajectory[beforeIndex]
  const afterPoint = trajectory[afterIndex]

  // 计算插值因子
  const beforeTime = new Date(beforePoint.timestamp).getTime()
  const afterTime = new Date(afterPoint.timestamp).getTime()
  const factor = (targetTime - beforeTime) / (afterTime - beforeTime)

  // 线性插值计算位置
  return {
    longitude: beforePoint.longitude + (afterPoint.longitude - beforePoint.longitude) * factor,
    latitude: beforePoint.latitude + (afterPoint.latitude - beforePoint.latitude) * factor,
    height:
      (beforePoint.altitude || beforePoint.height || 0) +
      ((afterPoint.altitude || afterPoint.height || 0) -
        (beforePoint.altitude || beforePoint.height || 0)) *
        factor,
  }
}

// 生成虚拟节点连线函数
const generateVirtualRelations = (target, nodes) => {
  console.log('target', target)
  console.log('nodes', nodes)
  const { originTarget } = target
  const relations = []

  // 从target的nodeConnections生成连线数据
  if (originTarget.nodeConnections && Array.isArray(originTarget.nodeConnections)) {
    originTarget.nodeConnections.forEach((connection, index) => {
      // 查找源节点：根据connection.source匹配对应的虚拟节点
      const nodeIndex = nodes.findIndex((item) => item.originNode.id === connection.source_id)
      const sourceNode = nodes[nodeIndex]

      // console.log('sourceNode====================', sourceNode)

      if (!sourceNode) {
        console.warn(`虚拟连线警告: 找不到源节点 ${connection.source_id}，连线索引: ${index}`)
        return
      }

      // 检查目标是否为轨迹目标
      const trajectoryData = dataManager.trajectoryManager.findById(connection.target_id)
      const isTrajectoryTarget = !!(
        trajectoryData &&
        trajectoryData.trajectory &&
        trajectoryData.trajectory.length > 0
      )

      // 预先获取静态目标数据，避免作用域问题
      const staticTargetData = !isTrajectoryTarget
        ? dataManager.targetLocationManager.findById(connection.target_id)
        : null

      let positions

      if (isTrajectoryTarget) {
        // 对于轨迹目标，使用CallbackProperty动态获取位置
        positions = new Cesium.CallbackProperty((time, result) => {
          // 检查轨迹数据是否仍然有效
          const currentTrajectoryData = dataManager.trajectoryManager.findById(connection.target_id)
          console.log('currentTrajectoryData', currentTrajectoryData)
          if (!currentTrajectoryData || !currentTrajectoryData.trajectory || currentTrajectoryData.trajectory.length === 0) {
            // 轨迹消失时返回null，隐藏连线
            return null
          }

          // 检查当前时间是否在轨迹时间范围内
          const currentTimeStr = window.Cesium.JulianDate.toIso8601(time)
          const trajectory = currentTrajectoryData.trajectory
          const firstTimestamp = trajectory[0].timestamp
          const lastTimestamp = trajectory[trajectory.length - 1].timestamp
          
          if (currentTimeStr < firstTimestamp || currentTimeStr > lastTimestamp) {
            // 当前时间超出轨迹时间范围，隐藏连线
            return null
          }

          // 尝试从实体中获取轨迹位置
          let trajectoryEntity
          // const trajectoryEntity = getEntityByIds([
          //   connection.target + '@trajectory@' + layerId.value,
          //   connection.target + '@point@' + layerId.value,
          // ])

          // console.log('trajectoryEntity', trajectoryEntity)

          let targetPosition
          if (trajectoryEntity && trajectoryEntity.position) {
            targetPosition = trajectoryEntity.position.getValue(time)
          }

          if (!targetPosition) {
            // 如果无法从实体获取位置，使用插值计算
            const currentTimeStr = window.Cesium.JulianDate.toIso8601(time)
            const interpolatedPosition = interpolateTrajectoryPosition(
              currentTrajectoryData.trajectory,
              currentTimeStr,
            )

            if (interpolatedPosition) {
              targetPosition = Cesium.Cartesian3.fromDegrees(
                interpolatedPosition.longitude,
                interpolatedPosition.latitude,
                interpolatedPosition.height || 0,
              )
            } else {
              // 使用最新点位作为备选
              const latestPoint = currentTrajectoryData.trajectory[currentTrajectoryData.trajectory.length - 1]
              targetPosition = Cesium.Cartesian3.fromDegrees(
                latestPoint.longitude,
                latestPoint.latitude,
                latestPoint.altitude || latestPoint.height || 0,
              )
            }
          }

          const sourcePosition = Cesium.Cartesian3.fromDegrees(...sourceNode.position)
          return [sourcePosition, targetPosition]
        }, false)
      } else {
        // 对于静态目标，使用固定位置
        const actualPoint = dataManager.targetLocationManager.findById(connection.target_id)
        if (!actualPoint) {
          console.warn(
            `虚拟连线警告: 找不到目标点位 ${connection.target_id}，既不在目标位置管理器中，也不在轨迹管理器中，连线索引: ${index}`,
          )
          return
        }

        positions = [
          Cesium.Cartesian3.fromDegrees(...sourceNode.position),
          Cesium.Cartesian3.fromDegrees(
            actualPoint.longitude,
            actualPoint.latitude,
            actualPoint.height || 0,
          ),
        ]
      }

      const relationId = `circle_connector_${String(index + 1).padStart(3, '0')}`
      const cleanTargetId = connection.target_id
      const cleanSourceId = connection.source_id

      // console.log(
      //   `连线${index}: source=${connection.source}, target=${connection.target}, 是轨迹目标=${isTrajectoryTarget}`,
      // )

      const relation = {
        id: relationId,
        description: connection.description,
        source_id: cleanSourceId,
        target_id: cleanTargetId,
        type: connection.type || '圆环连接',
        createdAt: new Date().toISOString(),
        name: connection.description || `${sourceNode.name} -> ${connection.target_id}`,
        sourceId: cleanSourceId,
        targetId: cleanTargetId,
        sourcePosition: sourceNode.position,
        // LineWithLabel组件需要的属性
        positions: positions,
        width: 2,
        material: connection.status === 'active' ? Cesium.Color.LIME : Cesium.Color.GRAY,
        showLabel: false,
        labelStyle: {
          text: connection.description || connection.type,
          font: '10pt sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
          backgroundPadding: new Cesium.Cartesian2(8, 4),
          pixelOffset: new Cesium.Cartesian2(0, -15),
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        },
      }
      relations.push(relation)
    })
  }

  return relations
}

// 生成轨迹动态虚拟节点连线函数
const generateTrajectoryVirtualRelations = (trajectory, nodes) => {
  const { trajectoryData } = trajectory
  const relations = []

  // 检查nodes数组有效性，防止数组长度错误
  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    console.warn('轨迹虚拟节点数组无效，跳过连线生成:', trajectory.id)
    return []
  }

  // 检查轨迹数据有效性
  if (!trajectoryData || !trajectoryData.target_id) {
    console.warn('轨迹数据无效，跳过连线生成:', trajectory.id)
    return []
  }

  // 获取目标基础数据
  const base = dataManager.targetBaseManager.findById(trajectoryData.target_id)

  // 从base的nodeConnections生成连线数据
  if (base && base.nodeConnections && Array.isArray(base.nodeConnections)) {
    base.nodeConnections.forEach((connection, index) => {
      // 查找源节点：根据connection.source匹配对应的虚拟节点
      const nodeIndex = nodes.findIndex(
        (item) => item.originNode && item.originNode.id === connection.source_id,
      )
      const sourceNode = nodes[nodeIndex]

      if (!sourceNode) {
        console.warn(`轨迹虚拟连线警告: 找不到源节点 ${connection.source_id}，连线索引: ${index}`)
        return
      }

      // 检查目标是否为轨迹目标
      const trajectoryData = dataManager.trajectoryManager.findById(connection.target_id)
      const isTrajectoryTarget = !!(
        trajectoryData &&
        trajectoryData.trajectory &&
        trajectoryData.trajectory.length > 0
      )

      // 获取静态目标数据（在作用域顶层定义）
      const staticTargetData = !isTrajectoryTarget
        ? dataManager.targetLocationManager.findById(connection.target_id)
        : null

      let positions

      if (isTrajectoryTarget) {
        // 对于轨迹目标，使用CallbackProperty动态获取位置
        positions = new window.Cesium.CallbackProperty((time, result) => {
          try {
            const viewer = window.viewer || window.cesiumViewer
            if (viewer) {
              // 使用正确的轨迹实体ID格式
              const trajectoryEntityId = connection.target_id + '@trajectory@' + layerId.value
              const trajectoryEntity = viewer.entities.getById(trajectoryEntityId)

              let targetPosition
              if (trajectoryEntity && trajectoryEntity.position) {
                targetPosition = trajectoryEntity.position.getValue(time)
              }

              // 如果轨迹实体没有找到或没有位置，尝试查找点实体
              if (!targetPosition) {
                const pointEntityId = connection.target_id + '@point@' + layerId.value
                const pointEntity = viewer.entities.getById(pointEntityId)
                if (pointEntity && pointEntity.position) {
                  targetPosition = pointEntity.position.getValue(time)
                }
              }

              // 获取源节点的动态位置
              let sourcePosition
              if (sourceNode.position && typeof sourceNode.position.getValue === 'function') {
                sourcePosition = sourceNode.position.getValue(time)
              }

              if (sourcePosition && targetPosition) {
                return [sourcePosition, targetPosition]
              }
            }
          } catch (error) {
            console.warn('获取轨迹虚拟连线位置失败:', error)
          }
          return []
        }, false)
      } else {
        // 对于静态目标，创建动态连线到静态位置
        // console.log('staticTargetData', staticTargetData)
        if (staticTargetData) {
          const staticTargetPosition = window.Cesium.Cartesian3.fromDegrees(
            staticTargetData.longitude,
            staticTargetData.latitude,
            staticTargetData.height || 0,
          )

          positions = new window.Cesium.CallbackProperty((time, result) => {
            try {
              // 获取源节点的动态位置
              let sourcePosition
              if (sourceNode.position && typeof sourceNode.position.getValue === 'function') {
                sourcePosition = sourceNode.position.getValue(time)
              }

              if (sourcePosition) {
                return [sourcePosition, staticTargetPosition]
              }
            } catch (error) {
              console.warn('获取轨迹虚拟连线到静态目标位置失败:', error)
            }
            return []
          }, false)
        }
      }

      if (positions) {
        const relation = {
          id: `${trajectory.id}-trajectory-relation-${index}`,
          sourceId: sourceNode.id,
          targetId: connection.target_id,
          positions: positions,
          width: connection.width || 2,
          material: connection.material || window.Cesium?.Color?.YELLOW || '#ffff00',
          showLabel: connection.showLabel !== false,
          labelStyle: {
            text: connection.label || `${sourceNode.name} → ${connection.target_id}`,
            font: '10pt sans-serif',
            fillColor: window.Cesium?.Color?.WHITE || '#ffffff',
            outlineColor: window.Cesium?.Color?.BLACK || '#000000',
            outlineWidth: 1,
            style: window.Cesium?.LabelStyle?.FILL_AND_OUTLINE || 0,
            pixelOffset: new (window.Cesium?.Cartesian2 || Object)(0, -20),
            ...distanceConfigs,
          },
          // 动态计算源位置和目标位置用于标签定位
          sourcePosition: sourceNode.position,
          targetPosition: isTrajectoryTarget
            ? new window.Cesium.CallbackProperty((time) => {
                try {
                  // 检查轨迹数据在当前时间是否有效
                  if (!trajectoryData || !trajectoryData.trajectory || trajectoryData.trajectory.length === 0) {
                    return null // 轨迹数据无效时返回null
                  }

                  const viewer = window.viewer || window.cesiumViewer
                  if (viewer) {
                    // 使用正确的轨迹实体ID格式
                    const trajectoryEntityId = connection.target + '@trajectory@' + layerId.value
                    const trajectoryEntity = viewer.entities.getById(trajectoryEntityId)
                    if (trajectoryEntity && trajectoryEntity.position) {
                      return trajectoryEntity.position.getValue(time)
                    }

                    // 如果轨迹实体没有找到，尝试查找点实体
                    const pointEntityId = connection.target + '@point@' + layerId.value
                    const pointEntity = viewer.entities.getById(pointEntityId)
                    if (pointEntity && pointEntity.position) {
                      return pointEntity.position.getValue(time)
                    }
                  }
                } catch (error) {
                  console.warn('获取目标位置失败:', error)
                }
                return null
              }, false)
            : staticTargetData
              ? window.Cesium.Cartesian3.fromDegrees(
                  staticTargetData.longitude,
                  staticTargetData.latitude,
                  staticTargetData.height || 0,
                )
              : null,
        }

        relations.push(relation)
      }
    })
  }
  // console.log('relations', relations)
  return relations
}

// 生成虚拟节点连线函数
const generateVirtualNodeEvents = (target, nodes) => {
  const { originTarget } = target
  const connections = []
  console.log('originTarget', originTarget)

  // 从target的nodeEvents生成连线数据（参考generateVirtualRelations的单循环结构）
  if (originTarget.nodeEvents && Array.isArray(originTarget.nodeEvents)) {
    originTarget.nodeEvents.forEach((eventData, index) => {
      // 检查事件数据是否有效
      if (!eventData || (!eventData.source_id && !eventData.target_id)) {
        console.warn(`虚拟节点事件数据无效，跳过连线生成`, { eventData })
        return
      }

      // 查找源节点：根据eventData.source_id匹配对应的虚拟节点
      const sourceNode = eventData.source_id
        ? nodes.find(
            (node) =>
              node.originNode?.id === eventData.source_id || node.id === eventData.source_id,
          )
        : null

      if (!sourceNode) {
        console.warn(`虚拟节点事件警告: 找不到源节点 ${eventData.source_id}，事件索引: ${index}`)
        return
      }

      // 检查目标是否为轨迹目标
      const targetId = eventData.target_id || target.id
      const trajectoryData = dataManager.trajectoryManager.findById(targetId)
      const isTrajectoryTarget = !!(
        trajectoryData &&
        trajectoryData.trajectory &&
        trajectoryData.trajectory.length > 0
      )

      // 预先获取静态目标数据，避免作用域问题
      const staticTargetData = !isTrajectoryTarget
        ? dataManager.targetLocationManager.findById(targetId)
        : null

      if (!isTrajectoryTarget && !staticTargetData) {
        console.warn(`虚拟节点连线缺少目标点`, { eventData, targetId })
        return
      }

      const connectionId = `${sourceNode.id}-event-connection-${index}`

      let positions

      if (isTrajectoryTarget) {
        // 对于轨迹目标，使用CallbackProperty动态获取位置
        positions = new Cesium.CallbackProperty((time, result) => {
          // 检查轨迹数据是否仍然有效
          const currentTrajectoryData = dataManager.trajectoryManager.findById(targetId)
          if (!currentTrajectoryData || !currentTrajectoryData.trajectory || currentTrajectoryData.trajectory.length === 0) {
            // 轨迹消失时返回null，隐藏连线
            return null
          }

          // 检查当前时间是否在轨迹时间范围内
          const currentTimeStr = window.Cesium.JulianDate.toIso8601(time)
          const trajectory = currentTrajectoryData.trajectory
          const firstTimestamp = trajectory[0].timestamp
          const lastTimestamp = trajectory[trajectory.length - 1].timestamp
          
          if (currentTimeStr < firstTimestamp || currentTimeStr > lastTimestamp) {
            // 当前时间超出轨迹时间范围，隐藏连线
            return null
          }

          // 尝试从实体中获取轨迹位置
          let trajectoryEntity
          // const trajectoryEntity = getEntityByIds([
          //   targetId + '@trajectory@' + layerId.value,
          //   targetId + '@point@' + layerId.value,
          // ])

          let targetPosition
          if (trajectoryEntity && trajectoryEntity.position) {
            targetPosition = trajectoryEntity.position.getValue(time)
          }

          if (!targetPosition) {
            // 如果无法从实体获取位置，使用插值计算
            const interpolatedPosition = interpolateTrajectoryPosition(
              currentTrajectoryData.trajectory,
              currentTimeStr,
            )

            if (interpolatedPosition) {
              targetPosition = Cesium.Cartesian3.fromDegrees(
                interpolatedPosition.longitude,
                interpolatedPosition.latitude,
                interpolatedPosition.height || 0,
              )
            } else {
              // 使用最新点位作为备选
              const latestPoint = currentTrajectoryData.trajectory[currentTrajectoryData.trajectory.length - 1]
              targetPosition = Cesium.Cartesian3.fromDegrees(
                latestPoint.longitude,
                latestPoint.latitude,
                latestPoint.altitude || latestPoint.height || 0,
              )
            }
          }

          const sourcePosition = Cesium.Cartesian3.fromDegrees(
            sourceNode.position[0],
            sourceNode.position[1],
            sourceNode.position[2] || 0,
          )
          return [sourcePosition, targetPosition]
        }, false)
      } else {
        // 对于静态目标，使用固定位置
        positions = [
          window.Cesium.Cartesian3.fromDegrees(
            sourceNode.position[0],
            sourceNode.position[1],
            sourceNode.position[2] || 0,
          ),
          window.Cesium.Cartesian3.fromDegrees(
            staticTargetData.longitude,
            staticTargetData.latitude,
            staticTargetData.height || 0,
          ),
        ]
      }

      // 获取连线样式配置
      const styleConfig = getRelationStyleConfig(eventData.type || 'virtual_connection')
      const material = getMaterialProperty(styleConfig.material, styleConfig.materialProps)

      // 标签文本
      const labelText = eventData.description || eventData.name || `虚拟事件连线${index + 1}`

      // 创建虚拟节点连线时间可用性区间
      let availability = null
      if (eventData.startTime) {
        const startTime = window.Cesium.JulianDate.fromIso8601(eventData.startTime)
        console.log('startTime', startTime)
        let endTime = startTime

        // 如果有结束时间，使用结束时间；否则使用开始时间加上持续时间或默认持续时间
        if (eventData.endTime) {
          endTime = window.Cesium.JulianDate.fromIso8601(eventData.endTime)
        } else if (eventData.duration) {
          // duration是分钟数，转换为秒
          endTime = window.Cesium.JulianDate.addSeconds(
            startTime,
            eventData.duration * 60,
            new window.Cesium.JulianDate(),
          )
        } else {
          // 默认虚拟节点连线持续30分钟
          endTime = window.Cesium.JulianDate.addSeconds(
            startTime,
            1800,
            new window.Cesium.JulianDate(),
          )
        }

        availability = new window.Cesium.TimeIntervalCollection([
          new window.Cesium.TimeInterval({
            start: startTime,
            stop: endTime,
          }),
        ])

        console.log('availability', availability)
      }

      const virtualConnection = {
        id: connectionId,
        name: `虚拟节点${sourceNode.name}连线`,
        type: eventData.type || 'virtual_node_connection',
        source_id: sourceNode.id,
        target_id: eventData.target_id || target.id,

        // 设置时间可用性
        availability: availability,
        // LineWithLabel组件需要的属性
        positions,
        width: styleConfig.width || 2,
        material: material,
        showLabel: true, // 添加缺少的 showLabel 属性
        distanceDisplayCondition: distanceConfigs.distanceDisplayCondition,
        labelStyle: {
          ...distanceConfigs,
          text: labelText,
          font: '8pt sans-serif',
          fillColor: '#fff',
          outlineColor: '#000000',
          showBackground: true,
          backgroundColor: 'rgba(233,211,0,0.3)',
          outlineWidth: 2,
          pixelOffset: [0, -20],
          verticalOrigin: 1,
        },
        curveConfig: {
          enabled: styleConfig.curve?.enabled || false,
          height: styleConfig.curve?.height || 100000,
        },
        materialType: styleConfig.material,

        // 虚拟连线特有属性
        isVirtual: true,
        virtualType: 'node_connection',

        // 保留原始事件数据
        originalEventData: eventData,
      }

      connections.push(virtualConnection)
    })
  }

  console.log('生成虚拟节点事件数量:', connections.length)
  return connections
}

// 生成轨迹虚拟节点连线函数
const generateTrajectoryVirtualNodeEvents = (trajectory, nodes) => {
  const { trajectoryData } = trajectory
  const connections = []

  console.log('nodes--------', nodes)

  // 获取目标基础数据
  const base = dataManager.targetBaseManager.findById(trajectoryData.target_id)

  // 添加base存在性检查，与generateTrajectoryVirtualRelations保持一致
  if (!base) {
    console.warn(`轨迹虚拟节点事件警告: 找不到目标基础数据 ${trajectoryData.target_id}`)
    return connections
  }

  // 从base的nodeEvents生成连线数据（参考generateVirtualNodeEvents的单循环结构）
  if (base.nodeEvents && Array.isArray(base.nodeEvents)) {
    console.log('base.nodeEvents', base.nodeEvents)
    base.nodeEvents.forEach((eventData, index) => {
      // 检查事件数据是否有效
      if (!eventData || (!eventData.source_id && !eventData.target_id)) {
        console.warn(`轨迹虚拟节点事件数据无效，跳过连线生成`, { eventData })
        return
      }

      // 查找源节点：改进查找逻辑，支持多种匹配方式
      let sourceNode = null

      if (eventData.source_id) {
        // 方法1：通过originNode.id匹配
        sourceNode = nodes.find((node) => node.originNode?.id === eventData.source_id)

        // 方法2：如果方法1失败，通过base.virtualNodes的索引匹配
        if (!sourceNode && base.virtualNodes && Array.isArray(base.virtualNodes)) {
          const virtualNodeIndex = base.virtualNodes.findIndex(
            (vNode) => vNode.id === eventData.source_id,
          )
          if (virtualNodeIndex >= 0 && virtualNodeIndex < nodes.length) {
            sourceNode = nodes[virtualNodeIndex]
          }
        }

        // 方法3：如果前两种方法都失败，直接通过节点ID匹配
        if (!sourceNode) {
          sourceNode = nodes.find((node) => node.id === eventData.source_id)
        }
      }

      if (!sourceNode) {
        console.warn(
          `轨迹虚拟节点事件警告: 找不到源节点 ${eventData.source_id}，事件索引: ${index}，可用节点:`,
          nodes.map((n) => ({ id: n.id, originNodeId: n.originNode?.id })),
        )
        return
      }
      // 检查目标是否为轨迹目标，与generateTrajectoryVirtualRelations保持一致的逻辑
      console.log('eventData', eventData)
      const targetId = eventData.target_id
      const targetTrajectoryData = dataManager.trajectoryManager.findById(targetId)
      console.log('targetTrajectoryData', targetTrajectoryData)
      const isTrajectoryTarget = !!(
        targetTrajectoryData &&
        targetTrajectoryData.trajectory &&
        targetTrajectoryData.trajectory.length > 0
      )

      // 获取静态目标数据（在作用域顶层定义，与generateTrajectoryVirtualRelations保持一致）
      const staticTargetData = !isTrajectoryTarget
        ? dataManager.targetLocationManager.findById(targetId)
        : null

      if (!isTrajectoryTarget && !staticTargetData) {
        console.warn(`轨迹虚拟节点事件缺少目标点`, { eventData, targetId })
        return
      }

      const connectionId = `${sourceNode.id}-trajectory-connection-${index}`

      let positions
      console.log('isTrajectoryTarget@@@@@@@@@@@@@@@@@@@', isTrajectoryTarget)
      if (isTrajectoryTarget) {
        // 对于轨迹目标，使用CallbackProperty动态获取位置
        positions = new window.Cesium.CallbackProperty((time, result) => {
          try {
            const viewer = window.viewer || window.cesiumViewer
            if (viewer) {
              // 使用正确的轨迹实体ID格式
              const trajectoryEntityId = targetId + '@trajectory@' + layerId.value
              const trajectoryEntity = viewer.entities.getById(trajectoryEntityId)

              let targetPosition
              if (trajectoryEntity && trajectoryEntity.position) {
                targetPosition = trajectoryEntity.position.getValue(time)
              }

              // 如果轨迹实体没有找到或没有位置，尝试查找点实体
              if (!targetPosition) {
                const pointEntityId = targetId + '@point@' + layerId.value
                const pointEntity = viewer.entities.getById(pointEntityId)
                if (pointEntity && pointEntity.position) {
                  targetPosition = pointEntity.position.getValue(time)
                }
              }

              // 获取源节点的动态位置
              let sourcePosition
              if (sourceNode.position && typeof sourceNode.position.getValue === 'function') {
                sourcePosition = sourceNode.position.getValue(time)
              }

              if (sourcePosition && targetPosition) {
                return [sourcePosition, targetPosition]
              }
            }
          } catch (error) {
            console.warn('获取轨迹虚拟连线位置失败:', error)
          }
          return []
        }, false)
      } else {
        // 对于静态目标，创建动态连线到静态位置
        if (staticTargetData) {
          const staticTargetPosition = window.Cesium.Cartesian3.fromDegrees(
            staticTargetData.longitude,
            staticTargetData.latitude,
            staticTargetData.height || 0,
          )

          positions = new window.Cesium.CallbackProperty((time, result) => {
            try {
              // 获取源节点的动态位置
              let sourcePosition
              if (sourceNode.position && typeof sourceNode.position.getValue === 'function') {
                sourcePosition = sourceNode.position.getValue(time)
              }

              if (sourcePosition) {
                return [sourcePosition, staticTargetPosition]
              }
            } catch (error) {
              console.warn('获取轨迹虚拟连线到静态目标位置失败:', error)
            }
            return []
          }, false)
        }
      }

      // 检查positions是否成功创建
      if (!positions) {
        console.warn(`轨迹虚拟节点事件缺少位置数据`, { eventData, targetId })
        return
      }

      // 获取连线样式配置
      const styleConfig = getRelationStyleConfig(eventData.type || 'trajectory_virtual_connection')
      const material = getMaterialProperty(styleConfig.material, styleConfig.materialProps)

      // 标签文本
      const labelText = eventData.description || eventData.name || `轨迹虚拟事件连线${index + 1}`

      // 创建轨迹虚拟节点连线时间可用性区间
      let availability = null
      if (eventData.startTime) {
        const startTime = window.Cesium.JulianDate.fromIso8601(eventData.startTime)
        let endTime = startTime

        // 如果有结束时间，使用结束时间；否则使用开始时间加上持续时间或默认持续时间
        if (eventData.endTime) {
          endTime = window.Cesium.JulianDate.fromIso8601(eventData.endTime)
        } else if (eventData.duration) {
          // duration是分钟数，转换为秒
          endTime = window.Cesium.JulianDate.addSeconds(
            startTime,
            eventData.duration * 60,
            new window.Cesium.JulianDate(),
          )
        } else {
          // 默认轨迹虚拟节点连线持续45分钟
          endTime = window.Cesium.JulianDate.addSeconds(
            startTime,
            2700,
            new window.Cesium.JulianDate(),
          )
        }

        availability = new window.Cesium.TimeIntervalCollection([
          new window.Cesium.TimeInterval({
            start: startTime,
            stop: endTime,
          }),
        ])
      }

      const virtualConnection = {
        id: connectionId,
        name: `轨迹虚拟节点${sourceNode.name}连线`,
        type: eventData.type || 'trajectory_virtual_node_connection',
        source_id: sourceNode.id,
        target_id: eventData.target_id || trajectory.trajectoryData.target_id,

        // 设置时间可用性
        availability: availability,
        // LineWithLabel组件需要的属性
        positions,
        width: styleConfig.width || 2,
        material: material,
        showLabel: true, // 添加缺少的 showLabel 属性
        distanceDisplayCondition: distanceConfigs.distanceDisplayCondition,
        labelStyle: {
          ...distanceConfigs,
          text: labelText,
          font: '8pt sans-serif',
          fillColor: '#fff',
          outlineColor: '#000000',
          showBackground: true,
          backgroundColor: 'rgba(233,211,0,0.3)',
          outlineWidth: 2,
          pixelOffset: [0, -20],
          verticalOrigin: 1,
        },
        curveConfig: {
          enabled: styleConfig.curve?.enabled || false,
          height: styleConfig.curve?.height || 100000,
        },
        materialType: styleConfig.material,

        // 轨迹虚拟连线特有属性
        isVirtual: true,
        virtualType: 'trajectory_node_connection',
        isDynamic: true, // 标记为动态连线

        // 保留原始事件数据
        originalEventData: eventData,
      }

      connections.push(virtualConnection)
    })
  }

  console.log('生成轨迹虚拟节点事件数量:', connections.length)
  return connections
}

const onTargetDblClick = (target, event) => {
  emit('targetDblClick', target, event)
  const { originTarget } = target
  // 检查目标是否包含圆环相关属性
  if (originTarget.ringMaterial && originTarget.ringOutlineColor && originTarget.ringRadius) {
    const ringId = `ring-${target.id}`
    const nodesId = `nodes-${target.id}`

    // 如果圆环已存在，则移除它和虚拟节点
    if (activeRings.value.has(ringId)) {
      activeRings.value.delete(ringId)
      virtualNodes.value.delete(nodesId)
      virtualRelations.value.delete(nodesId)
      virtualEvents.value.delete(nodesId)
      console.log('移除圆环、虚拟节点、连线:', ringId)
    } else {
      console.log('target', target)
      // 创建新的圆环配置
      const ringConfig = {
        id: ringId,
        targetId: target.id,
        position: target.position,
        material: originTarget.ringMaterial,
        outlineColor: originTarget.ringOutlineColor,
        radius: originTarget.ringRadius,
        height: target.position[2] || 0,
        target,
      }

      activeRings.value.set(ringId, ringConfig)
      console.log('创建圆环:', ringId, ringConfig)

      // 如果目标包含virtualNodes属性，生成虚拟节点
      if (originTarget.virtualNodes && originTarget.virtualNodes.length > 0) {
        const nodes = generateVirtualNodes(target)
        virtualNodes.value.set(nodesId, nodes)
        // console.log('创建虚拟节点:', nodesId, nodes)

        // 生成虚拟节点连线
        const relations = generateVirtualRelations(target, nodes)
        // console.log('生成的虚拟连线数据:', relations)
        // console.log('连线数量:', relations.length)
        virtualRelations.value.set(nodesId, relations)

        // 生成虚拟节点连线
        const connections = generateVirtualNodeEvents(target, nodes)
        virtualEvents.value.set(nodesId, connections)
        console.log('创建虚拟节点连线:', nodesId, connections)
      }
    }
  }
}

const onRelationClick = debounceEvent((relation, event) => {
  emit('relationClick', relation, event)
}, 50)

// 悬浮事件处理函数
const onTargetHover = debounceEvent((target, event) => {
  setPointer('pointer')
  emit('targetHover', target, event)
}, 100)

const onTargetLeave = debounceEvent((target, event) => {
  setPointer('auto')
  emit('targetLeave', target, event)
}, 100)

// 轨迹事件处理函数
const onTrajectoryClick = debounceEvent((trajectory, event) => {
  emit('trajectoryClick', trajectory, event)
}, 50)

const onTrajectoryHover = debounceEvent((trajectory, event) => {
  setPointer('pointer')
  emit('trajectoryHover', trajectory, event)
}, 100)

const onTrajectoryLeave = debounceEvent((trajectory, event) => {
  setPointer('auto')
  emit('trajectoryLeave', trajectory, event)
}, 100)

// 轨迹双击事件处理函数
const onTrajectoryDblClick = (trajectory, event) => {
  emit('trajectoryDblClick', trajectory, event)
  const { trajectoryData } = trajectory
  const base = dataManager.targetBaseManager.findById(trajectoryData.target_id)
  // 检查轨迹目标是否包含圆环相关属性
  if (base && base.ringMaterial && base.ringOutlineColor && base.ringRadius) {
    const ringId = `ring-${trajectory.id}`
    const nodesId = `nodes-${trajectory.id}`

    // 如果圆环已存在，则移除它和虚拟节点
    if (activeRings.value.has(ringId)) {
      activeRings.value.delete(ringId)
      virtualNodes.value.delete(nodesId)
      virtualRelations.value.delete(nodesId)
      virtualEvents.value.delete(nodesId)
      console.log('移除轨迹圆环、虚拟节点、连线:', ringId)
    } else {
      console.log('轨迹目标:', trajectory)
      // 使用CallbackProperty动态获取轨迹的实时位置
      const dynamicPosition = new window.Cesium.CallbackProperty((time) => {
        try {
          const viewer = window.viewer || window.cesiumViewer
          if (viewer) {
            const trajectoryEntity = viewer.entities.getById(trajectory.id)

            if (trajectoryEntity && trajectoryEntity.position) {
              const realTimePosition = trajectoryEntity.position.getValue(time)
              if (realTimePosition) {
                // 直接返回Cartesian3位置
                return realTimePosition
              }
            }
          }
        } catch (error) {
          console.warn('获取轨迹实时位置失败:', error)
        }
        // 如果获取失败，返回默认位置的Cartesian3
        const defaultPos = trajectory.position || [121.774, 24.5674, 0]
        return window.Cesium.Cartesian3.fromDegrees(
          defaultPos[0],
          defaultPos[1],
          defaultPos[2] || 0,
        )
      }, false)

      // 创建新的圆环配置，使用动态位置
      const ringConfig = {
        id: ringId,
        targetId: trajectory.id,
        position: dynamicPosition,
        material: base.ringMaterial,
        outlineColor: base.ringOutlineColor,
        radius: base.ringRadius,
        height: 0, // 高度也可以通过CallbackProperty动态获取
        target: trajectory,
      }

      activeRings.value.set(ringId, ringConfig)
      // console.log('创建轨迹圆环:', ringId, ringConfig)

      // 如果轨迹目标包含virtualNodes属性，生成动态虚拟节点
      if (base.virtualNodes && base.virtualNodes.length > 0) {
        const nodes = generateTrajectoryVirtualNodes(trajectory)

        // 只有在成功生成虚拟节点时才继续处理连线
        if (nodes && nodes.length > 0) {
          virtualNodes.value.set(nodesId, nodes)

          // 生成轨迹动态虚拟节点连线
          const relations = generateTrajectoryVirtualRelations(trajectory, nodes)
          virtualRelations.value.set(nodesId, relations)

          // 生成轨迹虚拟节点连线
          const connections = generateTrajectoryVirtualNodeEvents(trajectory, nodes)
          virtualEvents.value.set(nodesId, connections)
          console.log('创建轨迹虚拟节点连线:', nodesId, relations)
        } else {
          console.warn('轨迹虚拟节点生成失败，跳过连线创建:', trajectory.id)
        }
      }
    }
  } else {
    console.log('轨迹目标缺少圆环配置属性:', trajectory)
  }
}

const onRelationHover = debounceEvent((relation, event) => {
  setPointer('pointer')
  emit('relationHover', relation, event)
}, 100)

const onRelationLeave = debounceEvent((relation, event) => {
  setPointer('auto')
  emit('relationLeave', relation, event)
}, 100)

const onEventClick = debounceEvent((data, event) => {
  emit('eventClick', data, event)
}, 50)

const onEventHover = debounceEvent((data, event) => {
  setPointer('pointer')
  emit('eventHover', data, event)
}, 100)

const onEventLeave = debounceEvent((data, event) => {
  setPointer('auto')
  emit('eventLeave', data, event)
}, 100)

// 处理目标点位数据

// 组件挂载时确保处理初始数据
onMounted(() => {
  console.log('🎯 DataVisualization - 组件已挂载，开始处理初始数据')

  // 确保在组件挂载后处理所有初始数据
  nextTick(() => {
    if (props.points && props.points.length > 0) {
      // console.log('🎯 DataVisualization - onMounted处理points数据:', props.points.length, '个点')
      processPoint()
    }
    if (props.relations && props.relations.length > 0) {
      processRelation()
    }
    if (props.trajectories && Object.keys(props.trajectories).length > 0) {
      processTrajectory()
    }
  })

  // 等待viewer初始化完成后添加时间轴监听器
  watchEffect(() => {
    console.log('🎯 viewer.value', viewer.value)
    if (viewer.value && viewer.value.clock) {
      console.log('🎯 viewer已初始化，添加时间轴监听器')
      viewer.value.clock.onTick.addEventListener((clock) => {
        const currentTime = clock.currentTime
        const currentTimeStr = window.Cesium.JulianDate.toIso8601(currentTime)

        // 遍历所有轨迹记录，检查可见性变化
        trajectoryTimeLog.value.forEach((timeRecord, trajectoryId) => {
          if (timeRecord.startTime && timeRecord.endTime) {
            const startTime = window.Cesium.JulianDate.fromIso8601(timeRecord.startTime)
            const endTime = window.Cesium.JulianDate.fromIso8601(timeRecord.endTime)

            // 判断当前时间是否在轨迹的可见时间范围内
            const shouldBeVisible =
              window.Cesium.JulianDate.greaterThanOrEquals(currentTime, startTime) &&
              window.Cesium.JulianDate.lessThanOrEquals(currentTime, endTime)

            // 更新可见性状态
            if (timeRecord.isVisible !== shouldBeVisible) {
              updateTrajectoryVisibility(trajectoryId, shouldBeVisible, currentTimeStr)
            }
          }
        })
      })
    }
  })
})

// 暴露轨迹时间记录相关函数供外部调用
defineExpose({
  // 原有的暴露函数...

  // 轨迹时间记录相关函数
  getTrajectoryTimeRecord,
  getAllTrajectoryTimeRecords,
  isTrajectoryVisibleAtTime,
  updateTrajectoryVisibility,

  // 获取轨迹时间记录的响应式数据
  trajectoryTimeLog: readonly(trajectoryTimeLog),
})
</script>

<style scoped>
/* 组件样式 */
</style>
