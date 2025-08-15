<template>
  <div
    ref="containerRef"
    class="adaptive-container"
    :class="[
      `position-${position}`,
      { 'auto-adjust': autoAdjust },
      customClass
    ]"
    :style="containerStyle"
  >
    <slot />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

// Props
const props = defineProps({
  // 触发位置 (鼠标位置或固定位置)
  triggerPosition: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  // 偏移量
  offset: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  // 是否自动调整位置
  autoAdjust: {
    type: Boolean,
    default: true
  },
  // 首选位置 ('bottom-right', 'bottom-left', 'top-right', 'top-left', 'center')
  preferredPosition: {
    type: String,
    default: 'bottom-right',
    validator: (value) => [
      'bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'
    ].includes(value)
  },
  // 边界间距
  boundary: {
    type: Number,
    default: 10
  },
  // 最大宽度
  maxWidth: {
    type: [String, Number],
    default: 'auto'
  },
  // 最大高度
  maxHeight: {
    type: [String, Number],
    default: 'auto'
  },
  // 自定义样式类
  customClass: {
    type: String,
    default: ''
  },
  // 是否固定定位
  fixed: {
    type: Boolean,
    default: true
  },
  // z-index
  zIndex: {
    type: Number,
    default: 1000
  }
})

// Emits
const emit = defineEmits(['position-change', 'overflow'])

// Refs
const containerRef = ref(null)
const position = ref(props.preferredPosition)
const isOverflow = ref(false)

// 计算容器样式
const containerStyle = computed(() => {
  const { x, y } = props.triggerPosition
  const { x: offsetX, y: offsetY } = props.offset

  let left = x + offsetX
  let top = y + offsetY

  // 根据位置调整
  const adjustments = getPositionAdjustments(position.value)
  left += adjustments.x
  top += adjustments.y

  const style = {
    position: props.fixed ? 'fixed' : 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    zIndex: props.zIndex
  }

  // 设置最大宽高
  if (props.maxWidth !== 'auto') {
    style.maxWidth = typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : props.maxWidth
  }
  if (props.maxHeight !== 'auto') {
    style.maxHeight = typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight
  }

  return style
})

// 获取位置调整值
function getPositionAdjustments(pos) {
  const adjustments = { x: 0, y: 0 }

  if (!containerRef.value) return adjustments

  const rect = containerRef.value.getBoundingClientRect()

  switch (pos) {
    case 'bottom-left':
      adjustments.x = -rect.width
      break
    case 'top-right':
      adjustments.y = -rect.height
      break
    case 'top-left':
      adjustments.x = -rect.width
      adjustments.y = -rect.height
      break
    case 'center':
      adjustments.x = -rect.width / 2
      adjustments.y = -rect.height / 2
      break
    // 'bottom-right' 默认不调整
  }

  return adjustments
}

// 检查是否超出屏幕边界
function checkBoundary() {
  if (!containerRef.value || !props.autoAdjust) return

  const rect = containerRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const boundary = props.boundary

  const overflow = {
    left: rect.left < boundary,
    right: rect.right > viewportWidth - boundary,
    top: rect.top < boundary,
    bottom: rect.bottom > viewportHeight - boundary
  }

  const hasOverflow = Object.values(overflow).some(Boolean)

  if (hasOverflow !== isOverflow.value) {
    isOverflow.value = hasOverflow
    emit('overflow', { overflow, hasOverflow })
  }

  // 自动调整位置
  if (hasOverflow) {
    adjustPosition(overflow)
  }
}

// 调整位置
function adjustPosition(overflow) {
  let newPosition = props.preferredPosition

  // 根据溢出情况选择最佳位置
  if (overflow.right && overflow.bottom) {
    newPosition = 'top-left'
  } else if (overflow.right && overflow.top) {
    newPosition = 'bottom-left'
  } else if (overflow.left && overflow.bottom) {
    newPosition = 'top-right'
  } else if (overflow.left && overflow.top) {
    newPosition = 'bottom-right'
  } else if (overflow.right) {
    newPosition = newPosition.includes('right') ? newPosition.replace('right', 'left') : newPosition
  } else if (overflow.left) {
    newPosition = newPosition.includes('left') ? newPosition.replace('left', 'right') : newPosition
  } else if (overflow.bottom) {
    newPosition = newPosition.includes('bottom') ? newPosition.replace('bottom', 'top') : newPosition
  } else if (overflow.top) {
    newPosition = newPosition.includes('top') ? newPosition.replace('top', 'bottom') : newPosition
  }

  if (newPosition !== position.value) {
    position.value = newPosition
    emit('position-change', newPosition)
  }
}

// 更新位置
async function updatePosition() {
  await nextTick()
  checkBoundary()
}

// 监听触发位置变化
watch(() => props.triggerPosition, updatePosition, { deep: true })

// 监听首选位置变化
watch(() => props.preferredPosition, (newPos) => {
  position.value = newPos
  updatePosition()
})

// 窗口大小变化监听
let resizeObserver = null

onMounted(() => {
  updatePosition()

  // 监听窗口大小变化
  window.addEventListener('resize', updatePosition)

  // 监听容器大小变化
  if (window.ResizeObserver && containerRef.value) {
    resizeObserver = new ResizeObserver(updatePosition)
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePosition)
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// 暴露方法
defineExpose({
  updatePosition,
  checkBoundary,
  position: () => position.value,
  isOverflow: () => isOverflow.value
})
</script>

<style scoped>
.adaptive-container {
  display: inline-block;
  max-width: 100vw;
  max-height: 100vh;
  box-sizing: border-box;
}

.adaptive-container.auto-adjust {
  transition: all 0.2s ease;
}

/* 位置指示器 */
.adaptive-container.position-bottom-right::before {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  width: 0;
  height: 0;
  border: 4px solid transparent;
  border-bottom-color: currentColor;
  border-right-color: currentColor;
}

.adaptive-container.position-bottom-left::before {
  content: '';
  position: absolute;
  top: -4px;
  right: -4px;
  width: 0;
  height: 0;
  border: 4px solid transparent;
  border-bottom-color: currentColor;
  border-left-color: currentColor;
}

.adaptive-container.position-top-right::before {
  content: '';
  position: absolute;
  bottom: -4px;
  left: -4px;
  width: 0;
  height: 0;
  border: 4px solid transparent;
  border-top-color: currentColor;
  border-right-color: currentColor;
}

.adaptive-container.position-top-left::before {
  content: '';
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 0;
  height: 0;
  border: 4px solid transparent;
  border-top-color: currentColor;
  border-left-color: currentColor;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .adaptive-container {
    max-width: calc(100vw - 20px);
    max-height: calc(100vh - 20px);
  }
}
</style>
