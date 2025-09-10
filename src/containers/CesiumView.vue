<script setup>
import { ref, computed, onMounted, toRaw, watchEffect, watch } from 'vue'
import DataVisualization from '@/components/ui/sanbox/DataVisualization.vue'
import MouseTooltip from '@/components/ui/MouseTooltip.vue'
import ContextMenu from '@/components/ui/ContextMenu.vue'
import ContentDisplay from '@/components/ui/ContentDisplay.vue'
import LayerControlPanel from '@/components/business/LayerControlPanel.vue'
import LineWithLabel from '@/components/ui/sanbox/LineWithLabel.vue'

import { useGlobalMapStore } from '@/stores/globalMap.js'
import { storeToRefs } from 'pinia'
import { initMaterialProperty } from '@/components/ui/sanbox/material'

const globalMapStore = useGlobalMapStore()
const { globalLayerManager, initDefaultLayers } = globalMapStore
const { layers, activeLayerId, activeLayer, loading } = storeToRefs(globalMapStore)
const ready = ref(false)

// UI组件状态
const tooltipVisible = ref(false)
const tooltipPosition = ref({ x: 0, y: 0 })
const tooltipData = ref(null)
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuItems = ref([])

// 圆环状态管理
const activeRings = ref(new Map()) // 存储活跃的圆环实体
const virtualNodes = ref(new Map()) // 存储虚拟节点
const virtualRelations = ref(new Map()) // 虚拟节点上的连线

// 获取距离相关配置（自适应缩放）
const getDistanceConfigs = () => {
  if (!window.Cesium) {
    return {
      scaleByDistance: null,
      pixelOffsetScaleByDistance: null,
      distanceDisplayCondition: null,
    }
  }
  return {
    scaleByDistance: new window.Cesium.NearFarScalar(1.5e2, 1.5, 1.5e7, 0.2),
    pixelOffsetScaleByDistance: new window.Cesium.NearFarScalar(1.5e2, 1.0, 1.5e7, 0.3),
    distanceDisplayCondition: new window.Cesium.DistanceDisplayCondition(0.0, 2.0e7),
  }
}

// 生成虚拟节点函数
const generateVirtualNodes = (target) => {
  const nodes = []
  const nodeCount = target.nodeCount || 6
  const radius = target.ringRadius || 50000
  const centerLng = target.position[0]
  const centerLat = target.position[1]
  const centerHeight = target.position[2] || 0

  // 获取距离配置用于自适应缩放
  const distanceConfigs = getDistanceConfigs()

  for (let i = 0; i < nodeCount; i++) {
    const angle = (i * 360) / nodeCount
    const radian = (angle * Math.PI) / 180

    // 使用球面几何学的精确计算方法
    const earthRadius = 6371000 // 地球半径(米)
    const latRad = (centerLat * Math.PI) / 180
    const lonRad = (centerLng * Math.PI) / 180

    // 计算新的纬度
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(radius / earthRadius) +
        Math.cos(latRad) * Math.sin(radius / earthRadius) * Math.cos(radian),
    )

    // 计算新的经度
    const newLonRad =
      lonRad +
      Math.atan2(
        Math.sin(radian) * Math.sin(radius / earthRadius) * Math.cos(latRad),
        Math.cos(radius / earthRadius) - Math.sin(latRad) * Math.sin(newLatRad),
      )

    const nodeLng = (newLonRad * 180) / Math.PI
    const nodeLat = (newLatRad * 180) / Math.PI

    // 获取对应的virtualNode配置数据
    const virtualNodeData =
      target.virtualNodes && target.virtualNodes[i] ? target.virtualNodes[i] : null
    const nodeName = virtualNodeData ? virtualNodeData.name : `节点${i + 1}`
    const nodeIcon = virtualNodeData ? virtualNodeData.icon : '/icons/communication.svg'
    const nodeColor = virtualNodeData ? virtualNodeData.color : '#ff6b35'

    // 获取当前节点对应的连接目标
    const connectionTarget =
      target.nodeConnections && target.nodeConnections[i]
        ? target.nodeConnections[i].target
        : target.id
    console.log(`节点${i}: 原target.id=${target.id}, 连接目标=${connectionTarget}`)

    // 参考DataVisualization.vue中renderPoints的结构，创建完整的节点配置
    const node = {
      id: `${target.id}-node-${i}`,
      name: nodeName,
      type: virtualNodeData ? virtualNodeData.type : 'virtual_node',
      position: [nodeLng, nodeLat, centerHeight],
      targetId: connectionTarget,
      angle: angle,
      virtualNodeData: virtualNodeData, // 保存原始数据用于连线匹配
      // 添加billboard配置，包含自适应缩放
      billboard: {
        image: nodeIcon,
        scale: 0.8,
        verticalOrigin: window.Cesium?.VerticalOrigin?.BOTTOM || 0,
        horizontalOrigin: window.Cesium?.HorizontalOrigin?.CENTER || 0,
        pixelOffset: new (window.Cesium?.Cartesian2 || Object)(0, 0),
        heightReference: window.Cesium?.HeightReference?.NONE || 0,
        // 添加自适应缩放配置
        ...distanceConfigs,
      },
      // 添加label配置，包含自适应缩放
      label: {
        text: nodeName,
        font: '10pt sans-serif',
        fillColor: window.Cesium?.Color?.WHITE || '#ffffff',
        outlineColor: window.Cesium?.Color?.BLACK || '#000000',
        outlineWidth: 1,
        style: window.Cesium?.LabelStyle?.FILL_AND_OUTLINE || 0,
        pixelOffset: new (window.Cesium?.Cartesian2 || Object)(0, 25),
        showBackground: true,
        backgroundColor:
          window.Cesium?.Color?.fromCssColorString?.('rgba(0,0,0,0.7)') || 'rgba(0,0,0,0.7)',
        // 添加自适应缩放配置
        ...distanceConfigs,
      },
      // 添加point配置，包含自适应缩放
      point: {
        pixelSize: 8,
        color: window.Cesium?.Color?.fromCssColorString?.(nodeColor) || nodeColor,
        outlineColor: window.Cesium?.Color?.WHITE || '#ffffff',
        outlineWidth: 2,
        heightReference: window.Cesium?.HeightReference?.NONE || 0,
        // 添加自适应缩放配置
        ...distanceConfigs,
      },
    }

    nodes.push(node)
  }

  return nodes
}

// 生成虚拟节点连线函数
const generateVirtualRelations = (target, nodes) => {
  console.log('target', target)
  console.log('nodes', nodes)
  const relations = []

  // 从target的nodeConnections生成连线数据
  if (target.nodeConnections && Array.isArray(target.nodeConnections)) {
    target.nodeConnections.forEach((connection, index) => {
      // 查找源节点：根据connection.source匹配对应的虚拟节点
      // connection.source格式为node_001, node_002等
      // 生成的虚拟节点id格式为target_041-node-0, target_041-node-1等
      // 需要建立映射关系：node_001对应第0个节点，node_002对应第1个节点
      const nodeIndex = parseInt(connection.source.replace('node_', '')) - 1
      const sourceNode = nodes[nodeIndex]

      // 根据connection.target查找实际的目标点数据
        // 首先尝试从当前活跃图层获取
        const currentLayer = activeLayer.value
        let actualTarget = currentLayer?.dataManager?.targetLocationManager?.findById(connection.target)
        
        // 如果当前图层没有找到，尝试从全局数据中查找
        if (!actualTarget) {
          // 从全局targetLocationData中查找
          const { targetLocationData } = globalMapStore
          actualTarget = targetLocationData.find(item => item.id === connection.target)
        }
      
      if (sourceNode && actualTarget) {
        // 计算距离（简化计算，实际应使用地理距离）
        const distance =
          Math.sqrt(
            Math.pow(actualTarget.longitude - sourceNode.position[0], 2) +
              Math.pow(actualTarget.latitude - sourceNode.position[1], 2),
          ) * 111 // 粗略转换为公里

        const relationId = `circle_connector_${String(index + 1).padStart(3, '0')}`

        // 处理target_id和source_id，去除可能的@point@或@trajectory@后缀
        const cleanTargetId = connection.target.split('@')[0] // 使用connection.target而不是target.id
        const cleanSourceId = connection.source
        console.log(
          `连线${index}: source=${connection.source}, target=${connection.target}, 实际目标=${actualTarget.name}, 原target.id=${target.id}`,
        )

        const relation = {
          id: relationId,
          description: `${sourceNode.name || '节点'}到${connection.target || '目标'}的圆环连接器`,
          source_id: cleanSourceId, // 使用清理后的source_id
          target_id: cleanTargetId, // 使用connection.target
          type: connection.type || '圆环连接',
          status: connection.status || '正常',
          priority: connection.bandwidth === 'high' ? '高' : '中',
          distance: Math.round(distance * 10) / 10,
          capacity: connection.bandwidth === 'high' ? '高带宽' : '标准带宽',
          createdAt: new Date().toISOString(),
          // 保留原有属性用于兼容
          name: connection.description || `${sourceNode.name} -> ${connection.target}`,
          sourceId: cleanSourceId, // 使用清理后的source_id
          targetId: cleanTargetId, // 使用connection.target
          sourcePosition: sourceNode.position,
          targetPosition: [actualTarget.longitude, actualTarget.latitude, actualTarget.height || 0], // 使用实际目标点的位置作为连线终点位置
          bandwidth: connection.bandwidth,
          protocol: connection.protocol,
          // LineWithLabel组件需要的属性
          positions: [
            Cesium.Cartesian3.fromDegrees(...sourceNode.position),
            Cesium.Cartesian3.fromDegrees(
              actualTarget.longitude,
              actualTarget.latitude,
              actualTarget.height || 0,
            ),
          ],
          width: 2,
          material: connection.status === 'active' ? Cesium.Color.LIME : Cesium.Color.GRAY,
          showLabel: true,
          labelStyle: {
            text: connection.description || connection.type,
            font: '10pt sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
            backgroundPadding: new Cesium.Cartesian2(8, 4),
            pixelOffset: new Cesium.Cartesian2(0, -15),
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          },
        }
        relations.push(relation)
      }
    })
  }

  return relations
}

// const activeRingsValue = computed(() => activeRings.value.map(ring=>{
//   return ring.value
// }))

// watchEffect(() => {
//   console.log('layers', layers.value)
//   console.log('activeLayerId', activeLayerId.value)
// })

// 工具函数
const formatEntityData = (entity, type) => {
  const baseData = {
    // ID: entity.id || '未知',
    类型: type,
    名称: entity.name || entity.label?.text || '未命名',
  }

  // 根据实体类型添加特定字段
  switch (type) {
    case '目标点位':
      return {
        ...baseData,
        经度: entity.longitude?.toFixed(6) || '未知',
        纬度: entity.latitude?.toFixed(6) || '未知',
        高度: entity.height ? `${entity.height.toFixed(2)}m` : '未知',
        状态: entity.status || '正常',
      }
    case '关系连线':
      return {
        ...baseData,
        起点: entity.startPoint || '未知',
        终点: entity.endPoint || '未知',
        距离: entity.distance ? `${entity.distance.toFixed(2)}km` : '未知',
        强度: entity.strength || '中等',
      }
    case '轨迹':
      return {
        ...baseData,
        速度: entity.speed ? `${entity.speed}km/h` : '未知',
        方向: entity.heading ? `${entity.heading}°` : '未知',
        时间: entity.time || '未知',
      }
    case '事件':
      return {
        ...baseData,
        事件类型: entity.type || '未知',
        严重程度: entity.severity || '一般',
        发生时间: entity.timestamp || '未知',
        描述: entity.description || '无描述',
      }
    default:
      return baseData
  }
}

const showTooltip = (event, data, type) => {
  // console.log('showTooltip', event, data, type);

  tooltipData.value = formatEntityData(data, type)
  tooltipPosition.value = { x: event.windowPosition?.x || 0, y: event.windowPosition?.y || 0 }
  tooltipVisible.value = true
}

const hideTooltip = () => {
  tooltipVisible.value = false
  tooltipData.value = null
}

const showContextMenu = (event, data, type) => {
  const menuItems = [
    {
      label: '查看详情',
      icon: '👁️',
      action: () => {
        console.log('查看详情:', data)
        alert(`查看${type}详情:\n${JSON.stringify(formatEntityData(data, type), null, 2)}`)
      },
    },
    {
      label: '飞行到此处',
      icon: '✈️',
      action: () => {
        console.log('飞行到:', data)
        if (window.viewer && data.longitude && data.latitude) {
          const destination = window.Cesium.Cartesian3.fromDegrees(
            data.longitude,
            data.latitude,
            (data.height || 0) + 1000,
          )
          window.viewer.camera.flyTo({
            destination: destination,
            duration: 2.0,
          })
        }
      },
    },
    { type: 'separator' },
    {
      label: '复制信息',
      icon: '📋',
      action: () => {
        const info = JSON.stringify(formatEntityData(data, type), null, 2)
        navigator.clipboard.writeText(info)
        console.log('已复制到剪贴板:', info)
      },
    },
  ]

  contextMenuItems.value = menuItems
  contextMenuPosition.value = { x: event.windowPosition?.x || 0, y: event.windowPosition?.y || 0 }
  contextMenuVisible.value = true
}

const hideContextMenu = () => {
  contextMenuVisible.value = false
  contextMenuItems.value = []
}

// 事件处理函数
const onTargetClick = (target, event) => {
  // console.log('点击目标:', target, event)
  if (event?.button === 2) {
    // 右键
    showContextMenu(event, target, '目标点位')
  }
}

const onTargetDblClick = (target, event) => {
  console.log('双击目标:', target, event)

  // 检查目标是否包含圆环相关属性
  if (target.ringMaterial && target.ringOutlineColor && target.ringRadius) {
    const ringId = `ring-${target.id}`
    const nodesId = `nodes-${target.id}`

    // 如果圆环已存在，则移除它和虚拟节点
    if (activeRings.value.has(ringId)) {
      activeRings.value.delete(ringId)
      virtualNodes.value.delete(nodesId)
      virtualRelations.value.delete(nodesId)
      console.log('移除圆环、虚拟节点和连线:', ringId)
    } else {
      console.log('target', target)
      // 创建新的圆环配置
      const ringConfig = {
        id: ringId,
        targetId: target.id,
        position: target.position,
        material: target.ringMaterial,
        outlineColor: target.ringOutlineColor,
        radius: target.ringRadius,
        height: target.position[2] || 0,
      }

      activeRings.value.set(ringId, ringConfig)
      console.log('创建圆环:', ringId, ringConfig)

      // 如果目标包含nodeCount属性，生成虚拟节点
      if (target.nodeCount) {
        const nodes = generateVirtualNodes(target)
        virtualNodes.value.set(nodesId, nodes)
        console.log('创建虚拟节点:', nodesId, nodes)

        // 生成虚拟节点连线
        const relations = generateVirtualRelations(target, nodes)
        console.log('生成的虚拟连线数据:', relations)
        console.log('连线数量:', relations.length)
        if (relations.length > 0) {
          console.log('第一条连线详情:', relations[0])
          console.log('positions:', relations[0].positions)
          console.log('material:', relations[0].material)
          console.log('labelStyle:', relations[0].labelStyle)
        }
        virtualRelations.value.set(nodesId, relations)
        console.log('virtualRelations Map大小:', virtualRelations.value.size)
        console.log('virtualRelations内容:', Array.from(virtualRelations.value.entries()))
      }
    }
  }

  // 原有的特定处理逻辑
  if (target.name === '北京通信中心') {
    console.log('双击了北京通信中心，执行特定操作')
  }
}

// 虚拟节点点击事件
const onVirtualNodeClick = (node) => {
  console.log('点击虚拟节点:', node)
  // 这里可以添加虚拟节点的点击处理逻辑
}

const onTargetHover = (target, event) => {
  showTooltip(event, target, '目标点位')
}

const onTargetLeave = () => {
  hideTooltip()
}

const onRelationClick = (relation, event) => {
  console.log('点击关系:', relation)
  if (event.originalEvent?.button === 2) {
    // 右键
    showContextMenu(event, relation, '关系连线')
  }
}

const onRelationHover = (relation, event) => {
  showTooltip(event, relation, '关系连线')
}

const onRelationLeave = () => {
  hideTooltip()
}

// 轨迹事件处理函数
const onTrajectoryClick = (trajectory, event) => {
  console.log('点击轨迹:', trajectory)
  if (event.originalEvent?.button === 2) {
    // 右键
    showContextMenu(event, trajectory, '轨迹')
  }
}

const onTrajectoryHover = (trajectory, event) => {
  showTooltip(event, trajectory, '轨迹')
}

const onTrajectoryLeave = () => {
  hideTooltip()
}

// 事件处理函数
const onEventClick = (eventData, event) => {
  console.log('点击事件:', eventData)
  if (event.originalEvent?.button === 2) {
    // 右键
    showContextMenu(event, eventData, '事件')
  }
}

const onEventHover = (eventData, event) => {
  showTooltip(event, eventData, '事件')
}

const onEventLeave = () => {
  hideTooltip()
}

// const handleFlyToTarget = (target) => {
//   console.log('飞行到目标:', target)
//   if (window.viewer && target.longitude && target.latitude) {
//     const destination = window.Cesium.Cartesian3.fromDegrees(
//       target.longitude,
//       target.latitude,
//       target.height + 1000,
//     )

//     window.viewer.camera.flyTo({
//       destination: destination,
//       duration: 2.0,
//     })
//   }
// }

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

// 全局点击事件监听器，用于隐藏右键菜单
onMounted(() => {
  const handleGlobalClick = (event) => {
    // 如果点击的不是右键菜单区域，则隐藏菜单
    if (contextMenuVisible.value && !event.target.closest('.context-menu')) {
      hideContextMenu()
    }
  }

  document.addEventListener('click', handleGlobalClick)
  document.addEventListener('contextmenu', (e) => {
    // 阻止默认右键菜单，但允许我们的自定义菜单
    if (!e.target.closest('.cesium-viewer')) {
      e.preventDefault()
    }
  })

  // 清理事件监听器
  return () => {
    document.removeEventListener('click', handleGlobalClick)
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
            :target-status="layer.data.targetStatus"
            :events="layer.data.events"
            :visible="layer.visible"
            :show-points="layer.showControls.showPoints"
            :show-relation="layer.showControls.showRelation"
            :show-trajectory="layer.showControls.showTrajectory"
            :show-events="layer.showControls.showEvents"
            :show-target-status="layer.showControls.showTargetStatus"
            @target-click="onTargetClick"
            @target-dbl-click="onTargetDblClick"
            @target-hover="onTargetHover"
            @target-leave="onTargetLeave"
            @relation-click="onRelationClick"
            @relation-hover="onRelationHover"
            @relation-leave="onRelationLeave"
            @trajectory-click="onTrajectoryClick"
            @trajectory-hover="onTrajectoryHover"
            @trajectory-leave="onTrajectoryLeave"
            @event-click="onEventClick"
            @event-hover="onEventHover"
            @event-leave="onEventLeave"
          />
        </template>

        <!-- 动态圆环渲染 -->
        <template v-for="[ringId, ringConfig] in activeRings" :key="ringId">
          <vc-entity :id="ringConfig.id" :position="ringConfig.position" :selectable="false">
            <vc-graphics-ellipse
              :semi-major-axis="ringConfig.radius"
              :semi-minor-axis="ringConfig.radius"
              :height="ringConfig.height || 0"
              :material="ringConfig.material"
              :outline="true"
              :outline-color="ringConfig.outlineColor"
              :outline-width="2"
            />
          </vc-entity>
        </template>

        <!-- 虚拟节点渲染 -->
        <template v-for="[nodesId, nodes] in virtualNodes" :key="nodesId">
          <template v-for="node in nodes" :key="node.id">
            <vc-entity
              :id="node.id"
              :position="node.position"
              :billboard="node.billboard"
              :label="node.label"
              :point="node.point"
              @click="onVirtualNodeClick(node)"
            />
          </template>
        </template>

        <!-- 虚拟节点连线渲染 -->
        <template v-for="[relationsId, relations] in virtualRelations" :key="relationsId">
          <template v-for="relation in relations" :key="relation.id">
            <LineWithLabel
              :id="relation.id"
              :show="true"
              :positions="relation.positions"
              :width="relation.width"
              :material="relation.material"
              :show-label="relation.showLabel"
              :label-style="relation.labelStyle"
              :source-position="relation.sourcePosition"
              :target-position="relation.targetPosition"
            />
          </template>
        </template>
      </div>
    </vc-viewer>

    <!-- TODO: 鼠标提示组件, 相当一般待修改 -->
    <MouseTooltip :visible="tooltipVisible" :mousePosition="tooltipPosition">
      <ContentDisplay v-if="tooltipData" :data="tooltipData" :columns="2" :show-empty="false" />
    </MouseTooltip>

    <!-- 右键菜单组件 -->
    <ContextMenu
      :visible="contextMenuVisible"
      :position="contextMenuPosition"
      :menuItems="contextMenuItems"
      @close="hideContextMenu"
    />

    <!-- 图层控制面板 -->
    <LayerControlPanel />
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
