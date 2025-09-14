import { defineStore } from 'pinia'
import {
  getTargetBaseData,
  getTargetLocationData,
  getRelationData,
  getEventData,
  getShipTrajectoryData,
  getTargetStatusData,
  getCircleConnectorData,
} from '@/api/index.js'
import { ref, markRaw, computed } from 'vue'
import LayerManager from '@/components/ui/layer'

export const useGlobalMapStore = defineStore('globalMap', () => {
  // 创建全局图层管理器实例
  const globalLayerManager = markRaw(new LayerManager())

  // 目标基础数据
  const targetBaseData = ref([])
  // 目标位置数据
  const targetLocationData = ref([])
  // 关系数据
  const relationData = ref([])
  // 目标状态数据
  const targetStatusData = ref([])
  // 事件数据
  const eventData = ref([])
  // 轨迹数据
  const trajectoryData = ref({})
  // 圆环连接器数据
  const circleConnectorData = ref({})
  const loading = ref(false)

  function init() {
    loading.value = true
    // 初始化地图
    return Promise.all([
      getTargetBaseData(),
      getTargetLocationData(),
      getRelationData(),
      getShipTrajectoryData(),
      getEventData(),
      getTargetStatusData(),
      getCircleConnectorData(),
    ])
      .then((res) => {
        console.log('????????????????????????????????',res[6])
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',res[3])
        targetBaseData.value = [...(res[0] || [])]
        targetLocationData.value = [...(res[1] || [])]
        relationData.value = [...(res[2] || [])]
        trajectoryData.value = { ...(res[3] || {}) }
        eventData.value = [...(res[4] || [])]
        targetStatusData.value = [...(res[5] || [])]
        circleConnectorData.value = {...res[6]}
      })
      .finally(() => {
        loading.value = false
      })
  }

  // 初始化默认图层
  function initDefaultLayers() {
    // 清空现有图层
    globalLayerManager.clear()

    // 创建目标基础数据图层
    const targetBaseLayer = globalLayerManager.createLayer({
      name: '数据卡片1',
      zIndex: 1,
      visible: false,
    })
    // targetBaseLayer.updateAllData({
    //   targets: targetBaseData.value,
    //   points: targetLocationData.value.slice(0, 20),
    //   relations: relationData.value.slice(0, 6),
    // })

    // 创建目标位置数据图层
    const targetLocationLayer = globalLayerManager.createLayer({
      name: '数据卡片2',
      zIndex: 2,
      visible: false,
    })
    // targetLocationLayer.updateAllData({
    //   targets: targetBaseData.value,
    //   points: targetLocationData.value.slice(20),
    //   relations: relationData.value.slice(6),
    // })

    // 创建关系连线图层
    const relationLayer = globalLayerManager.createLayer({
      name: '轨迹数据',
      zIndex: 3,
      visible: false,
    })
    // relationLayer.updateAllData({
    //   targets: targetBaseData.value,
    //   trajectories: trajectoryData.value,
    // })
    // 创建圆环连接器数据图层
    const circleConnectorLayer = globalLayerManager.createLayer({
      name: '圆环连接器',
      zIndex: 4,
      visible: true,
    })

    // 设置显示控制 - 启用关系连线显示
    circleConnectorLayer.setShowControl('showRelation', true)

    circleConnectorLayer.updateAllData({
      targets: circleConnectorData.value.targets || [],
      points: circleConnectorData.value.points || [],
      relations: circleConnectorData.value.relations || [],
      trajectories: {...circleConnectorData.value.trajectories}  || [],
    })

    // 全数据图层
    const allDataLayer = globalLayerManager.createLayer({
      name: '全数据',
      zIndex: 5,
      visible: false,
    })

    // allDataLayer.updateAllData({
    //   targets: targetBaseData.value,
    //   trajectories: trajectoryData.value,
    //   points: targetLocationData.value,
    //   relations: relationData.value,
    //   events: eventData.value,
    //   targetStatuses: targetStatusData.value,
    // })

    // 全局时间轴更新
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
    initDefaultLayers,
    getLayerManager,
    // 变量
    layers,
    activeLayerId,
    activeLayer,
    globalLayerManager,
    targetBaseData,
    targetLocationData,
    relationData,
    targetStatusData,
    eventData,
    trajectoryData,
    circleConnectorData,
    loading,
  }
})
