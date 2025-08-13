<template>
  <div class="target-panel" :class="{ collapsed: isCollapsed }">
    <!-- 面板头部 -->
    <div class="panel-header" @click="togglePanel">
      <div class="panel-title">
        <i class="icon-targets"></i>
        <span>目标点位</span>
        <span class="target-count">({{ filteredTargets.length }})</span>
      </div>
      <div class="toggle-btn" :class="{ rotated: isCollapsed }">
        <i class="icon-chevron">‹</i>
      </div>
    </div>

    <!-- 面板内容 -->
    <div class="panel-content" v-show="!isCollapsed">
      <!-- 搜索框 -->
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索目标点位..."
          class="search-input"
        />
        <i class="search-icon">🔍</i>
      </div>

      <!-- 类型筛选 -->
      <div class="filter-section">
        <div class="filter-title">类型筛选</div>
        <div class="filter-options">
          <label class="filter-option" v-for="type in targetTypes" :key="type">
            <input
              type="checkbox"
              :value="type"
              v-model="selectedTypes"
            />
            <span class="checkbox-custom"></span>
            <span class="type-name">{{ type }}</span>
            <span class="type-count">({{ getTypeCount(type) }})</span>
          </label>
        </div>
      </div>

      <!-- 目标列表 -->
      <div class="target-list">
        <div class="list-header">
          <span>目标列表</span>
          <span class="sort-btn" @click="toggleSort">
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </span>
        </div>
        <div class="target-items">
          <div
            v-for="target in sortedTargets"
            :key="target.id"
            class="target-item"
            :class="{ active: selectedTarget?.id === target.id }"
            @click="selectTarget(target)"
            @dblclick="flyToTarget(target)"
          >
            <div class="target-icon">
              <i :class="getTargetIcon(target.type)"></i>
            </div>
            <div class="target-info">
              <div class="target-name">{{ target.name }}</div>
              <div class="target-details">
                <span class="target-type">{{ target.type }}</span>
                <span class="target-location">{{ target.province }} {{ target.city }}</span>
              </div>
              <div class="target-status" :class="getStatusClass(target.status)">
                {{ target.status }}
              </div>
            </div>
            <div class="target-actions">
              <button class="action-btn" @click.stop="flyToTarget(target)" title="定位">
                📍
              </button>
              <button class="action-btn" @click.stop="showTargetInfo(target)" title="详情">
                ℹ️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { targetBaseData } from '../../data/targetBaseData.js'
import { targetLocationData } from '../../data/targetLocationData.js'

// 响应式数据
const isCollapsed = ref(false)
const searchQuery = ref('')
const selectedTypes = ref([])
const selectedTarget = ref(null)
const sortOrder = ref('asc')

// 合并目标数据
const targets = computed(() => {
  return targetBaseData.map(base => {
    const location = targetLocationData.find(loc => loc.id === base.id)
    return {
      ...base,
      ...location
    }
  })
})

// 获取所有目标类型
const targetTypes = computed(() => {
  const types = [...new Set(targets.value.map(t => t.type))]
  return types.sort()
})

// 筛选后的目标
const filteredTargets = computed(() => {
  let filtered = targets.value

  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(target => 
      target.name.toLowerCase().includes(query) ||
      target.type.toLowerCase().includes(query) ||
      target.province.toLowerCase().includes(query) ||
      target.city.toLowerCase().includes(query)
    )
  }

  // 类型筛选
  if (selectedTypes.value.length > 0) {
    filtered = filtered.filter(target => selectedTypes.value.includes(target.type))
  }

  return filtered
})

// 排序后的目标
const sortedTargets = computed(() => {
  const sorted = [...filteredTargets.value]
  return sorted.sort((a, b) => {
    const nameA = a.name.toLowerCase()
    const nameB = b.name.toLowerCase()
    if (sortOrder.value === 'asc') {
      return nameA.localeCompare(nameB)
    } else {
      return nameB.localeCompare(nameA)
    }
  })
})

// 方法
const togglePanel = () => {
  isCollapsed.value = !isCollapsed.value
}

const toggleSort = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

const getTypeCount = (type) => {
  return targets.value.filter(t => t.type === type).length
}

const selectTarget = (target) => {
  selectedTarget.value = target
}

const flyToTarget = (target) => {
  // 发射事件给父组件处理飞行到目标
  emit('flyToTarget', target)
}

const showTargetInfo = (target) => {
  // 发射事件给父组件显示目标详情
  emit('showTargetInfo', target)
}

const getTargetIcon = (type) => {
  const iconMap = {
    '机场': 'icon-airport',
    '雷达站': 'icon-radar',
    '港口': 'icon-port',
    '火车站': 'icon-train',
    '通信站': 'icon-communication',
    '军事基地': 'icon-military'
  }
  return iconMap[type] || 'icon-default'
}

const getStatusClass = (status) => {
  const statusMap = {
    '运营中': 'status-active',
    '运行中': 'status-active',
    '维护中': 'status-maintenance',
    '停用': 'status-inactive',
    '机密': 'status-classified'
  }
  return statusMap[status] || 'status-unknown'
}

// 事件定义
const emit = defineEmits(['flyToTarget', 'showTargetInfo'])

// 初始化时选择所有类型
onMounted(() => {
  selectedTypes.value = [...targetTypes.value]
})
</script>

<style scoped>
.target-panel {
  position: fixed;
  left: 20px;
  top: 20px;
  width: 350px;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  transition: all 0.3s ease;
  max-height: 80vh;
  overflow: hidden;
}

.target-panel.collapsed {
  width: 200px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  user-select: none;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

.target-count {
  color: #64b5f6;
  font-size: 12px;
}

.toggle-btn {
  color: #fff;
  font-size: 18px;
  transition: transform 0.3s ease;
}

.toggle-btn.rotated {
  transform: rotate(180deg);
}

.panel-content {
  padding: 16px;
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

.search-box {
  position: relative;
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  outline: none;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.search-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.6);
}

.filter-section {
  margin-bottom: 16px;
}

.filter-title {
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 0;
}

.filter-option input[type="checkbox"] {
  display: none;
}

.checkbox-custom {
  width: 12px;
  height: 12px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 2px;
  position: relative;
}

.filter-option input[type="checkbox"]:checked + .checkbox-custom {
  background: #64b5f6;
  border-color: #64b5f6;
}

.filter-option input[type="checkbox"]:checked + .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: -2px;
  left: 1px;
  color: #fff;
  font-size: 10px;
}

.type-count {
  color: rgba(255, 255, 255, 0.6);
  margin-left: auto;
}

.target-list {
  margin-top: 16px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sort-btn {
  cursor: pointer;
  color: #64b5f6;
  font-size: 14px;
}

.target-items {
  max-height: 300px;
  overflow-y: auto;
}

.target-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.target-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(100, 181, 246, 0.3);
}

.target-item.active {
  background: rgba(100, 181, 246, 0.2);
  border-color: #64b5f6;
}

.target-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(100, 181, 246, 0.2);
  border-radius: 50%;
  color: #64b5f6;
  font-size: 12px;
}

.target-info {
  flex: 1;
  min-width: 0;
}

.target-name {
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.target-details {
  display: flex;
  gap: 8px;
  margin-bottom: 2px;
}

.target-type {
  color: #64b5f6;
  font-size: 10px;
  background: rgba(100, 181, 246, 0.2);
  padding: 1px 4px;
  border-radius: 2px;
}

.target-location {
  color: rgba(255, 255, 255, 0.7);
  font-size: 10px;
}

.target-status {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
}

.status-active {
  color: #4caf50;
  background: rgba(76, 175, 80, 0.2);
}

.status-maintenance {
  color: #ff9800;
  background: rgba(255, 152, 0, 0.2);
}

.status-inactive {
  color: #f44336;
  background: rgba(244, 67, 54, 0.2);
}

.status-classified {
  color: #9c27b0;
  background: rgba(156, 39, 176, 0.2);
}

.target-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  cursor: pointer;
  font-size: 10px;
  transition: background 0.2s ease;
}

.action-btn:hover {
  background: rgba(100, 181, 246, 0.3);
}

/* 图标样式 */
.icon-targets::before { content: '🎯'; }
.icon-chevron { font-weight: bold; }
.icon-airport::before { content: '✈️'; }
.icon-radar::before { content: '📡'; }
.icon-port::before { content: '🚢'; }
.icon-train::before { content: '🚄'; }
.icon-communication::before { content: '📶'; }
.icon-military::before { content: '🏛️'; }
.icon-default::before { content: '📍'; }

/* 滚动条样式 */
.panel-content::-webkit-scrollbar,
.target-items::-webkit-scrollbar {
  width: 4px;
}

.panel-content::-webkit-scrollbar-track,
.target-items::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.panel-content::-webkit-scrollbar-thumb,
.target-items::-webkit-scrollbar-thumb {
  background: rgba(100, 181, 246, 0.5);
  border-radius: 2px;
}

.panel-content::-webkit-scrollbar-thumb:hover,
.target-items::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 181, 246, 0.7);
}
</style>