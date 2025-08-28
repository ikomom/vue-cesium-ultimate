<template>
  <div class="ship-trajectory-panel">
    <h3>舰船轨迹</h3>
    <div class="info-section">
      <p>舰船数量: {{ shipTrajectories.length }}</p>
      <p>时间轴状态: {{ timelineStatus }}</p>
    </div>
    <div class="button-group">
      <button @click="handleGenerateShip" class="test-btn">
        生成舰船
      </button>
      <button @click="handleStartAnimation" class="test-btn">
        开始动画
      </button>
      <button @click="handlePauseAnimation" class="test-btn">
        暂停动画
      </button>
      <button @click="handleClearShips" class="test-btn clear-btn">
        清除舰船
      </button>
    </div>
  </div>
</template>

<script>
import { onMounted } from 'vue'
import { useShipTrajectory } from '@/composables/useShipTrajectory'

export default {
  name: 'ShipTrajectoryPanel',
  props: {
    viewer: {
      type: Object,
      default: null
    },
    cesium: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    const {
      shipTrajectories,
      timelineStatus,
      setViewer,
      initializeTimeline,
      generateShipTrajectory,
      startAnimation,
      pauseAnimation,
      clearShips
    } = useShipTrajectory()

    onMounted(() => {
      if (props.viewer && props.cesium) {
        setViewer(props.viewer)
        initializeTimeline(props.viewer, props.cesium)
      }
    })

    const handleGenerateShip = () => {
      generateShipTrajectory()
    }

    const handleStartAnimation = () => {
      startAnimation()
    }

    const handlePauseAnimation = () => {
      pauseAnimation()
    }

    const handleClearShips = () => {
      clearShips()
    }

    // 暴露方法供父组件调用
    const handleViewerChange = (viewer, cesium) => {
      if (viewer && cesium) {
        setViewer(viewer)
        initializeTimeline(viewer, cesium)
      }
    }

    return {
      shipTrajectories,
      timelineStatus,
      handleGenerateShip,
      handleStartAnimation,
      handlePauseAnimation,
      handleClearShips,
      handleViewerChange
    }
  }
}
</script>

<style scoped>
.ship-trajectory-panel h4 {
  margin: 0 0 10px 0;
  color: #409eff;
}

.info {
  margin-bottom: 10px;
}

.info p {
  margin: 5px 0;
  font-size: 12px;
  color: #666;
}

.button-group .el-button {
  margin: 5px 5px 5px 0;
}
</style>
