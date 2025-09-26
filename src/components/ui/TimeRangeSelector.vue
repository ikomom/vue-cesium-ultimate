<template>
  <div 
    class="time-range-selector"
    :class="{ 'is-dragging': isDragging }"
    :style="{ transform: `translate(${position.x}px, ${position.y}px)` }"
  >
    <!-- 拖拽手柄 -->
    <div class="drag-handle" @mousedown="startDrag">
      <div class="drag-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span class="panel-title">时间范围选择</span>
    </div>

    <!-- 主要控制区域 -->
    <div class="main-controls">
      <!-- 预设时间范围下拉选择 -->
      <div class="preset-selector">
        <label>快捷选择</label>
        <select 
          v-model="selectedRange" 
          @change="onPresetChange"
          class="preset-select"
        >
          <option value="">请选择时间范围</option>
          <option 
            v-for="option in timeRangeOptions" 
            :key="option.key"
            :value="option.key"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- 自定义时间范围 -->
      <div class="custom-time-range">
        <div class="time-inputs-row">
          <div class="input-group">
            <label>开始时间</label>
            <input 
              type="datetime-local" 
              v-model="customStartTime"
              @change="onCustomTimeChange"
            />
          </div>
          <div class="input-group">
            <label>结束时间</label>
            <input 
              type="datetime-local" 
              v-model="customEndTime"
              @change="onCustomTimeChange"
            />
          </div>
          <button 
            class="apply-custom"
            @click="applyCustomRange"
            :disabled="!isCustomRangeValid"
          >
            应用
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Props
const props = defineProps({
  initialPosition: {
    type: Object,
    default: () => ({ x: 20, y: 100 })
  }
})

// Emits
const emit = defineEmits(['timeRangeChange'])

// 响应式数据
const position = ref({ ...props.initialPosition })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const selectedRange = ref('3days')
const showCustomRange = ref(false)
const customStartTime = ref('')
const customEndTime = ref('')

// 时间范围选项
const timeRangeOptions = ref([
  {
    key: '3days',
    label: '近三天',
    description: '最近3天的数据',
    icon: '📅',
    days: 3
  },
  {
    key: '1week',
    label: '近一周',
    description: '最近7天的数据',
    icon: '📊',
    days: 7
  },
  {
    key: '1month',
    label: '近一个月',
    description: '最近30天的数据',
    icon: '📈',
    days: 30
  },
  {
    key: '1year',
    label: '近一年',
    description: '最近365天的数据',
    icon: '📋',
    days: 365
  },
  {
    key: '2years',
    label: '近二年',
    description: '最近730天的数据',
    icon: '📊',
    days: 730
  }
])

// 计算属性
const isCustomRangeValid = computed(() => {
  return customStartTime.value && customEndTime.value && 
         new Date(customStartTime.value) < new Date(customEndTime.value)
})

// 拖拽相关方法
const startDrag = (e) => {
  // 检查是否点击在可交互元素上，如果是则不开始拖拽
  if (e.target.closest('.preset-select') || 
      e.target.closest('.input-group') || 
      e.target.closest('.apply-custom') ||
      e.target.closest('.main-controls')) {
    return // 不在这些区域开始拖拽
  }
  
  isDragging.value = true
  dragStart.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

const onDrag = (e) => {
  if (!isDragging.value) return
  
  position.value = {
    x: e.clientX - dragStart.value.x,
    y: e.clientY - dragStart.value.y
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 时间范围选择方法
const selectTimeRange = (rangeKey) => {
  selectedRange.value = rangeKey
  const option = timeRangeOptions.value.find(opt => opt.key === rangeKey)
  
  if (option) {
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - option.days * 24 * 60 * 60 * 1000)
    
    // 更新自定义时间输入框的值
    customStartTime.value = startTime.toISOString().slice(0, 16)
    customEndTime.value = endTime.toISOString().slice(0, 16)
    
    emit('timeRangeChange', {
      type: 'preset',
      key: rangeKey,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      label: option.label
    })
  }
}

// 预设选择器变化处理
const onPresetChange = () => {
  if (selectedRange.value) {
    selectTimeRange(selectedRange.value)
  }
}

// 自定义时间范围方法
const onCustomTimeChange = () => {
  if (isCustomRangeValid.value) {
    selectedRange.value = 'custom'
  }
}

const applyCustomRange = () => {
  if (isCustomRangeValid.value) {
    selectedRange.value = 'custom'
    emit('timeRangeChange', {
      type: 'custom',
      key: 'custom',
      startTime: new Date(customStartTime.value).toISOString(),
      endTime: new Date(customEndTime.value).toISOString(),
      label: '自定义范围'
    })
  }
}

// 初始化
onMounted(() => {
  // 默认选择近三天
  selectTimeRange('3days')
  
  // 设置自定义时间的默认值
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  
  customEndTime.value = now.toISOString().slice(0, 16)
  customStartTime.value = threeDaysAgo.toISOString().slice(0, 16)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style lang="less" scoped>
.time-range-selector {
  position: fixed;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  min-width: 400px;
  max-width: 500px;
  user-select: none;
  transition: all 0.2s ease;

  &.is-dragging {
    cursor: grabbing;
    transform-origin: center;
    scale: 1.02;
  }
}

.drag-handle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  cursor: grab;
  user-select: none; /* 防止文本选择 */
  
  &:active {
    cursor: grabbing;
  }
}

.drag-dots {
  display: flex;
  flex-direction: column;
  gap: 2px;
  
  span {
    width: 4px;
    height: 4px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
  }
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.main-controls {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preset-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
  
  label {
    font-size: 12px;
    color: #666;
    font-weight: 500;
  }
  
  .preset-select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 13px;
    background: white;
    cursor: pointer;
    transition: border-color 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
    }
  }
}

.custom-time-range {
  .time-inputs-row {
    display: flex;
    gap: 12px;
    align-items: flex-end;
  }
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    
    label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }
    
    input {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
      transition: border-color 0.2s ease;
      
      &:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
      }
    }
  }
  
  .apply-custom {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    height: fit-content;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>