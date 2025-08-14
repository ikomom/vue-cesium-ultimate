import { defineStore } from 'pinia'
import {
  getTargetBaseData,
  getTargetLocationData,
  getRelationData,
  getShipTrajectoryData,
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
  // 轨迹数据
  const trajectoryData = ref({})
  const loading = ref(false)

  function init() {
    loading.value = true
    // 初始化地图
    return Promise.all([
      getTargetBaseData(),
      getTargetLocationData(),
      getRelationData(),
      getShipTrajectoryData(),
    ])
      .then((res) => {
        targetBaseData.value = [...(res[0] || [])]
        targetLocationData.value = [...(res[1] || [])]
        relationData.value = [...(res[2] || [])]
        trajectoryData.value = { ...(res[3] || {}) }

        // 初始化默认图层
        initDefaultLayers()
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
    targetBaseLayer.updateAllData({
      targets: targetBaseData.value,
      points: targetLocationData.value.slice(0, 20),
      relations: relationData.value.slice(0, 6),
    })

    // 创建目标位置数据图层
    const targetLocationLayer = globalLayerManager.createLayer({
      name: '数据卡片2',
      zIndex: 2,
      visible: false,
    })
    targetLocationLayer.updateAllData({
      targets: targetBaseData.value,
      points: targetLocationData.value.slice(20),
      relations: relationData.value.slice(6),
    })

    // 创建关系连线图层
    const relationLayer = globalLayerManager.createLayer({
      name: '轨迹数据',
      zIndex: 3,
      visible: false,
    })
    relationLayer.updateAllData({
      targets: targetBaseData.value,
      trajectories: trajectoryData.value,
    })
    // 全数据图层
    const allDataLayer = globalLayerManager.createLayer({
      name: '全数据',
      zIndex: 4,
      visible: true,
    })
    allDataLayer.updateAllData({
      targets: targetBaseData.value,
      trajectories: trajectoryData.value,
      points: targetLocationData.value,
      relations: relationData.value,
    })
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
    trajectoryData,
    loading,
  }
})
