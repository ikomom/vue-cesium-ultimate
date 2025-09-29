import { defineStore } from 'pinia'
import { getCircleConnectorData, getDataByTimeRange } from '@/api/index.js'
import { ref, markRaw, computed } from 'vue'
import LayerManager from '@/components/ui/layer'
import dayjs from 'dayjs'

export const useGlobalMapStore = defineStore('globalMap', () => {
  // 创建全局图层管理器实例
  const globalLayerManager = markRaw(new LayerManager())

  const mapInit = ref(false)
  const loading = ref(false)
  // 圆环连接器数据
  const circleConnectorData = ref({})
  // 时间范围状态
  const timeRange = ref({
    startTime: dayjs().subtract(1, 'month').toDate(),
    endTime: dayjs().toDate(),
  })

  const rangeData = ref({
    eventData: [],
    fusionLineData: [],
    relationData: [],
    targetBaseData: [],
    targetLocationData: [],
    targetStatusData: [],
    trajectoryData: {},
  })

  // 使用新的API接口加载数据
  async function loadDataByTimeRange(options = {}) {
    const {
      startTime = timeRange.value.startTime,
      endTime = timeRange.value.endTime,
      targetIds = null,
    } = options

    loading.value = true

    try {
      console.log('🔄 加载时间范围数据:', { startTime, endTime, targetIds })

      const data = await getDataByTimeRange({ startTime, endTime, targetIds })
      rangeData.value = data.data

      // 更新时间范围
      timeRange.value = { startTime, endTime }

      console.log('✅ 数据加载完成:', { startTime, endTime, data })
      return data
    } catch (error) {
      console.error('❌ 数据加载失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function init() {
    try {
      mapInit.value = false
      // 并行加载时间范围数据和圆环连接器数据
      const [timeRangeData, circleData] = await Promise.all([
        loadDataByTimeRange(),
        getCircleConnectorData(),
      ])
      console.log('✅ 初始化数据:', { timeRangeData, circleData })
      // 更新数据状态
      rangeData.value = timeRangeData.data
      circleConnectorData.value = { ...circleData }
      mapInit.value = true
    } catch (error) {
      console.error('初始化数据加载失败:', error)
      throw error
    }
  }

  // 初始化默认图层
  function initDefaultLayers() {
    // 清空现有图层
    globalLayerManager.clear()

    // // 创建目标基础数据图层
    // const targetBaseLayer = globalLayerManager.createLayer({
    //   ...timeRange.value,
    //   name: '数据卡片1',
    //   zIndex: 1,
    //   visible: false,
    // })

    // targetBaseLayer.updateAllData({
    //   targets: rangeData.value.targetBaseData,
    //   points: rangeData.value.targetLocationData.slice(0, 20),
    //   relations: rangeData.value.relationData.slice(0, 6),
    // })

    // // 创建目标位置数据图层
    // const targetLocationLayer = globalLayerManager.createLayer({
    //   ...timeRange.value,
    //   name: '数据卡片2',
    //   zIndex: 2,
    //   visible: false,
    // })

    // targetLocationLayer.updateAllData({
    //   targets: rangeData.value.targetBaseData,
    //   points: rangeData.value.targetLocationData.slice(20),
    //   relations: rangeData.value.relationData.slice(6),
    // })

    // // 创建关系连线图层
    // const relationLayer = globalLayerManager.createLayer({
    //   ...timeRange.value,
    //   name: '轨迹数据',
    //   zIndex: 3,
    //   visible: false,
    // })

    // relationLayer.updateAllData({
    //   targets: rangeData.value.targetBaseData,
    //   trajectories: rangeData.value.trajectoryData,
    // })

    // 创建圆环连接器数据图层
    const circleConnectorLayer = globalLayerManager.createLayer({
      ...timeRange.value,
      name: '圆环连接器',
      zIndex: 4,
      visible: false,
    })

    // 设置显示控制 - 启用关系连线显示
    circleConnectorLayer.setShowControl('showRelation', true)

    circleConnectorLayer.updateAllData({
      targets: circleConnectorData.value.targets || [],
      points: circleConnectorData.value.points || [],
      relations: circleConnectorData.value.relations || [],
      trajectories: { ...circleConnectorData.value.trajectories } || [],
    })

    // 融合线数据图层
    const fusionLineLayer = globalLayerManager.createLayer({
      name: '融合线数据',
      zIndex: 5,
      visible: false,
    })

    // 设置显示控制 - 启用融合线显示
    fusionLineLayer.setShowControl('showFusionLines', true)

    fusionLineLayer.updateAllData({
      fusionLines: rangeData.value.fusionLineData,
      points: rangeData.value.targetLocationData,
    })

    // 全数据图层
    const allDataLayer = globalLayerManager.createLayer({
      ...timeRange.value,
      name: '全数据',
      zIndex: 6,
      visible: true,
    })

    allDataLayer.updateAllData({
      targets: rangeData.value.targetBaseData,
      trajectories: rangeData.value.trajectoryData,
      points: rangeData.value.targetLocationData,
      relations: rangeData.value.relationData,
      events: rangeData.value.eventData,
      targetStatuses: rangeData.value.targetStatusData,
    })

    // 全局时间轴更新
    globalLayerManager.updateGlobalTimeline()
  }

  // 更新时间范围并重新加载数据
  async function updateTimeRange(startTime, endTime, targetIds = null) {
    console.log('🕒 更新时间范围:', { startTime, endTime, targetIds })

    try {
      // 加载新的时间范围数据
      await loadDataByTimeRange({ startTime, endTime, targetIds })

      // 更新现有图层数据，而不是重新创建图层
      updateExistingLayersData()

      console.log('✅ 时间范围更新完成')
    } catch (error) {
      console.error('❌ 时间范围更新失败:', error)
      throw error
    }
  }

  // 更新现有图层数据
  function updateExistingLayersData() {
    const existingLayers = globalLayerManager.getAllLayers()

    // 如果没有现有图层，则初始化默认图层
    if (existingLayers.length === 0) {
      initDefaultLayers()
      return
    }

    // 更新现有图层的数据
    existingLayers.forEach((layer) => {
      const layerInfo = layer.getInfo()

      // 根据图层名称更新对应的数据
      switch (layerInfo.name) {
        case '圆环连接器':
          layer.updateAllData({
            circleConnectors: circleConnectorData.value.circleConnectors,
            points: rangeData.value.targetLocationData,
          })
          break
        case '事件数据':
          layer.updateAllData({
            events: rangeData.value.eventData,
            points: rangeData.value.targetLocationData,
          })
          break
        case '融合线数据':
          layer.updateAllData({
            fusionLines: rangeData.value.fusionLineData,
            points: rangeData.value.targetLocationData,
          })
          break
        case '全数据':
          layer.updateAllData({
            targets: rangeData.value.targetBaseData,
            trajectories: rangeData.value.trajectoryData,
            points: rangeData.value.targetLocationData,
            relations: rangeData.value.relationData,
            events: rangeData.value.eventData,
            targetStatuses: rangeData.value.targetStatusData,
          })
          break
        default:
          // 对于其他图层，尝试更新通用数据
          layer.updateAllData({
            targets: rangeData.value.targetBaseData,
            points: rangeData.value.targetLocationData,
            relations: rangeData.value.relationData,
            trajectories: rangeData.value.trajectoryData,
            events: rangeData.value.eventData,
          })
          break
      }

      // 更新图层的时间范围
      layer.startTime = timeRange.value.startTime
      layer.endTime = timeRange.value.endTime
    })

    // 更新全局时间轴
    globalLayerManager.updateGlobalTimeline()
  }

  // 获取图层管理器
  function getLayerManager() {
    return globalLayerManager
  }
  const layers = computed(() => globalLayerManager.getAllLayers())
  const activeLayerId = computed(() => globalLayerManager.activeLayerId.value)
  const activeLayer = computed(() => globalLayerManager.getLayer(activeLayerId.value))

  return {
    // 方法
    init,
    mapInit,
    initDefaultLayers,
    getLayerManager,
    loadDataByTimeRange,
    updateTimeRange,
    // 变量
    layers,
    activeLayerId,
    activeLayer,
    globalLayerManager,
    circleConnectorData,
    loading,
    timeRange,
    rangeData,
  }
})
