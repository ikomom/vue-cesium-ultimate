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
      @click="onTargetClick(target, $event)"
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
      :show-label="true"
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
</template>

<script setup>
import { watch, watchEffect, ref, shallowRef, toRefs, computed, toRaw, nextTick } from 'vue'
import { DataManagerFactory } from '@/components/ui/sanbox/manager'
import {
  getRelationStyleConfig,
  getTargetIconConfig,
  getDistanceConfigs,
  getEventStatusStyleConfig,
} from './config/visualConfig'
import { getMaterialProperty } from './material'
import { MATERIAL_TYPES } from './constanst'
import { generateCurve } from './utils/map'
import { useVueCesium } from 'vue-cesium'
import LineWithLabel from './LineWithLabel.vue'

const { viewer } = useVueCesium()
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
  'eventClick',
  'eventHover',
  'eventLeave',
])

// 使用shallowRef优化性能，避免深度响应式
const renderPoints = shallowRef([])
const renderRelations = shallowRef([])
const renderTrajectory = shallowRef([])
const renderEvents = shallowRef([])

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
  // 遍历实体ID数组,返回第一个找到的实体
  for (const entityId of entityIds) {
    const entity = viewer.entities.getById(entityId)
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
    .filter(Boolean).filter(i => i.type === '通信链路')
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

    return {
  id: event.id + '@event@' + layerId.value,
        name: event.name,
        type: event.type,
        target,
        source,
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
    }
  })
  console.log('事件数据', { renderEvents: toRaw(renderEvents.value) })
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

// 防抖函数用于事件处理
function debounceEvent(fn, delay = 100) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

// 事件处理函数
const onTargetClick = debounceEvent((target, event) => {
  emit('targetClick', target, event)
}, 50)

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
</script>

<style scoped>
/* 组件样式 */
</style>
