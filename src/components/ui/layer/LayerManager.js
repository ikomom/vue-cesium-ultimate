import { DataManagerFactory } from '@/components/ui/sanbox/manager'
import { reactive, ref } from 'vue'

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
    })

    // 将响应式属性绑定到实例
    this.name = layerState.name
    this.visible = layerState.visible
    this.zIndex = layerState.zIndex
    this._state = layerState

    // 图层数据
    this.data = reactive({
      points: [],
      targets: [],
      relations: [],
      trajectories: {},
      events: [],
    })

    // 显示控制
    this.showControls = reactive({
      showPoints: true,
      showRelation: true,
      showTrajectory: true,
      showEvents: true,
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
    return `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

    // 遍历传入的数据对象
    Object.keys(dataObject).forEach((key) => {
      // 只更新data对象中存在的key
      if (this.data.hasOwnProperty(key)) {
        this.data[key] = dataObject[key]
        // 同步到数据管理器
        this.syncToDataManager(key, dataObject[key])
        hasUpdated = true
        console.log(
          `📊 图层 [${this.name}] 更新 ${this.getDataTypeDisplayName(key)}: ${dataObject[key].length} 项`,
        )
      } else {
        console.warn(`⚠️ 图层 [${this.name}] 数据类型 ${key} 不存在，跳过更新`)
      }
    })

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
    }
    return displayNames[dataType] || dataType
  }

  /**
   * 同步数据到数据管理器
   */
  syncToDataManager(dataType, data) {
    switch (dataType) {
      case 'targets':
        this.dataManager.targetBaseManager.updateData(data)
        break
      case 'points':
        this.dataManager.targetLocationManager.updateData(data)
        break
      case 'relations':
        this.dataManager.relationManager.updateData(data)
        break
      case 'trajectories':
        this.dataManager.trajectoryManager.updateData(data)
        break
      default:
        console.warn(`⚠️ 图层 [${this.name}] 未知的数据类型: ${dataType}`)
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
   * 获取图层信息
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      visible: this.visible,
      zIndex: this.zIndex,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      dataCount: {
        points: this.data.points.length,
        targets: this.data.targets.length,
        relations: this.data.relations.length,
        trajectories: Object.keys(this.data.trajectories).length,
        events: this.data.events.length,
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
  }

  /**
   * 创建图层
   */
  createLayer(options = {}) {
    const layer = new Layer(options)
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

    console.log(`🗑️ 图层删除成功: [${layer.name}] ID: ${layerId}`)
    return true
  }

  /**
   * 获取图层
   */
  getLayer(layerId) {
    return this.layers.get(layerId)
  }

  /**
   * 根据图层ID更新图层数据
   */
  updateLayerData(layerId, dataType, newData) {
    const layer = this.layers.get(layerId)
    if (!layer) {
      console.warn(`⚠️ 图层不存在: ID ${layerId}`)
      return false
    }

    return layer.updateData(dataType, newData)
  }

  /**
   * 根据图层ID批量更新图层数据
   */
  updateLayerDataBatch(layerId, dataUpdates) {
    const layer = this.layers.get(layerId)
    if (!layer) {
      console.warn(`⚠️ 图层不存在: ID ${layerId}`)
      return false
    }

    let success = true
    Object.entries(dataUpdates).forEach(([dataType, newData]) => {
      const result = layer.updateData(dataType, newData)
      if (!result) {
        success = false
      }
    })

    return success
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
   */
  setLayersVisible(layerIds, visible) {
    layerIds.forEach((layerId) => {
      const layer = this.layers.get(layerId)
      if (layer) {
        layer.setVisible(visible)
      }
    })
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
      })

      // 恢复显示控制
      Object.assign(layer.showControls, layerConfig.showControls)
    })

    // 恢复活动图层
    if (config.activeLayerId && this.layers.has(config.activeLayerId)) {
      this.activeLayerId.value = config.activeLayerId
    }

    console.log('图层配置导入成功')
    return true
  }
}

// 默认导出
export default LayerManager
