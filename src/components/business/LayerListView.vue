<template>
  <div class="layer-list-view">
    <!-- 图层列表 -->
    <div class="layer-list">
      <div
        v-for="layer in sortedLayers"
        :key="layer.id"
        class="layer-item"
        :class="{ active: layer.id === activeLayerId, 'layer-hidden': !layer.visible }"
      >
        <div class="layer-info" @click="setActiveLayer(layer.id)">
          <div class="layer-icon">
            <i class="icon-layers"></i>
          </div>
          <div class="layer-details">
            <div class="layer-name">{{ layer.name }}</div>
            <div class="layer-meta">
              <span class="layer-count">{{ getLayerDataCount(layer) }}</span>
            </div>
          </div>
        </div>

        <div class="layer-controls">
          <!-- 主要控制行 -->
          <div class="main-controls">
            <!-- 可见性控制 -->
            <button
              class="btn-icon"
              :class="{ active: layer.visible }"
              @click="toggleLayerVisibility(layer.id)"
              :title="layer.visible ? '隐藏图层' : '显示图层'"
            >
              <i :class="layer.visible ? 'icon-eye' : 'icon-eye-off'"></i>
            </button>

            <!-- 编辑按钮 -->
            <button class="btn-icon" @click="editLayer(layer)" title="编辑图层">
              <i class="icon-edit"></i>
            </button>

            <!-- 删除按钮 -->
            <button class="btn-icon btn-danger" @click="deleteLayer(layer.id)" title="删除图层">
              <i class="icon-trash"></i>
            </button>
          </div>

          <!-- 显示控制行 -->
          <div class="show-controls">
            <button
              class="btn-icon btn-mini"
              :class="{ active: layer.showControls.showPoints }"
              @click="toggleShowControl(layer.id, 'showPoints')"
              title="点位"
            >
              <i class="icon-point"></i>
            </button>
            <button
              class="btn-icon btn-mini"
              :class="{ active: layer.showControls.showRelation }"
              @click="toggleShowControl(layer.id, 'showRelation')"
              title="关系"
            >
              <i class="icon-link"></i>
            </button>
            <button
              class="btn-icon btn-mini"
              :class="{ active: layer.showControls.showTrajectory }"
              @click="toggleShowControl(layer.id, 'showTrajectory')"
              title="轨迹"
            >
              <i class="icon-route"></i>
            </button>
            <button
              class="btn-icon btn-mini"
              :class="{ active: layer.showControls.showEvents }"
              @click="toggleShowControl(layer.id, 'showEvents')"
              title="事件"
            >
              <i class="icon-calendar"></i>
            </button>
            <button
              class="btn-icon btn-mini"
              :class="{ active: layer.showControls.showRings }"
              @click="toggleShowControl(layer.id, 'showRings')"
              title="圆环"
            >
              <i class="icon-ring"></i>
            </button>
            <button
              class="btn-icon btn-mini"
              :class="{ active: layer.showControls.showVirtualNodes }"
              @click="toggleShowControl(layer.id, 'showVirtualNodes')"
              title="虚拟节点"
            >
              <i class="icon-node"></i>
            </button>
            <button
              class="btn-icon btn-mini"
              :class="{ active: layer.showControls.showVirtualRelations }"
              @click="toggleShowControl(layer.id, 'showVirtualRelations')"
              title="虚拟关系"
            >
              <i class="icon-virtual-link"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="layers.length === 0" class="empty-state">
      <i class="icon-layers"></i>
      <p>暂无图层</p>
      <button class="btn-primary" @click="$emit('create-layer')">创建第一个图层</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGlobalMapStore } from '@/stores/globalMap'
import { storeToRefs } from 'pinia'

const props = defineProps({
  activeLayerId: String,
})

const emit = defineEmits([
  'set-active-layer',
  'layer-visibility-toggle',
  'edit-layer',
  'delete-layer',
  'toggle-show-control',
  'create-layer',
  'event-select',
  'relation-select',
])

const globalMapStore = useGlobalMapStore()
const { globalLayerManager } = globalMapStore
const { layers } = storeToRefs(globalMapStore)

// 计算属性
const sortedLayers = computed(() => {
  return [...layers.value].sort((a, b) => b.zIndex - a.zIndex)
})

// 方法
const setActiveLayer = (layerId) => {
  emit('set-active-layer', layerId)
}

const toggleLayerVisibility = (layerId) => {
  emit('layer-visibility-toggle', layerId)
}

const editLayer = (layer) => {
  emit('edit-layer', layer)
}

const deleteLayer = (layerId) => {
  emit('delete-layer', layerId)
}

const getLayerDataCount = (layer) => {
  const info = layer.getInfo()
  const total = Object.values(info.dataCount).reduce((sum, count) => sum + count, 0)
  return `${total} 项`
}

// 切换显示控制
const toggleShowControl = (layerId, controlType) => {
  emit('toggle-show-control', layerId, controlType)
}

</script>

<style scoped>
.layer-list-view {
  height: 100%;
  overflow-y: auto;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-item {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
  min-height: 70px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.layer-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.layer-item.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.layer-item.layer-hidden {
  opacity: 0.5;
  background: rgba(255, 255, 255, 0.02) !important;
}

.layer-item.layer-hidden .layer-name {
  color: rgba(255, 255, 255, 0.5);
}

.layer-item.layer-hidden .layer-meta {
  color: rgba(255, 255, 255, 0.3);
}

.layer-info {
  flex: 1;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding-right: 8px;
}

.layer-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: #ffffff;
  font-size: 16px;
}

.layer-details {
  flex: 1;
}

.layer-name {
  font-weight: 500;
  color: #ffffff;
  margin-bottom: 4px;
  line-height: 1.2;
}

.layer-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.3;
}

.layer-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 130px;
  margin-left: 8px;
}

.main-controls {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.show-controls {
  display: flex;
  gap: 3px;
  justify-content: center;
  padding: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.btn-icon:active {
  transform: scale(0.95);
}

.btn-icon.btn-mini {
  width: 24px;
  height: 24px;
  font-size: 11px;
  padding: 3px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-icon.btn-mini:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: scale(1.05);
}

.btn-icon.active {
  background: #3b82f6;
  color: #fff;
}

.btn-icon.btn-danger:hover {
  background: #ef4444;
  color: #fff;
}

.btn-primary {
  padding: 8px 16px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
}

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

/* 关联信息样式 */
.layer-associations {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.association-section {
  margin-bottom: 12px;
}

.association-section:last-child {
  margin-bottom: 0;
}

.association-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 6px;
}

.association-title .count {
  color: rgba(255, 255, 255, 0.6);
  font-weight: normal;
}

.association-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.association-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}

.association-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.association-item span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-items {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  padding: 4px 8px;
  text-align: center;
  font-style: italic;
}

/* 图标样式 */
.icon-layers::before {
  content: '📋';
}
.icon-eye::before {
  content: '👁️';
}
.icon-eye-off::before {
  content: '🙈';
}
.icon-edit::before {
  content: '✏️';
}
.icon-trash::before {
  content: '🗑️';
}
.icon-point::before {
  content: '📍';
}
.icon-link::before {
  content: '🔗';
}
.icon-route::before {
  content: '🛤️';
}
.icon-calendar::before {
  content: '📅';
}
.icon-ring::before {
  content: '⭕';
}
.icon-node::before {
  content: '🔵';
}
.icon-virtual-link::before {
  content: '🔗';
}
</style>
