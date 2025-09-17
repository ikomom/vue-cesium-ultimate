<template>
  <div
    ref="panelRef"
    class="layer-control-panel"
    :style="panelStyle"
    :class="{ 'is-collapsed': isCollapsed, 'is-dragging': isDragging }"
  >
    <div ref="dragHandleRef" class="panel-header" :style="dragHandleStyle" @click="toggleCollapse">
      <div class="header-left">
        <i class="icon-layers"></i>
        <span class="title">图层管理</span>
        <i class="collapse-icon" :class="isCollapsed ? 'icon-expand' : 'icon-collapse'"></i>
      </div>
      <div class="header-right" v-show="!isCollapsed">
        <button class="btn-icon" @click.stop="showCreateDialog = true" title="新增图层">
          <i class="icon-plus"></i>
        </button>
        <button class="btn-icon" @click.stop="refreshLayers" title="刷新">
          <i class="icon-refresh"></i>
        </button>
      </div>
    </div>

    <div class="panel-content" v-show="!isCollapsed">
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

  <!-- 创建/编辑图层对话框 - 移到面板外部 -->
  <div v-if="showCreateDialog || showEditDialog" class="dialog-overlay" @click="closeDialogs">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h4>{{ showCreateDialog ? '新增图层' : '编辑图层' }}</h4>
        <button class="btn-close" @click="closeDialogs">
          <i class="icon-close"></i>
        </button>
      </div>

      <div class="dialog-content">
        <form @submit.prevent="submitForm">
          <div class="form-group">
            <label>图层名称</label>
            <input v-model="formData.name" type="text" placeholder="请输入图层名称" required />
          </div>

          <div class="form-group">
            <label>层级顺序</label>
            <input
              v-model.number="formData.zIndex"
              type="number"
              placeholder="数值越大越靠前"
              min="0"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="formData.visible" type="checkbox" />
              <span>默认可见</span>
            </label>
          </div>
        </form>
      </div>

      <div class="dialog-footer">
        <button class="btn-secondary" @click="closeDialogs">取消</button>
        <button class="btn-primary" @click="submitForm">
          {{ showCreateDialog ? '创建' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGlobalMapStore } from '@/stores/globalMap'
import { useDraggableCollapse } from '@/composables/useDraggableCollapse.js'
import { storeToRefs } from 'pinia'

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

// 响应式数据 - 直接使用图层管理器的响应式数据

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const editingLayer = ref(null)

// 表单数据
const formData = ref({
  name: '',
  zIndex: 0,
  visible: true,
})

// 计算属性
const sortedLayers = computed(() => {
  return [...layers.value].sort((a, b) => b.zIndex - a.zIndex)
})

const statistics = computed(() => {
  return globalLayerManager.getStatistics()
})

// 方法
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

const editLayer = (layer) => {
  editingLayer.value = layer
  formData.value = {
    name: layer.name,
    zIndex: layer.zIndex,
    visible: layer.visible,
  }
  showEditDialog.value = true
}

const deleteLayer = (layerId) => {
  if (confirm('确定要删除这个图层吗？此操作不可撤销。')) {
    globalLayerManager.removeLayer(layerId)
  }
}

const closeDialogs = () => {
  showCreateDialog.value = false
  showEditDialog.value = false
  editingLayer.value = null
  resetForm()
}

const resetForm = () => {
  formData.value = {
    name: '',
    zIndex: 0,
    visible: true,
  }
}

const submitForm = () => {
  if (!formData.value.name) {
    alert('请填写图层名称')
    return
  }

  if (showCreateDialog.value) {
    // 创建新图层
    const layer = globalLayerManager.createLayer({
      name: formData.value.name,
      zIndex: formData.value.zIndex,
      visible: formData.value.visible,
    })
  } else if (showEditDialog.value && editingLayer.value) {
    // 编辑现有图层
    const layer = editingLayer.value
    layer.setName(formData.value.name)
    layer.setZIndex(formData.value.zIndex)
    layer.setVisible(formData.value.visible)
  }

  closeDialogs()
}

const getLayerDataCount = (layer) => {
  const info = layer.getInfo()
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

// 生命周期
onMounted(() => {
  // 图层数据现在是响应式的，不需要手动刷新
  console.log('图层控制面板已挂载，当前图层数量:', layers.value.length)
})
</script>

<style scoped>
.layer-control-panel {
  width: 320px;
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
  height: auto;
}

.layer-control-panel.is-dragging {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  transform: scale(1.02);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: grab;
  transition: background-color 0.2s ease;
}

.panel-header:hover {
  background: rgba(255, 255, 255, 0.08);
}

.panel-header:active {
  cursor: grabbing;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.header-right {
  display: flex;
  gap: 4px;
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

.collapse-icon {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.7;
  transition: transform 0.3s ease;
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
</style>
