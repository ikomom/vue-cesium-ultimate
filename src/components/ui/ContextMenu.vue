<template>
  <AdaptiveContainer
    v-if="visible"
    :triggerPosition="position"
    :offset="{ x: offsetX, y: offsetY }"
    :preferred-position="preferredPosition"
    :max-width="maxWidth"
    :max-height="maxHeight"
    :z-index="zIndex"
    :fixed="true"
    class="context-menu-container"
    @click.stop
  >
    <div
      class="context-menu"
      :class="[
        `theme-${theme}`,
        { 'has-icons': hasIcons },
        customClass
      ]"
      :style="menuStyle"
    >
      <!-- 菜单项 -->
      <template v-for="(item, index) in processedMenuItems" :key="item.key || index">
        <!-- 分隔线 -->
        <div v-if="item.type === 'divider'" class="menu-divider"></div>

        <!-- 菜单组标题 -->
        <div v-else-if="item.type === 'group'" class="menu-group-title">
          {{ item.label }}
        </div>

        <!-- 普通菜单项 -->
        <div
          v-else
          class="menu-item"
          :class="{
            'disabled': item.disabled,
            'active': item.active,
            'danger': item.danger,
            'has-submenu': item.children && item.children.length > 0
          }"
          @click="handleItemClick(item, $event)"
          @mouseenter="handleItemHover(item, index)"
          @mouseleave="handleItemLeave(item)"
        >
          <!-- 图标 -->
          <span v-if="item.icon" class="menu-icon">
            {{ item.icon }}
          </span>

          <!-- 文本内容 -->
          <span class="menu-text">{{ item.label }}</span>

          <!-- 快捷键 -->
          <span v-if="item.shortcut" class="menu-shortcut">{{ item.shortcut }}</span>

          <!-- 子菜单箭头 -->
          <span v-if="item.children && item.children.length > 0" class="menu-arrow">
            <i class="arrow-icon">▶</i>
          </span>
        </div>
      </template>
    </div>

    <!-- 子菜单 -->
    <ContextMenu
      v-if="submenuVisible && activeSubmenu"
      :visible="submenuVisible"
      :position="submenuPosition"
      :menu-items="activeSubmenu.children"
      :theme="theme"
      :z-index="zIndex + 1"
      @select="handleSubmenuSelect"
      @close="closeSubmenu"
    />
  </AdaptiveContainer>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import AdaptiveContainer from './AdaptiveContainer.vue'

// Props
const props = defineProps({
  // 是否显示
  visible: {
    type: Boolean,
    default: false
  },
  // 菜单位置
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  // 菜单项
  menuItems: {
    type: Array,
    default: () => []
  },
  // 主题
  theme: {
    type: String,
    default: 'light', // light, dark
    validator: (value) => ['light', 'dark'].includes(value)
  },
  // 偏移量
  offsetX: {
    type: Number,
    default: 0
  },
  offsetY: {
    type: Number,
    default: 0
  },
  // 首选位置
  preferredPosition: {
    type: String,
    default: 'bottom-right'
  },
  // 最大宽度
  maxWidth: {
    type: [String, Number],
    default: 200
  },
  // 最大高度
  maxHeight: {
    type: [String, Number],
    default: 300
  },
  // z-index
  zIndex: {
    type: Number,
    default: 9999
  },
  // 自定义样式类
  customClass: {
    type: String,
    default: ''
  },
  // 最小宽度
  minWidth: {
    type: [String, Number],
    default: 120
  }
})

// Emits
const emit = defineEmits(['select', 'close', 'item-hover'])

// 响应式数据
const submenuVisible = ref(false)
const activeSubmenu = ref(null)
const submenuPosition = ref({ x: 0, y: 0 })
const hoveredIndex = ref(-1)

// 处理后的菜单项
const processedMenuItems = computed(() => {
  return props.menuItems.map((item, index) => ({
    key: item.key || `item_${index}`,
    ...item
  }))
})

// 是否有图标
const hasIcons = computed(() => {
  return props.menuItems.some(item => item.icon)
})

// 菜单样式
const menuStyle = computed(() => {
  const minWidth = typeof props.minWidth === 'number' ? `${props.minWidth}px` : props.minWidth
  return {
    minWidth
  }
})

// 处理菜单项点击
function handleItemClick(item, event) {
  if (item.disabled) return

  // 如果有子菜单，显示子菜单
  if (item.children && item.children.length > 0) {
    showSubmenu(item, event)
    return
  }

  // 执行回调
  if (typeof item.callback === 'function') {
    item.callback(item, event)
  }

  // 发送选择事件
  emit('select', item, event)

  // 关闭菜单
  emit('close')
}

// 处理菜单项悬停
function handleItemHover(item, index) {
  hoveredIndex.value = index
  emit('item-hover', item, index)

  // 如果有子菜单，延迟显示
  if (item.children && item.children.length > 0) {
    setTimeout(() => {
      if (hoveredIndex.value === index) {
        showSubmenu(item)
      }
    }, 300)
  } else {
    closeSubmenu()
  }
}

// 处理菜单项离开
function handleItemLeave(item) {
  // 延迟关闭子菜单，给用户时间移动到子菜单
  setTimeout(() => {
    if (!submenuVisible.value) return
    closeSubmenu()
  }, 200)
}

// 显示子菜单
function showSubmenu(item, event) {
  if (!item.children || item.children.length === 0) return

  activeSubmenu.value = item

  nextTick(() => {
    // 计算子菜单位置
    const rect = event?.target?.getBoundingClientRect()
    if (rect) {
      submenuPosition.value = {
        x: rect.right,
        y: rect.top
      }
    }

    submenuVisible.value = true
  })
}

// 关闭子菜单
function closeSubmenu() {
  submenuVisible.value = false
  activeSubmenu.value = null
}

// 处理子菜单选择
function handleSubmenuSelect(item, event) {
  emit('select', item, event)
  emit('close')
}

// 监听可见性变化
watch(() => props.visible, (newVisible) => {
  if (!newVisible) {
    closeSubmenu()
    hoveredIndex.value = -1
  }
})

// 点击外部关闭菜单
function handleClickOutside(event) {
  if (!props.visible) return

  const target = event.target
  const menuElement = target.closest('.context-menu-container')

  if (!menuElement) {
    emit('close')
  }
}

// 键盘事件处理
function handleKeydown(event) {
  if (!props.visible) return

  switch (event.key) {
    case 'Escape':
      emit('close')
      break
    case 'ArrowUp':
      event.preventDefault()
      navigateMenu(-1)
      break
    case 'ArrowDown':
      event.preventDefault()
      navigateMenu(1)
      break
    case 'Enter':
      event.preventDefault()
      if (hoveredIndex.value >= 0) {
        const item = processedMenuItems.value[hoveredIndex.value]
        handleItemClick(item, event)
      }
      break
  }
}

// 菜单导航
function navigateMenu(direction) {
  const items = processedMenuItems.value.filter(item =>
    item.type !== 'divider' && item.type !== 'group' && !item.disabled
  )

  if (items.length === 0) return

  let newIndex = hoveredIndex.value + direction

  if (newIndex < 0) {
    newIndex = items.length - 1
  } else if (newIndex >= items.length) {
    newIndex = 0
  }

  hoveredIndex.value = newIndex
}

// 生命周期
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.context-menu-container {
  user-select: none;
}

.context-menu {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  font-size: 12px;
  line-height: 1.4;
  overflow: hidden;
}

/* 深色主题 */
.context-menu.theme-dark {
  background: #2c2c2c;
  border-color: #404040;
  color: #fff;
}

/* 菜单项 */
.menu-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 8px;
  min-height: 28px;
}

.menu-item:hover:not(.disabled) {
  background-color: #f5f5f5;
}

.theme-dark .menu-item:hover:not(.disabled) {
  background-color: #404040;
}

.menu-item.active {
  background-color: #e6f7ff;
  color: #1890ff;
}

.theme-dark .menu-item.active {
  background-color: #1f3a8a;
  color: #60a5fa;
}

.menu-item.disabled {
  color: #bbb;
  cursor: not-allowed;
}

.theme-dark .menu-item.disabled {
  color: #666;
}

.menu-item.danger {
  color: #ff4d4f;
}

.menu-item.danger:hover:not(.disabled) {
  background-color: #fff2f0;
}

.theme-dark .menu-item.danger:hover:not(.disabled) {
  background-color: #4a1a1a;
}

/* 图标 */
.menu-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.has-icons .menu-item:not(.menu-icon) {
  padding-left: 36px;
}

/* 文本 */
.menu-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 快捷键 */
.menu-shortcut {
  color: #999;
  font-size: 11px;
  margin-left: auto;
  flex-shrink: 0;
}

.theme-dark .menu-shortcut {
  color: #666;
}

/* 箭头 */
.menu-arrow {
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: auto;
}

.arrow-icon {
  font-size: 8px;
  color: #999;
}

.theme-dark .arrow-icon {
  color: #666;
}

/* 分隔线 */
.menu-divider {
  height: 1px;
  background-color: #e8e8e8;
  margin: 4px 0;
}

.theme-dark .menu-divider {
  background-color: #404040;
}

/* 组标题 */
.menu-group-title {
  padding: 4px 12px;
  font-size: 11px;
  color: #999;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.theme-dark .menu-group-title {
  color: #666;
}

/* 动画效果 */
.context-menu {
  animation: contextMenuFadeIn 0.15s ease-out;
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .context-menu {
    font-size: 14px;
  }

  .menu-item {
    padding: 8px 16px;
    min-height: 36px;
  }

  .menu-icon {
    width: 20px;
    height: 20px;
  }
}

/* 无障碍支持 */
.menu-item:focus {
  outline: 2px solid #1890ff;
  outline-offset: -2px;
}

.theme-dark .menu-item:focus {
  outline-color: #60a5fa;
}

/* 滚动条样式 */
.context-menu::-webkit-scrollbar {
  width: 6px;
}

.context-menu::-webkit-scrollbar-track {
  background: transparent;
}

.context-menu::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.context-menu::-webkit-scrollbar-thumb:hover {
  background: #999;
}

.theme-dark .context-menu::-webkit-scrollbar-thumb {
  background: #555;
}

.theme-dark .context-menu::-webkit-scrollbar-thumb:hover {
  background: #777;
}
</style>
