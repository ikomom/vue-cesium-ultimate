# Composables 使用指南

这个目录包含了项目中的所有可复用组合式函数（Composables）。

## 📁 目录结构

```
composables/
├── index.js                    # 统一导出文件
├── useDraggableCollapse.js     # 拖拽折叠Hook
└── README.md                   # 使用指南
```

## 🎯 useDraggableCollapse

一个通用的拖拽折叠Hook，为面板组件提供拖拽移动和折叠功能。

### 功能特性

- 🎯 **拖拽移动** - 支持鼠标和触摸拖拽
- 📱 **移动端支持** - 完整的触摸事件处理
- 🔄 **折叠切换** - 点击头部区域折叠/展开
- 🎨 **样式管理** - 自动计算位置和拖拽状态样式
- 🚫 **边界约束** - 防止面板拖拽出屏幕范围
- 🛡️ **智能防误触** - 拖拽完成后自动防止意外折叠
- ⚙️ **高度可配置** - 支持多种配置选项

### 🚀 快速开始

```vue
<template>
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
      <p>面板内容</p>
    </div>
  </div>
</template>

<script setup>
import { useDraggableCollapse } from '@/composables/useDraggableCollapse.js'

const {
  isCollapsed,
  isDragging,
  panelRef,
  toggleCollapse,
  panelStyle
} = useDraggableCollapse()
</script>
```

### ⚙️ 配置选项

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `initialCollapsed` | `boolean` | `false` | 初始折叠状态 |
| `initialPosition` | `{x: number, y: number}` | `{x: 20, y: 20}` | 初始位置 |
| `dragHandle` | `string` | `'.panel-header'` | 拖拽手柄选择器 |
| `enableDrag` | `boolean` | `true` | 是否启用拖拽 |
| `enableCollapse` | `boolean` | `true` | 是否启用折叠 |
| `constraints` | `object` | `{}` | 拖拽约束 |

#### 约束配置示例

```javascript
const { ... } = useDraggableCollapse({
  constraints: {
    minX: 0,
    maxX: window.innerWidth - 300,
    minY: 0,
    maxY: window.innerHeight - 200
  }
})
```

### 📤 返回值

#### 状态
- `isCollapsed` - 折叠状态（ref）
- `position` - 位置信息（reactive）
- `isDragging` - 拖拽状态（ref）

#### DOM引用
- `panelRef` - 面板DOM引用
- `dragHandleRef` - 拖拽手柄DOM引用

#### 方法
- `toggleCollapse()` - 切换折叠状态
- `setCollapsed(collapsed)` - 设置折叠状态
- `setPosition(x, y)` - 设置位置
- `resetPosition()` - 重置到初始位置
- `centerPanel()` - 居中显示

#### 样式
- `panelStyle` - 面板样式对象（computed）
- `dragHandleStyle` - 拖拽手柄样式对象（computed）

### 🎨 推荐CSS样式

```css
.panel {
  background: rgba(0, 0, 0, 0.85);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.panel.collapsed {
  /* 折叠状态样式 */
}

.panel.dragging {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  transform: scale(1.02);
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
```

### 📱 移动端支持

Hook自动支持触摸事件，无需额外配置：

- 触摸拖拽
- 触摸折叠
- 响应式约束

### 🛡️ 智能防误触

为了防止拖拽完成后意外触发折叠，Hook 内置了智能防误触机制：

- **移动检测** - 自动检测是否发生了实际的拖拽移动
- **短暂阻止** - 拖拽结束后100ms内阻止点击事件
- **精确控制** - 只有真正的点击才会触发折叠，拖拽不会

### 🔧 高级用法

#### 多面板管理

```javascript
const leftPanel = useDraggableCollapse({
  initialPosition: { x: 20, y: 20 }
})

const rightPanel = useDraggableCollapse({
  initialPosition: { x: window.innerWidth - 320, y: 20 }
})
```

#### 自定义拖拽手柄

```javascript
const { ... } = useDraggableCollapse({
  dragHandle: '.custom-drag-handle'
})
```

#### 禁用特定功能

```javascript
// 只允许折叠，不允许拖拽
const { ... } = useDraggableCollapse({
  enableDrag: false,
  enableCollapse: true
})

// 只允许拖拽，不允许折叠
const { ... } = useDraggableCollapse({
  enableDrag: true,
  enableCollapse: false
})
```

### 🐛 常见问题

#### Q: 面板无法拖拽？
A: 检查是否正确设置了 `ref="panelRef"` 和拖拽手柄选择器。

#### Q: 拖拽时面板闪烁？
A: 确保在拖拽状态下禁用了 transition：
```css
.panel {
  transition: all 0.3s ease;
}
.panel.dragging {
  transition: none;
}
```

#### Q: 移动端触摸不响应？
A: Hook已自动处理触摸事件，如果仍有问题，检查CSS的 `touch-action` 属性。

### 📝 更新日志

- **v1.0.0** - 初始版本
  - 基础拖拽功能
  - 折叠切换功能
  - 移动端支持
  - 位置约束
  - 样式管理

### 🤝 贡献

如果你有改进建议或发现了bug，欢迎提交Issue或Pull Request。

### 📄 许可证

本项目采用 MIT 许可证。