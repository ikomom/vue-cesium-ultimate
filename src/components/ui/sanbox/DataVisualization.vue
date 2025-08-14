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
import { watch, watchEffect, ref, toRefs, computed, toRaw } from 'vue'
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

const dataManager = new DataManagerFactory()
console.log('dataManager', { dataManager, layerId: props.layerId, layerName: props.layerName })
const distanceConfigs = getDistanceConfigs()

const renderPoints = ref([])
const renderRelations = ref([])
const renderTrajectory = ref([])

function setPointer(cursor = 'auto') {
  document.body.style.cursor = cursor
}

watch(
  () => props.targets,
  (newTargets) => {
    dataManager.targetBaseManager.updateData(newTargets)
  },
  { deep: true, immediate: true },
)
watch(
  () => props.points,
  (newPoints) => {
    dataManager.targetLocationManager.updateData(newPoints)
    processPoint()
  },
  { deep: true, immediate: true },
)
watch(
  () => props.relations,
  (newRelations) => {
    dataManager.relationManager.updateData(newRelations)
    processRelation()
  },
  { deep: true, immediate: true },
)
watch(
  () => props.trajectories,
  (newTrajectory) => {
    dataManager.trajectoryManager.updateData(newTrajectory)
    processTrajectory()
    processRelation()
  },
  { deep: true, immediate: true },
)

// 处理点数据
function processPoint() {
  const allPoint = dataManager.targetLocationManager.getAll()
  renderPoints.value = allPoint
    .map((target) => {
      const base = dataManager.targetBaseManager.findById(target.id)
      if (!base) {
        console.error('处理点数据项失败：缺少必要的目标基础信息', target)
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
// 处理关系数据
function processRelation() {
  const allRelation = dataManager.relationManager.getAll()
  renderRelations.value = allRelation
    .map((relation) => {
      const linkTrajectorySource = dataManager.trajectoryManager.findById(relation.source_id)
      const linkTrajectoryTarget = dataManager.trajectoryManager.findById(relation.target_id)
      const islinkTrajectory = !!(linkTrajectorySource || linkTrajectoryTarget)
      const source = dataManager.targetLocationManager.findById(relation.source_id)
      const target = dataManager.targetLocationManager.findById(relation.target_id)
      if (!source || (!target && !islinkTrajectory)) {
        console.error('处理关系数据项失败：缺少必要的源或目标点', relation)
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
              // debugger
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
  // .filter((item) => item.materialType === MATERIAL_TYPES.PolylinePulseLine)
  console.log('关系数据', { renderRelations: toRaw(renderRelations.value) })
}

// 处理轨迹数据
function processTrajectory() {
  const allTrajectory = dataManager.trajectoryManager.getAll()

  // 检查是否有轨迹数据
  if (!allTrajectory || allTrajectory.length === 0) {
    console.log('没有轨迹数据')
    renderTrajectory.value = []
    return
  }

  // 获取全局时间范围
  const globalTimeRange = dataManager.trajectoryManager.getTimeRange()
  console.log('全局时间范围:', globalTimeRange)

  if (globalTimeRange && window.viewer && globalTimeRange.start && globalTimeRange.end) {
    try {
      // 设置Cesium时间轴范围
      const startTimeStr =
        typeof globalTimeRange.start === 'string'
          ? globalTimeRange.start
          : String(globalTimeRange.start)
      const endTimeStr =
        typeof globalTimeRange.end === 'string' ? globalTimeRange.end : String(globalTimeRange.end)

      const startTime = window.Cesium.JulianDate.fromIso8601(startTimeStr)
      const endTime = window.Cesium.JulianDate.fromIso8601(endTimeStr)

      window.viewer.clock.startTime = startTime
      window.viewer.clock.stopTime = endTime
      window.viewer.clock.currentTime = startTime
      window.viewer.clock.clockRange = window.Cesium.ClockRange.LOOP_STOP
      window.viewer.clock.multiplier = 1

      // 设置时间轴范围
      if (window.viewer.timeline) {
        window.viewer.timeline.zoomTo(startTime, endTime)
      }

      console.log('时间轴设置完成:', { start: startTimeStr, end: endTimeStr })
    } catch (error) {
      console.warn('时间轴设置失败:', error, globalTimeRange)
    }
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
          console.warn('时间格式转换失败:', timestampStr, error)
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
}

// 事件处理函数
const onTargetClick = (target) => {
  emit('targetClick', target)
}

const onRelationClick = (relation) => {
  emit('relationClick', relation)
}

// 悬浮事件处理函数
const onTargetHover = (target) => {
  setPointer('pointer')
  emit('targetHover', target)
}

const onTargetLeave = (target) => {
  setPointer('auto')
  emit('targetLeave', target)
}

// 轨迹事件处理函数
const onTrajectoryClick = (trajectory) => {
  console.log('轨迹点击事件', trajectory)
  emit('trajectoryClick', trajectory)
}

const onTrajectoryHover = (trajectory) => {
  setPointer('pointer')
  console.log('轨迹悬停事件', trajectory)
  emit('trajectoryHover', trajectory)
}

const onTrajectoryLeave = (trajectory) => {
  setPointer('auto')
  emit('trajectoryLeave', trajectory)
}

const onRelationHover = (relation) => {
  setPointer('pointer')
  emit('relationHover', relation)
}

const onRelationLeave = (relation) => {
  setPointer('auto')
  emit('relationLeave', relation)
}
</script>

<style scoped>
/* 组件样式 */
</style>
