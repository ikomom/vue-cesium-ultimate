<template>
  <div class="tree-node" :class="nodeClass">
    <!-- 节点内容 -->
    <div class="node-content" :class="contentClass" @click="handleNodeClick">
      <div class="node-left">
        <!-- 复选框 -->
        <input
          v-if="showCheckbox"
          type="checkbox"
          class="node-checkbox"
          :checked="isChecked"
          :indeterminate="isIndeterminate"
          @click.stop
          @change="handleCheckboxChange"
          :title="checkboxTitle"
        />

        <!-- 展开图标 -->
        <i
          v-if="hasChildren"
          class="expand-icon"
          :class="isExpanded ? 'icon-chevron-down' : 'icon-chevron-right'"
          @click.stop="toggleExpand"
        ></i>
        <i v-else class="expand-icon icon-placeholder"></i>

        <!-- 节点图标 -->
        <i v-if="nodeIcon" class="node-icon" :class="nodeIcon" :style="iconStyle"></i>

        <!-- 节点标签 -->
        <span class="node-label">{{ nodeData.label || nodeData.name || nodeData.id }}</span>

        <!-- 节点类型 -->
        <span v-if="nodeData.type" class="node-type">{{ nodeData.type }}</span>

        <!-- 节点计数 -->
        <span v-if="nodeData.count !== undefined" class="node-count">({{ nodeData.count }})</span>

        <!-- 自定义内容插槽 -->
        <slot name="node-content" :node="nodeData" :level="level"></slot>
      </div>

      <!-- 节点控制按钮 -->
      <div class="node-controls">
        <slot name="node-controls" :node="nodeData" :level="level"></slot>
      </div>
    </div>

    <!-- 子节点 -->
    <div v-if="isExpanded && hasChildren" class="tree-children">
      <TreeNode
        v-for="child in children"
        :key="getChildKey(child)"
        :node-data="child"
        :level="level + 1"
        :show-checkbox="showCheckbox"
        :checked-keys="checkedKeys"
        :expanded-keys="expandedKeys"
        :node-key="nodeKey"
        :children-key="childrenKey"
        :node-class-fn="nodeClassFn"
        :content-class-fn="contentClassFn"
        :icon-fn="iconFn"
        @node-click="$emit('node-click', $event)"
        @node-expand="$emit('node-expand', $event)"
        @node-check="handleChildCheck"
      >
        <template #node-content="slotProps">
          <slot name="node-content" v-bind="slotProps"></slot>
        </template>
        <template #node-controls="slotProps">
          <slot name="node-controls" v-bind="slotProps"></slot>
        </template>
      </TreeNode>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  },
  showCheckbox: {
    type: Boolean,
    default: false
  },
  checkedKeys: {
    type: Set,
    default: () => new Set()
  },
  expandedKeys: {
    type: Set,
    default: () => new Set()
  },
  nodeKey: {
    type: String,
    default: 'id'
  },
  childrenKey: {
    type: String,
    default: 'children'
  },
  nodeClassFn: {
    type: Function,
    default: null
  },
  contentClassFn: {
    type: Function,
    default: null
  },
  iconFn: {
    type: Function,
    default: null
  }
})

const emit = defineEmits([
  'node-click',
  'node-expand',
  'node-check'
])

// 获取节点唯一标识
const nodeId = computed(() => {
  return props.nodeData[props.nodeKey]
})

// 获取子节点
const children = computed(() => {
  return props.nodeData[props.childrenKey] || []
})

// 是否有子节点
const hasChildren = computed(() => {
  return children.value.length > 0
})

// 是否展开
const isExpanded = computed(() => {
  return props.expandedKeys.has(nodeId.value)
})

// 是否选中
const isChecked = computed(() => {
  return props.checkedKeys.has(nodeId.value)
})

// 是否半选中状态（部分子节点选中）
const isIndeterminate = computed(() => {
  if (!hasChildren.value || !props.showCheckbox) return false

  const checkedChildrenCount = children.value.filter(child =>
    props.checkedKeys.has(child[props.nodeKey])
  ).length

  return checkedChildrenCount > 0 && checkedChildrenCount < children.value.length
})

// 节点样式类
const nodeClass = computed(() => {
  const classes = [`tree-node-level-${props.level}`]
  if (props.nodeClassFn) {
    const customClass = props.nodeClassFn(props.nodeData, props.level)
    if (customClass) classes.push(customClass)
  }
  return classes
})

// 内容样式类
const contentClass = computed(() => {
  const classes = []
  if (props.contentClassFn) {
    const customClass = props.contentClassFn(props.nodeData, props.level)
    if (customClass) classes.push(customClass)
  }
  return classes
})

// 节点图标
const nodeIcon = computed(() => {
  if (props.iconFn) {
    return props.iconFn(props.nodeData, props.level)?.icon
  }
  return null
})

// 图标样式
const iconStyle = computed(() => {
  if (props.iconFn) {
    return props.iconFn(props.nodeData, props.level)?.style || {}
  }
  return {}
})

// 复选框标题
const checkboxTitle = computed(() => {
  return isChecked.value ? '取消选择' : '选择'
})

// 获取子节点key
const getChildKey = (child) => {
  return child[props.nodeKey]
}

// 处理节点点击
const handleNodeClick = () => {
  emit('node-click', {
    node: props.nodeData,
    level: props.level,
    nodeId: nodeId.value
  })
}

// 切换展开状态
const toggleExpand = () => {
  emit('node-expand', {
    node: props.nodeData,
    level: props.level,
    nodeId: nodeId.value,
    expanded: !isExpanded.value
  })
}

// 处理复选框变化
const handleCheckboxChange = (event) => {
  const checked = event.target.checked

  // 收集当前节点及所有子节点的ID
  const affectedNodeIds = [nodeId.value]

  const collectChildrenIds = (node) => {
    const childrenData = node[props.childrenKey] || []
    childrenData.forEach(child => {
      affectedNodeIds.push(child[props.nodeKey])
      collectChildrenIds(child)
    })
  }

  collectChildrenIds(props.nodeData)

  emit('node-check', {
    node: props.nodeData,
    level: props.level,
    nodeId: nodeId.value,
    checked,
    affectedNodeIds
  })
}

// 处理子节点选中变化
const handleChildCheck = (checkData) => {
  emit('node-check', checkData)
}
</script>

<style scoped>
.tree-node {
  margin-bottom: 2px;
}

.node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 36px;
}

.node-content:hover {
  background: rgba(255, 255, 255, 0.08);
}

.node-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

/* 复选框样式 */
.node-checkbox {
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
  accent-color: #409eff;
}

.node-checkbox:hover {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}

.expand-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.expand-icon.icon-placeholder {
  opacity: 0;
  display: none;
  pointer-events: none;
}

.node-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.node-label {
  font-weight: 500;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.node-type {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

.node-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
}

.node-controls {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.node-content:hover .node-controls {
  opacity: 1;
}

.tree-children {
  margin-left: 24px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  padding-left: 8px;
}

/* 图标样式 */
.icon-chevron-right::before {
  content: '▶';
}
.icon-chevron-down::before {
  content: '▼';
}
</style>
