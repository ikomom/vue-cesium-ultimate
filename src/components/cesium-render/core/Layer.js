/**
 * 图层类 - 管理单个图层的数据和渲染
 * 支持大数据渲染、动态更新、LOD和视锥剔除
 */

import * as Cesium from 'cesium'

class Layer {
  constructor(layerId, renderEngine, options = {}) {
    this.layerId = layerId
    this.renderEngine = renderEngine
    this.viewer = renderEngine.viewer

    // 图层配置
    this.options = {
      visible: true,
      zIndex: 0,
      enableLOD: true,
      enableCulling: true,
      maxDistance: 10000000, // 最大可见距离
      minPixelSize: 1, // 最小像素大小
      ...options,
    }

    // 数据管理
    this.dataManager = null
    this.entities = new Map() // 实体映射 dataId -> entity
    this.entityGroups = new Map() // 实体分组管理

    // 渲染状态
    this.renderState = {
      needsUpdate: false,
      lastUpdateTime: null,
      visibleEntities: new Set(),
      culledEntities: new Set(),
    }

    // 时间管理
    this.timeRange = { start: null, end: null }
    this.currentTime = null

    // 性能统计
    this.stats = {
      totalEntities: 0,
      visibleEntities: 0,
      renderedEntities: 0,
      lastFrameTime: 0,
    }

    // 事件处理器
    this.eventHandlers = new Map()

    this.init()
  }

  /**
   * 初始化图层
   */
  init() {
    // 创建图层专用的实体集合
    this.entityCollection = new Cesium.EntityCollection()

    // 监听数据变化
    this.setupDataListeners()
  }

  /**
   * 设置数据管理器
   * @param {Object} dataManager - 数据管理器实例
   */
  setDataManager(dataManager) {
    this.dataManager = dataManager
    this.setupDataListeners()
    this.markNeedsUpdate()
  }

  /**
   * 设置数据监听器
   */
  setupDataListeners() {
    if (!this.dataManager) return

    // 监听数据变化事件
    this.dataManager.on?.('dataChanged', this.onDataChanged.bind(this))
    this.dataManager.on?.('dataAdded', this.onDataAdded.bind(this))
    this.dataManager.on?.('dataRemoved', this.onDataRemoved.bind(this))
    this.dataManager.on?.('dataUpdated', this.onDataUpdated.bind(this))
  }

  /**
   * 数据变化处理
   * @param {Object} event - 数据变化事件
   */
  onDataChanged(event) {
    this.markNeedsUpdate()
    this.emit('dataChanged', event)
  }

  /**
   * 数据添加处理
   * @param {Object} data - 新增数据
   */
  onDataAdded(data) {
    this.createEntityFromData(data)
    this.stats.totalEntities++
    this.emit('dataAdded', data)
  }

  /**
   * 数据移除处理
   * @param {string} dataId - 数据ID
   */
  onDataRemoved(dataId) {
    this.removeEntity(dataId)
    this.stats.totalEntities--
    this.emit('dataRemoved', dataId)
  }

  /**
   * 数据更新处理
   * @param {Object} data - 更新的数据
   */
  onDataUpdated(data) {
    this.updateEntityFromData(data)
    this.emit('dataUpdated', data)
  }

  /**
   * 从数据创建实体
   * @param {Object} data - 数据对象
   * @returns {Cesium.Entity} 创建的实体
   */
  createEntityFromData(data) {
    const entityId = `${this.layerId}_${data.id}`

    // 检查实体是否已存在
    if (this.entities.has(data.id)) {
      return this.updateEntityFromData(data)
    }

    // 创建实体配置
    const entityConfig = this.buildEntityConfig(data)

    // 创建实体
    const entity = new Cesium.Entity({
      id: entityId,
      ...entityConfig,
    })

    // 添加到集合
    this.entityCollection.add(entity)
    this.entities.set(data.id, entity)

    // 设置实体的数据引用
    entity._layerData = data
    entity._layerId = this.layerId

    // 添加事件监听
    this.setupEntityEvents(entity)

    return entity
  }

  /**
   * 构建实体配置
   * @param {Object} data - 数据对象
   * @returns {Object} 实体配置
   */
  buildEntityConfig(data) {
    const config = {}

    // 位置配置
    if (data.position) {
      config.position = this.createPositionProperty(data)
    }

    // 图标配置
    if (data.billboard || data.icon) {
      config.billboard = this.createBillboardConfig(data)
    }

    // 模型配置
    if (data.model) {
      config.model = this.createModelConfig(data)
    }

    // 标签配置
    if (data.label) {
      config.label = this.createLabelConfig(data)
    }

    // 点配置
    if (data.point) {
      config.point = this.createPointConfig(data)
    }

    // 路径配置
    if (data.path) {
      config.path = this.createPathConfig(data)
    }

    // 多边形配置
    if (data.polygon) {
      config.polygon = this.createPolygonConfig(data)
    }

    // 线条配置
    if (data.polyline) {
      config.polyline = this.createPolylineConfig(data)
    }

    // 属性
    if (data.properties) {
      config.properties = data.properties
    }

    return config
  }

  /**
   * 创建位置属性
   * @param {Object} data - 数据对象
   * @returns {Cesium.Property} 位置属性
   */
  createPositionProperty(data) {
    if (data.trajectory && Array.isArray(data.trajectory)) {
      // 轨迹数据 - 使用SampledPositionProperty
      const property = new Cesium.SampledPositionProperty()

      data.trajectory.forEach((point) => {
        const time = Cesium.JulianDate.fromIso8601(point.time)
        const position = Cesium.Cartesian3.fromDegrees(
          point.longitude,
          point.latitude,
          point.height || 0,
        )
        property.addSample(time, position)
      })

      return property
    } else if (data.position) {
      // 静态位置
      if (typeof data.position.longitude !== 'undefined') {
        return Cesium.Cartesian3.fromDegrees(
          data.position.longitude,
          data.position.latitude,
          data.position.height || 0,
        )
      } else {
        return data.position
      }
    }

    return undefined
  }

  /**
   * 创建图标配置
   * @param {Object} data - 数据对象
   * @returns {Object} 图标配置
   */
  createBillboardConfig(data) {
    const billboardData = data.billboard || data.icon || {}

    const config = {
      image: billboardData.image || '/icons/default.svg',
      scale: billboardData.scale || 1.0,
      color: billboardData.color
        ? Cesium.Color.fromCssColorString(billboardData.color)
        : Cesium.Color.WHITE,
      pixelOffset: billboardData.pixelOffset || new Cesium.Cartesian2(0, 0),
      eyeOffset: billboardData.eyeOffset || new Cesium.Cartesian3(0, 0, 0),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    }

    // LOD配置
    if (this.options.enableLOD) {
      config.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(
        0.0,
        this.options.maxDistance,
      )
      config.scaleByDistance = new Cesium.NearFarScalar(1000, 1.0, this.options.maxDistance, 0.1)
    }

    // 动态属性支持
    if (data.dynamicProperties) {
      this.applyDynamicProperties(config, data.dynamicProperties)
    }

    return config
  }

  /**
   * 创建标签配置
   * @param {Object} data - 数据对象
   * @returns {Object} 标签配置
   */
  createLabelConfig(data) {
    const labelData = data.label || {}

    return {
      text: labelData.text || data.name || data.id,
      font: labelData.font || '12pt sans-serif',
      fillColor: labelData.fillColor
        ? Cesium.Color.fromCssColorString(labelData.fillColor)
        : Cesium.Color.WHITE,
      outlineColor: labelData.outlineColor
        ? Cesium.Color.fromCssColorString(labelData.outlineColor)
        : Cesium.Color.BLACK,
      outlineWidth: labelData.outlineWidth || 1,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: labelData.pixelOffset || new Cesium.Cartesian2(0, -40),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      distanceDisplayCondition: this.options.enableLOD
        ? new Cesium.DistanceDisplayCondition(0.0, this.options.maxDistance / 2)
        : undefined,
    }
  }

  /**
   * 创建点配置
   * @param {Object} data - 数据对象
   * @returns {Object} 点配置
   */
  createPointConfig(data) {
    const pointData = data.point || {}

    return {
      pixelSize: pointData.pixelSize || 10,
      color: pointData.color
        ? Cesium.Color.fromCssColorString(pointData.color)
        : Cesium.Color.YELLOW,
      outlineColor: pointData.outlineColor
        ? Cesium.Color.fromCssColorString(pointData.outlineColor)
        : Cesium.Color.BLACK,
      outlineWidth: pointData.outlineWidth || 1,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      distanceDisplayCondition: this.options.enableLOD
        ? new Cesium.DistanceDisplayCondition(0.0, this.options.maxDistance)
        : undefined,
    }
  }

  /**
   * 创建路径配置
   * @param {Object} data - 数据对象
   * @returns {Object} 路径配置
   */
  createPathConfig(data) {
    const pathData = data.path || {}

    return {
      width: pathData.width || 2,
      material: pathData.material
        ? Cesium.Color.fromCssColorString(pathData.material)
        : Cesium.Color.CYAN,
      resolution: pathData.resolution || 60,
      leadTime: pathData.leadTime || 0,
      trailTime: pathData.trailTime || 3600,
    }
  }

  /**
   * 创建线条配置
   * @param {Object} data - 数据对象
   * @returns {Object} 线条配置
   */
  createPolylineConfig(data) {
    const polylineData = data.polyline || {}

    return {
      positions: polylineData.positions || [],
      width: polylineData.width || 2,
      material: polylineData.material
        ? Cesium.Color.fromCssColorString(polylineData.material)
        : Cesium.Color.WHITE,
      clampToGround: polylineData.clampToGround !== false,
    }
  }

  /**
   * 应用动态属性
   * @param {Object} config - 实体配置
   * @param {Object} dynamicProps - 动态属性配置
   */
  applyDynamicProperties(config, dynamicProps) {
    Object.keys(dynamicProps).forEach((key) => {
      const propConfig = dynamicProps[key]

      if (propConfig.type === 'callback') {
        config[key] = new Cesium.CallbackProperty(
          propConfig.callback,
          propConfig.isConstant || false,
        )
      } else if (propConfig.type === 'sampled') {
        const property = new Cesium.SampledProperty(propConfig.valueType || Cesium.Cartesian3)
        propConfig.samples.forEach((sample) => {
          property.addSample(Cesium.JulianDate.fromIso8601(sample.time), sample.value)
        })
        config[key] = property
      }
    })
  }

  /**
   * 设置实体事件监听
   * @param {Cesium.Entity} entity - 实体对象
   */
  setupEntityEvents(entity) {
    // 这里可以添加实体级别的事件监听
    // 例如点击、悬停等事件
  }

  /**
   * 更新实体数据
   * @param {Object} data - 更新的数据
   * @returns {Cesium.Entity} 更新的实体
   */
  updateEntityFromData(data) {
    const entity = this.entities.get(data.id)
    if (!entity) {
      return this.createEntityFromData(data)
    }

    // 更新实体配置
    const newConfig = this.buildEntityConfig(data)

    // 应用新配置到实体
    Object.keys(newConfig).forEach((key) => {
      entity[key] = newConfig[key]
    })

    // 更新数据引用
    entity._layerData = data

    return entity
  }

  /**
   * 移除实体
   * @param {string} dataId - 数据ID
   */
  removeEntity(dataId) {
    const entity = this.entities.get(dataId)
    if (entity) {
      this.entityCollection.remove(entity)
      this.entities.delete(dataId)
    }
  }

  /**
   * 设置时间范围
   * @param {Object} timeRange - 时间范围
   */
  setTimeRange(timeRange) {
    this.timeRange = timeRange
    this.markNeedsUpdate()
  }

  /**
   * 更新当前时间
   * @param {Cesium.JulianDate} time - 当前时间
   */
  updateTime(time) {
    this.currentTime = time

    // 更新时间相关的实体显示
    this.updateTimeBasedVisibility(time)
  }

  /**
   * 更新基于时间的可见性
   * @param {Cesium.JulianDate} time - 当前时间
   */
  updateTimeBasedVisibility(time) {
    if (!this.timeRange.start || !this.timeRange.end) return

    const timeStr = Cesium.JulianDate.toIso8601(time)
    const startStr = Cesium.JulianDate.toIso8601(this.timeRange.start)
    const endStr = Cesium.JulianDate.toIso8601(this.timeRange.end)

    for (const entity of this.entities.values()) {
      const data = entity._layerData

      // 检查实体是否在时间范围内
      let isVisible = true

      if (data.timeRange) {
        isVisible = timeStr >= data.timeRange.start && timeStr <= data.timeRange.end
      } else if (data.startTime) {
        isVisible = timeStr >= data.startTime && (!data.endTime || timeStr <= data.endTime)
      }

      entity.show = isVisible && this.options.visible
    }
  }

  /**
   * 执行视锥剔除
   * @param {Cesium.PerspectiveFrustum} frustum - 视锥体
   * @param {Cesium.Cartesian3} cameraPosition - 相机位置
   * @returns {number} 被剔除的实体数量
   */
  performCulling(frustum, cameraPosition) {
    if (!this.options.enableCulling) return 0

    this.renderState.visibleEntities.clear()
    this.renderState.culledEntities.clear()

    let culledCount = 0

    for (const entity of this.entities.values()) {
      const position = entity.position?.getValue(this.currentTime)
      if (!position) continue

      // 计算距离
      const distance = Cesium.Cartesian3.distance(cameraPosition, position)

      // 距离剔除
      if (distance > this.options.maxDistance) {
        this.renderState.culledEntities.add(entity)
        entity.show = false
        culledCount++
        continue
      }

      // 视锥剔除（简化版本）
      // 这里可以实现更复杂的视锥剔除算法

      this.renderState.visibleEntities.add(entity)
      entity.show = this.options.visible
    }

    // 更新统计信息
    this.stats.visibleEntities = this.renderState.visibleEntities.size

    return culledCount
  }

  /**
   * 标记需要更新
   */
  markNeedsUpdate() {
    this.renderState.needsUpdate = true
  }

  /**
   * 添加数据到图层
   * @param {Array|Object} data - 要添加的数据
   * @param {Object} options - 选项
   */
  async addData(data, options = {}) {
    try {
      const dataArray = Array.isArray(data) ? data : [data]

      for (const item of dataArray) {
        if (item && typeof item === 'object' && item.id) {
          this.createEntityFromData(item)
          this.stats.totalEntities++
        } else {
          console.warn('Invalid data item:', item)
        }
      }

      this.markNeedsUpdate()
      this.emit('dataAdded', { count: dataArray.length, data: dataArray })
    } catch (error) {
      console.error(`Failed to add data to layer ${this.layerId}:`, error)
      throw error
    }
  }

  /**
   * 更新图层数据
   * @param {Array|Object} data - 要更新的数据
   * @param {Object} options - 选项
   */
  async updateData(data, options = {}) {
    try {
      const dataArray = Array.isArray(data) ? data : [data]

      for (const item of dataArray) {
        if (item && typeof item === 'object' && item.id) {
          this.updateEntityFromData(item)
        } else {
          console.warn('Invalid data item for update:', item)
        }
      }

      this.markNeedsUpdate()
      this.emit('dataUpdated', { count: dataArray.length, data: dataArray })
    } catch (error) {
      console.error(`Failed to update data in layer ${this.layerId}:`, error)
      throw error
    }
  }

  /**
   * 移除图层数据
   * @param {Array|string} dataIds - 要移除的数据ID
   */
  async removeData(dataIds) {
    try {
      const idsArray = Array.isArray(dataIds) ? dataIds : [dataIds]

      for (const id of idsArray) {
        this.removeEntity(id)
        this.stats.totalEntities--
      }

      this.markNeedsUpdate()
      this.emit('dataRemoved', { count: idsArray.length, dataIds: idsArray })
    } catch (error) {
      console.error(`Failed to remove data from layer ${this.layerId}:`, error)
      throw error
    }
  }

  /**
   * 清空图层数据
   */
  clearData() {
    try {
      const entityCount = this.entities.size

      this.entityCollection.removeAll()
      this.entities.clear()

      this.stats.totalEntities = 0
      this.markNeedsUpdate()
      this.emit('dataCleared', { count: entityCount })
    } catch (error) {
      console.error(`Failed to clear data from layer ${this.layerId}:`, error)
      throw error
    }
  }

  /**
   * 获取图层数据
   * @returns {Array} 图层中的所有数据
   */
  getData() {
    const data = []
    for (const entity of this.entities.values()) {
      if (entity._layerData) {
        data.push(entity._layerData)
      }
    }
    return data
  }

  /**
   * 设置渲染顺序
   * @param {number} order - 渲染顺序
   */
  setRenderOrder(order) {
    this.options.zIndex = order
    // 这里可以添加实际的渲染顺序设置逻辑
  }

  /**
   * 处理图层交互事件
   * @param {string} sourceLayerId - 源图层ID
   * @param {string} event - 事件类型
   * @param {Object} data - 事件数据
   */
  onLayerInteraction(sourceLayerId, event, data) {
    // 处理来自其他图层的交互事件
    this.emit('layerInteraction', { sourceLayerId, event, data })
  }

  /**
   * 处理更新事件
   * @param {Object} update - 更新数据
   */
  processUpdate(update) {
    try {
      switch (update.type) {
        case 'data':
          this.updateEntityFromData(update.data)
          break
        case 'visibility':
          this.setVisible(update.data.visible)
          break
        case 'style':
          // 处理样式更新
          break
        default:
          console.warn(`Unknown update type: ${update.type}`)
      }
    } catch (error) {
      console.error(`Failed to process update for layer ${this.layerId}:`, error)
      throw error
    }
  }

  /**
   * 更新图层
   * 处理图层的渲染更新逻辑
   */
  update() {
    if (!this.renderState.needsUpdate) {
      return
    }

    try {
      // 更新时间戳
      this.renderState.lastUpdateTime = Date.now()

      // 如果有数据管理器，触发数据更新
      if (this.dataManager && typeof this.dataManager.update === 'function') {
        this.dataManager.update()
      }

      // 更新基于时间的可见性
      if (this.currentTime) {
        this.updateTimeBasedVisibility(this.currentTime)
      }

      // 执行视锥剔除（如果启用）
      if (this.options.enableCulling && this.viewer && this.viewer.camera) {
        const camera = this.viewer.camera
        this.performCulling(camera.frustum, camera.position)
      }

      // 更新统计信息
      this.stats.renderedEntities = this.renderState.visibleEntities.size
      this.stats.lastFrameTime = Date.now() - this.renderState.lastUpdateTime

      // 重置更新标记
      this.renderState.needsUpdate = false

      // 触发更新完成事件
      this.emit('updated', {
        layerId: this.layerId,
        stats: this.getStats(),
      })
    } catch (error) {
      console.error(`Failed to update layer ${this.layerId}:`, error)
      // 即使出错也要重置更新标记，避免无限循环
      this.renderState.needsUpdate = false
    }
  }

  /**
   * 设置图层可见性
   * @param {boolean} visible - 是否可见
   */
  setVisible(visible) {
    this.options.visible = visible

    for (const entity of this.entities.values()) {
      entity.show = visible
    }
  }

  /**
   * 获取图层统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      layerId: this.layerId,
      visible: this.options.visible,
      entityCount: this.entities.size,
    }
  }

  /**
   * 事件发射器
   * @param {string} eventName - 事件名称
   * @param {*} data - 事件数据
   */
  emit(eventName, data) {
    const handlers = this.eventHandlers.get(eventName)
    if (handlers) {
      handlers.forEach((handler) => handler(data))
    }

    // 向渲染引擎传播事件
    this.renderEngine.emit(`layer:${eventName}`, { layerId: this.layerId, ...data })
  }

  /**
   * 监听事件
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 事件处理器
   */
  on(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, [])
    }
    this.eventHandlers.get(eventName).push(handler)
  }

  /**
   * 移除事件监听
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 事件处理器
   */
  off(eventName, handler) {
    const handlers = this.eventHandlers.get(eventName)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * 销毁图层
   */
  destroy() {
    // 移除所有实体
    this.entityCollection.removeAll()
    this.entities.clear()

    // 清理事件监听
    this.eventHandlers.clear()

    // 清理数据管理器监听
    if (this.dataManager && this.dataManager.off) {
      this.dataManager.off('dataChanged', this.onDataChanged)
      this.dataManager.off('dataAdded', this.onDataAdded)
      this.dataManager.off('dataRemoved', this.onDataRemoved)
      this.dataManager.off('dataUpdated', this.onDataUpdated)
    }
  }
}

export default Layer
