import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

/**
 * 拖拽折叠Hook
 * @param {Object} options 配置选项
 * @param {boolean} options.initialCollapsed 初始折叠状态
 * @param {Object} options.initialPosition 初始位置 {x, y}
 * @param {string} options.dragHandle 拖拽手柄选择器
 * @param {boolean} options.enableDrag 是否启用拖拽
 * @param {boolean} options.enableCollapse 是否启用折叠
 * @param {Object} options.constraints 拖拽约束 {minX, maxX, minY, maxY}
 * @returns {Object} 返回状态和方法
 */
export function useDraggableCollapse(options = {}) {
  const {
    initialCollapsed = false,
    initialPosition = { x: 20, y: 20 },
    dragHandle = '.panel-header',
    enableDrag = true,
    enableCollapse = true,
    constraints = {}
  } = options

  // 响应式状态
  const isCollapsed = ref(initialCollapsed)
  const position = reactive({ ...initialPosition })
  const isDragging = ref(false)
  const dragOffset = reactive({ x: 0, y: 0 })
  
  // 拖拽状态跟踪
  const hasMoved = ref(false) // 跟踪是否发生了实际移动
  const preventClick = ref(false) // 防止拖拽后意外点击

  // DOM引用
  const panelRef = ref(null)
  const dragHandleRef = ref(null)

  // 折叠切换
  const toggleCollapse = () => {
    if (!enableCollapse || preventClick.value) return
    isCollapsed.value = !isCollapsed.value
  }

  // 设置折叠状态
  const setCollapsed = (collapsed) => {
    if (!enableCollapse) return
    isCollapsed.value = collapsed
  }

  // 设置位置
  const setPosition = (x, y) => {
    const { minX = 0, maxX = window.innerWidth, minY = 0, maxY = window.innerHeight } = constraints
    
    position.x = Math.max(minX, Math.min(maxX, x))
    position.y = Math.max(minY, Math.min(maxY, y))
  }

  // 鼠标按下事件
  const handleMouseDown = (event) => {
    if (!enableDrag) return
    
    // 检查是否点击在拖拽手柄上
    const handle = dragHandleRef.value || panelRef.value?.querySelector(dragHandle)
    if (!handle || !handle.contains(event.target)) return

    // 防止文本选择
    event.preventDefault()
    
    isDragging.value = true
    hasMoved.value = false // 重置移动标记
    
    // 计算鼠标相对于面板的偏移
    const rect = panelRef.value.getBoundingClientRect()
    dragOffset.x = event.clientX - rect.left
    dragOffset.y = event.clientY - rect.top

    // 添加全局事件监听
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    // 添加拖拽样式
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
  }

  // 鼠标移动事件
  const handleMouseMove = (event) => {
    if (!isDragging.value) return

    // 标记已发生移动
    hasMoved.value = true

    // 计算新位置
    const newX = event.clientX - dragOffset.x
    const newY = event.clientY - dragOffset.y
    
    setPosition(newX, newY)
  }

  // 鼠标释放事件
  const handleMouseUp = () => {
    if (!isDragging.value) return
    
    isDragging.value = false
    
    // 如果发生了移动，短暂阻止点击事件
    if (hasMoved.value) {
      preventClick.value = true
      setTimeout(() => {
        preventClick.value = false
      }, 100) // 100ms后恢复点击
    }
    
    // 移除全局事件监听
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    
    // 恢复样式
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }

  // 触摸事件支持
  const handleTouchStart = (event) => {
    if (!enableDrag) return
    
    const handle = dragHandleRef.value || panelRef.value?.querySelector(dragHandle)
    if (!handle || !handle.contains(event.target)) return

    const touch = event.touches[0]
    const rect = panelRef.value.getBoundingClientRect()
    
    isDragging.value = true
    hasMoved.value = false // 重置移动标记
    dragOffset.x = touch.clientX - rect.left
    dragOffset.y = touch.clientY - rect.top

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  }

  const handleTouchMove = (event) => {
    if (!isDragging.value) return
    
    // 标记已发生移动
    hasMoved.value = true
    
    event.preventDefault()
    const touch = event.touches[0]
    const newX = touch.clientX - dragOffset.x
    const newY = touch.clientY - dragOffset.y
    
    setPosition(newX, newY)
  }

  const handleTouchEnd = () => {
    if (!isDragging.value) return
    
    isDragging.value = false
    
    // 如果发生了移动，短暂阻止点击事件
    if (hasMoved.value) {
      preventClick.value = true
      setTimeout(() => {
        preventClick.value = false
      }, 100) // 100ms后恢复点击
    }
    
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
  }

  // 重置位置到初始位置
  const resetPosition = () => {
    setPosition(initialPosition.x, initialPosition.y)
  }

  // 居中显示
  const centerPanel = () => {
    if (!panelRef.value) return
    
    const rect = panelRef.value.getBoundingClientRect()
    const centerX = (window.innerWidth - rect.width) / 2
    const centerY = (window.innerHeight - rect.height) / 2
    
    setPosition(centerX, centerY)
  }

  // 窗口大小变化时调整位置
  const handleResize = () => {
    if (!panelRef.value) return
    
    const rect = panelRef.value.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width
    const maxY = window.innerHeight - rect.height
    
    // 确保面板不会超出屏幕
    if (position.x > maxX) position.x = Math.max(0, maxX)
    if (position.y > maxY) position.y = Math.max(0, maxY)
  }

  // 生命周期
  onMounted(() => {
    if (!panelRef.value) return
    
    // 绑定事件
    panelRef.value.addEventListener('mousedown', handleMouseDown)
    panelRef.value.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('resize', handleResize)
    
    // 设置初始位置
    setPosition(position.x, position.y)
  })

  onUnmounted(() => {
    // 清理事件监听
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    window.removeEventListener('resize', handleResize)
    
    // 恢复样式
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  })

  // 计算样式
  const panelStyle = computed(() => ({
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: isDragging.value ? 9999 : 1000,
    transition: isDragging.value ? 'none' : 'all 0.3s ease',
    cursor: enableDrag ? 'move' : 'default'
  }))

  // 拖拽手柄样式
  const dragHandleStyle = computed(() => ({
    cursor: enableDrag ? 'grab' : 'default',
    userSelect: 'none'
  }))

  return {
    // 状态
    isCollapsed,
    position,
    isDragging,
    
    // DOM引用
    panelRef,
    dragHandleRef,
    
    // 方法
    toggleCollapse,
    setCollapsed,
    setPosition,
    resetPosition,
    centerPanel,
    
    // 样式
    panelStyle,
    dragHandleStyle
  }
}

// 默认导出
export default useDraggableCollapse