import { ref, computed, toRaw, watch } from 'vue'

/**
 * 树形控件选择逻辑的 Hook
 * @param {Object} options 配置选项
 * @param {Ref} options.treeData 树形数据
 * @param {Ref} options.treeRef 树形控件引用
 * @returns {Object} 返回选择相关的状态和方法
 */
export function useTreeSelection(options = {}) {
  const { treeData, treeRef } = options

  // 选中的节点 keys
  const checkedKeys = ref([])

  // 创建 target_id 到节点 id 的映射
  const targetIdToNodeIds = ref(new Map())

  // 递归构建 target_id 到节点 id 的映射
  const buildTargetIdMapping = (nodes) => {
    nodes.forEach((node) => {
      const targetId = node.target_id
      if (!targetIdToNodeIds.value.has(targetId)) {
        targetIdToNodeIds.value.set(targetId, [])
      }
      targetIdToNodeIds.value.get(targetId).push(node.id)

      if (node.children) {
        buildTargetIdMapping(node.children)
      }
    })
  }

  // 监听 treeData 变化，自动重新构建映射关系
  watch(
    () => treeData?.value,
    (newTreeData) => {
      if (newTreeData) {
        targetIdToNodeIds.value.clear()
        buildTargetIdMapping(newTreeData)
      }
    },
    { immediate: true, deep: true },
  )

  // 递归收集节点及其所有子节点的 target_id
  const collectAllTargetIds = (node) => {
    const targetIds = new Set()

    const traverse = (currentNode) => {
      targetIds.add(currentNode.target_id)
      if (currentNode.children) {
        currentNode.children.forEach((child) => traverse(child))
      }
    }

    traverse(node)
    return Array.from(targetIds)
  }

  // 处理节点勾选事件
  const handleCheck = (data, checkState) => {
    const { checkedKeys: newCheckedKeys } = checkState

    // 判断当前节点是被选中还是取消选中
    const isChecked = newCheckedKeys.includes(data.id)

    // 收集当前节点及其所有子节点的 target_id
    const allTargetIds = collectAllTargetIds(data)

    // 去重并收集所有需要处理的节点ID
    const allRelatedNodeIds = new Set()
    allTargetIds.forEach((tid) => {
      const relatedNodes = targetIdToNodeIds.value.get(tid) || []
      relatedNodes.forEach((nodeId) => allRelatedNodeIds.add(nodeId))
    })

    // 根据选中状态批量更新节点
    if (isChecked) {
      // 选中所有相关节点
      allRelatedNodeIds.forEach((nodeId) => {
        if (!checkedKeys.value.includes(nodeId)) {
          checkedKeys.value.push(nodeId)
        }
      })
    } else {
      // 取消选中所有相关节点
      checkedKeys.value = checkedKeys.value.filter((nodeId) => !allRelatedNodeIds.has(nodeId))
    }

    // 直接更新树形控件的选中状态
    if (treeRef?.value) {
      treeRef.value.setCheckedKeys(toRaw(checkedKeys.value))
    }
  }

  // 计算选中的 target_id
  const checkedTargetIds = computed(() => {
    if (!treeData?.value) return []

    const targetIds = new Set()

    // 遍历所有选中的节点，收集它们的 target_id
    const collectTargetIds = (nodes) => {
      nodes.forEach((node) => {
        if (checkedKeys.value.includes(node.id)) {
          targetIds.add(node.target_id)
        }
        if (node.children) {
          collectTargetIds(node.children)
        }
      })
    }

    collectTargetIds(treeData.value)
    return Array.from(targetIds)
  })

  // 计算 target_id 统计信息
  const targetIdStats = computed(() => {
    const stats = {}
    checkedTargetIds.value.forEach((targetId) => {
      const nodeIds = targetIdToNodeIds.value.get(targetId) || []
      const checkedCount = nodeIds.filter((nodeId) => checkedKeys.value.includes(nodeId)).length
      stats[targetId] = {
        total: nodeIds.length,
        checked: checkedCount,
      }
    })
    return stats
  })

  // 清空所有选择
  const clearAll = () => {
    checkedKeys.value = []
    if (treeRef?.value) {
      treeRef.value.setCheckedKeys([])
    }
  }

  // 根据 target_id 选择节点
  const selectByTargetId = (targetId) => {
    const nodeIds = targetIdToNodeIds.value.get(targetId) || []
    nodeIds.forEach((nodeId) => {
      if (!checkedKeys.value.includes(nodeId)) {
        checkedKeys.value.push(nodeId)
      }
    })
    if (treeRef?.value) {
      treeRef.value.setCheckedKeys(toRaw(checkedKeys.value))
    }
  }

  return {
    // 状态
    checkedKeys,
    checkedTargetIds,
    targetIdStats,
    targetIdToNodeIds,

    // 方法
    handleCheck,
    clearAll,
    selectByTargetId,
    buildTargetIdMapping,
    collectAllTargetIds,
  }
}
