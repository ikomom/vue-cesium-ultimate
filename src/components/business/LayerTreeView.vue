<template>
  <div class="layer-tree-view">
    <!-- 使用el-tree组件 -->
    <el-tree
      ref="treeRef"
      :data="treeDataList"
      :props="treeProps"
      :show-checkbox="true"
      :check-strictly="false"
      :default-checked-keys="defaultCheckedKeys"
      :default-expanded-keys="defaultExpandedKeys"
      :expand-on-click-node="false"
      :check-on-click-node="false"
      node-key="id"
      class="custom-tree"
      @node-click="handleNodeClick"
      @check="handleNodeCheck"
    >
      <template #default="{ node, data }">
        <div class="tree-node-content" :class="getNodeClass(data)">
          <!-- 节点图标 -->
          <span class="node-icon" :style="getNodeIconStyle(data)">
            {{ getNodeIconText(data) }}
          </span>
          
          <!-- 节点标签 -->
          <span class="node-label">
            {{ data.name }}
            <span v-if="data.count" class="node-count">({{ data.count }})</span>
          </span>
          
          <!-- 关系目标 -->
          <span v-if="data.relationType" class="relation-target">→ {{ data.targetName }}</span>
          
          <!-- 控制按钮 -->
          <div class="node-controls">
            <!-- 图层控制按钮 -->
            <button
              v-if="data.nodeType === 'layer'"
              class="btn-icon btn-mini"
              :class="{ active: data.visible }"
              @click.stop="toggleLayerVisibility(data.id)"
              :title="data.visible ? '隐藏图层' : '显示图层'"
            >
              <i :class="data.visible ? 'icon-eye' : 'icon-eye-off'"></i>
            </button>

            <!-- 点位控制按钮 -->
            <button
              v-if="data.nodeType === 'point'"
              class="btn-icon btn-mini"
              @click.stop="selectPoint(data.id)"
              :title="'选择点位'"
            >
              <i class="icon-target"></i>
            </button>

            <!-- 关系控制按钮 -->
            <button
              v-if="data.nodeType === 'relation'"
              class="btn-icon btn-mini"
              @click.stop="selectRelation(data.id)"
              :title="'选择关系'"
            >
              <i class="icon-target"></i>
            </button>
          </div>
        </div>
      </template>
    </el-tree>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect, nextTick } from 'vue'
import { useGlobalMapStore } from '@/stores/globalMap'
import { storeToRefs } from 'pinia'

const props = defineProps({
  activeLayerId: String,
})

const emit = defineEmits([
  'layer-visibility-toggle',
  'point-visibility-toggle',
  'point-select',
  'relation-select',
])

const globalMapStore = useGlobalMapStore()
const { globalLayerManager } = globalMapStore
const { layers } = storeToRefs(globalMapStore)

// 响应式状态
const treeRef = ref(null)
const expandedKeys = ref(new Set())
const checkedKeys = ref(new Set())
const selectedPointId = ref(null)
const selectedTrajectoryId = ref(null)
const selectedRelationId = ref(null)
const selectedEventId = ref(null)

// el-tree配置
const treeProps = {
  children: 'children',
  label: 'name'
}

// 默认选中和展开的keys（数组格式）
const defaultCheckedKeys = computed(() => {
  return Array.from(checkedKeys.value)
})

const defaultExpandedKeys = computed(() => {
  return Array.from(expandedKeys.value)
})

// 初始化选中状态
const initializeCheckedKeys = () => {
  const keys = new Set()
  layers.value.forEach(layer => {
    if (layer.visible) {
      keys.add(layer.id)
      // 添加所有子节点
      const points = getLayerPoints(layer)
      points.forEach(point => {
        keys.add(point.id)
        const relations = getPointRelations(point)
        relations.forEach(relation => {
          keys.add(relation.id)
        })
        const events = getPointEvents(point)
        events.forEach(event => {
          keys.add(event.id)
        })
      })

      // 添加轨迹节点
      const trajectories = getLayerTrajectories(layer)
      trajectories.forEach(trajectory => {
        keys.add(trajectory.id)
        const relations = getTrajectoryRelations(trajectory)
        relations.forEach(relation => {
          keys.add(relation.id)
        })
        const events = getTrajectoryEvents(trajectory)
        events.forEach(event => {
          keys.add(event.id)
        })
      })
    }
  })
  checkedKeys.value = keys
}

// 获取图层的点位数据
const getLayerPoints = (layer) => {
  // 合并targets和points数据
  const targets = layer.data.targets || []
  const points = layer.data.points || []
  return [...targets, ...points]
}

// 获取图层的轨迹数据
const getLayerTrajectories = (layer) => {
  const trajectories = layer.data.trajectories || {}

  // 如果轨迹数据是对象格式（如shipTrajectoryData.json），转换为数组
  if (typeof trajectories === 'object' && !Array.isArray(trajectories)) {
    return Object.entries(trajectories).map(([targetId, trajectory]) => ({
      id: targetId,
      target_id: targetId,
      name: `轨迹-${targetId}`,
      trajectory: trajectory || [],
      type: 'ship' // 默认类型
    }))
  }

  // 如果已经是数组格式，直接返回
  return Array.isArray(trajectories) ? trajectories : []
}

// 获取点位的关系数据
const getPointRelations = (point) => {
  // 从所有图层中查找与该点位相关的关系
  const allRelations = []
  layers.value.forEach(layer => {
    const relations = layer.data.relations || []
    const pointRelations = relations.filter(rel =>
      rel.source_id === point.id || rel.target_id === point.id
    )
    allRelations.push(...pointRelations)
  })
  return allRelations
}

// 获取点位的事件数据
const getPointEvents = (point) => {
  // 从所有图层中查找与该点位相关的事件
  const allEvents = []
  layers.value.forEach(layer => {
    const events = layer.data.events || []
    const pointEvents = events.filter(event =>
      event.source_id === point.id || event.target_id === point.id
    )
    allEvents.push(...pointEvents)
  })
  return allEvents
}

// 获取轨迹的关系数据
const getTrajectoryRelations = (trajectory) => {
  // 从所有图层中查找与该轨迹相关的关系
  const allRelations = []
  layers.value.forEach(layer => {
    const relations = layer.data.relations || []
    const trajectoryRelations = relations.filter(rel =>
      rel.source_id === trajectory.id || rel.target_id === trajectory.id
    )
    allRelations.push(...trajectoryRelations)
  })
  return allRelations
}

// 获取轨迹的事件数据
const getTrajectoryEvents = (trajectory) => {
  // 从所有图层中查找与该轨迹相关的事件
  const allEvents = []
  layers.value.forEach(layer => {
    const events = layer.data.events || []
    const trajectoryEvents = events.filter(event =>
      event.source_id === trajectory.id || event.target_id === trajectory.id
    )
    allEvents.push(...trajectoryEvents)
  })
  return allEvents
}

// 获取关系的目标名称
const getRelationTargetName = (relation) => {
  // 查找目标点位的名称
  for (const layer of layers.value) {
    const allPoints = [...(layer.data.targets || []), ...(layer.data.points || [])]
    const targetPoint = allPoints.find(p => p.id === relation.target_id)
    if (targetPoint) {
      return targetPoint.name || targetPoint.id
    }
  }
  return relation.target_id
}

// 监听图层变化，重新初始化选中状态
watchEffect(() => {
  if (layers.value.length > 0) {
    initializeCheckedKeys()
    // 使用nextTick确保DOM更新后再设置选中状态
    nextTick(() => {
      if (treeRef.value) {
        treeRef.value.setCheckedKeys(Array.from(checkedKeys.value))
      }
    })
  }
})

// 转换为树形数据结构
const treeDataList = computed(() => {
  return layers.value.map(layer => {
    const points = getLayerPoints(layer)
    const trajectories = getLayerTrajectories(layer)

    // 处理点位节点
    const pointChildren = points.map(point => {
      const relations = getPointRelations(point)
      const events = getPointEvents(point)

      const relationChildren = relations.map(relation => ({
        id: relation.id,
        name: relation.description || relation.id,
        type: relation.type,
        nodeType: 'relation',
        relationType: relation.type,
        targetName: getRelationTargetName(relation),
        children: []
      }))

      const eventChildren = events.map(event => ({
        id: event.id,
        name: event.description || event.id,
        type: event.type || 'event',
        nodeType: 'event',
        eventType: event.eventType || event.type,
        status: event.type,
        startTime: event.startTime,
        children: []
      }))

      return {
        id: point.id,
        name: point.name || point.id,
        type: point.type,
        nodeType: 'point',
        count: (relations.length + events.length) > 0 ? (relations.length + events.length) : undefined,
        children: [...relationChildren, ...eventChildren]
      }
    })

    // 处理轨迹节点
    const trajectoryChildren = trajectories.map(trajectory => {
      const relations = getTrajectoryRelations(trajectory)
      const events = getTrajectoryEvents(trajectory)

      const relationChildren = relations.map(relation => ({
        id: relation.id,
        name: relation.description || relation.id,
        type: relation.type,
        nodeType: 'relation',
        relationType: relation.type,
        targetName: getRelationTargetName(relation),
        children: []
      }))

      const eventChildren = events.map(event => ({
        id: event.id,
        name: event.description || event.id,
        type: event.type || 'event',
        nodeType: 'event',
        eventType: event.eventType || event.type,
        status: event.type,
        startTime: event.startTime,
        children: []
      }))

      return {
        id: trajectory.id,
        name: trajectory.name || trajectory.id,
        type: trajectory.type || 'trajectory',
        nodeType: 'trajectory',
        count: (relations.length + events.length) > 0 ? (relations.length + events.length) : undefined,
        children: [...relationChildren, ...eventChildren]
      }
    })

    return {
      id: layer.id,
      name: layer.name,
      nodeType: 'layer',
      visible: layer.visible,
      count: points.length + trajectories.length,
      children: [...pointChildren, ...trajectoryChildren]
    }
  })
})

watchEffect(() => {
  console.log(treeDataList.value, 'treeDataList.value')
})

// 节点样式类
const getNodeClass = (node, level) => {
  const classes = []
  if (node.nodeType === 'layer') {
    classes.push('layer-node')
    if (node.id === props.activeLayerId) classes.push('active')
    if (!node.visible) classes.push('layer-hidden')
  } else if (node.nodeType === 'point') {
    classes.push('point-node')
    if (selectedPointId.value === node.id) classes.push('active')
  } else if (node.nodeType === 'trajectory') {
    classes.push('trajectory-node')
    if (selectedTrajectoryId.value === node.id) classes.push('active')
  } else if (node.nodeType === 'relation') {
    classes.push('relation-node')
    if (selectedRelationId.value === node.id) classes.push('active')
  } else if (node.nodeType === 'event') {
    classes.push('event-node')
    if (selectedEventId.value === node.id) classes.push('active')
  }
  return classes.join(' ')
}

// 内容样式类
const getContentClass = (node, level) => {
  if (node.nodeType === 'layer') return 'layer-content'
  if (node.nodeType === 'point') return 'point-content'
  if (node.nodeType === 'trajectory') return 'trajectory-content'
  if (node.nodeType === 'relation') return 'relation-content'
  if (node.nodeType === 'event') return 'event-content'
  return ''
}

// 节点图标文本（emoji）
const getNodeIconText = (node) => {
  if (node.nodeType === 'layer') {
    return '📁'
  } else if (node.nodeType === 'point') {
    return '📍'
  } else if (node.nodeType === 'trajectory') {
    return '🛤️'
  } else if (node.nodeType === 'relation') {
    return '🔗'
  } else if (node.nodeType === 'event') {
    return '⚡'
  }
  return '📄'
}

// 节点图标样式
const getNodeIconStyle = (node) => {
  let color = '#6b7280'
  
  if (node.nodeType === 'point') {
    color = getPointTypeColor(node.type)
  } else if (node.nodeType === 'trajectory') {
    color = getTrajectoryTypeColor(node.type)
  } else if (node.nodeType === 'relation') {
    color = getRelationTypeColor(node.type)
  } else if (node.nodeType === 'event') {
    color = getEventTypeColor(node.eventType || node.type)
  }
  
  return { color }
}

// 事件处理
const handleNodeClick = (data, node) => {
  if (data.nodeType === 'point') {
    selectPoint(data.id)
  } else if (data.nodeType === 'trajectory') {
    selectTrajectory(data.id)
  } else if (data.nodeType === 'relation') {
    selectRelation(data.id)
  } else if (data.nodeType === 'event') {
    selectEvent(data.id)
  }
}

const handleNodeCheck = (data, checkedInfo) => {
  console.log('handleNodeCheck', data, checkedInfo);
  
  // 获取当前所有选中的节点ID
  const checkedNodes = checkedInfo.checkedNodes || []
  const halfCheckedNodes = checkedInfo.halfCheckedNodes || []
  const allCheckedNodes = [...checkedNodes, ...halfCheckedNodes]
  const newCheckedKeys = new Set(allCheckedNodes.map(node => node.id))
  
  // 更新内部状态，但不影响默认选中的逻辑
  checkedKeys.value = newCheckedKeys

  // 根据节点类型触发相应事件
  if (data.nodeType === 'layer') {
    emit('layer-visibility-toggle', data.id)
  } else if (data.nodeType === 'point') {
    emit('point-visibility-toggle', data.id)
  } else if (data.nodeType === 'trajectory') {
    emit('trajectory-visibility-toggle', data.id)
  }
}

// 图层可见性切换
const toggleLayerVisibility = (layerId) => {
  emit('layer-visibility-toggle', layerId)
}

// 选择点位
const selectPoint = (pointId) => {
  selectedPointId.value = pointId
  selectedRelationId.value = null
  selectedTrajectoryId.value = null
  selectedEventId.value = null
  emit('point-select', pointId)
}

// 选择轨迹
const selectTrajectory = (trajectoryId) => {
  selectedTrajectoryId.value = trajectoryId
  selectedPointId.value = null
  selectedRelationId.value = null
  selectedEventId.value = null
  emit('trajectory-select', trajectoryId)
}

// 选择关系
const selectRelation = (relationId) => {
  selectedRelationId.value = relationId
  selectedPointId.value = null
  selectedTrajectoryId.value = null
  selectedEventId.value = null
  emit('relation-select', relationId)
}

// 选择事件
const selectEvent = (eventId) => {
  selectedEventId.value = eventId
  selectedPointId.value = null
  selectedTrajectoryId.value = null
  selectedRelationId.value = null
  emit('event-select', eventId)
}

// 获取图层的点位数据
// 获取图层点位数量
const getLayerPointsCount = (layer) => {
  return getLayerPoints(layer).length
}

// 获取图层轨迹数量
const getLayerTrajectoriesCount = (layer) => {
  return getLayerTrajectories(layer).length
}

// 获取轨迹类型颜色
const getTrajectoryTypeColor = (type) => {
  const colors = {
    '飞行轨迹': '#3b82f6',
    '船舶轨迹': '#06b6d4',
    '车辆轨迹': '#10b981',
    '人员轨迹': '#f59e0b',
    '军用轨迹': '#dc2626',
  }
  return colors[type] || '#6b7280'
}

// 获取事件类型颜色
const getEventTypeColor = (type) => {
  const colors = {
    '已完成': '#10b981',
    '进行中': '#f59e0b',
    '待处理': '#6b7280',
    '预警中': '#ef4444',
    'aviation': '#3b82f6',
    'communication': '#10b981',
    'maritime': '#06b6d4',
    'railway': '#8b5cf6',
    'military': '#dc2626',
  }
  return colors[type] || '#6b7280'
}

// 获取点位类型颜色
const getPointTypeColor = (type) => {
  const colors = {
    '机场': '#3b82f6',
    '雷达站': '#10b981',
    '港口': '#8b5cf6',
    '火车站': '#f59e0b',
    '通信站': '#ef4444',
    '军事基地': '#dc2626',
    '船只': '#06b6d4',
  }
  return colors[type] || '#6b7280'
}

// 获取关系类型颜色
const getRelationTypeColor = (type) => {
  const colors = {
    '航线连接': '#3b82f6',
    '雷达覆盖': '#10b981',
    '通信链路': '#f59e0b',
    '运输路线': '#8b5cf6',
    '指挥关系': '#ef4444',
  }
  return colors[type] || '#6b7280'
}
</script>

<style scoped>
.layer-tree-view {
  height: 100%;
  overflow-y: auto;
}

/* el-tree自定义样式 */
.custom-tree {
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
}

.custom-tree :deep(.el-tree-node) {
  margin-bottom: 4px;
}

.custom-tree :deep(.el-tree-node__content) {
  height: auto;
  min-height: 32px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  margin-bottom: 2px;
  transition: all 0.2s ease;
}

.custom-tree :deep(.el-tree-node__content:hover) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.custom-tree :deep(.el-tree-node__content:focus) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  outline: none;
}

.custom-tree :deep(.el-tree-node.is-focusable:focus > .el-tree-node__content) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.custom-tree :deep(.el-checkbox) {
  margin-right: 8px;
}

.custom-tree :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #409eff;
  border-color: #409eff;
}

.custom-tree :deep(.el-tree-node__expand-icon) {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

/* 树节点内容样式 */
.tree-node-content {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.node-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.node-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 4px;
}

.relation-target {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
  flex-shrink: 0;
}

.node-controls {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* 按钮样式 */
.btn-icon.btn-mini {
  width: 20px;
  height: 20px;
  font-size: 10px;
  padding: 2px;
  border-radius: 3px;
  transition: all 0.2s ease;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}

.btn-icon.btn-mini:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.btn-icon.btn-mini.active {
  color: #409eff;
}

/* 节点类型样式 */
.layer-node {
  font-weight: 600;
}

.layer-node.active .tree-node-content {
  background: rgba(59, 130, 246, 0.2) !important;
  border-color: rgba(59, 130, 246, 0.5) !important;
}

.layer-node.layer-hidden {
  opacity: 0.5;
}

.point-node.active .tree-node-content {
  background: rgba(16, 185, 129, 0.2) !important;
  border-color: rgba(16, 185, 129, 0.5) !important;
}

.trajectory-node.active .tree-node-content {
  background: rgba(59, 130, 246, 0.2) !important;
  border-color: rgba(59, 130, 246, 0.5) !important;
}

.relation-node {
  font-size: 13px;
}

.relation-node.active .tree-node-content {
  background: rgba(139, 92, 246, 0.2) !important;
  border-color: rgba(139, 92, 246, 0.5) !important;
}

.event-node {
  font-size: 13px;
}

.event-node.active .tree-node-content {
  background: rgba(245, 158, 11, 0.2) !important;
  border-color: rgba(245, 158, 11, 0.5) !important;
}

/* 图标样式 */
:deep(.icon-layers::before) {
  content: '📁';
}

:deep(.icon-point::before) {
  content: '📍';
}

:deep(.icon-trajectory::before) {
  content: '🛤️';
}

:deep(.icon-link::before) {
  content: '🔗';
}

:deep(.icon-event::before) {
  content: '⚡';
}
:deep(.icon-eye::before) {
  content: '👁️';
}
:deep(.icon-eye-off::before) {
  content: '🙈';
}
:deep(.icon-target::before) {
  content: '🎯';
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.7);
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state i::before {
  content: '📋';
}
</style>
