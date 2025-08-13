/**
 * 拖拽折叠Hook使用示例
 * 
 * 这个文件展示了如何在Vue组件中使用useDraggableCollapse hook
 * 来实现面板的拖拽移动和折叠功能
 */

import { useDraggableCollapse } from '../composables/useDraggableCollapse.js'

// 基础用法示例
export const basicExample = {
  setup() {
    const {
      isCollapsed,
      isDragging,
      panelRef,
      toggleCollapse,
      panelStyle
    } = useDraggableCollapse()

    return {
      isCollapsed,
      isDragging,
      panelRef,
      toggleCollapse,
      panelStyle
    }
  },
  template: `
    <div 
      ref="panelRef" 
      class="panel" 
      :class="{ collapsed: isCollapsed, dragging: isDragging }"
      :style="panelStyle"
    >
      <div class="panel-header" @click="toggleCollapse">
        <span>可拖拽面板</span>
        <span>{{ isCollapsed ? '展开' : '折叠' }}</span>
      </div>
      <div class="panel-content" v-show="!isCollapsed">
        <p>这是面板内容</p>
      </div>
    </div>
  `
}

// 高级配置示例
export const advancedExample = {
  setup() {
    const {
      isCollapsed,
      isDragging,
      panelRef,
      toggleCollapse,
      setCollapsed,
      setPosition,
      resetPosition,
      centerPanel,
      panelStyle
    } = useDraggableCollapse({
      initialCollapsed: false,
      initialPosition: { x: 100, y: 100 },
      enableDrag: true,
      enableCollapse: true,
      constraints: {
        minX: 0,
        maxX: window.innerWidth - 300,
        minY: 0,
        maxY: window.innerHeight - 200
      }
    })

    // 自定义方法
    const handleReset = () => {
      resetPosition()
      setCollapsed(false)
    }

    return {
      isCollapsed,
      isDragging,
      panelRef,
      toggleCollapse,
      setCollapsed,
      setPosition,
      resetPosition,
      centerPanel,
      panelStyle,
      handleReset
    }
  },
  template: `
    <div 
      ref="panelRef" 
      class="advanced-panel" 
      :class="{ collapsed: isCollapsed, dragging: isDragging }"
      :style="panelStyle"
    >
      <div class="panel-header">
        <span>高级配置面板</span>
        <div class="controls">
          <button @click="toggleCollapse">{{ isCollapsed ? '展开' : '折叠' }}</button>
          <button @click="centerPanel">居中</button>
          <button @click="handleReset">重置</button>
        </div>
      </div>
      <div class="panel-content" v-show="!isCollapsed">
        <p>这是一个具有高级配置的可拖拽面板</p>
        <p>支持位置约束、自定义初始状态等功能</p>
        <div class="status">
          <p>拖拽状态: {{ isDragging ? '拖拽中' : '静止' }}</p>
          <p>折叠状态: {{ isCollapsed ? '已折叠' : '已展开' }}</p>
        </div>
      </div>
    </div>
  `
}

// 多面板示例
export const multiPanelExample = {
  setup() {
    // 左侧面板
    const leftPanel = useDraggableCollapse({
      initialPosition: { x: 20, y: 20 },
      initialCollapsed: true
    })

    // 右侧面板
    const rightPanel = useDraggableCollapse({
      initialPosition: { x: window.innerWidth - 320, y: 20 },
      initialCollapsed: false
    })

    // 底部面板
    const bottomPanel = useDraggableCollapse({
      initialPosition: { x: 20, y: window.innerHeight - 220 },
      initialCollapsed: false,
      dragHandle: '.bottom-panel-header'
    })

    return {
      leftPanel,
      rightPanel,
      bottomPanel
    }
  },
  template: `
    <div class="multi-panel-container">
      <!-- 左侧面板 -->
      <div 
        ref="leftPanel.panelRef" 
        class="panel left-panel" 
        :class="{ collapsed: leftPanel.isCollapsed, dragging: leftPanel.isDragging }"
        :style="leftPanel.panelStyle"
      >
        <div class="panel-header" @click="leftPanel.toggleCollapse">
          <span>左侧面板</span>
        </div>
        <div class="panel-content" v-show="!leftPanel.isCollapsed">
          <p>左侧面板内容</p>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div 
        ref="rightPanel.panelRef" 
        class="panel right-panel" 
        :class="{ collapsed: rightPanel.isCollapsed, dragging: rightPanel.isDragging }"
        :style="rightPanel.panelStyle"
      >
        <div class="panel-header" @click="rightPanel.toggleCollapse">
          <span>右侧面板</span>
        </div>
        <div class="panel-content" v-show="!rightPanel.isCollapsed">
          <p>右侧面板内容</p>
        </div>
      </div>

      <!-- 底部面板 -->
      <div 
        ref="bottomPanel.panelRef" 
        class="panel bottom-panel" 
        :class="{ collapsed: bottomPanel.isCollapsed, dragging: bottomPanel.isDragging }"
        :style="bottomPanel.panelStyle"
      >
        <div class="bottom-panel-header" @click="bottomPanel.toggleCollapse">
          <span>底部面板</span>
        </div>
        <div class="panel-content" v-show="!bottomPanel.isCollapsed">
          <p>底部面板内容</p>
        </div>
      </div>
    </div>
  `
}

// 配置选项说明
export const configOptions = {
  // 初始折叠状态
  initialCollapsed: false, // boolean
  
  // 初始位置
  initialPosition: { x: 20, y: 20 }, // { x: number, y: number }
  
  // 拖拽手柄选择器
  dragHandle: '.panel-header', // string
  
  // 是否启用拖拽
  enableDrag: true, // boolean
  
  // 是否启用折叠
  enableCollapse: true, // boolean
  
  // 拖拽约束
  constraints: {
    minX: 0,
    maxX: window.innerWidth,
    minY: 0,
    maxY: window.innerHeight
  }
}

// 返回的API说明
export const returnedAPI = {
  // 状态
  isCollapsed: 'ref<boolean>', // 折叠状态
  position: 'reactive<{x: number, y: number}>', // 位置信息
  isDragging: 'ref<boolean>', // 拖拽状态
  
  // DOM引用
  panelRef: 'ref<HTMLElement>', // 面板DOM引用
  dragHandleRef: 'ref<HTMLElement>', // 拖拽手柄DOM引用
  
  // 方法
  toggleCollapse: 'function', // 切换折叠状态
  setCollapsed: 'function', // 设置折叠状态
  setPosition: 'function', // 设置位置
  resetPosition: 'function', // 重置到初始位置
  centerPanel: 'function', // 居中显示
  
  // 样式
  panelStyle: 'computed', // 面板样式对象
  dragHandleStyle: 'computed' // 拖拽手柄样式对象
}