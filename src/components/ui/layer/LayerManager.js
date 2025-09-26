import { DataManagerFactory } from '@/components/ui/sanbox/manager'
import { reactive, ref } from 'vue'
import { v4 as uuidV4 } from 'uuid'

export const LAYER_DATA_TYPE = {
  POINTS: 'points',
  TARGETS: 'targets',
  RELATIONS: 'relations',
  TRAJECTORIES: 'trajectories',
  EVENTS: 'events',
  TARGET_STATUS: 'targetStatuses',
  FUSION_LINES: 'fusionLines',
}

/**
 * 单个图层类
 */
export class Layer {
  constructor(options = {}) {
    this.id = options.id || this.generateId()

    // 使用响应式对象存储图层属性
    const layerState = reactive({
      name: options.name || `图层_${this.id}`,
      visible: options.visible !== undefined ? options.visible : true,
      zIndex: options.zIndex || 0,
      startTime: options.startTime || null,
      endTime: options.endTime || null,
    })

    // 将响应式属性绑定到实例
    this.name = layerState.name
    this.visible = layerState.visible
    this.zIndex = layerState.zIndex
    this.startTime = layerState.startTime
    this.endTime = layerState.endTime
    this._state = layerState
    this.viewer = options.viewer

    // 图层数据
    this.data = reactive({
      points: [],
      targets: [],
      relations: [],
      trajectories: {},
      events: [],
      targetStatuses: [],
      fusionLines: [],
    })

    // 显示控制
    this.showControls = reactive({
      showPoints: true,
      showRelation: false,
      showTrajectory: true,
      showEvents: false,
      showTargetStatus: true,
      showRings: true,
      showVirtualNodes: true,
      showVirtualRelations: true,
      showFusionLines: true,
    })

    // 每个图层都有自己的数据管理器
    this.dataManager = new DataManagerFactory()

    // 创建时间
    this.createdAt = new Date()
    this.updatedAt = new Date()
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return uuidV4()
  }

  /**
   * 更新图层数据
   */
  updateData(dataType, newData) {
    if (!this.data.hasOwnProperty(dataType)) {
      console.warn(`图层数据类型 ${dataType} 不存在`)
      return false
    }

    this.data[dataType] = newData
    this.updatedAt = new Date()

    // 同步更新到对应的数据管理器
    this.syncToDataManager(dataType, newData)

    return true
  }

  /**
   * 批量更新数据
   * @param {Object} dataObject - 包含要更新的数据的对象，key必须与data对象的key匹配
   */
  updateAllData(dataObject) {
    if (!dataObject || typeof dataObject !== 'object') {
      console.warn('updateAllData: 参数必须是一个对象')
      return false
    }

    let hasUpdated = false

    console.group(`📊 更新图层 [${this.name}] 数据`)
    // 遍历传入的数据对象
    Object.keys(dataObject).forEach((key) => {
      // 只更新data对象中存在的key
      if (this.data.hasOwnProperty(key)) {
        this.data[key] = dataObject[key]
        // 同步到数据管理器
        this.syncToDataManager(key, dataObject[key])
        hasUpdated = true
        // 根据数据类型显示不同的统计信息
        if (key === 'trajectories') {
          const trajectoryCount = Object.keys(dataObject[key]).length
          console.log(`${this.getDataTypeDisplayName(key)}: ${trajectoryCount} 个目标轨迹`)
        } else {
          console.log(`${this.getDataTypeDisplayName(key)}: ${dataObject[key].length} 项`)
        }
      } else {
        console.warn(`⚠️ 数据类型 ${key} 不存在，跳过更新`)
      }
    })
    console.groupEnd()

    if (hasUpdated) {
      this.updatedAt = new Date()
    }

    return hasUpdated
  }

  /**
   * 获取数据类型的显示名称
   */
  getDataTypeDisplayName(dataType) {
    const displayNames = {
      targets: '目标数据',
      points: '点位数据',
      relations: '关系数据',
      trajectories: '轨迹数据',
      events: '事件数据',
      targetStatuses: '目标状态数据',
      fusionLines: '融合线数据',
    }
    return displayNames[dataType] || dataType
  }

  /**
   * 同步数据到数据管理器
   */
  syncToDataManager(dataType, data) {
    switch (dataType) {
      case LAYER_DATA_TYPE.TARGETS:
        this.dataManager.targetBaseManager.updateData(data)
        break
      case LAYER_DATA_TYPE.POINTS:
        this.dataManager.targetLocationManager.updateData(data)
        break
      case LAYER_DATA_TYPE.RELATIONS:
        this.dataManager.relationManager.updateData(data)
        break
      case LAYER_DATA_TYPE.TRAJECTORIES:
        this.dataManager.trajectoryManager.updateData(data)
        // 轨迹数据更新时，同时更新时间轴
        // this.updateTimelineFromTrajectories()
        break
      case LAYER_DATA_TYPE.EVENTS:
        this.dataManager.eventManager.updateData(data)
        break
      case LAYER_DATA_TYPE.TARGET_STATUS:
        this.dataManager.targetStatusManager.updateData(data)
        break
      case LAYER_DATA_TYPE.FUSION_LINES:
        this.dataManager.fusionLineManager.updateData(data)
        break
      default:
        console.warn(`⚠️ 图层 [${this.name}] 未知的数据类型: ${dataType}`)
    }
  }

  /**
   * 从轨迹数据更新时间轴
   * @deprecated 从全局数据管理器获取时间范围
   */
  updateTimelineFromTrajectories() {
    if (!this.viewer) {
      console.warn('Cesium viewer 未初始化，无法更新时间轴')
      return
    }

    // 获取当前图层的时间范围
    const timeRange = this.dataManager.trajectoryManager.getTimeRange()

    if (!timeRange || !timeRange.start || !timeRange.end) {
      console.log(`图层 [${this.name}] 没有有效的轨迹时间数据`)
      return
    }

    try {
      // 转换时间格式
      const startTimeStr =
        typeof timeRange.start === 'string' ? timeRange.start : String(timeRange.start)
      const endTimeStr = typeof timeRange.end === 'string' ? timeRange.end : String(timeRange.end)

      const startTime = this.Cesium.JulianDate.fromIso8601(startTimeStr)
      const endTime = this.Cesium.JulianDate.fromIso8601(endTimeStr)
      const currentTime = new Date()
      const cesiumCurrentTime = this.Cesium.JulianDate.fromDate(currentTime)

      // 更新Cesium时间轴
      this.viewer.clock.startTime = startTime
      this.viewer.clock.stopTime = endTime
      // 设置当前时间为实际当前时间，如果在范围内则使用当前时间，否则使用开始时间
      if (
        Cesium.JulianDate.greaterThanOrEquals(cesiumCurrentTime, startTime) &&
        Cesium.JulianDate.lessThanOrEquals(cesiumCurrentTime, endTime)
      ) {
        this.viewer.clock.currentTime = cesiumCurrentTime
      } else {
        this.viewer.clock.currentTime = startTime
      }
      this.viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP
      this.viewer.clock.multiplier = 1

      // 设置时间轴范围
      if (this.viewer.timeline) {
        this.viewer.timeline.zoomTo(startTime, endTime)
      }

      console.log(`✅ 图层 [${this.name}] 时间轴更新完成:`, {
        start: startTimeStr,
        end: endTimeStr,
        currentTime: currentTime.toISOString(),
      })
    } catch (error) {
      console.warn(`⚠️ 图层 [${this.name}] 时间轴设置失败:`, error, timeRange)
    }
  }

  /**
   * 设置显示控制
   */
  setShowControl(controlType, visible) {
    if (this.showControls.hasOwnProperty(controlType)) {
      this.showControls[controlType] = visible
      this.updatedAt = new Date()
      return true
    }
    return false
  }

  /**
   * 设置图层可见性
   */
  setVisible(visible) {
    this._state.visible = visible
    this.visible = visible
    this.updatedAt = new Date()
  }

  /**
   * 设置图层层级
   */
  setZIndex(zIndex) {
    this._state.zIndex = zIndex
    this.zIndex = zIndex
    this.updatedAt = new Date()
  }

  /**
   * 设置图层名称
   */
  setName(name) {
    this._state.name = name
    this.name = name
    this.updatedAt = new Date()
  }

  /**
   * 设置图层开始时间
   */
  setStartTime(startTime) {
    this._state.startTime = startTime
    this.startTime = startTime
    this.updatedAt = new Date()
  }

  /**
   * 设置图层结束时间
   */
  setEndTime(endTime) {
    this._state.endTime = endTime
    this.endTime = endTime
    this.updatedAt = new Date()
  }

  /**
   * 设置图层时间范围
   */
  setTimeRange(startTime, endTime) {
    this._state.startTime = startTime
    this._state.endTime = endTime
    this.startTime = startTime
    this.endTime = endTime
    this.updatedAt = new Date()
  }

  /**
   * 获取图层信息
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      visible: this.visible,
      zIndex: this.zIndex,
      startTime: this.startTime,
      endTime: this.endTime,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      dataCount: {
        points: this.data.points.length,
        targets: this.data.targets.length,
        relations: this.data.relations.length,
        trajectories: Object.keys(this.data.trajectories).length,
        events: this.data.events.length,
        fusionLines: this.data.fusionLines.length,
      },
    }
  }

  /**
   * 销毁图层
   */
  destroy() {
    // 清空数据
    Object.keys(this.data).forEach((key) => {
      if (Array.isArray(this.data[key])) {
        this.data[key] = []
      } else {
        this.data[key] = {}
      }
    })

    // 清空数据管理器
    this.dataManager = null
  }
}

/**
 * 图层管理器类
 */
export class LayerManager {
  constructor() {
    this.layers = reactive(new Map())
    this.activeLayerId = ref(null)
    this.viewer = null
    
    // 全局数据存储 - 使用reactive使其响应式
    this.globalData = reactive({
      targetBaseData: [],
      targetLocationData: [],
      relationData: [],
      targetStatusData: [],
      eventData: [],
      trajectoryData: {},
      circleConnectorData: {
        targets: [],
        points: [],
        relations: [],
        trajectories: {}
      },
      fusionLineData: [],
      timeRange: {
        startTime: null,
        endTime: null
      },
      loading: false
    })
  }

  setViewer(viewer) {
    this.viewer = viewer
  }

  /**
   * 创建图层
   * @param {Object} options 图层选项
   * @returns {Layer} 图层对象
   */
  createLayer(options = {}) {
    const layer = new Layer({
      ...options,
      viewer: this.viewer,
    })
    this.layers.set(layer.id, layer)

    // 如果是第一个图层，设为活动图层
    if (this.layers.size === 1) {
      this.activeLayerId.value = layer.id
    }

    console.log(`✅ 图层创建成功: [${layer.name}] ID: ${layer.id}`)
    return layer
  }

  /**
   * 删除图层
   * @param {string} layerId 图层ID
   * @returns {boolean} 是否删除成功
   */
  removeLayer(layerId) {
    const layer = this.layers.get(layerId)
    if (!layer) {
      console.warn(`⚠️ 图层不存在: ID ${layerId}`)
      return false
    }

    // 销毁图层
    layer.destroy()

    // 从管理器中移除
    this.layers.delete(layerId)

    // 如果删除的是活动图层，重新设置活动图层
    if (this.activeLayerId.value === layerId) {
      const remainingLayers = Array.from(this.layers.keys())
      this.activeLayerId.value = remainingLayers.length > 0 ? remainingLayers[0] : null
    }
    // 图层删除后，重新计算全局时间轴
    this.updateGlobalTimeline()

    console.log(`🗑️ 图层删除成功: [${layer.name}] ID: ${layerId}`)
    return true
  }

  /**
   * 获取图层
   * @param {string} layerId 图层ID
   * @returns {Layer} 图层对象
   */
  getLayer(layerId) {
    return this.layers.get(layerId)
  }

  /**
   * 根据图层ID更新图层数据
   * @param {string} layerId 图层ID
   * @param {LAYER_DATA_TYPE} dataType 数据类型
   * @param {Object} newData 新数据
   * @returns {boolean} 是否更新成功
   */
  updateLayerData(layerId, dataType, newData) {
    const layer = this.layers.get(layerId)
    if (!layer) {
      console.warn(`⚠️ 图层不存在: ID ${layerId}`)
      return false
    }
    const success = layer.updateData(dataType, newData)
    if (success) {
      if (dataType === LAYER_DATA_TYPE.TRAJECTORIES) {
        // 轨迹数据更新后，重新计算全局时间轴
        this.updateGlobalTimeline()
      }
    }
    return
  }

  /**
   * 批量更新图层数据
   * @param {string} layerId 图层ID
   * @param {object} dataUpdates 数据更新对象
   * @returns {boolean} 是否更新成功
   */
  updateLayerDataBatch(layerId, dataUpdates) {
    const layer = this.layers.get(layerId)
    if (!layer) {
      console.warn(`⚠️ 图层不存在: ID ${layerId}`)
      return false
    }
    return layer.updateAllData(dataUpdates)
  }

  /**
   * 获取所有图层
   */
  getAllLayers() {
    return Array.from(this.layers.values())
  }

  /**
   * 获取可见图层
   */
  getVisibleLayers() {
    return Array.from(this.layers.values()).filter((layer) => layer.visible)
  }

  /**
   * 按层级排序获取图层
   */
  getLayersByZIndex() {
    return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex)
  }

  /**
   * 设置活动图层
   * @param {string} layerId 图层ID
   * @returns {boolean} 是否设置成功
   */
  setActiveLayer(layerId) {
    if (this.layers.has(layerId)) {
      this.activeLayerId.value = layerId
      return true
    }
    console.warn(`图层 ${layerId} 不存在`)
    return false
  }

  /**
   * 获取活动图层
   */
  getActiveLayer() {
    return this.activeLayerId.value ? this.layers.get(this.activeLayerId.value) : null
  }

  /**
   * 批量设置图层可见性
   * @param {string[]} layerIds 图层ID数组
   * @param {boolean} visible 可见性
   */
  setLayersVisible(layerIds, visible) {
    layerIds.forEach((layerId) => {
      const layer = this.layers.get(layerId)
      if (layer) {
        layer.setVisible(visible)
      }
    })
    // 图层可见性变化后，重新计算全局时间轴
    this.updateGlobalTimeline()
  }

  /**
   * 显示所有图层
   */
  showAllLayers() {
    this.layers.forEach((layer) => {
      layer.setVisible(true)
    })
  }

  /**
   * 隐藏所有图层
   */
  hideAllLayers() {
    this.layers.forEach((layer) => {
      layer.setVisible(false)
    })
  }

  /**
   * 获取图层统计信息
   */
  getStatistics() {
    const totalLayers = this.layers.size
    const visibleLayers = this.getVisibleLayers().length
    const hiddenLayers = totalLayers - visibleLayers

    return {
      totalLayers,
      visibleLayers,
      hiddenLayers,
      activeLayerId: this.activeLayerId.value,
    }
  }

  /**
   * 清空所有图层
   */
  clear() {
    this.layers.forEach((layer) => {
      layer.destroy()
    })
    this.layers.clear()
    this.activeLayerId.value = null
    console.log('所有图层已清空')
  }

  /**
   * 导出图层配置
   */
  exportConfig() {
    const config = {
      layers: [],
      activeLayerId: this.activeLayerId.value,
      exportTime: new Date().toISOString(),
    }

    this.layers.forEach((layer) => {
      config.layers.push({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        zIndex: layer.zIndex,
        showControls: { ...layer.showControls },
        createdAt: layer.createdAt,
        updatedAt: layer.updatedAt,
      })
    })

    return config
  }

  /**
   * 导入图层配置
   * @param {Object} config 图层配置对象
   * @returns {boolean} 是否导入成功
   */
  importConfig(config) {
    if (!config || !config.layers) {
      console.warn('无效的图层配置')
      return false
    }

    // 清空现有图层
    this.clear()

    // 重建图层
    config.layers.forEach((layerConfig) => {
      const layer = this.createLayer({
        id: layerConfig.id,
        name: layerConfig.name,
        visible: layerConfig.visible,
        zIndex: layerConfig.zIndex,
        viewer: this.viewer,
      })

      // 恢复显示控制
      Object.assign(layer.showControls, layerConfig.showControls)
    })

    // 恢复活动图层
    if (config.activeLayerId && this.layers.has(config.activeLayerId)) {
      this.activeLayerId.value = config.activeLayerId
    }

    // 导入完成后，重新计算全局时间轴
    this.updateGlobalTimeline()

    console.log('图层配置导入成功')
    return true
  }

  /**
   * 更新全局数据
   * @param {string} dataType - 数据类型
   * @param {any} data - 数据
   */
  updateGlobalData(dataType, data) {
    if (this.globalData.hasOwnProperty(dataType)) {
      this.globalData[dataType] = data
      console.log(`🔄 全局数据更新: ${dataType}`, data?.length || Object.keys(data || {}).length)
      return true
    }
    console.warn(`⚠️ 未知的全局数据类型: ${dataType}`)
    return false
  }

  /**
   * 批量更新全局数据
   * @param {Object} dataUpdates - 数据更新对象
   */
  updateGlobalDataBatch(dataUpdates) {
    if (!dataUpdates || typeof dataUpdates !== 'object') {
      console.warn('updateGlobalDataBatch: 参数必须是一个对象')
      return false
    }

    let hasUpdated = false
    console.group('📊 批量更新全局数据')
    
    Object.keys(dataUpdates).forEach((key) => {
      if (this.globalData.hasOwnProperty(key)) {
        this.globalData[key] = dataUpdates[key]
        hasUpdated = true
        
        if (key === 'trajectoryData') {
          const trajectoryCount = Object.keys(dataUpdates[key]).length
          console.log(`${key}: ${trajectoryCount} 个目标轨迹`)
        } else if (typeof dataUpdates[key] === 'object' && dataUpdates[key].length !== undefined) {
          console.log(`${key}: ${dataUpdates[key].length} 项`)
        } else {
          console.log(`${key}: 已更新`)
        }
      } else {
        console.warn(`⚠️ 全局数据类型 ${key} 不存在，跳过更新`)
      }
    })
    
    console.groupEnd()
    return hasUpdated
  }

  /**
   * 获取全局数据
   * @param {string} dataType - 数据类型
   * @returns {any} 数据
   */
  getGlobalData(dataType) {
    return this.globalData[dataType]
  }

  /**
   * 获取所有全局数据
   * @returns {Object} 所有全局数据
   */
  getAllGlobalData() {
    return this.globalData
  }

  /**
   * 设置全局时间范围
   * @param {string} startTime - 开始时间
   * @param {string} endTime - 结束时间
   */
  setGlobalTimeRange(startTime, endTime) {
    this.globalData.timeRange.startTime = startTime
    this.globalData.timeRange.endTime = endTime
    console.log('🕒 全局时间范围已更新:', { startTime, endTime })
  }

  /**
   * 获取全局时间范围
   * @returns {Object} 时间范围对象
   */
  getGlobalTimeRange() {
    return this.globalData.timeRange
  }

  /**
   * 设置全局加载状态
   * @param {boolean} loading - 加载状态
   */
  setGlobalLoading(loading) {
    this.globalData.loading = loading
  }

  /**
   * 获取全局加载状态
   * @returns {boolean} 加载状态
   */
 /**
   * 更新全局时间轴
   * 统一管理所有图层的时间轴范围
   */
  updateGlobalTimeline() {
    if (!this.viewer) {
      console.warn('Cesium viewer 未初始化，无法更新全局时间轴')
      return
    }

    // 获取所有可见图层的时间范围
    const visibleLayers = this.getVisibleLayers()
    const timeRanges = []

    visibleLayers.forEach((layer) => {
      // 获取轨迹时间范围
      const trajectoryTimeRange = layer.dataManager.trajectoryManager.getTimeRange()
      if (trajectoryTimeRange && trajectoryTimeRange.start && trajectoryTimeRange.end) {
        timeRanges.push(trajectoryTimeRange)
      }

      // 获取事件时间范围
      const eventTimeRange = layer.dataManager.eventManager.getTimeRange()
      if (eventTimeRange && eventTimeRange.start && eventTimeRange.end) {
        timeRanges.push(eventTimeRange)
      }

      // 获取目标状态时间范围
      const targetStatusTimeRange = layer.dataManager.targetStatusManager.getTimeRange()

      if (targetStatusTimeRange && targetStatusTimeRange.start && targetStatusTimeRange.end) {
        timeRanges.push(targetStatusTimeRange)
      }
    })

    if (timeRanges.length === 0) {
      console.log('没有可用的轨迹、事件或目标状态时间数据，跳过全局时间轴更新')
      return
    }

    try {
      // 计算全局时间范围
      let globalStart = timeRanges[0].start
      let globalEnd = timeRanges[0].end

      timeRanges.forEach((range) => {
        if (range.start < globalStart) {
          globalStart = range.start
        }
        if (range.end > globalEnd) {
          globalEnd = range.end
        }
      })

      // 转换时间格式
      const startTimeStr = typeof globalStart === 'string' ? globalStart : String(globalStart)
      const endTimeStr = typeof globalEnd === 'string' ? globalEnd : String(globalEnd)

      const startTime = Cesium.JulianDate.fromIso8601(startTimeStr)
      const endTime = Cesium.JulianDate.fromIso8601(endTimeStr)
      const currentTime = new Date()
      const cesiumCurrentTime = Cesium.JulianDate.fromDate(currentTime)

      // 更新Cesium时间轴
      this.viewer.clock.startTime = startTime
      this.viewer.clock.stopTime = endTime

      // 设置当前时间
      if (
        Cesium.JulianDate.greaterThanOrEquals(cesiumCurrentTime, startTime) &&
        Cesium.JulianDate.lessThanOrEquals(cesiumCurrentTime, endTime)
      ) {
        this.viewer.clock.currentTime = cesiumCurrentTime
      } else {
        this.viewer.clock.currentTime = startTime
      }

      this.viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP
      this.viewer.clock.multiplier = 1

      // 设置时间轴范围
      if (this.viewer.timeline) {
        this.viewer.timeline.zoomTo(startTime, endTime)
      }

      console.log(`✅ 全局时间轴更新完成:`, {
        start: startTimeStr,
        end: endTimeStr,
        layerCount: visibleLayers.length,
      })
    } catch (error) {
      console.warn(`⚠️ 全局时间轴设置失败:`, error)
    }
  }
}

// 默认导出
export default LayerManager
