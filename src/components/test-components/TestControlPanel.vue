<template>
  <div class="test-control-panel">
    <div class="panel-header">
      <div class="panel-title">
        <b>测试控制面板</b>
      </div>
      <select v-model="selectedPanel" class="panel-selector">
        <option value="mapInfo">地图信息</option>
        <option value="basicTest">基础测试</option>
        <option value="shipTrajectory">舰船轨迹</option>
        <option value="viewControl">视角控制</option>
      </select>
    </div>

    <div class="panel-content">
      <MapInfoPanel
        v-if="selectedPanel === 'mapInfo'"
        ref="mapInfoRef"
        :viewer="viewer"
      />

      <BasicTestPanel
        v-if="selectedPanel === 'basicTest'"
        ref="basicTestRef"
      />

      <ShipTrajectoryPanel
        v-if="selectedPanel === 'shipTrajectory'"
        ref="shipTrajectoryRef"
        :viewer="viewer"
        :cesium="cesium"
      />

      <ViewControlPanel
        v-if="selectedPanel === 'viewControl'"
        ref="viewControlRef"
        :viewer="viewer"
      />
    </div>
  </div>
</template>

<script>
import { ref, watch, nextTick } from 'vue'
import MapInfoPanel from './MapInfoPanel.vue'
import BasicTestPanel from './BasicTestPanel.vue'
import ShipTrajectoryPanel from './ShipTrajectoryPanel.vue'
import ViewControlPanel from './ViewControlPanel.vue'

export default {
  name: 'TestControlPanel',
  components: {
    MapInfoPanel,
    BasicTestPanel,
    ShipTrajectoryPanel,
    ViewControlPanel
  },
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
    const selectedPanel = ref('mapInfo')
    const mapInfoRef = ref(null)
    const basicTestRef = ref(null)
    const shipTrajectoryRef = ref(null)
    const viewControlRef = ref(null)

    // 监听viewer变化，通知子组件
    watch(() => props.viewer, (newViewer) => {
      nextTick(() => {
        if (mapInfoRef.value && mapInfoRef.value.handleViewerChange) {
          mapInfoRef.value.handleViewerChange(newViewer)
        }
        if (shipTrajectoryRef.value && shipTrajectoryRef.value.handleViewerChange) {
          shipTrajectoryRef.value.handleViewerChange(newViewer, props.cesium)
        }
        if (viewControlRef.value && viewControlRef.value.handleViewerChange) {
          viewControlRef.value.handleViewerChange(newViewer)
        }
      })
    })

    return {
      selectedPanel,
      mapInfoRef,
      basicTestRef,
      shipTrajectoryRef,
      viewControlRef
    }
  }
}
</script>

<style scoped>
.test-control-panel {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 300px;
  z-index: 1000;
  max-height: 80vh;
  overflow: auto;
  background-color: #fff;
  border-radius: 8px;
  padding: 10px;

  .panel-title {
    font-size: 18px;
    margin-bottom: 10px;
  }
}

.control-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.function-selector h3 {
  margin: 0 0 15px 0;
  color: #409eff;
  text-align: center;
  font-size: 16px;
}

.function-content {
  min-height: 200px;
}

/* 滚动条样式 */
.test-control-panel::-webkit-scrollbar {
  width: 6px;
}

.test-control-panel::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.test-control-panel::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}

.test-control-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.5);
}
</style>
