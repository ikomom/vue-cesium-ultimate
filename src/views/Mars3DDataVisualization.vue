<template>
  <div class="mars3d-data-visualization">
    <!-- 地图容器 -->
    <div id="mars3dContainer" class="mars3d-container"></div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="panel-header">
        <h3>Mars3D 数据可视化</h3>
      </div>

      <div class="panel-content">
        <!-- 显示控制 -->
        <div class="control-group">
          <h4>显示控制</h4>
          <label
            ><input type="checkbox" v-model="showPoints" @change="updateDisplay" /> 目标点位</label
          >
          <label
            ><input type="checkbox" v-model="showRelations" @change="updateDisplay" />
            关系连线</label
          >
          <label
            ><input type="checkbox" v-model="showTrajectories" @change="updateDisplay" />
            轨迹</label
          >
          <label><input type="checkbox" v-model="showEvents" @change="updateDisplay" /> 事件</label>
          <label
            ><input type="checkbox" v-model="showFusionLines" @change="updateDisplay" />
            融合线</label
          >
        </div>

        <!-- 数据加载 -->
        <div class="control-group">
          <h4>数据操作</h4>
          <button @click="loadRealData" class="btn btn-primary">加载真实数据</button>
          <button @click="clearAllData" class="btn btn-secondary">清空数据</button>
        </div>

        <!-- 统计信息 -->
        <div class="control-group">
          <h4>统计信息</h4>
          <div class="stats">
            <div>目标点位: {{ stats.points }}</div>
            <div>关系连线: {{ stats.relations }}</div>
            <div>轨迹: {{ stats.trajectories }}</div>
            <div>事件: {{ stats.events }}</div>
            <div>融合线: {{ stats.fusionLines }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 信息面板 -->
    <div class="info-panel" v-if="selectedEntity">
      <div class="panel-header">
        <h4>{{ selectedEntity.name || '实体信息' }}</h4>
        <button @click="closeInfoPanel" class="close-btn">&times;</button>
      </div>
      <div class="panel-content">
        <div v-for="(value, key) in selectedEntity.properties" :key="key" class="info-item">
          <span class="key">{{ key }}:</span>
          <span class="value">{{ value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, nextTick, watch } from 'vue'
import * as mars3d from 'mars3d'
import { DataVisualizationManager } from '@/components/mars3d/DataVisualizationManager.js'
import { useGlobalMapStore } from '@/stores/globalMap.js'
import { storeToRefs } from 'pinia'

// 响应式数据
const map = ref(null)
const visualizationManager = ref(null)
const selectedEntity = ref(null)

// 集成 globalMap store
const globalMapStore = useGlobalMapStore()
const { rangeData, loading, mapInit } = storeToRefs(globalMapStore)

// 显示控制
const showPoints = ref(true)
const showRelations = ref(true)
const showTrajectories = ref(true)
const showEvents = ref(true)
const showFusionLines = ref(true)

// 统计信息
const stats = reactive({
  points: 0,
  relations: 0,
  trajectories: 0,
  events: 0,
  fusionLines: 0,
})

// 数据存储
const dataStore = reactive({
  points: [],
  relations: [],
  trajectories: [],
  events: [],
  fusionLines: [],
  virtualNodes: new Map(),
  activeRings: new Map(),
})

// 图层管理
const layers = reactive({
  pointLayer: null,
  relationLayer: null,
  trajectoryLayer: null,
  eventLayer: null,
  fusionLineLayer: null,
  virtualLayer: null,
})

/**
 * 初始化Mars3D地图
 */
const initMars3D = async () => {
  try {
    // 创建地图实例
    map.value = new mars3d.Map('mars3dContainer', {
      scene: {
        center: { lat: 31.686, lng: 117.077, alt: 15000000, heading: 0, pitch: -90 },
        showSun: false,
        showMoon: false,
        showSkyBox: false,
        showSkyAtmosphere: false,
        fog: { enabled: false },
        fxaa: true,
        requestRenderMode: false, // 设置为 false 以支持动画材质的持续渲染
        globe: {
          depthTestAgainstTerrain: false,
          showGroundAtmosphere: false,
          enableLighting: false,
        },
      },
      control: {
        baseLayerPicker: true,
        sceneModePicker: true,
        vrButton: false,
        fullscreenButton: true,
        geocoder: false,
        homeButton: true,
        infoBox: false,
        navigationHelpButton: false,
        selectionIndicator: false,
        timeline: true,
        animation: true,
      },
      terrain: {
        url: 'https://data.mars3d.cn/terrain',
      },
      basemaps: [
        {
          name: '天地图影像',
          icon: 'https://data.mars3d.cn/img/thumbnail/basemap/tdt_img.png',
          type: 'tdt',
          layer: 'img_d',
          show: true,
        },
      ],
    })

    // 创建数据可视化管理器
    visualizationManager.value = new DataVisualizationManager(map.value)

    // 绑定事件
    bindEvents()

    console.log('Mars3D地图初始化完成')
  } catch (error) {
    console.error('Mars3D地图初始化失败:', error)
  }
}

/**
 * 绑定事件
 */
const bindEvents = () => {
  // 绑定实体点击事件
  map.value.on('entityClick', (event) => {
    handleEntityClick(event.graphic, event.entityType, event.originalData)
  })

  // 绑定实体双击事件
  map.value.on('entityDoubleClick', (event) => {
    handleEntityDoubleClick(event.graphic, event.entityType, event.originalData)
  })
}

/**
 * 处理实体点击事件
 */
const handleEntityClick = (graphic, entityType, originalData) => {
  console.log('实体被点击:', graphic, entityType, originalData)

  // 设置选中实体信息
  selectedEntity.value = {
    name: originalData?.name || graphic.attr?.name || '未命名实体',
    properties: {
      ID: graphic.id,
      类型: entityType || '未知',
      位置: graphic.position ? getPositionString(graphic.position) : '未知',
      创建时间: originalData?.createdAt || '未知',
      ...originalData,
    },
  }
}

/**
 * 处理实体双击事件
 */
const handleEntityDoubleClick = (graphic, entityType, originalData) => {
  console.log('实体被双击:', graphic, entityType, originalData)
  // 双击事件已在DataVisualizationManager中处理
}

/**
 * 加载真实数据
 */
const loadRealData = async () => {
  try {
    if (!visualizationManager.value) {
      console.warn('数据可视化管理器未初始化')
      return
    }

    // 等待 globalMap store 初始化完成
    if (!mapInit?.value) {
      console.log('等待 globalMap store 初始化...')
      await globalMapStore.init()
    }

    // 清空现有数据
    clearAllData()

    // 加载真实数据
    await loadRealPointData()
    await loadRealRelationData()
    await loadRealTrajectoryData()
    await loadRealEventData()
    await loadRealFusionLineData()

    // 更新统计信息
    updateStats()

    console.log('真实数据加载完成')
  } catch (error) {
    console.error('真实数据加载失败:', error)
  }
}

/**
 * 加载真实目标点位数据
 */
const loadRealPointData = async () => {
  if (!rangeData.value) {
    console.warn('rangeData 未初始化')
    return
  }

  const points = rangeData.value.targetLocationData || []
  const targets = rangeData.value.targetBaseData || []

  console.log('加载真实点位数据:', points.length, '个点位')

  points.forEach((point, index) => {
    // 查找对应的目标基础数据 - 使用point.id而不是point.targetId
    const target = targets.find((t) => t.id === point.id)
    if (target) {
      visualizationManager.value.addPoint({
        id: point.id || `point_${index}`,
        name: point.name || target.name || `目标点${index + 1}`,
        longitude: point.longitude || point.lng,
        latitude: point.latitude || point.lat,
        height: point.height || point.alt || 0,
        type: target.type || 'unknown',
        status: target.status || 'active',
        ringRadius: 50000,
        ringColor: getColorByType(target.type || 'unknown'),
        ringOutlineColor: getColorByType(target.type || 'unknown'),
        iconUrl: getIconByType(target.type || 'unknown'),
        scale: 1.0,
        color: '#ffffff',
        labelColor: '#ffffff',
        labelBackgroundColor: getColorByStatus(target.status || 'active'),
        showLabel: true,
        metadata: {
          createdAt: point.createdAt || new Date().toISOString(),
          category: 'real_data',
          targetId: point.id, // 使用point.id
          ...target,
        },
      })

      dataStore.points.push(point)
    }
  })
}

/**
 * 加载真实关系连线数据
 */
const loadRealRelationData = async () => {
  if (!rangeData.value) {
    console.warn('rangeData 未初始化')
    return
  }

  const relations = rangeData.value.relationData || []

  console.log('加载真实关系数据:', relations.length, '条关系')

  relations.forEach((relation, index) => {
    // 获取关系类型的样式配置
    const relationColor = getColorByRelationType(relation.type || 'connection')
    const relationWidth = getWidthByRelationType(relation.type || 'connection')
    const materialType = getMaterialTypeByRelationType(relation.type || 'connection')

    visualizationManager.value.addRelation({
      id: relation.id || `relation_${index}`,
      name: relation.description || `关系${index + 1}`,
      sourceId: relation.source_id || relation.sourceId || relation.from,
      targetId: relation.target_id || relation.targetId || relation.to,
      type: relation.type || 'connection',
      strength: relation.strength || 0.8,
      color: relationColor,
      width: relationWidth,
      materialType: materialType,
      curve: relation.type === '航线连接' || relation.type === '海运航线',
      curveHeight: relation.type === '航线连接' ? 200000 : 100000,
      metadata: {
        createdAt: relation.createdAt || relation.timestamp || new Date().toISOString(),
        category: 'real_data',
        ...relation,
      },
    })

    dataStore.relations.push(relation)
  })
}

/**
 * 加载真实轨迹数据
 */
const loadRealTrajectoryData = async () => {
  if (!rangeData.value) {
    console.warn('rangeData 未初始化')
    return
  }

  const trajectories = rangeData.value.trajectoryData || {}

  console.log('加载真实轨迹数据:', Object.keys(trajectories).length, '条轨迹')

  Object.entries(trajectories).forEach(([targetId, trajectory]) => {
    if (trajectory && trajectory.positions && trajectory.positions.length > 0) {
      visualizationManager.value.addTrajectory({
        id: `trajectory_${targetId}`,
        name: `${trajectory.name || targetId}轨迹`,
        targetId: targetId,
        positions: trajectory.positions.map((pos) => ({
          longitude: pos.longitude || pos.lng,
          latitude: pos.latitude || pos.lat,
          height: pos.height || pos.alt || 0,
          time: pos.timestamp || pos.time,
        })),
        pathMaterial: 'LineTrail',
        pathColor: '#00ffff',
        pathWidth: 2,
        showPath: true,
        showPoints: false,
        metadata: {
          category: 'real_data',
          targetId: targetId,
          ...trajectory,
        },
      })

      dataStore.trajectories.push(trajectory)
    }
  })
}

/**
 * 加载真实事件数据
 */
const loadRealEventData = async () => {
  if (!rangeData.value) {
    console.warn('rangeData 未初始化')
    return
  }

  const events = rangeData.value.eventData || []

  console.log('加载真实事件数据:', events.length, '个事件')

  events.forEach((event, index) => {
    visualizationManager.value.addEvent({
      id: event.id || `event_${index}`,
      name: event.name || event.title || `事件${index + 1}`,
      longitude: event.longitude || event.lng,
      latitude: event.latitude || event.lat,
      height: event.height || event.alt || 0,
      type: event.type || 'info',
      level: event.level || 'normal',
      description: event.description || event.content,
      timestamp: event.timestamp || event.time,
      iconUrl: getEventIconByType(event.type || 'info'),
      color: getColorByEventLevel(event.level || 'normal'),
      metadata: {
        category: 'real_data',
        ...event,
      },
    })

    dataStore.events.push(event)
  })
}

/**
 * 加载真实融合线数据
 */
const loadRealFusionLineData = async () => {
  if (!rangeData.value) {
    console.warn('rangeData 未初始化')
    return
  }

  const fusionLines = rangeData.value.fusionLineData || []

  console.log('加载真实融合线数据:', fusionLines.length, '条融合线')

  fusionLines.forEach((fusionLine, index) => {
    if (fusionLine.positions && fusionLine.positions.length > 1) {
      visualizationManager.value.addFusionLine({
        id: fusionLine.id || `fusion_${index}`,
        name: fusionLine.name || `融合线${index + 1}`,
        positions: fusionLine.positions.map((pos) => ({
          longitude: pos.longitude || pos.lng,
          latitude: pos.latitude || pos.lat,
          height: pos.height || pos.alt || 0,
        })),
        type: fusionLine.type || 'data_fusion',
        pathMaterial: 'LineFlow',
        pathColor: '#ff00ff',
        pathWidth: 2,
        metadata: {
          category: 'real_data',
          ...fusionLine,
        },
      })

      dataStore.fusionLines.push(fusionLine)
    }
  })
}











/**
 * 更新显示状态
 */
const updateDisplay = () => {
  if (visualizationManager.value) {
    visualizationManager.value.setLayerShow('points', showPoints.value)
    visualizationManager.value.setLayerShow('relations', showRelations.value)
    visualizationManager.value.setLayerShow('trajectories', showTrajectories.value)
    visualizationManager.value.setLayerShow('events', showEvents.value)
    visualizationManager.value.setLayerShow('fusionLines', showFusionLines.value)
  }
}

/**
 * 更新统计信息
 */
const updateStats = () => {
  if (visualizationManager.value) {
    const currentStats = visualizationManager.value.getStats()
    Object.assign(stats, currentStats)
  }
}

/**
 * 清空所有数据
 */
const clearAllData = () => {
  if (visualizationManager.value) {
    visualizationManager.value.clearAll()
  }

  // 清空本地数据存储
  dataStore.points = []
  dataStore.relations = []
  dataStore.trajectories = []
  dataStore.events = []
  dataStore.fusionLines = []

  // 重置统计信息
  updateStats()

  // 清空选中实体
  selectedEntity.value = null
}
/**
 * 关闭信息面板
 */
const closeInfoPanel = () => {
  selectedEntity.value = null
}

/**
 * 根据类型获取颜色
 */
const getColorByType = (type) => {
  const colorMap = {
    military: '#ff6b35',
    communication: '#00ff00',
    radar: '#0080ff',
    ship: '#00ffff',
    aircraft: '#ff00ff',
    unknown: '#888888',
  }
  return colorMap[type] || '#888888'
}

/**
 * 根据关系类型获取宽度
 */
const getWidthByRelationType = (type) => {
  const widthMap = {
    '航线连接': 3,
    '雷达覆盖': 2,
    '海运航线': 4,
    '高铁线路': 3,
    connection: 2,
    communication: 2,
    data_link: 2,
    command: 3,
    support: 2,
  }
  return widthMap[type] || 2
}

/**
 * 根据关系类型获取材质类型
 */
const getMaterialTypeByRelationType = (type) => {
  const materialMap = {
    '航线连接': 'LineFlow',
    '雷达覆盖': 'LineBlink',
    '海运航线': 'LineFlow',
    '高铁线路': 'LineFlow',
    connection: 'LineFlow',
    communication: 'LineFlow',
    data_link: 'LineBlink',
    command: 'LineFlow',
    support: 'LineFlow',
  }
  return materialMap[type] || 'LineFlow'
}

/**
 * 根据关系类型获取颜色
 */
const getColorByRelationType = (type) => {
  const colorMap = {
    '航线连接': '#00ff00',
    '雷达覆盖': '#ff6b35',
    '海运航线': '#0080ff',
    '高铁线路': '#ff00ff',
    connection: '#00ff00',
    communication: '#0080ff',
    data_link: '#ff00ff',
    command: '#ff6b35',
    support: '#ffff00',
  }
  return colorMap[type] || '#ffffff'
}

/**
 * 根据事件类型获取图标
 */
const getEventIconByType = (type) => {
  const iconMap = {
    info: '/icons/info.svg',
    warning: '/icons/warning.svg',
    error: '/icons/error.svg',
    alert: '/icons/alert.svg',
  }
  return iconMap[type] || '/icons/info.svg'
}

/**
 * 根据事件级别获取颜色
 */
const getColorByEventLevel = (level) => {
  const colorMap = {
    low: '#00ff00',
    normal: '#ffff00',
    high: '#ff6b35',
    critical: '#ff0000',
  }
  return colorMap[level] || '#ffff00'
}

/**
 * 根据类型获取图标
 */
const getIconByType = (type) => {
  const iconMap = {
    military: '/icons/military.svg',
    communication: '/icons/communication.svg',
    radar: '/icons/radar.svg',
    ship: '/icons/ship.svg',
    aircraft: '/icons/aircraft.svg',
  }
  return iconMap[type] || '/icons/port.svg'
}

/**
 * 根据状态获取颜色
 */
const getColorByStatus = (status) => {
  const colorMap = {
    active: 'rgba(0,255,0,0.7)',
    standby: 'rgba(255,255,0,0.7)',
    maintenance: 'rgba(255,165,0,0.7)',
    offline: 'rgba(255,0,0,0.7)',
  }
  return colorMap[status] || 'rgba(128,128,128,0.7)'
}

/**
 * 获取位置字符串
 */
const getPositionString = (position) => {
  if (Array.isArray(position)) {
    return `${position[0].toFixed(3)}, ${position[1].toFixed(3)}, ${position[2] || 0}`
  }
  return '未知位置'
}

// 生命周期
onMounted(async () => {
  await nextTick()
  await initMars3D()

  // 初始化 globalMap store
  if (!mapInit?.value) {
    await globalMapStore.init()
  }

  // 自动加载真实数据
  await loadRealData()
})

// 监听 rangeData 变化，自动更新可视化
watch(
  () => rangeData?.value,
  (newData) => {
    if (newData && visualizationManager.value) {
      console.log('检测到数据更新，重新加载可视化数据')
      loadRealData()
    }
  },
  { deep: true },
)

// 监听 loading 状态
watch(
  () => loading?.value,
  (isLoading) => {
    console.log('数据加载状态:', isLoading ? '加载中...' : '加载完成')
  },
)

onUnmounted(() => {
  if (visualizationManager.value) {
    visualizationManager.value.destroy()
    visualizationManager.value = null
  }

  if (map.value) {
    map.value.destroy()
    map.value = null
  }
})
</script>

<style scoped>
.mars3d-data-visualization {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.mars3d-container {
  width: 100%;
  height: 100%;
}

.control-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 280px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  z-index: 1000;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
}

.panel-content {
  padding: 16px;
}

.control-group {
  margin-bottom: 20px;
}

.control-group h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #00d4ff;
}

.control-group label {
  display: block;
  margin-bottom: 8px;
  cursor: pointer;
}

.control-group input[type='checkbox'] {
  margin-right: 8px;
}

.btn {
  padding: 8px 16px;
  margin-right: 8px;
  margin-bottom: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.stats div {
  margin-bottom: 4px;
  font-size: 12px;
}

.info-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 300px;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  z-index: 1000;
}

.info-panel .panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.info-panel .panel-header h4 {
  margin: 0;
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.info-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 12px;
}

.info-item .key {
  font-weight: bold;
  min-width: 80px;
  color: #00d4ff;
}

.info-item .value {
  flex: 1;
  word-break: break-all;
}
</style>
