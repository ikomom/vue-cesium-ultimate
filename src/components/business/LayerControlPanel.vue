<template>
  <div>
    <div
      ref="panelRef"
      class="layer-control-panel"
      :style="panelStyle"
      :class="{ 'is-collapsed': isCollapsed, 'is-dragging': isDragging, 'is-expanded': isExpanded }"
    >
      <div ref="dragHandleRef" class="panel-header" :style="dragHandleStyle" @click="toggleCollapse">
        <div class="header-left">
          <i class="icon-layers"></i>
          <span class="title">图层管理</span>
          <i class="collapse-icon" :class="isCollapsed ? 'icon-expand' : 'icon-collapse'"></i>
        </div>
        <div class="header-right" v-show="!isCollapsed">
          <!-- 视图切换按钮 -->
          <div class="view-toggle">
            <button
              class="btn-icon btn-toggle"
              :class="{ active: viewMode === 'tree' }"
              @click.stop="setViewMode('tree')"
              title="树形视图"
            >
              <i class="icon-tree"></i>
            </button>
            <button
              class="btn-icon btn-toggle"
              :class="{ active: viewMode === 'list' }"
              @click.stop="setViewMode('list')"
              title="列表视图"
            >
              <i class="icon-list"></i>
            </button>
          </div>
          <button class="btn-icon" @click.stop="showCreateDialog = true" title="新增图层">
            <i class="icon-plus"></i>
          </button>
          <button class="btn-icon" @click.stop="refreshLayers" title="刷新">
            <i class="icon-refresh"></i>
          </button>
          <button class="btn-icon" @click.stop="togglePanelSize" :title="isExpanded ? '缩小面板' : '放大面板'">
            <i :class="isExpanded ? 'icon-minimize' : 'icon-maximize'"></i>
          </button>
        </div>
      </div>

      <div class="panel-content" v-show="!isCollapsed">
        <!-- 树形视图 -->
        <LayerTreeView
          v-if="viewMode === 'tree'"
          :active-layer-id="activeLayerId"
          @layer-visibility-toggle="toggleLayerVisibility"
          @point-visibility-toggle="handlePointVisibilityToggle"
          @point-select="handlePointSelect"
          @relation-select="handleRelationSelect"
        />

        <!-- 列表视图 -->
        <div v-else class="layer-list">
          <div
            v-for="layer in sortedLayers"
            :key="layer.id"
            class="layer-item"
            :class="{ active: layer.id === activeLayerId, 'layer-hidden': !layer.visible }"
            @click="setActiveLayer(layer.id)"
          >
            <div class="layer-info">
              <div class="layer-icon">
                <i class="icon-layer"></i>
              </div>
              <div class="layer-details">
                <div class="layer-name">{{ layer.name }}</div>
                <div class="layer-meta">
                  <span>Z-Index: {{ layer.zIndex }}</span>
                  <span>{{ getLayerDataCount(layer) }}</span>
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
                  @click.stop="toggleLayerVisibility(layer.id)"
                  :title="layer.visible ? '隐藏图层' : '显示图层'"
                >
                  <i :class="layer.visible ? 'icon-eye' : 'icon-eye-off'"></i>
                </button>

                <!-- 编辑按钮 -->
                <button class="btn-icon" @click.stop="editLayer(layer)" title="编辑图层">
                  <i class="icon-edit"></i>
                </button>

                <!-- 删除按钮 -->
                <button class="btn-icon btn-danger" @click.stop="deleteLayer(layer.id)" title="删除图层">
                  <i class="icon-trash"></i>
                </button>
              </div>

              <!-- 显示控制行 -->
              <div class="show-controls">
                <button
                  class="btn-icon btn-mini"
                  :class="{ active: layer.showControls.showPoints }"
                  @click.stop="toggleShowControl(layer.id, 'showPoints')"
                  title="点位"
                >
                  <i class="icon-point"></i>
                </button>
                <button
                  class="btn-icon btn-mini"
                  :class="{ active: layer.showControls.showRelation }"
                  @click.stop="toggleShowControl(layer.id, 'showRelation')"
                  title="关系"
                >
                  <i class="icon-link"></i>
                </button>
                <button
                  class="btn-icon btn-mini"
                  :class="{ active: layer.showControls.showTrajectory }"
                  @click.stop="toggleShowControl(layer.id, 'showTrajectory')"
                  title="轨迹"
                >
                  <i class="icon-route"></i>
                </button>
                <button
                  class="btn-icon btn-mini"
                  :class="{ active: layer.showControls.showEvents }"
                  @click.stop="toggleShowControl(layer.id, 'showEvents')"
                  title="事件"
                >
                  <i class="icon-calendar"></i>
                </button>

              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="layers.length === 0" class="empty-state">
          <i class="icon-layers"></i>
          <p>暂无图层</p>
          <button class="btn-primary" @click="showCreateDialog = true">创建第一个图层</button>
        </div>
      </div>

      <!-- 图层统计 -->
      <div class="panel-footer">
        <div class="layer-stats">
          <span>总计: {{ statistics.totalLayers }}</span>
          <span>可见: {{ statistics.visibleLayers }}</span>
          <span>隐藏: {{ statistics.hiddenLayers }}</span>
        </div>
      </div>
    </div>

    <!-- 图层对话框 -->
    <LayerDialog
      :visible="showCreateDialog || showEditDialog"
      :is-edit="showEditDialog"
      :editing-layer="editingLayer"
      @submit="handleLayerSave"
      @close="closeDialogs"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useGlobalMapStore } from '@/stores/globalMap'
import { useDraggableCollapse } from '@/composables/useDraggableCollapse.js'
import { storeToRefs } from 'pinia'
import LayerTreeView from './LayerTreeView.vue'
import LayerListView from './LayerListView.vue'
import LayerDialog from './LayerDialog.vue'

const globalMapStore = useGlobalMapStore()
const { globalLayerManager } = globalMapStore
const { layers, activeLayerId } = storeToRefs(globalMapStore)

// 拖拽折叠功能
const {
  isCollapsed,
  position,
  isDragging,
  panelRef,
  dragHandleRef,
  toggleCollapse,
  setCollapsed,
  panelStyle,
  dragHandleStyle,
} = useDraggableCollapse({
  initialCollapsed: false,
  initialPosition: { x: 20, y: 20 },
  dragHandle: '.panel-header',
  enableDrag: true,
  enableCollapse: true,
  constraints: {
    minX: 0,
    maxX: window.innerWidth - 320,
    minY: 0,
    maxY: window.innerHeight - 400,
  },
})

// 视图模式
const viewMode = ref('tree') // 'tree' | 'list'

// 面板尺寸状态
const isExpanded = ref(false)

// 对话框状态
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const editingLayer = ref(null)

// 计算属性
const sortedLayers = computed(() => {
  return [...layers.value].sort((a, b) => b.zIndex - a.zIndex)
})

const statistics = computed(() => {
  return globalLayerManager.getStatistics()
})

// 方法
const setViewMode = (mode) => {
  viewMode.value = mode
}

const togglePanelSize = () => {
  isExpanded.value = !isExpanded.value
}

const setActiveLayer = (layerId) => {
  globalLayerManager.setActiveLayer(layerId)
}

const toggleLayerVisibility = (layerId) => {
  const layer = globalLayerManager.getLayer(layerId)
  if (layer) {
    const newVisibility = !layer.visible
    layer.setVisible(newVisibility)
    console.log(`图层 ${layer.name} 可见性切换为: ${newVisibility}`)
  }
}

const deleteLayer = (layerId) => {
  if (confirm('确定要删除这个图层吗？此操作不可撤销。')) {
    globalLayerManager.removeLayer(layerId)
  }
}

const getLayerDataCount = (layer) => {
  const info = layer.getInfo()
  console.log('图层数据统计:', info.dataCount)
  const total = Object.values(info.dataCount).reduce((sum, count) => sum + count, 0)
  return `${total} 项`
}

// 切换显示控制
const toggleShowControl = (layerId, controlType) => {
  const layer = globalLayerManager.getLayer(layerId)
  if (layer) {
    // 确保控制属性存在，如果不存在则初始化为false
    if (!layer.showControls.hasOwnProperty(controlType)) {
      layer.showControls[controlType] = false
    }
    layer.showControls[controlType] = !layer.showControls[controlType]
    console.log(`🎛️ 图层 [${layer.name}] ${controlType} 已${layer.showControls[controlType] ? '开启' : '关闭'}`)
  }
}

const refreshLayers = () => {
  // 刷新图层数据
  console.log('刷新图层数据')
}

const handlePointSelect = (pointId) => {
  console.log('选择点位:', pointId)
}

const handleRelationSelect = (relationId) => {
  console.log('选择关系:', relationId)
  // 可以在这里添加关系选择的具体逻辑，比如高亮显示关系
}

const handleEventSelect = (eventId) => {
  console.log('选择事件:', eventId)
  // 可以在这里添加事件选择的具体逻辑，比如显示事件详情
}

const handlePointVisibilityToggle = (pointId) => {
  // 处理点位可见性切换
  console.log('切换点位可见性:', pointId)
  // 可以在这里添加点位显示/隐藏的地图操作
}

// LayerDialog事件处理
const editLayer = (layer) => {
  editingLayer.value = layer
  showEditDialog.value = true
}

const closeDialogs = () => {
  showCreateDialog.value = false
  showEditDialog.value = false
  editingLayer.value = null
}

const handleLayerSave = (layerData) => {
  if (showCreateDialog.value) {
    // 创建新图层
    globalLayerManager.createLayer(layerData)
  } else if (showEditDialog.value && editingLayer.value) {
    // 编辑现有图层
    const layer = editingLayer.value
    layer.setName(layerData.name)
    layer.setZIndex(layerData.zIndex)
    layer.setVisible(layerData.visible)
  }
  closeDialogs()
}

// 生命周期
onMounted(() => {
  // 图层数据现在是响应式的，不需要手动刷新
  console.log('图层控制面板已挂载，当前图层数量:', layers.value.length)
})
</script>

<style scoped>
.layer-control-panel {
  width: 360px;
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  max-height: 600px;
  overflow: hidden;
  transition: all 0.3s ease;
  user-select: none;
}

.layer-control-panel.is-collapsed {
  height: 40px;
}

.layer-control-panel.is-expanded {
  width: 500px;
  height: 600px;
  max-height: 80vh;
}

.layer-control-panel.is-dragging {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  transform: scale(1.02);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  cursor: grab;
  transition: all 0.3s ease;
  min-height: 48px;
  position: relative;
}

.panel-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
}

.panel-header:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.panel-header:active {
  cursor: grabbing;
  transform: scale(0.998);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.header-left .icon-layers {
  font-size: 18px;
  opacity: 0.9;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collapse-icon {
  margin-left: 8px;
  font-size: 14px;
  opacity: 0.6;
  transition: all 0.3s ease;
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
}

.collapse-icon:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.view-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 2px;
  margin-right: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-toggle {
  width: 32px !important;
  height: 28px !important;
  border-radius: 4px !important;
  background: transparent !important;
  transition: all 0.2s ease !important;
  position: relative;
}

.btn-toggle.active {
  background: rgba(59, 130, 246, 0.8) !important;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  transform: none !important;
}

.btn-toggle:hover:not(.active) {
  background: rgba(255, 255, 255, 0.1) !important;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  position: relative;
  overflow: hidden;
}

.btn-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.btn-icon:hover::before {
  left: 100%;
}

.btn-icon:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.icon-expand::before {
  content: '▼';
}
.icon-collapse::before {
  content: '▲';
}
.icon-layers::before {
  content: '📋';
}
.icon-plus::before {
  content: '+';
}
.icon-refresh::before {
  content: '🔄';
}
.icon-edit::before {
  content: '✏️';
}
.icon-delete::before {
  content: '🗑️';
}
.icon-eye::before {
  content: '👁️';
}
.icon-eye-off::before {
  content: '🙈';
}
.icon-target::before {
  content: '🎯';
}
.icon-move::before {
  content: '↕️';
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
.icon-trash::before {
  content: '🗑️';
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
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
  align-items: flex-start;
  cursor: pointer;
  padding: 4px 16px 4px 0;
  gap: 16px;
  min-height: 60px;
}

.layer-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 20px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.layer-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  opacity: 0.8;
}

.layer-item:hover .layer-icon {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.12));
  transform: scale(1.05);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.layer-item.active .layer-icon {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(59, 130, 246, 0.25));
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow:
    0 4px 12px rgba(59, 130, 246, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.layer-details {
  flex: 1;
  min-width: 0;
  padding-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-name {
  font-weight: 600;
  color: #ffffff;
  line-height: 1.4;
  font-size: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.layer-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
}

.layer-meta span {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  white-space: nowrap;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.layer-meta span:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08));
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
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
  gap: 4px;
  justify-content: center;
  padding: 6px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.1));
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.btn-icon.btn-mini {
  width: 28px;
  height: 28px;
  font-size: 12px;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.btn-icon.btn-mini::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.btn-icon.btn-mini:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px) scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-icon.btn-mini:hover::before {
  left: 100%;
}

.btn-icon.btn-mini.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(59, 130, 246, 0.7));
  color: #ffffff;
  border-color: rgba(59, 130, 246, 0.8);
  box-shadow:
    0 2px 8px rgba(59, 130, 246, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.btn-icon.btn-mini.active:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 1), rgba(59, 130, 246, 0.8));
  box-shadow:
    0 4px 12px rgba(59, 130, 246, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.btn-icon.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(59, 130, 246, 0.7));
  color: #ffffff;
  border-color: rgba(59, 130, 246, 0.8);
  box-shadow:
    0 2px 8px rgba(59, 130, 246, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.btn-icon.active:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 1), rgba(59, 130, 246, 0.8));
  box-shadow:
    0 4px 12px rgba(59, 130, 246, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.btn-icon.btn-danger {
  border-color: rgba(239, 68, 68, 0.3);
}

.btn-icon.btn-danger:hover {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(239, 68, 68, 0.7));
  color: #ffffff;
  border-color: rgba(239, 68, 68, 0.8);
  box-shadow:
    0 4px 12px rgba(239, 68, 68, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
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

.btn-secondary {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
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

.panel-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.layer-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  z-index: 10000;
}

.dialog {
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  color: #ffffff;
}

.dialog-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.btn-close {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: color 0.2s ease;
}

.btn-close:hover {
  color: #ffffff;
}

.dialog-content {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #ffffff;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  transition: all 0.2s ease;
}

.form-group input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  background: rgba(255, 255, 255, 0.15);
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input {
  width: auto !important;
  margin-right: 8px;
}

.dialog-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 图标样式 - 使用简单的CSS图标 */
.icon-plus::before {
  content: '+';
}
.icon-eye::before {
  content: '👁';
}
.icon-eye-off::before {
  content: '🙈';
}
.icon-edit::before {
  content: '✏️';
}
.icon-trash::before {
  content: '🗑';
}
.icon-close::before {
  content: '✕';
}
.icon-layers::before {
  content: '📋';
}
.icon-map-pin::before {
  content: '📍';
}
.icon-target::before {
  content: '🎯';
}
.icon-link::before {
  content: '🔗';
}
.icon-route::before {
  content: '🛤';
}
.icon-calendar::before {
  content: '📅';
}
.icon-layer::before {
  content: '📄';
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
/* 视图切换和面板控制图标 */
.icon-tree::before {
  content: '🌳';
}
.icon-list::before {
  content: '📋';
}
.icon-minimize::before {
  content: '🔽';
}
.icon-maximize::before {
  content: '🔼';
}
.icon-refresh::before {
  content: '🔄';
}
.icon-point::before {
  content: '📍';
}
</style>
