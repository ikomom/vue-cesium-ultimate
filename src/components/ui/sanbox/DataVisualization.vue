<template>
  <template>
    <!-- 目标点位 -->
    <vc-entity
      v-for="target in renderPoints"
      :key="target.id"
      :show="showPoints"
      :position="target.position"
      :billboard="target.billboard"
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
      :show="showRelation"
      @click="onRelationClick(relation)"
      @mouseover="onRelationHover(relation)"
      @mouseout="onRelationLeave(relation)"
    >
      <vc-graphics-polyline
        :positions="relation.polyline.positions"
        :width="relation.polyline.width"
        :material="relation.polyline.material"
      />
    </vc-entity>
  </template>
</template>

<script setup>
import { watch, watchEffect, ref, computed, toRaw } from 'vue'
import { DataManagerFactory } from '@/components/ui/sanbox/manager'
import { getRelationStyleConfig, getTargetIconConfig } from './config/visualConfig'
import { getMaterialProperty } from './material'
import { MATERIAL_TYPES } from './constanst'
import { generateCurve } from './utils/map'
// Props定义
const props = defineProps({
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
  showPoints: {
    type: Boolean,
    default: true,
  },
  showRelation: {
    type: Boolean,
    default: true,
  },
})

// Emits定义
const emit = defineEmits([
  'targetClick',
  'relationClick',
  'targetHover',
  'targetLeave',
  'relationHover',
  'relationLeave',
])

const dataManager = new DataManagerFactory()
console.log('dataManager', { dataManager })

const renderPoints = ref([])
const renderRelations = ref([])

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

function processPoint() {
  const allPoint = dataManager.targetLocationManager.getAll()
  renderPoints.value = allPoint.map((target) => {
    const base = dataManager.targetBaseManager.findById(target.id)
    const iconConfig = getTargetIconConfig(base.type)
    return {
      id: target.id,
      name: target.name,
      type: target.type,
      position: [target.longitude, target.latitude, target.height],
      billboard: {
        image: iconConfig.image,
        scale: iconConfig.scale,
        color: iconConfig.color,
        pixelOffset: [0, -20],
      },
      label: {
        text: target.name,
        font: '10pt sans-serif',
        fillColor: '#fff',
        outlineColor: '#000000',
        outlineWidth: 2,
        pixelOffset: [0, 20],
      },
    }
  })
  console.log('点数据', { renderPoints: toRaw(renderPoints.value) })
}

function processRelation() {
  const allRelation = dataManager.relationManager.getAll()
  renderRelations.value = allRelation
    .map((relation) => {
      const source = dataManager.targetLocationManager.findById(relation.source_id)
      const target = dataManager.targetLocationManager.findById(relation.target_id)
      if (!source || !target) {
        console.error('处理关系数据项失败：缺少必要的源或目标点', relation)
        return null
      }
      const styleConfig = getRelationStyleConfig(relation.type)
      const material = getMaterialProperty(styleConfig.material, styleConfig.materialProps)
      const positions = styleConfig.curve.enabled
        ? generateCurve(
            Cesium.Cartesian3.fromDegrees(source.longitude, source.latitude, source.height),
            Cesium.Cartesian3.fromDegrees(target.longitude, target.latitude, target.height),
            styleConfig.curve.height,
          )
        : [
            [source.longitude, source.latitude, source.height],
            [target.longitude, target.latitude, target.height],
          ]
      return {
        id: relation.id,
        name: relation.name,
        type: relation.type,
        target,
        source,
        polyline: {
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
