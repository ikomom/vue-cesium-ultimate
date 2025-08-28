/**
 * 实体管理器 - 负责实体的生命周期管理和性能优化
 * 支持对象池、批量操作、LOD和视锥剔除
 */

import * as Cesium from 'cesium'

class EntityManager {
  constructor(viewer, options = {}) {
    this.viewer = viewer
    this.scene = viewer.scene
    this.camera = viewer.camera

    // 配置选项
    this.options = {
      enableObjectPool: true,
      enableLOD: true,
      enableCulling: true,
      maxEntities: 10000,
      poolSize: 1000,
      cullDistance: 1000000,
      lodLevels: [
        { distance: 1000, detail: 'high' },
        { distance: 10000, detail: 'medium' },
        { distance: 100000, detail: 'low' },
      ],
      ...options,
    }

    // 实体存储
    this.entities = new Map() // entityId -> entity
    this.entitiesByLayer = new Map() // layerId -> Set<entityId>
    this.entitiesByType = new Map() // entityType -> Set<entityId>

    // 对象池
    this.objectPools = new Map() // entityType -> Pool
    this.initObjectPools()

    // 渲染队列
    this.renderQueue = {
      add: new Set(),
      update: new Set(),
      remove: new Set(),
    }

    // 性能管理
    this.performanceManager = {
      frameCount: 0,
      lastFrameTime: 0,
      averageFrameTime: 0,
      entityCount: 0,
      visibleEntityCount: 0,
    }

    // LOD管理
    this.lodManager = {
      currentLevel: 0,
      lastUpdateTime: 0,
      updateInterval: 100, // ms
    }

    // 视锥剔除
    this.cullingManager = {
      frustum: null,
      lastCameraPosition: null,
      lastCameraDirection: null,
      updateThreshold: 10, // 相机移动阈值
    }

    // 事件处理器
    this.eventHandlers = new Map()

    this.init()
  }

  /**
   * 初始化实体管理器
   */
  init() {
    // 监听相机变化
    this.camera.changed.addEventListener(this.onCameraChanged.bind(this))

    // 监听场景渲染
    this.scene.preRender.addEventListener(this.onPreRender.bind(this))
    this.scene.postRender.addEventListener(this.onPostRender.bind(this))

    // 初始化视锥体
    this.updateFrustum()
  }

  /**
   * 初始化对象池
   */
  initObjectPools() {
    const entityTypes = ['point', 'target', 'trajectory', 'relation', 'event', 'area', 'route']

    entityTypes.forEach((type) => {
      this.objectPools.set(type, new EntityPool(type, this.options.poolSize))
    })
  }

  /**
   * 创建实体
   * @param {Object} data - 实体数据
   * @param {string} layerId - 图层ID
   * @returns {Cesium.Entity} 创建的实体
   */
  createEntity(data, layerId) {
    try {
      // 检查实体数量限制
      if (this.entities.size >= this.options.maxEntities) {
        console.warn('Entity limit reached, cannot create more entities')
        return null
      }

      // 从对象池获取实体
      let entity = null
      if (this.options.enableObjectPool) {
        const pool = this.objectPools.get(data.type)
        entity = pool ? pool.acquire() : null
      }

      // 如果对象池没有可用实体，创建新实体
      if (!entity) {
        entity = new Cesium.Entity({
          id: `${layerId}_${data.id}`,
          name: data.name || data.id,
        })
      } else {
        // 重置实体属性
        entity.id = `${layerId}_${data.id}`
        entity.name = data.name || data.id
        this.resetEntity(entity)
      }

      // 应用实体配置
      this.applyEntityConfig(entity, data)

      // 设置实体元数据
      entity._layerId = layerId
      entity._entityType = data.type
      entity._originalData = data
      entity._createdTime = Date.now()
      entity._lastUpdateTime = Date.now()

      // 添加到存储
      this.entities.set(entity.id, entity)

      // 添加到图层索引
      if (!this.entitiesByLayer.has(layerId)) {
        this.entitiesByLayer.set(layerId, new Set())
      }
      this.entitiesByLayer.get(layerId).add(entity.id)

      // 添加到类型索引
      if (!this.entitiesByType.has(data.type)) {
        this.entitiesByType.set(data.type, new Set())
      }
      this.entitiesByType.get(data.type).add(entity.id)

      // 添加到渲染队列
      this.renderQueue.add.add(entity.id)

      // 触发事件
      this.emit('entityCreated', { entity, data, layerId })

      return entity
    } catch (error) {
      console.error('Failed to create entity:', error)
      return null
    }
  }

  /**
   * 更新实体
   * @param {string} entityId - 实体ID
   * @param {Object} data - 更新数据
   * @returns {boolean} 更新是否成功
   */
  updateEntity(entityId, data) {
    try {
      const entity = this.entities.get(entityId)
      if (!entity) {
        console.warn(`Entity not found: ${entityId}`)
        return false
      }

      // 应用更新配置
      this.applyEntityConfig(entity, data)

      // 更新元数据
      entity._originalData = { ...entity._originalData, ...data }
      entity._lastUpdateTime = Date.now()

      // 添加到更新队列
      this.renderQueue.update.add(entityId)

      // 触发事件
      this.emit('entityUpdated', { entity, data })

      return true
    } catch (error) {
      console.error('Failed to update entity:', error)
      return false
    }
  }

  /**
   * 删除实体
   * @param {string} entityId - 实体ID
   * @returns {boolean} 删除是否成功
   */
  removeEntity(entityId) {
    try {
      const entity = this.entities.get(entityId)
      if (!entity) {
        return false
      }

      const layerId = entity._layerId
      const entityType = entity._entityType

      // 从存储中移除
      this.entities.delete(entityId)

      // 从图层索引中移除
      const layerEntities = this.entitiesByLayer.get(layerId)
      if (layerEntities) {
        layerEntities.delete(entityId)
        if (layerEntities.size === 0) {
          this.entitiesByLayer.delete(layerId)
        }
      }

      // 从类型索引中移除
      const typeEntities = this.entitiesByType.get(entityType)
      if (typeEntities) {
        typeEntities.delete(entityId)
        if (typeEntities.size === 0) {
          this.entitiesByType.delete(entityType)
        }
      }

      // 添加到删除队列
      this.renderQueue.remove.add(entityId)

      // 返回到对象池
      if (this.options.enableObjectPool) {
        const pool = this.objectPools.get(entityType)
        if (pool) {
          this.resetEntity(entity)
          pool.release(entity)
        }
      }

      // 触发事件
      this.emit('entityRemoved', { entityId, layerId, entityType })

      return true
    } catch (error) {
      console.error('Failed to remove entity:', error)
      return false
    }
  }

  /**
   * 批量创建实体
   * @param {Array} dataArray - 实体数据数组
   * @param {string} layerId - 图层ID
   * @returns {Array} 创建的实体数组
   */
  createEntitiesBatch(dataArray, layerId) {
    const entities = []
    const batchSize = 100 // 批处理大小

    for (let i = 0; i < dataArray.length; i += batchSize) {
      const batch = dataArray.slice(i, i + batchSize)

      batch.forEach((data) => {
        const entity = this.createEntity(data, layerId)
        if (entity) {
          entities.push(entity)
        }
      })

      // 让出控制权，避免阻塞UI
      if (i + batchSize < dataArray.length) {
        setTimeout(() => {}, 0)
      }
    }

    return entities
  }

  /**
   * 批量更新实体
   * @param {Array} updates - 更新数据数组 [{entityId, data}]
   * @returns {number} 成功更新的数量
   */
  updateEntitiesBatch(updates) {
    let successCount = 0

    updates.forEach((update) => {
      if (this.updateEntity(update.entityId, update.data)) {
        successCount++
      }
    })

    return successCount
  }

  /**
   * 批量删除实体
   * @param {Array} entityIds - 实体ID数组
   * @returns {number} 成功删除的数量
   */
  removeEntitiesBatch(entityIds) {
    let successCount = 0

    entityIds.forEach((entityId) => {
      if (this.removeEntity(entityId)) {
        successCount++
      }
    })

    return successCount
  }

  /**
   * 根据图层获取实体
   * @param {string} layerId - 图层ID
   * @returns {Array} 实体数组
   */
  getEntitiesByLayer(layerId) {
    const entityIds = this.entitiesByLayer.get(layerId)
    if (!entityIds) return []

    return Array.from(entityIds)
      .map((id) => this.entities.get(id))
      .filter((entity) => entity)
  }

  /**
   * 根据类型获取实体
   * @param {string} entityType - 实体类型
   * @returns {Array} 实体数组
   */
  getEntitiesByType(entityType) {
    const entityIds = this.entitiesByType.get(entityType)
    if (!entityIds) return []

    return Array.from(entityIds)
      .map((id) => this.entities.get(id))
      .filter((entity) => entity)
  }

  /**
   * 设置图层可见性
   * @param {string} layerId - 图层ID
   * @param {boolean} visible - 是否可见
   */
  setLayerVisible(layerId, visible) {
    const entities = this.getEntitiesByLayer(layerId)
    entities.forEach((entity) => {
      entity.show = visible
    })
  }

  /**
   * 应用实体配置
   * @param {Cesium.Entity} entity - 实体对象
   * @param {Object} data - 配置数据
   */
  applyEntityConfig(entity, data) {
    // 位置配置
    if (data.position) {
      entity.position = this.createPositionProperty(data.position, data.trajectory)
    }

    // 图标配置
    if (data.billboard) {
      entity.billboard = this.createBillboardConfig(data.billboard)
    }

    // 标签配置
    if (data.label) {
      entity.label = this.createLabelConfig(data.label)
    }

    // 点配置
    if (data.point) {
      entity.point = this.createPointConfig(data.point)
    }

    // 路径配置
    if (data.path) {
      entity.path = this.createPathConfig(data.path)
    }

    // 多边形配置
    if (data.polygon) {
      entity.polygon = this.createPolygonConfig(data.polygon)
    }

    // 线条配置
    if (data.polyline) {
      entity.polyline = this.createPolylineConfig(data.polyline)
    }

    // 模型配置
    if (data.model) {
      entity.model = this.createModelConfig(data.model)
    }

    // 可见性
    entity.show = data.visible !== false
  }

  /**
   * 创建位置属性
   * @param {Object} position - 位置数据
   * @param {Array} trajectory - 轨迹数据
   * @returns {*} 位置属性
   */
  createPositionProperty(position, trajectory) {
    if (trajectory && Array.isArray(trajectory)) {
      const property = new Cesium.SampledPositionProperty()
      trajectory.forEach((point) => {
        const time = Cesium.JulianDate.fromIso8601(point.time)
        const pos = Cesium.Cartesian3.fromDegrees(
          point.position.longitude,
          point.position.latitude,
          point.position.height || 0,
        )
        property.addSample(time, pos)
      })
      return property
    } else {
      return Cesium.Cartesian3.fromDegrees(
        position.longitude,
        position.latitude,
        position.height || 0,
      )
    }
  }

  /**
   * 创建图标配置
   * @param {Object} config - 图标配置
   * @returns {Object} Cesium图标配置
   */
  createBillboardConfig(config) {
    const billboardConfig = {
      image: config.image,
      scale: config.scale || 1.0,
      color: config.color ? Cesium.Color.fromCssColorString(config.color) : Cesium.Color.WHITE,
      pixelOffset: config.pixelOffset
        ? Array.isArray(config.pixelOffset)
          ? new Cesium.Cartesian2(config.pixelOffset[0] || 0, config.pixelOffset[1] || 0)
          : config.pixelOffset
        : new Cesium.Cartesian2(0, 0),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    }

    // LOD配置
    if (this.options.enableLOD) {
      billboardConfig.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(
        0.0,
        this.options.cullDistance,
      )
    }

    return billboardConfig
  }

  /**
   * 创建标签配置
   * @param {Object} config - 标签配置
   * @returns {Object} Cesium标签配置
   */
  createLabelConfig(config) {
    return {
      text: config.text,
      font: config.font || '12pt sans-serif',
      fillColor: config.fillColor
        ? Cesium.Color.fromCssColorString(config.fillColor)
        : Cesium.Color.WHITE,
      outlineColor: config.outlineColor
        ? Cesium.Color.fromCssColorString(config.outlineColor)
        : Cesium.Color.BLACK,
      outlineWidth: config.outlineWidth || 1,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: config.pixelOffset
        ? Array.isArray(config.pixelOffset)
          ? new Cesium.Cartesian2(config.pixelOffset[0] || 0, config.pixelOffset[1] || 0)
          : config.pixelOffset
        : new Cesium.Cartesian2(0, -40),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    }
  }

  /**
   * 创建点配置
   * @param {Object} config - 点配置
   * @returns {Object} Cesium点配置
   */
  createPointConfig(config) {
    return {
      pixelSize: config.pixelSize || 10,
      color: config.color ? Cesium.Color.fromCssColorString(config.color) : Cesium.Color.YELLOW,
      outlineColor: config.outlineColor
        ? Cesium.Color.fromCssColorString(config.outlineColor)
        : Cesium.Color.BLACK,
      outlineWidth: config.outlineWidth || 1,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    }
  }

  /**
   * 创建路径配置
   * @param {Object} config - 路径配置
   * @returns {Object} Cesium路径配置
   */
  createPathConfig(config) {
    return {
      width: config.width || 2,
      material: config.material
        ? Cesium.Color.fromCssColorString(config.material)
        : Cesium.Color.CYAN,
      resolution: config.resolution || 60,
      leadTime: config.leadTime || 0,
      trailTime: config.trailTime || 3600,
    }
  }

  /**
   * 创建多边形配置
   * @param {Object} config - 多边形配置
   * @returns {Object} Cesium多边形配置
   */
  createPolygonConfig(config) {
    const positions = config.hierarchy.map((pos) =>
      Cesium.Cartesian3.fromDegrees(pos.longitude, pos.latitude, pos.height || 0),
    )

    return {
      hierarchy: positions,
      material: config.material
        ? Cesium.Color.fromCssColorString(config.material)
        : Cesium.Color.YELLOW.withAlpha(0.3),
      outline: config.outline !== false,
      outlineColor: config.outlineColor
        ? Cesium.Color.fromCssColorString(config.outlineColor)
        : Cesium.Color.YELLOW,
      height: config.height || 0,
      extrudedHeight: config.extrudedHeight,
    }
  }

  /**
   * 创建线条配置
   * @param {Object} config - 线条配置
   * @returns {Object} Cesium线条配置
   */
  createPolylineConfig(config) {
    const positions = config.positions.map((pos) =>
      Cesium.Cartesian3.fromDegrees(pos.longitude, pos.latitude, pos.height || 0),
    )

    return {
      positions: positions,
      width: config.width || 2,
      material: config.material
        ? Cesium.Color.fromCssColorString(config.material)
        : Cesium.Color.WHITE,
      clampToGround: config.clampToGround !== false,
    }
  }

  /**
   * 创建模型配置
   * @param {Object} config - 模型配置
   * @returns {Object} Cesium模型配置
   */
  createModelConfig(config) {
    return {
      uri: config.uri,
      scale: config.scale || 1.0,
      minimumPixelSize: config.minimumPixelSize || 64,
      maximumScale: config.maximumScale || 20000,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    }
  }

  /**
   * 重置实体属性
   * @param {Cesium.Entity} entity - 实体对象
   */
  resetEntity(entity) {
    entity.billboard = undefined
    entity.label = undefined
    entity.point = undefined
    entity.path = undefined
    entity.polygon = undefined
    entity.polyline = undefined
    entity.model = undefined
    entity.position = undefined
    entity.show = true
  }

  /**
   * 相机变化处理
   */
  onCameraChanged() {
    // 更新视锥体
    this.updateFrustum()

    // 执行LOD更新
    if (this.options.enableLOD) {
      this.updateLOD()
    }

    // 执行视锥剔除
    if (this.options.enableCulling) {
      this.performCulling()
    }
  }

  /**
   * 渲染前处理
   */
  onPreRender() {
    const startTime = performance.now()

    // 处理渲染队列
    this.processRenderQueue()

    this.performanceManager.lastFrameTime = performance.now() - startTime
  }

  /**
   * 渲染后处理
   */
  onPostRender() {
    this.performanceManager.frameCount++

    // 更新性能统计
    if (this.performanceManager.frameCount % 60 === 0) {
      this.updatePerformanceStats()
    }
  }

  /**
   * 处理渲染队列
   */
  processRenderQueue() {
    // 处理添加队列
    this.renderQueue.add.forEach((entityId) => {
      const entity = this.entities.get(entityId)
      if (entity) {
        this.viewer.entities.add(entity)
      }
    })
    this.renderQueue.add.clear()

    // 处理删除队列
    this.renderQueue.remove.forEach((entityId) => {
      const entity = this.viewer.entities.getById(entityId)
      if (entity) {
        this.viewer.entities.remove(entity)
      }
    })
    this.renderQueue.remove.clear()

    // 更新队列不需要特殊处理，实体属性已经直接更新
    this.renderQueue.update.clear()
  }

  /**
   * 更新视锥体
   */
  updateFrustum() {
    this.cullingManager.frustum = this.camera.frustum
    this.cullingManager.lastCameraPosition = this.camera.position.clone()
    this.cullingManager.lastCameraDirection = this.camera.direction.clone()
  }

  /**
   * 更新LOD
   */
  updateLOD() {
    const now = Date.now()
    if (now - this.lodManager.lastUpdateTime < this.lodManager.updateInterval) {
      return
    }

    const cameraPosition = this.camera.position

    this.entities.forEach((entity) => {
      const entityPosition = entity.position?.getValue(this.viewer.clock.currentTime)
      if (!entityPosition) return

      const distance = Cesium.Cartesian3.distance(cameraPosition, entityPosition)
      const lodLevel = this.getLODLevel(distance)

      this.applyLOD(entity, lodLevel)
    })

    this.lodManager.lastUpdateTime = now
  }

  /**
   * 获取LOD级别
   * @param {number} distance - 距离
   * @returns {Object} LOD级别配置
   */
  getLODLevel(distance) {
    for (const level of this.options.lodLevels) {
      if (distance <= level.distance) {
        return level
      }
    }
    return this.options.lodLevels[this.options.lodLevels.length - 1]
  }

  /**
   * 应用LOD
   * @param {Cesium.Entity} entity - 实体对象
   * @param {Object} lodLevel - LOD级别
   */
  applyLOD(entity, lodLevel) {
    switch (lodLevel.detail) {
      case 'high':
        // 高细节：显示所有元素
        if (entity.billboard) entity.billboard.show = true
        if (entity.label) entity.label.show = true
        break
      case 'medium':
        // 中等细节：隐藏标签
        if (entity.billboard) entity.billboard.show = true
        if (entity.label) entity.label.show = false
        break
      case 'low':
        // 低细节：只显示简化图标
        if (entity.billboard) {
          entity.billboard.show = true
          entity.billboard.scale = 0.5
        }
        if (entity.label) entity.label.show = false
        break
    }
  }

  /**
   * 执行视锥剔除
   */
  performCulling() {
    const cameraPosition = this.camera.position
    let visibleCount = 0

    this.entities.forEach((entity) => {
      const entityPosition = entity.position?.getValue(this.viewer.clock.currentTime)
      if (!entityPosition) return

      const distance = Cesium.Cartesian3.distance(cameraPosition, entityPosition)
      const isVisible = distance <= this.options.cullDistance

      entity.show = isVisible && entity._originalData?.visible !== false

      if (isVisible) {
        visibleCount++
      }
    })

    this.performanceManager.visibleEntityCount = visibleCount
  }

  /**
   * 更新性能统计
   */
  updatePerformanceStats() {
    this.performanceManager.entityCount = this.entities.size
    this.performanceManager.averageFrameTime = this.performanceManager.lastFrameTime

    // 触发性能统计事件
    this.emit('performanceUpdate', this.performanceManager)
  }

  /**
   * 获取性能统计
   * @returns {Object} 性能统计信息
   */
  getPerformanceStats() {
    return { ...this.performanceManager }
  }

  /**
   * 清空所有实体
   */
  clear() {
    this.entities.clear()
    this.entitiesByLayer.clear()
    this.entitiesByType.clear()
    this.renderQueue.add.clear()
    this.renderQueue.update.clear()
    this.renderQueue.remove.clear()

    this.viewer.entities.removeAll()
  }

  /**
   * 设置时间管理器
   * @param {TimeManager} timeManager - 时间管理器实例
   */
  setTimeManager(timeManager) {
    this.timeManager = timeManager

    // 监听时间变化事件
    if (timeManager && timeManager.on) {
      timeManager.on('timeChanged', this.onTimeChanged.bind(this))
    }
  }

  /**
   * 时间变化处理
   * @param {Object} timeInfo - 时间信息
   */
  onTimeChanged(timeInfo) {
    // 更新时间相关的实体属性
    this.entities.forEach((entity) => {
      if (entity._originalData && entity._originalData.timeDependent) {
        this.updateTimeBasedEntity(entity, timeInfo)
      }
    })
  }

  /**
   * 更新基于时间的实体
   * @param {Cesium.Entity} entity - 实体对象
   * @param {Object} timeInfo - 时间信息
   */
  updateTimeBasedEntity(entity, timeInfo) {
    // 这里可以根据时间更新实体的位置、属性等
    // 具体实现根据业务需求
  }

  /**
   * 渲染前处理
   */
  preRender() {
    const startTime = performance.now()

    // 处理渲染队列
    this.processRenderQueue()

    // 执行LOD计算
    if (this.options.enableLOD) {
      this.updateLOD()
    }

    // 执行视锥剔除
    if (this.options.enableCulling) {
      this.performCulling()
    }

    // 更新性能统计
    this.performanceManager.lastFrameTime = performance.now() - startTime
  }

  /**
   * 渲染后处理
   */
  postRender() {
    // 更新性能统计
    this.updatePerformanceStats()

    // 清理渲染队列
    this.renderQueue.add.clear()
    this.renderQueue.update.clear()
    this.renderQueue.remove.clear()

    // 触发渲染完成事件
    this.emit('renderComplete', {
      frameTime: this.performanceManager.lastFrameTime,
      entityCount: this.entities.size,
      visibleCount: this.performanceManager.visibleEntityCount,
    })
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
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      totalEntities: this.entities.size,
      visibleEntities: this.performanceManager.visibleEntityCount,
      renderQueueSize:
        this.renderQueue.add.size + this.renderQueue.update.size + this.renderQueue.remove.size,
      lastFrameTime: this.performanceManager.lastFrameTime,
      memoryUsage: this.performanceManager.memoryUsage,
      poolStats: Array.from(this.objectPools.entries()).map(([type, pool]) => ({
        type,
        ...pool.getStats(),
      })),
    }
  }

  /**
   * 销毁实体管理器
   */
  destroy() {
    // 移除事件监听
    this.camera.changed.removeEventListener(this.onCameraChanged)
    this.scene.preRender.removeEventListener(this.onPreRender)
    this.scene.postRender.removeEventListener(this.onPostRender)

    // 清空所有数据
    this.clear()

    // 清空对象池
    this.objectPools.forEach((pool) => pool.clear())
    this.objectPools.clear()

    // 清空事件处理器
    this.eventHandlers.clear()
  }
}

/**
 * 实体对象池
 */
class EntityPool {
  constructor(entityType, maxSize = 100) {
    this.entityType = entityType
    this.maxSize = maxSize
    this.pool = []
    this.activeCount = 0
  }

  /**
   * 获取实体
   * @returns {Cesium.Entity|null} 实体对象
   */
  acquire() {
    if (this.pool.length > 0) {
      const entity = this.pool.pop()
      this.activeCount++
      return entity
    }
    return null
  }

  /**
   * 释放实体
   * @param {Cesium.Entity} entity - 实体对象
   */
  release(entity) {
    if (this.pool.length < this.maxSize) {
      this.pool.push(entity)
      this.activeCount--
    }
  }

  /**
   * 清空对象池
   */
  clear() {
    this.pool = []
    this.activeCount = 0
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      entityType: this.entityType,
      poolSize: this.pool.length,
      activeCount: this.activeCount,
      maxSize: this.maxSize,
    }
  }
}

export default EntityManager
export { EntityPool }
