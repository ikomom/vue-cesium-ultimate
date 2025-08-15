<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="tooltipRef"
      class="mouse-tooltip"
      :style="tooltipStyle"
    >
      <slot v-if="$slots.default" />
      <div v-else-if="content" v-html="content" />
      <div v-else class="tooltip-empty">{{ emptyText }}</div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'

// Props
const props = defineProps({
  // 是否显示
  visible: {
    type: Boolean,
    default: false
  },
  // 提示内容
  content: {
    type: String,
    default: ''
  },
  // 鼠标位置
  mousePosition: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  // 偏移量
  offset: {
    type: Object,
    default: () => ({ x: 10, y: 10 })
  },
  // 空内容时的默认文本
  emptyText: {
    type: String,
    default: '暂无数据'
  },
  // 最大宽度
  maxWidth: {
    type: [String, Number],
    default: 300
  },
  // 自定义样式类
  customClass: {
    type: String,
    default: ''
  },
  // 是否自动调整位置避免超出屏幕
  autoAdjust: {
    type: Boolean,
    default: true
  }
})

// Refs
const tooltipRef = ref(null)

// 计算提示框样式
const tooltipStyle = computed(() => {
  const { x, y } = props.mousePosition
  const { x: offsetX, y: offsetY } = props.offset

  let left = x + offsetX
  let top = y + offsetY

  // 自动调整位置避免超出屏幕
  if (props.autoAdjust && tooltipRef.value) {
    const rect = tooltipRef.value.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // 右侧超出时调整到左侧
    if (left + rect.width > viewportWidth) {
      left = x - rect.width - offsetX
    }

    // 底部超出时调整到上方
    if (top + rect.height > viewportHeight) {
      top = y - rect.height - offsetY
    }

    // 确保不超出左边界和上边界
    left = Math.max(5, left)
    top = Math.max(5, top)
  }

  return {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    maxWidth: typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : props.maxWidth,
    zIndex: 9999
  }
})

// 监听可见性变化，确保位置计算正确
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    await nextTick()
    // 触发重新计算位置
    if (tooltipRef.value && props.autoAdjust) {
      tooltipRef.value.style.visibility = 'hidden'
      await nextTick()
      tooltipRef.value.style.visibility = 'visible'
    }
  }
})
</script>

<style scoped>
.mouse-tooltip {
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  word-wrap: break-word;
  word-break: break-all;
  white-space: pre-wrap;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: opacity 0.2s ease;
}

.tooltip-empty {
  color: #999;
  font-style: italic;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .mouse-tooltip {
    font-size: 11px;
    padding: 6px 10px;
    max-width: 250px !important;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .mouse-tooltip {
    background: rgba(40, 40, 40, 0.95);
    border-color: rgba(255, 255, 255, 0.15);
  }
}

/* 浅色主题 */
.mouse-tooltip.light {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.mouse-tooltip.light .tooltip-empty {
  color: #666;
}
</style>
