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
      @click="onTargetClick(target)"
      @mouseover="onTargetHover(target)"
      @mouseout="onTargetLeave(target)"
    />
  </template>
  <template>
    <!-- 关系连线 -->
    <vc-entity
      v-for="relation in renderRelations"
      :key="relation.id"
      :id="relation.id"
      :show="visible && showRelation"
      @click="onRelationClick(relation)"
      @mouseover="onRelationHover(relation)"
      @mouseout="onRelationLeave(relation)"
    >
      <vc-graphics-polyline
        :positions="relation.polyline.positions"
        :distance-display-condition="relation.polyline.distanceDisplayCondition"
        :width="relation.polyline.width"
        :material="relation.polyline.material"
      />
    </vc-entity>
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
      @click="onTrajectoryClick(trajectory)"
      @mouseover="onTrajectoryHover(trajectory)"
      @mouseout="onTrajectoryLeave(trajectory)"
    />
  </template>
</template>

<script setup>
import { watch, watchEffect, ref, shallowRef, toRefs, computed, toRaw, nextTick } from 'vue'
import { DataManagerFactory } from '@/components/ui/sanbox/manager'
import {
  getRelationStyleConfig,
  getTargetIconConfig,
  getDistanceConfigs,
} from './config/visualConfig'
import { getMaterialProperty } from './material'
import { MATERIAL_TYPES } from './constanst'
import { generateCurve } from './utils/map'
// Props定义
const props = defineProps({
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
})
const { layerId, layerName } = toRefs(props)
const { dataManager } = props

// Emits定义
const emit = defineEmits([
  'targetClick',
  'relationClick',
  'targetHover',
  'targetLeave',
  'relationHover',
  'relationLeave',
  'trajectoryClick',
  'trajectoryHover',
  'trajectoryLeave',
])

// 使用shallowRef优化性能，避免深度响应式
const renderPoints = shallowRef([])
const renderRelations = shallowRef([])
const renderTrajectory = shallowRef([])

// 缓存配置对象，避免重复计算
const distanceConfigs = getDistanceConfigs()

// 创建日志前缀，统一日志样式
const createLogPrefix = (type) => {
  const layerInfo = layerName.value ? `[${layerName.value}]` : `[Layer-${layerId.value}]`
  return `%c🎯 ${layerInfo} - ${type} %c`
}

const logStyles = {
  primary:
    'color: #409eff; font-weight: bold; background: #f0f9ff; padding: 2px 6px; border-radius: 3px;',
  secondary: 'color: #666; font-weight: normal;',
}

function logFuncWrap(func, type) {
  return (...args) => {
    console.group(createLogPrefix(type), logStyles.primary, logStyles.secondary, ...args)
    func(...args)
    console.groupEnd()
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
let updateTimer = null
const debounceUpdate = (callback, delay = 300) => {
  if (updateTimer) clearTimeout(updateTimer)
  updateTimer = setTimeout(callback, delay)
}
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
function getEntityByIds(entityIds = []) {
  // 遍历实体ID数组,返回第一个找到的实体
  for (const entityId of entityIds) {
    const entity = window.viewer.entities.getById(entityId)
    if (entity) {
      return entity
    }
  }
  return null
}

// 处理点数据
const processPoint = logFuncWrap(() => {
  const allPoint = dataManager.targetLocationManager.getAll()

  if (!allPoint || allPoint.length === 0) {
    console.log(
      createLogPrefix('点数据'),
      logStyles.primary,
      logStyles.secondary,
      '没有点数据需要处理',
    )
    renderPoints.value = []
    return
  }

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

      const iconConfig = getTargetIconConfig(base.type)

      return {
        id: target.id + '@point@' + layerId.value,
        name: target.name,
        type: target.type,
        position: [target.longitude, target.latitude, target.height],
        billboard: {
          ...distanceConfigs,
          ...iconConfig.billboard,
        },
        model: {
          ...distanceConfigs,
          ...iconConfig.model,
        },
        label: {
          ...distanceConfigs,
          ...iconConfig.label,
          text: target.name,
        },
      }
    })
    .filter(Boolean)
  console.log('点数据', { renderPoints: toRaw(renderPoints.value) })
}, '点位数据')

// 处理关系数据
const processRelation = logFuncWrap(() => {
  const allRelation = dataManager.relationManager.getAll()

  if (!allRelation || allRelation.length === 0) {
    console.log(
      createLogPrefix('关系数据'),
      logStyles.primary,
      logStyles.secondary,
      '没有关系数据需要处理',
    )
    renderRelations.value = []
    return
  }

  renderRelations.value = allRelation
    .map((relation) => {
      const linkTrajectorySource = dataManager.trajectoryManager.findById(relation.source_id)
      const linkTrajectoryTarget = dataManager.trajectoryManager.findById(relation.target_id)
      const islinkTrajectory = !!(linkTrajectorySource || linkTrajectoryTarget)

      const source = dataManager.targetLocationManager.findById(relation.source_id)
      const target = dataManager.targetLocationManager.findById(relation.target_id)

      if ((!source || !target) && !islinkTrajectory) {
        console.error(
          `缺少源或目标点 - 关系ID: ${relation.id}, 源ID: ${relation.source_id}, 目标ID: ${relation.target_id}, 轨迹连接: ${islinkTrajectory}`,
          { relation },
        )
        return null
      }

      const styleConfig = getRelationStyleConfig(relation.type)
      const material = getMaterialProperty(styleConfig.material, styleConfig.materialProps)

      const positions = islinkTrajectory
        ? new Cesium.CallbackProperty((time, result) => {
            const linkSource = getEntityByIds([
              relation.source_id + '@trajectory@' + layerId.value,
              relation.source_id + '@point@' + layerId.value,
            ])?.position?.getValue(time)
            const linkTarget = getEntityByIds([
              relation.target_id + '@trajectory@' + layerId.value,
              relation.target_id + '@point@' + layerId.value,
            ])?.position?.getValue(time)
            if (linkSource && linkTarget) {
              return getPosition(linkSource, linkTarget, styleConfig, true)
            }
            return []
          }, false)
        : getPosition(source, target, styleConfig)

      return {
        id: relation.id + '@relation@' + layerId.value,
        name: relation.name,
        type: relation.type,
        target,
        source,
        polyline: {
          ...distanceConfigs,
          positions,
          width: styleConfig.width,
          material: material,
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

      trajectory.trajectory.forEach((point) => {
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
        } catch (error) {
          console.warn(`轨迹时间错误 时间格式转换失败: ${timestampStr}`, error)
        }
      })

      // 设置插值算法
      timePositionProperty.setInterpolationOptions({
        interpolationDegree: 1,
        interpolationAlgorithm: window.Cesium.LagrangePolynomialApproximation,
      })

      return {
        id: trajectory.target_id + '@trajectory@' + layerId.value,
        name: trajectory.target_id,
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
  console.log('轨迹数据', { renderTrajectory: toRaw(renderTrajectory.value) })
}, '轨迹数据')

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

// 防抖函数用于事件处理
function debounceEvent(fn, delay = 100) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

// 事件处理函数
const onTargetClick = debounceEvent((target) => {
  emit('targetClick', target)
}, 50)

const onRelationClick = debounceEvent((relation) => {
  emit('relationClick', relation)
}, 50)

// 悬浮事件处理函数
const onTargetHover = debounceEvent((target) => {
  setPointer('pointer')
  emit('targetHover', target)
}, 100)

const onTargetLeave = debounceEvent((target) => {
  setPointer('auto')
  emit('targetLeave', target)
}, 100)

// 轨迹事件处理函数
const onTrajectoryClick = debounceEvent((trajectory) => {
  emit('trajectoryClick', trajectory)
}, 50)

const onTrajectoryHover = debounceEvent((trajectory) => {
  setPointer('pointer')
  emit('trajectoryHover', trajectory)
}, 100)

const onTrajectoryLeave = debounceEvent((trajectory) => {
  setPointer('auto')
  emit('trajectoryLeave', trajectory)
}, 100)

const onRelationHover = debounceEvent((relation) => {
  setPointer('pointer')
  emit('relationHover', relation)
}, 100)

const onRelationLeave = debounceEvent((relation) => {
  setPointer('auto')
  emit('relationLeave', relation)
}, 100)
</script>

<style scoped>
/* 组件样式 */
</style>
