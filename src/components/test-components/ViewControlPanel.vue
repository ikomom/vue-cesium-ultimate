<template>
  <div class="view-control-panel">
    <h3>视角控制</h3>
    <div class="button-group">
      <button @click="handleFlyToBeijing" class="test-btn">
        飞往北京
      </button>
      <button @click="handleFlyToShanghai" class="test-btn">
        飞往上海
      </button>
      <button @click="handleFlyToGuangzhou" class="test-btn">
        飞往广州
      </button>
    </div>
  </div>
</template>

<script>
import { onMounted } from 'vue'
import { useViewControl } from '@/composables/useViewControl'

export default {
  name: 'ViewControlPanel',
  props: {
    viewer: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    const {
      setViewer,
      flyToBeijing,
      flyToShanghai,
      flyToGuangzhou
    } = useViewControl()

    onMounted(() => {
      if (props.viewer) {
        setViewer(props.viewer)
      }
    })

    const handleFlyToBeijing = () => {
      flyToBeijing()
    }

    const handleFlyToShanghai = () => {
      flyToShanghai()
    }

    const handleFlyToGuangzhou = () => {
      flyToGuangzhou()
    }

    // 暴露方法供父组件调用
    const handleViewerChange = (viewer) => {
      if (viewer) {
        setViewer(viewer)
      }
    }

    return {
      handleFlyToBeijing,
      handleFlyToShanghai,
      handleFlyToGuangzhou,
      handleViewerChange
    }
  }
}
</script>

<style scoped>
.view-control-panel h4 {
  margin: 0 0 10px 0;
  color: #409eff;
}

.button-group .el-button {
  margin: 5px 5px 5px 0;
}
</style>
