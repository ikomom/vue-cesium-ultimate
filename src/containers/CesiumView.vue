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
            :viewer="viewer"
            :layer-id="layer.id"
            :layer-name="layer.name"
            :targets="layer.data.targets"
            :relations="layer.data.relations"
            :trajectories="layer.data.trajectories"
            :points="layer.data.points"
            :target-status="layer.data.targetStatus"
            :events="layer.data.events"
            :fusion-lines="layer.data.fusionLines"
            :visible="layer.visible"
            :show-points="layer.showControls.showPoints"
            :show-relation="layer.showControls.showRelation"
            :show-trajectory="layer.showControls.showTrajectory"
            :show-events="layer.showControls.showEvents"
            :show-target-status="layer.showControls.showTargetStatus"
            :show-fusion-lines="layer.showControls.showFusionLines"
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
            @fusion-line-click="onFusionLineClick"
            @fusion-line-hover="onFusionLineHover"
            @fusion-line-leave="onFusionLineLeave"
          />
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

    <!-- 时间范围选择面板 -->
    <TimeRangeSelector 
      :initial-position="{ x: 20, y: 200 }"
      @time-range-change="onTimeRangeChange"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, toRaw, watchEffect, watch } from 'vue'
import DataVisualization from '@/components/ui/sanbox/DataVisualization.vue'
import MouseTooltip from '@/components/ui/MouseTooltip.vue'
import ContextMenu from '@/components/ui/ContextMenu.vue'
import ContentDisplay from '@/components/ui/ContentDisplay.vue'
import LayerControlPanel from '@/components/business/LayerControlPanel.vue'
import LineWithLabel from '@/components/ui/sanbox/LineWithLabel.vue'
import TimeRangeSelector from '@/components/ui/TimeRangeSelector.vue'

import { useGlobalMapStore } from '@/stores/globalMap.js'
import { storeToRefs } from 'pinia'
import { initMaterialProperty } from '@/components/ui/sanbox/material'
import {debounce} from 'lodash-es'

const globalMapStore = useGlobalMapStore()
const { globalLayerManager, initDefaultLayers } = globalMapStore
const { layers, activeLayerId, activeLayer, loading, mapInit } = storeToRefs(globalMapStore)
const ready = ref(false)

// 时间缓冲区配置（可配置）
const timeBufferConfig = ref({
  bufferMinutes: 0, // 缓冲区时间（分钟）
  enabled: true, // 是否启用缓冲区功能
})

// UI组件状态
const tooltipVisible = ref(false)
const tooltipPosition = ref({ x: 0, y: 0 })
const tooltipData = ref(null)
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuItems = ref([])

const viewer = ref(null)

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
    case '融合线':
      return {
        ...baseData,
        起点: entity.startPoint || '未知',
        终点: entity.endPoint || '未知',
        距离: entity.distance ? `${entity.distance.toFixed(2)}km` : '未知',
        开始时间: entity.startTime || '未知',
        结束时间: entity.endTime || '未知',
        状态: entity.status || '正常',
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

// 融合线事件处理函数
const onFusionLineClick = (fusionLine, event) => {
  console.log('点击融合线:', fusionLine)

  // 处理材质属性的点击状态
  if (fusionLine.material && typeof fusionLine.material.setClicked === 'function') {
    // 切换点击状态
    const currentState = fusionLine.material.isClicked || false
    fusionLine.material.setClicked(!currentState)
    console.log('设置融合线点击状态:', fusionLine.id, !currentState)
  }

  if (event.originalEvent?.button === 2) {
    // 右键
    showContextMenu(event, fusionLine, '融合线')
  }
}

const onFusionLineHover = (fusionLine, event) => {
  showTooltip(event, fusionLine, '融合线')
}

const onFusionLineLeave = () => {
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
  viewer.value = viewer
  window.viewer = viewer
  window.Cesium = Cesium
  ready.value = true

  // 初始化材质属性
  initMaterialProperty()

  // 设置时间轴事件监听
  setupTimelineEventListeners(viewer, Cesium)

  // viewer.scene.globe.depthTestAgainstTerrain = true
}

// 设置时间轴事件监听
function setupTimelineEventListeners(viewer, Cesium) {
  let lastTime = null
  // 监听时钟变化事件
  viewer.clock.onTick.addEventListener((clock) => {
    const curTime = Cesium.JulianDate.toDate(clock.currentTime).getTime()
    if (mapInit.value && !loading.value && curTime !== lastTime) {
      lastTime = curTime
      handleTimeChange(clock, Cesium)
    }
  })

  // 监听时间轴范围变化
  if (viewer.timeline) {
    // 自定义时间轴标签格式
    viewer.timeline.makeLabel = function (time) {
      const date = Cesium.JulianDate.toDate(time)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        // second: '2-digit'
      })
    }
  }
}

// 处理时间变化
function handleTimeChange(clock, Cesium) {
  const currentTime = clock.currentTime
  const startTime = clock.startTime
  const stopTime = clock.stopTime

  // 检查时间是否接近缓冲区边界或超出当前数据范围
  if (startTime && stopTime && timeBufferConfig.value.enabled) {
    const bufferSeconds = timeBufferConfig.value.bufferMinutes * 60
    
    // 计算缓冲区边界
    const bufferStartTime = bufferSeconds ? Cesium.JulianDate.addSeconds(
      startTime,
      bufferSeconds,
      new Cesium.JulianDate(),
    ) : startTime
    const bufferEndTime = bufferSeconds ? Cesium.JulianDate.addSeconds(
      stopTime,
      -bufferSeconds,
      new Cesium.JulianDate(),
    ) : stopTime

    // 检查是否需要重新加载数据
    const isBeforeBuffer = Cesium.JulianDate.lessThan(currentTime, bufferStartTime)
    const isAfterBuffer = Cesium.JulianDate.greaterThan(currentTime, bufferEndTime)
    const isOutOfRange = Cesium.JulianDate.lessThan(currentTime, startTime) || 
                        Cesium.JulianDate.greaterThan(currentTime, stopTime)

    if (isBeforeBuffer || isAfterBuffer || isOutOfRange) {
      console.log('🔔 时间接近缓冲区边界或超出范围，准备重新加载数据:', {
        current: Cesium.JulianDate.toDate(currentTime),
        bufferStart: Cesium.JulianDate.toDate(bufferStartTime),
        bufferEnd: Cesium.JulianDate.toDate(bufferEndTime),
        isBeforeBuffer,
        isAfterBuffer,
        isOutOfRange
      })
      
      // 重新加载数据
      handleTimeRangeUpdate(clock, currentTime, Cesium)
    }
  }
}

// 处理时间范围更新和数据重新加载
async function handleTimeRangeUpdate(clock, currentTime, Cesium) {
  try {
    // 防止在数据加载期间重复触发
    if (loading.value) {
      return
    }

    // 计算新的时间范围：当前时间前后半天
    const halfDay = 12 * 60 * 60 // 半天的秒数
    const newStartTime = Cesium.JulianDate.addSeconds(
      currentTime,
      -halfDay,
      new Cesium.JulianDate(),
    )
    const newEndTime = Cesium.JulianDate.addSeconds(currentTime, halfDay, new Cesium.JulianDate())

    // 转换为ISO字符串格式用于API调用
    const startTimeStr = Cesium.JulianDate.toIso8601(newStartTime)
    const endTimeStr = Cesium.JulianDate.toIso8601(newEndTime)

    console.log('🔄 时间超出范围，重新加载数据:', {
      current: Cesium.JulianDate.toDate(currentTime),
      newStart: Cesium.JulianDate.toDate(newStartTime),
      newEnd: Cesium.JulianDate.toDate(newEndTime),
    })

    // 使用globalMap store的updateTimeRange方法更新数据
    const { updateTimeRange } = globalMapStore
    await updateTimeRange(startTimeStr, endTimeStr)

    // 数据加载完成后再更新时钟的时间范围，避免影响时间轴拖动
    setTimeout(() => {
      clock.startTime = newStartTime
      clock.stopTime = newEndTime
      console.log('✅ 数据重新加载完成，时间范围已更新')
    }, 100) // 延迟100ms确保数据加载完成
  } catch (error) {
    console.error('❌ 时间范围更新失败:', error)
  }
}

// 处理时间范围选择器的变化
async function onTimeRangeChange(timeRangeData) {
  try {
    console.log('🕒 时间范围选择器变化:', timeRangeData)
    
    // 使用globalMap store的updateTimeRange方法更新数据
    const { updateTimeRange } = globalMapStore
    await updateTimeRange(timeRangeData.startTime, timeRangeData.endTime)

    // 更新Cesium时钟的时间范围
    if (viewer.value && viewer.value.clock) {
      const clock = viewer.value.clock
      const Cesium = window.Cesium
      
      const newStartTime = Cesium.JulianDate.fromIso8601(timeRangeData.startTime)
      const newEndTime = Cesium.JulianDate.fromIso8601(timeRangeData.endTime)
      
      // 更新时钟范围
      clock.startTime = newStartTime
      clock.stopTime = newEndTime
      
      // 将当前时间设置为开始时间
      clock.currentTime = newStartTime.clone()
      
      console.log('✅ 时间范围已更新:', {
        type: timeRangeData.type,
        label: timeRangeData.label,
        start: Cesium.JulianDate.toDate(newStartTime),
        end: Cesium.JulianDate.toDate(newEndTime)
      })
    }
  } catch (error) {
    console.error('❌ 时间范围选择更新失败:', error)
  }
}

// 处理时间超出范围的情况（已废弃，使用动态时间范围）
// function handleTimeOutOfRange(clock, currentTime, startTime, stopTime, Cesium) {
//   console.log('时间超出范围:', {
//     current: Cesium.JulianDate.toDate(currentTime),
//     start: Cesium.JulianDate.toDate(startTime),
//     stop: Cesium.JulianDate.toDate(stopTime)
//   })

//   // 根据配置决定处理方式
//   const isBeforeStart = Cesium.JulianDate.lessThan(currentTime, startTime)
//   const isAfterStop = Cesium.JulianDate.greaterThan(currentTime, stopTime)

//   if (isBeforeStart) {
//     // 如果时间在开始时间之前，跳转到开始时间
//     clock.currentTime = startTime.clone()
//     console.log('时间调整到开始时间:', Cesium.JulianDate.toDate(startTime))
//   } else if (isAfterStop) {
//     // 如果时间在结束时间之后，根据时钟范围模式处理
//     switch (clock.clockRange) {
//       case Cesium.ClockRange.LOOP_STOP:
//         // 循环模式：跳转到开始时间
//         clock.currentTime = startTime.clone()
//         console.log('循环模式：时间调整到开始时间')
//         break
//       case Cesium.ClockRange.CLAMPED:
//         // 钳制模式：停留在结束时间
//         clock.currentTime = stopTime.clone()
//         clock.shouldAnimate = false
//         console.log('钳制模式：时间停留在结束时间')
//         break
//       default:
//         // 默认：跳转到开始时间
//         clock.currentTime = startTime.clone()
//         break
//     }
//   }
// }

watch([ready, mapInit], () => {
  if (ready.value && mapInit.value) {
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

<style lang="less">
.vc-viewer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
