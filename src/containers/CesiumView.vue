<script setup>
import { ref, computed, onMounted, toRaw } from 'vue'
import { useVisualizationStore } from '@/stores/visualization'
import DataVisualization from '@/components/ui/sanbox/DataVisualization.vue'

import { useGlobalMapStore } from '@/stores/globalMap.js'
import { storeToRefs } from 'pinia'

const visualizationStore = useVisualizationStore()

const globalMapStore = useGlobalMapStore()
const { relationData, targetBaseData, targetLocationData } = storeToRefs(globalMapStore)
const ready = ref(false)

// 事件处理函数
const onTargetClick = (target) => {
  console.log('点击目标:', target)
}

const onRelationClick = (relation) => {
  console.log('点击关系:', relation)
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

// const handleShowTargetInfo = (target) => {
//   console.log('显示目标详情:', target)
//   alert(`目标详情:\n名称: ${target.name}\n类型: ${target.type}\n状态: ${target.status}\n位置: ${target.province} ${target.city}\n描述: ${target.description}`)
// }

// const onMaterialModeChange = (newValue) => {
//   visualizationStore.setUseMaterialProperty(newValue)
//   console.log('材质模式切换为:', visualizationStore.useMaterialProperty ? 'MaterialProperty' : '传统 Material')
//   processRelations()
//   console.log('关系材质已更新')
// }

// // 动态注册自定义材质示例
// function registerCustomMaterials() {
//   // 注册闪烁材质
//   materialManager.registerMaterial(MATERIAL_TYPES.POLYLINE_BLINK_LINE, () => {
//     return new window.Cesium.Material({
//       fabric: {
//         type: MATERIAL_TYPES.POLYLINE_BLINK_LINE,
//         uniforms: {
//           color: new window.Cesium.Color(1.0, 0.0, 0.0, 1.0),
//           speed: 2.0
//         },
//         source: `
//           uniform vec4 color;
//           uniform float speed;
//           czm_material czm_getMaterial(czm_materialInput materialInput) {
//             czm_material material = czm_getDefaultMaterial(materialInput);
//             float alpha = abs(sin(czm_frameNumber * speed / 100.0));
//             material.diffuse = color.rgb;
//             material.alpha = alpha * color.a;
//             return material;
//           }
//         `
//       }
//     })
//   })

//   // 注册渐变材质
//   materialManager.registerMaterial(MATERIAL_TYPES.POLYLINE_GRADIENT_LINE, () => {
//     return new window.Cesium.Material({
//       fabric: {
//         type: MATERIAL_TYPES.POLYLINE_GRADIENT_LINE,
//         uniforms: {
//           color: new window.Cesium.Color(0.0, 1.0, 0.0, 1.0),
//           speed: 1.0
//         },
//         source: `
//           uniform vec4 color;
//           uniform float speed;
//           czm_material czm_getMaterial(czm_materialInput materialInput) {
//             czm_material material = czm_getDefaultMaterial(materialInput);
//             vec2 st = materialInput.st;
//             float gradient = st.s;
//             material.diffuse = color.rgb;
//             material.alpha = gradient * color.a;
//             return material;
//           }
//         `
//       }
//     })
//   })

//   // 注册关系类型映射
//   materialManager.registerRelationTypeMapping('卫星通信', MATERIAL_TYPES.POLYLINE_BLINK_LINE)
//   materialManager.registerRelationTypeMapping('光纤网络', MATERIAL_TYPES.POLYLINE_GRADIENT_LINE)
// }

function onViewerReady({ viewer, Cesium }) {
  console.log('onViewerReady', viewer)
  window.viewer = viewer
  window.Cesium = Cesium
  ready.value = true

  // 初始化材质管理器
  // materialManager.initCustomMaterials()
  // console.log('Cesium材质已初始化')

  // 注册自定义材质示例
  // registerCustomMaterials()
  // console.log('自定义材质已注册')

  // 处理数据
  // processTargets()
  // processRelations()
  // viewer.scene.globe.depthTestAgainstTerrain = true
}
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
    <template v-if="ready">
      <!-- 数据可视化组件 - 纯UI组件 -->
      <DataVisualization
        :points="targetLocationData"
        :targets="targetBaseData"
        :relations="relationData"
        :show-points="visualizationStore.showPoints"
        :show-relation="visualizationStore.showRelation"
        @target-click="onTargetClick"
        @relation-click="onRelationClick"
      />
    </template>

    <!-- 控制面板组件 - 业务组件 -->
    <!-- <ControlPanel
      @material-mode-change="onMaterialModeChange"
    /> -->

    <!-- 目标面板组件 - 业务组件 -->
    <!-- <TargetPanel
      @fly-to-target="handleFlyToTarget"
      @show-target-info="handleShowTargetInfo"
    /> -->
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
