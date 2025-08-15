<script setup>
import { ref, computed, onMounted, toRaw, watchEffect, watch } from 'vue'
import DataVisualization from '@/components/ui/sanbox/DataVisualization.vue'

import { useGlobalMapStore } from '@/stores/globalMap.js'
import { storeToRefs } from 'pinia'
import { initMaterialProperty } from '@/components/ui/sanbox/material'

const globalMapStore = useGlobalMapStore()
const { globalLayerManager, initDefaultLayers } = globalMapStore
const { layers, activeLayerId, loading } = storeToRefs(globalMapStore)
const ready = ref(false)

// watchEffect(() => {
//   console.log('layers', layers.value)
//   console.log('activeLayerId', activeLayerId.value)
// })

// 事件处理函数
const onTargetClick = (target) => {
  console.log('点击目标:', target)
}

const onRelationClick = (relation) => {
  console.log('点击关系:', relation)
}

// 轨迹事件处理函数
const onTrajectoryClick = (trajectory) => {
  console.log('点击轨迹:', trajectory)

  // 可以在这里添加轨迹点击后的逻辑，比如显示轨迹详情、飞行到轨迹等
  if (
    window.viewer &&
    trajectory.trajectoryData &&
    trajectory.trajectoryData.trajectory.length > 0
  ) {
    const firstPoint = trajectory.trajectoryData.trajectory[0]
    const destination = window.Cesium.Cartesian3.fromDegrees(
      firstPoint.longitude,
      firstPoint.latitude,
      (firstPoint.height || 0) + 1000,
    )

    window.viewer.camera.flyTo({
      destination: destination,
      duration: 2.0,
    })
  }
}

const onTrajectoryHover = (trajectory) => {
  console.log('悬停轨迹:', trajectory)
}

const onTrajectoryLeave = (trajectory) => {
  console.log('离开轨迹:', trajectory)
}

const handleFlyToTarget = (target) => {
  console.log('飞行到目标:', target)
  if (window.viewer && target.longitude && target.latitude) {
    const destination = window.Cesium.Cartesian3.fromDegrees(
      target.longitude,
      target.latitude,
      target.height + 1000,
    )

    window.viewer.camera.flyTo({
      destination: destination,
      duration: 2.0,
    })
  }
}

function onViewerReady({ viewer, Cesium }) {
  console.log('onViewerReady', viewer)
  globalLayerManager.setViewer(viewer)
  window.viewer = viewer
  window.Cesium = Cesium
  ready.value = true

  // 初始化材质属性
  initMaterialProperty()
  // viewer.scene.globe.depthTestAgainstTerrain = true
}

watch([ready, loading], () => {
  if (ready.value && !loading.value) {
    initDefaultLayers()
  }
})
</script>

<template>
  <div>
    <vc-viewer
      class="vc-viewer"
      @ready="onViewerReady"
      :info-box="false"
      :showCredit="false"
      :selection-indicator="false"
      timeline
      animation
    >
      <vc-layer-imagery>
        <vc-imagery-provider-arcgis ref="provider"></vc-imagery-provider-arcgis>
      </vc-layer-imagery>
      <!-- <vc-navigation :other-opts="false" /> -->
      <div v-if="ready">
        <template v-for="layer in layers" :key="layer.id">
          <!-- 数据可视化组件 - 纯UI组件 -->
          <DataVisualization
            :data-manager="layer.dataManager"
            :layer-id="layer.id"
            :layer-name="layer.name"
            :targets="layer.data.targets"
            :relations="layer.data.relations"
            :trajectories="layer.data.trajectories"
            :points="layer.data.points"
            :events="layer.data.events"
            :visible="layer.visible"
            :show-points="layer.showControls.showPoints"
            :show-relation="layer.showControls.showRelation"
            :show-trajectory="layer.showControls.showTrajectory"
            :show-events="layer.showControls.showEvents"
            @target-click="onTargetClick"
            @relation-click="onRelationClick"
            @trajectory-click="onTrajectoryClick"
            @trajectory-hover="onTrajectoryHover"
            @trajectory-leave="onTrajectoryLeave"
          />
        </template>
      </div>
    </vc-viewer>
  </div>
</template>

<style lang="less">
.vc-viewer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
