<template>
  <div class="tree-demo">
    <div class="header">
      <h2>树形控件演示</h2>
      <p>支持相同 target_id 的联动勾选功能</p>
    </div>

    <div class="content">
      <div class="tree-container">
        <el-tree
          ref="treeRef"
          :data="treeData"
          :props="defaultProps"
          show-checkbox
          node-key="id"
          @check="handleCheck"
          :default-expand-all="true"
          :check-strictly="true"
          class="custom-tree"
        />
      </div>

      <div class="info-panel">
        <div class="info-section-container">
          <h3>选中信息</h3>
          <div class="info-section">
            <h4>选中的节点 ID:</h4>
            <div class="tag-container">
              <el-tag
                v-for="key in checkedKeys"
                :key="key"
                type="primary"
                size="small"
                class="tag-item"
              >
                {{ key }}
              </el-tag>
            </div>
          </div>

          <div class="info-section">
            <h4>选中的 target_id:</h4>
            <div class="tag-container">
              <el-tag
                v-for="targetId in checkedTargetIds"
                :key="targetId"
                type="success"
                size="small"
                class="tag-item"
              >
                {{ targetId }}
              </el-tag>
            </div>
          </div>

          <div class="info-section">
            <h4>target_id 分组统计:</h4>
            <div class="stats">
              <div v-for="(stats, targetId) in targetIdStats" :key="targetId" class="stat-item">
                <span class="target-id">{{ targetId }}:</span>
                <span class="count">{{ stats.checked }}/{{ stats.total }} 个节点</span>
              </div>
            </div>
          </div>
        </div>

        <div class="actions">
          <el-button @click="clearAll" type="danger" size="small">清空选择</el-button>
          <el-button @click="selectSharedTarget" type="primary" size="small"
            >选择所有 shared_target</el-button
          >
          <el-button @click="selectXxxTarget" type="warning" size="small">选择所有 xxx</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElTree, ElTag, ElButton } from 'element-plus'
import { useTreeSelection } from '@/composables/useTreeSelection'

// 树形数据
const treeData = ref([])
const treeRef = ref(null)

// 树形控件配置
const defaultProps = {
  children: 'children',
  label: 'label',
}

// 使用树形选择 hook
const {
  checkedKeys,
  checkedTargetIds,
  targetIdStats,
  handleCheck,
  clearAll,
  selectByTargetId
} = useTreeSelection({ treeData, treeRef })

// 选择所有 shared_target
const selectSharedTarget = () => {
  selectByTargetId('shared_target')
}

// 选择所有 xxx
const selectXxxTarget = () => {
  selectByTargetId('xxx')
}

// 加载树形数据
const loadTreeData = async () => {
  try {
    const response = await fetch('/data/testTreeData.json')
    const data = await response.json()
    treeData.value = data
  } catch (error) {
    console.error('加载树形数据失败:', error)
  }
}

onMounted(() => {
  loadTreeData()
  window.treeRef = treeRef.value
})
</script>

<style scoped>
.tree-demo {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h2 {
  color: #409eff;
  margin-bottom: 10px;
}

.header p {
  color: #666;
  font-size: 14px;
}

.content {
  display: flex;
  gap: 30px;
  align-items: flex-start;
}

.tree-container {
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 20px;
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  max-height: 80vh;
  overflow: auto;
}

.custom-tree {
  font-size: 14px;
}

.custom-tree :deep(.el-tree-node__content) {
  height: 32px;
  line-height: 32px;
}

.info-panel {
  width: 350px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 20px;
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.info-section-container {
  max-height: 60vh;
  overflow: auto;
}

.info-panel h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #409eff;
  font-size: 16px;
}

.info-section {
  margin-bottom: 20px;
}

.info-section h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #333;
}

.tag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  margin: 0;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
}

.target-id {
  font-weight: 500;
  color: #409eff;
}

.count {
  color: #666;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.actions .el-button {
  width: 100%;
}

@media (max-width: 768px) {
  .content {
    flex-direction: column;
  }

  .info-panel {
    width: 100%;
  }
}
</style>
