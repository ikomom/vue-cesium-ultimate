<script setup>
import { ref, computed, onMounted, toRaw } from 'vue'
import { dataManager } from '../data/index.js'
import { useVisualizationStore } from '@/stores/visualization'
import { MaterialManager } from '../utils/materials.js'
import DataVisualization from '../components/ui/DataVisualization.vue'
import ControlPanel from '../components/business/ControlPanel.vue'
import TargetPanel from '../components/business/TargetPanel.vue'

const materialManager = new MaterialManager()
const visualizationStore = useVisualizationStore()

const ready = ref(false)
const targets = ref([])
const relations = ref([])

// 目标类型图标配置
const targetIcons = {
  '机场': {
    image: '/icons/airport.svg',
    scale: 1.2,
    color: '#FF6B35'
  },
  '雷达站': {
    image: '/icons/radar.svg',
    scale: 1.0,
    color: '#4ECDC4'
  },
  '港口': {
    image: '/icons/port.svg',
    scale: 1.2,
    color: '#45B7D1'
  },
  '火车站': {
    image: '/icons/train.svg',
    scale: 1.0,
    color: '#96CEB4'
  },
  '通信站': {
    image: '/icons/communication.svg',
    scale: 0.8,
    color: '#FFEAA7'
  },
  '军事基地': {
    image: '/icons/military.svg',
    scale: 1.3,
    color: '#DDA0DD'
  }
}

// 关系类型样式配置
const relationStyles = {
  '航线连接': {
    color: '#FF6B35',
    width: 3,
    material: 'SOLID',
    dashPattern: null
  },
  '雷达覆盖': {
    color: '#4ECDC4',
    width: 2,
    material: 'DASHED',
    dashPattern: [10, 5]
  },
  '海运航线': {
    color: '#45B7D1',
    width: 4,
    material: 'SOLID',
    dashPattern: null
  },
  '高铁线路': {
    color: '#96CEB4',
    width: 5,
    material: 'SOLID',
    dashPattern: null
  },
  '通信链路': {
    color: '#FFEAA7',
    width: 2,
    material: 'DOTTED',
    dashPattern: [5, 5]
  },
  '军事协防': {
    color: '#DDA0DD',
    width: 3,
    material: 'DASH_DOT',
    dashPattern: [15, 5, 5, 5]
  }
}

// 处理目标数据
const processTargets = () => {
  const completeTargets = dataManager.getAllCompleteTargets()

  targets.value = completeTargets.map(target => {
    const iconConfig = targetIcons[target.type] || targetIcons['机场']

    return {
      id: target.id,
      name: target.name,
      type: target.type,
      position: [target.longitude, target.latitude, target.height],
      billboard: {
        image: iconConfig.image,
        scale: iconConfig.scale,
        color: iconConfig.color,
        pixelOffset: [0, -20]
      },
      label: {
        text: target.name,
        font: '10pt sans-serif',
        fillColor: '#fff',
        outlineColor: '#000000',
        outlineWidth: 2,
        pixelOffset: [0, 20],
      }
    }
  })
  console.log('处理后的目标数据:', toRaw(targets.value))
}

// 处理关系数据
const processRelations = () => {
  const relationshipData = dataManager.relationship.data
  const targetMap = new Map()

  // 创建目标位置映射
  dataManager.getAllCompleteTargets().forEach(target => {
    targetMap.set(target.id, {
      longitude: target.longitude,
      latitude: target.latitude,
      height: target.height
    })
  })

  relations.value = relationshipData
    .filter(relation => {
      return targetMap.has(relation.source_id) && targetMap.has(relation.target_id)
    })
    .map(relation => {
      const sourcePos = targetMap.get(relation.source_id)
      const targetPos = targetMap.get(relation.target_id)

      const style = relationStyles[relation.type] || relationStyles['航线连接']

      // 根据材质模式设置材质
      let polylineMaterial
      
      if (visualizationStore.useMaterialProperty) {
        // 使用 MaterialProperty 模式
        const currentColor = visualizationStore.materialColors[visualizationStore.materialMode]
        const cesiumColor = new window.Cesium.Color(currentColor.r, currentColor.g, currentColor.b, currentColor.a * visualizationStore.materialOpacity)
        
        if (visualizationStore.materialMode === 'solid') {
          // 实线模式
          polylineMaterial = new window.Cesium.ColorMaterialProperty(cesiumColor)
        } else if (visualizationStore.materialMode === 'flyline') {
          // 飞线模式
          polylineMaterial = materialManager.createFlyLineMaterialProperty({
            color: cesiumColor,
            speed: visualizationStore.materialSpeed + Math.random() * 0.5,
            percent: 0.1 + Math.random() * 0.05,
            gradient: 0.1
          })
        } else if (visualizationStore.materialMode === 'pulse') {
          // 脉冲模式
          polylineMaterial = materialManager.createPulseLineMaterialProperty({
            color: cesiumColor,
            speed: visualizationStore.materialSpeed + Math.random() * 0.5,
            pulseWidth: 0.2 + Math.random() * 0.1
          })
        } else if (visualizationStore.materialMode === 'dynamic') {
          // 动态纹理模式
          polylineMaterial = materialManager.createDynamicTextureMaterialProperty({
            color: cesiumColor,
            speed: visualizationStore.materialSpeed + Math.random() * 0.5
          })
        }
      } else {
        // 使用传统 Material 模式 - 根据关系类型获取默认材质
        const materialInfo = materialManager.getMaterialByRelationType(relation.type)
        if (materialInfo.type === 'normal') {
          polylineMaterial = {
            fabric: {
              type: 'Color',
              uniforms: {
                color: style.color
              }
            }
          }
        } else {
          polylineMaterial = materialInfo.material
        }
      }

      return {
        id: relation.id,
        type: relation.type,
        description: relation.description,
        materialType: visualizationStore.useMaterialProperty ? visualizationStore.materialMode : 'traditional',
        polyline: {
          positions: [
            [sourcePos.longitude, sourcePos.latitude, sourcePos.height + 50],
            [targetPos.longitude, targetPos.latitude, targetPos.height + 50]
          ],
          width: style.width,
          material: polylineMaterial,
          clampToGround: false,
          followSurface: true,
          extrudedHeight: 0
        }
      }
    })

  console.log('处理后的关系数据:', toRaw(relations.value))
}

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
      target.height + 1000
    )

    window.viewer.camera.flyTo({
      destination: destination,
      duration: 2.0
    })
  }
}

const handleShowTargetInfo = (target) => {
  console.log('显示目标详情:', target)
  alert(`目标详情:\n名称: ${target.name}\n类型: ${target.type}\n状态: ${target.status}\n位置: ${target.province} ${target.city}\n描述: ${target.description}`)
}

const onMaterialModeChange = (newValue) => {
  visualizationStore.setUseMaterialProperty(newValue)
  console.log('材质模式切换为:', visualizationStore.useMaterialProperty ? 'MaterialProperty' : '传统 Material')
  processRelations()
  console.log('关系材质已更新')
}

function onViewerReady({ viewer, Cesium }) {
  console.log('onViewerReady', viewer)
  console.log('数据管理器:', dataManager)
  window.viewer = viewer
  window.Cesium = Cesium
  ready.value = true

  // 初始化材质管理器
  materialManager.initCustomMaterials()
  console.log('自定义材质已初始化')

  // 处理数据
  processTargets()
  processRelations()
  // viewer.scene.globe.depthTestAgainstTerrain = true
}
</script>

<template>
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
        :targets="targets"
        :relations="relations"
        :show-targets="visualizationStore.showTargets"
        :show-relationships="visualizationStore.showRelationships"
        @target-click="onTargetClick"
        @relation-click="onRelationClick"
      />
    </template>

    <!-- 控制面板组件 - 业务组件 -->
    <ControlPanel
      @material-mode-change="onMaterialModeChange"
    />

    <!-- 目标面板组件 - 业务组件 -->
    <TargetPanel
      @fly-to-target="handleFlyToTarget"
      @show-target-info="handleShowTargetInfo"
    />
  </vc-viewer>
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
