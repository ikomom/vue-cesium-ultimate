<template>
  <div
    class="content-display"
    :class="[
      `columns-${columns}`,
      { 'has-data': hasData },
      customClass
    ]"
    :style="containerStyle"
  >
    <!-- 有数据时显示内容 -->
    <template v-if="hasData">
      <div
        v-for="(item, index) in formattedData"
        :key="item.key || index"
        class="content-item"
        :class="item.class"
      >
        <!-- 使用插槽自定义显示 -->
        <slot
          :name="item.key"
          :item="item"
          :value="item.value"
          :label="item.label"
          :formatted="item.formatted"
        >
          <!-- 默认显示格式 -->
          <div class="item-content">
            <span v-if="item.label" class="item-label">{{ item.label }}:</span>
            <span class="item-value">{{ item.formatted }}</span>
          </div>
        </slot>
      </div>
    </template>

    <!-- 无数据时显示默认内容 -->
    <template v-else>
      <slot name="empty">
        <div class="empty-content">
          <span class="empty-text">{{ emptyText }}</span>
        </div>
      </slot>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  // 数据源
  data: {
    type: [Object, Array],
    default: () => ({})
  },
  // 格式化配置
  format: {
    type: Object,
    default: () => ({})
  },
  // 列数
  columns: {
    type: Number,
    default: 1,
    validator: (value) => value >= 1 && value <= 6
  },
  // 空数据时的默认文本
  emptyText: {
    type: String,
    default: '暂无数据'
  },
  // 自定义样式类
  customClass: {
    type: String,
    default: ''
  },
  // 间距
  gap: {
    type: [String, Number],
    default: '8px'
  },
  // 是否显示标签
  showLabel: {
    type: Boolean,
    default: true
  },
  // 标签宽度
  labelWidth: {
    type: [String, Number],
    default: 'auto'
  }
})

// 检查是否有数据
const hasData = computed(() => {
  if (Array.isArray(props.data)) {
    return props.data.length > 0
  }
  return Object.keys(props.data).length > 0
})

// 格式化数据
const formattedData = computed(() => {
  if (!hasData.value) return []

  let dataArray = []

  if (Array.isArray(props.data)) {
    dataArray = props.data.map((item, index) => ({
      key: item.key || `item_${index}`,
      value: item.value,
      label: item.label,
      ...item
    }))
  } else {
    dataArray = Object.entries(props.data).map(([key, value]) => ({
      key,
      value,
      label: key
    }))
  }

  return dataArray.map(item => {
    const formatConfig = props.format[item.key] || {}
    const formatted = formatValue(item.value, formatConfig)

    return {
      ...item,
      formatted,
      class: formatConfig.class || ''
    }
  })
})

// 格式化值
function formatValue(value, config = {}) {
  if (value === null || value === undefined) {
    return config.defaultValue || '--'
  }

  let formatted = value

  // 数字格式化
  if (typeof value === 'number' && config.type === 'number') {
    const precision = config.precision ?? 2
    formatted = value.toFixed(precision)

    // 千分位分隔符
    if (config.thousands) {
      formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }
  }

  // 日期格式化
  else if (config.type === 'date') {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      const format = config.format || 'YYYY-MM-DD HH:mm:ss'
      formatted = formatDate(date, format)
    }
  }

  // 百分比格式化
  else if (config.type === 'percent') {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      const precision = config.precision ?? 1
      formatted = (num * 100).toFixed(precision) + '%'
    }
  }

  // 自定义格式化函数
  else if (typeof config.formatter === 'function') {
    formatted = config.formatter(value)
  }

  // 添加前缀和后缀
  if (config.prefix) {
    formatted = config.prefix + formatted
  }
  if (config.suffix || config.unit) {
    formatted = formatted + (config.suffix || config.unit)
  }

  return formatted
}

// 日期格式化
function formatDate(date, format) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

// 容器样式
const containerStyle = computed(() => {
  const gap = typeof props.gap === 'number' ? `${props.gap}px` : props.gap

  return {
    gap,
    '--label-width': typeof props.labelWidth === 'number' ? `${props.labelWidth}px` : props.labelWidth
  }
})
</script>

<style scoped>
.content-display {
  display: grid;
  width: 100%;
  box-sizing: border-box;
}

/* 列数布局 */
.content-display.columns-1 {
  grid-template-columns: 1fr;
}

.content-display.columns-2 {
  grid-template-columns: repeat(2, 1fr);
}

.content-display.columns-3 {
  grid-template-columns: repeat(3, 1fr);
}

.content-display.columns-4 {
  grid-template-columns: repeat(4, 1fr);
}

.content-display.columns-5 {
  grid-template-columns: repeat(5, 1fr);
}

.content-display.columns-6 {
  grid-template-columns: repeat(6, 1fr);
}

/* 内容项 */
.content-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-content {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.item-label {
  color: #f4efef;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  width: var(--label-width, auto);
}

.item-value {
  font-weight: 400;
  word-break: break-all;
  flex: 1;
}

/* 空内容 */
.empty-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #999;
  font-style: italic;
  font-size: 12px;
}

.empty-text {
  opacity: 0.7;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .content-display.columns-3,
  .content-display.columns-4,
  .content-display.columns-5,
  .content-display.columns-6 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .content-display.columns-2,
  .content-display.columns-3,
  .content-display.columns-4,
  .content-display.columns-5,
  .content-display.columns-6 {
    grid-template-columns: 1fr;
  }

  .item-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .item-label {
    color: #aaa;
  }

  .item-value {
    color: #fff;
  }

  .empty-content {
    color: #666;
  }
}

/* 主题变体 */
.content-display.compact .item-content {
  font-size: 11px;
  gap: 2px;
}

.content-display.large .item-content {
  font-size: 14px;
  gap: 6px;
}

/* 特殊样式类 */
.content-item.highlight .item-value {
  color: #1890ff;
  font-weight: 600;
}

.content-item.warning .item-value {
  color: #faad14;
  font-weight: 600;
}

.content-item.error .item-value {
  color: #ff4d4f;
  font-weight: 600;
}

.content-item.success .item-value {
  color: #52c41a;
  font-weight: 600;
}
</style>
