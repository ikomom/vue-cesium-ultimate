<template>
  <div class="basic-test-panel">
    <h3>基础测试</h3>
    <div class="button-group">
      <button @click="handleAddRandomPoint" class="test-btn">
        添加随机点 ({{ testEntities.length }})
      </button>
      <button @click="handleAddRandomLine" class="test-btn">
        添加随机线 ({{ testLines.length }})
      </button>
      <button @click="handleClearAllTest" class="test-btn clear-btn">
        清除所有测试实体
      </button>
    </div>
  </div>
</template>

<script>
import { useBasicTest } from '@/composables/useBasicTest'

export default {
  name: 'BasicTestPanel',
  setup() {
    const {
      testEntities,
      testLines,
      addRandomPoint,
      addRandomLine,
      clearAllBasicTest
    } = useBasicTest()

    const handleAddRandomPoint = () => {
      addRandomPoint()
    }

    const handleAddRandomLine = () => {
      addRandomLine()
    }

    const handleClearAllTest = () => {
      clearAllBasicTest()
    }

    return {
      testEntities,
      testLines,
      handleAddRandomPoint,
      handleAddRandomLine,
      handleClearAllTest
    }
  }
}
</script>

<style scoped>
.basic-test-panel h4 {
  margin: 0 0 10px 0;
  color: #409eff;
}

.button-group {
  margin-bottom: 10px;
}

.button-group .el-button {
  margin: 5px 5px 5px 0;
}

.info p {
  margin: 5px 0;
  font-size: 12px;
  color: #666;
}
</style>
