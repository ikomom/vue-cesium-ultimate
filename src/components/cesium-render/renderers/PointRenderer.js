/**
 * 点位渲染器 - 负责渲染各种类型的点位实体
 * 支持Billboard、Label、聚类、LOD和动态更新
 */

class PointRenderer {
  constructor(options = {}) {
    this.viewer = options.viewer
    this.scene = this.viewer.scene
    this.factory = options.factory

    // 配置选项
    this.options = {
      enableBillboard: true,
      enableLabel: true,
      enableClustering: true,
      clusterPixelRange: 80,
      clusterMinimumSize: 50,
      enableLOD: true,
      lodDistances: [1000, 5000, 20000],
      maxPoints: 10000,
      enableDynamicUpdate: true,
      enableSelection: true,
      enableHover: true,
      ...options,
    }

    // 渲染状态
    this.isInitialized = false
    this.isBatched = false
    this.isInstanced = false

    // 实体管理
    this.entities = new Map() // entityId -> entity
    this.cesiumEntities = new Map() // entityId -> cesiumEntity
    this.clusters = new Map() // clusterId -> cluster

    // 数据源
    this.dataSource = new Cesium.CustomDataSource('PointRenderer')
    this.viewer.dataSources.add(this.dataSource)

    // 聚类管理
    this.clusterManager = {
      enabled: this.options.enableClustering,
      pixelRange: this.options.clusterPixelRange,
      minimumClusterSize: this.options.clusterMinimumSize,
      clusters: new Map(),
      lastCameraPosition: null,
      updateThreshold: 100, // 相机移动阈值
    }

    // LOD管理
    this.lodManager = {
      enabled: this.options.enableLOD,
      distances: this.options.lodDistances,
      entityLOD: new Map(), // entityId -> lodLevel
      lastUpdateTime: 0,
      updateInterval: 100, // 更新间隔（毫秒）
    }

    // 选择和交互
    this.interactionManager = {
      selectedEntity: null,
      hoveredEntity: null,
      clickHandler: null,
      mouseMoveHandler: null,
    }

    // 性能统计
    this.stats = {
      totalPoints: 0,
      visiblePoints: 0,
      clusteredPoints: 0,
      renderTime: 0,
      updateTime: 0,
    }

    this.init()
  }

  /**
   * 初始化渲染器
   */
  init() {
    // 设置聚类
    if (this.clusterManager.enabled) {
      this.initClustering()
    }

    // 设置交互
    if (this.options.enableSelection || this.options.enableHover) {
      this.initInteraction()
    }

    // 监听相机变化
    this.viewer.camera.changed.addEventListener(this.onCameraChanged.bind(this))

    this.isInitialized = true
  }

  /**
   * 初始化聚类
   */
  initClustering() {
    this.dataSource.clustering.enabled = true
    this.dataSource.clustering.pixelRange = this.clusterManager.pixelRange
    this.dataSource.clustering.minimumClusterSize = this.clusterManager.minimumClusterSize

    // 自定义聚类样式
    this.dataSource.clustering.clusterBillboards = false
    this.dataSource.clustering.clusterLabels = false
    this.dataSource.clustering.clusterPoints = true

    // 聚类事件处理
    this.dataSource.clustering.clusterEvent.addEventListener(this.onClusterEvent.bind(this))
  }

  /**
   * 初始化交互
   */
  initInteraction() {
    // 点击事件
    if (this.options.enableSelection) {
      this.interactionManager.clickHandler =
        this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
          this.onEntityClick.bind(this),
          Cesium.ScreenSpaceEventType.LEFT_CLICK,
        )
    }

    // 鼠标移动事件
    if (this.options.enableHover) {
      this.interactionManager.mouseMoveHandler =
        this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
          this.onEntityHover.bind(this),
          Cesium.ScreenSpaceEventType.MOUSE_MOVE,
        )
    }
  }

  /**
   * 渲染点位实体
   * @param {Array} entities - 实体数组
   * @param {Object} options - 渲染选项
   * @returns {Promise} 渲染结果
   */
  async render(entities, options = {}) {
    const startTime = performance.now()

    try {
      // 清理现有实体
      if (options.clearExisting !== false) {
        this.clear()
      }

      // 批量添加实体
      await this.addEntities(entities, options)

      // 更新LOD
      if (this.lodManager.enabled) {
        this.updateLOD()
      }

      // 更新聚类
      if (this.clusterManager.enabled) {
        this.updateClustering()
      }

      // 更新统计
      this.updateStats()

      return {
        success: true,
        entityCount: entities.length,
        renderTime: performance.now() - startTime,
      }
    } catch (error) {
      console.error('Point render error:', error)
      return {
        success: false,
        error: error.message,
        renderTime: performance.now() - startTime,
      }
    } finally {
      this.stats.renderTime = performance.now() - startTime
    }
  }

  /**
   * 批量添加实体
   * @param {Array} entities - 实体数组
   * @param {Object} options - 选项
   */
  async addEntities(entities, options = {}) {
    const batchSize = options.batchSize || 100

    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize)

      // 处理批次
      await this.processBatch(batch, options)

      // 让出控制权，避免阻塞UI
      if (i + batchSize < entities.length) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }
  }

  /**
   * 处理实体批次
   * @param {Array} batch - 实体批次
   * @param {Object} options - 选项
   */
  async processBatch(batch, options) {
    batch.forEach((entity) => {
      try {
        this.addEntity(entity, options)
      } catch (error) {
        console.warn('Failed to add entity:', entity.id, error)
      }
    })
  }

  /**
   * 添加单个实体
   * @param {Object} entity - 实体数据
   * @param {Object} options - 选项
   */
  addEntity(entity, options = {}) {
    if (!entity.id || !entity.position) {
      throw new Error('Entity must have id and position')
    }

    // 检查是否已存在
    if (this.entities.has(entity.id)) {
      this.updateEntity(entity, options)
      return
    }

    // 创建Cesium实体
    const cesiumEntity = this.createCesiumEntity(entity, options)

    // 添加到数据源
    this.dataSource.entities.add(cesiumEntity)

    // 存储引用
    this.entities.set(entity.id, entity)
    this.cesiumEntities.set(entity.id, cesiumEntity)

    // 设置初始LOD
    if (this.lodManager.enabled) {
      this.setEntityLOD(entity.id, this.calculateLOD(entity))
    }
  }

  /**
   * 创建Cesium实体
   * @param {Object} entity - 实体数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity} Cesium实体
   */
  createCesiumEntity(entity, options) {
    const position = Cesium.Cartesian3.fromDegrees(
      entity.position.longitude,
      entity.position.latitude,
      entity.position.height || 0,
    )

    const cesiumEntity = new Cesium.Entity({
      id: entity.id,
      position: position,
      properties: entity.properties || {},
    })

    // 添加Billboard
    if (this.options.enableBillboard && entity.billboard !== false) {
      cesiumEntity.billboard = this.createBillboard(entity, options)
    }

    // 添加Label
    if (this.options.enableLabel && entity.label) {
      cesiumEntity.label = this.createLabel(entity, options)
    }

    // 添加Point（用于聚类）
    if (this.clusterManager.enabled) {
      cesiumEntity.point = this.createPoint(entity, options)
    }

    return cesiumEntity
  }

  /**
   * 创建Billboard
   * @param {Object} entity - 实体数据
   * @param {Object} options - 选项
   * @returns {Object} Billboard配置
   */
  createBillboard(entity, options) {
    const billboard = {
      image: entity.image || this.getDefaultImage(entity),
      scale: entity.scale || 1.0,
      color: entity.color ? Cesium.Color.fromCssColorString(entity.color) : Cesium.Color.WHITE,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: entity.pixelOffset
        ? new Cesium.Cartesian2(entity.pixelOffset.x, entity.pixelOffset.y)
        : Cesium.Cartesian2.ZERO,
      eyeOffset: entity.eyeOffset
        ? new Cesium.Cartesian3(entity.eyeOffset.x, entity.eyeOffset.y, entity.eyeOffset.z)
        : Cesium.Cartesian3.ZERO,
      show: entity.visible !== false,
    }

    // 距离显示控制
    if (entity.distanceDisplayCondition) {
      billboard.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(
        entity.distanceDisplayCondition.near || 0,
        entity.distanceDisplayCondition.far || Number.MAX_VALUE,
      )
    }

    // 高度参考
    if (entity.heightReference) {
      billboard.heightReference = this.parseHeightReference(entity.heightReference)
    }

    return billboard
  }

  /**
   * 创建Label
   * @param {Object} entity - 实体数据
   * @param {Object} options - 选项
   * @returns {Object} Label配置
   */
  createLabel(entity, options) {
    const label = {
      text: entity.label.text || entity.name || entity.id,
      font: entity.label.font || '12pt sans-serif',
      fillColor: entity.label.fillColor
        ? Cesium.Color.fromCssColorString(entity.label.fillColor)
        : Cesium.Color.WHITE,
      outlineColor: entity.label.outlineColor
        ? Cesium.Color.fromCssColorString(entity.label.outlineColor)
        : Cesium.Color.BLACK,
      outlineWidth: entity.label.outlineWidth || 1,
      style: entity.label.style || Cesium.LabelStyle.FILL_AND_OUTLINE,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.TOP,
      pixelOffset: entity.label.pixelOffset
        ? new Cesium.Cartesian2(entity.label.pixelOffset.x, entity.label.pixelOffset.y)
        : new Cesium.Cartesian2(0, -40),
      show: entity.label.show !== false,
    }

    // 背景
    if (entity.label.showBackground) {
      label.showBackground = true
      label.backgroundColor = entity.label.backgroundColor
        ? Cesium.Color.fromCssColorString(entity.label.backgroundColor)
        : Cesium.Color.BLACK.withAlpha(0.7)
      label.backgroundPadding = entity.label.backgroundPadding
        ? new Cesium.Cartesian2(entity.label.backgroundPadding.x, entity.label.backgroundPadding.y)
        : new Cesium.Cartesian2(7, 5)
    }

    return label
  }

  /**
   * 创建Point（用于聚类）
   * @param {Object} entity - 实体数据
   * @param {Object} options - 选项
   * @returns {Object} Point配置
   */
  createPoint(entity, options) {
    return {
      pixelSize: entity.pointSize || 8,
      color: entity.pointColor
        ? Cesium.Color.fromCssColorString(entity.pointColor)
        : Cesium.Color.YELLOW,
      outlineColor: entity.pointOutlineColor
        ? Cesium.Color.fromCssColorString(entity.pointOutlineColor)
        : Cesium.Color.BLACK,
      outlineWidth: entity.pointOutlineWidth || 1,
      show: false, // 默认隐藏，聚类时显示
    }
  }

  /**
   * 获取默认图标
   * @param {Object} entity - 实体数据
   * @returns {string} 图标URL
   */
  getDefaultImage(entity) {
    const type = entity.type || 'default'
    const status = entity.status || 'normal'
    const priority = entity.priority || 'normal'

    // 根据类型、状态、优先级选择图标
    const iconMap = {
      target: {
        normal: '/icons/target-normal.png',
        warning: '/icons/target-warning.png',
        danger: '/icons/target-danger.png',
      },
      ship: {
        normal: '/icons/ship-normal.png',
        warning: '/icons/ship-warning.png',
        danger: '/icons/ship-danger.png',
      },
      aircraft: {
        normal: '/icons/aircraft-normal.png',
        warning: '/icons/aircraft-warning.png',
        danger: '/icons/aircraft-danger.png',
      },
      default: {
        normal: '/icons/point-normal.png',
        warning: '/icons/point-warning.png',
        danger: '/icons/point-danger.png',
      },
    }

    return iconMap[type]?.[status] || iconMap['default']['normal']
  }

  /**
   * 解析高度参考
   * @param {string} heightReference - 高度参考字符串
   * @returns {Cesium.HeightReference} 高度参考枚举
   */
  parseHeightReference(heightReference) {
    switch (heightReference.toLowerCase()) {
      case 'clamp_to_ground':
        return Cesium.HeightReference.CLAMP_TO_GROUND
      case 'relative_to_ground':
        return Cesium.HeightReference.RELATIVE_TO_GROUND
      case 'none':
      default:
        return Cesium.HeightReference.NONE
    }
  }

  /**
   * 更新实体
   * @param {Object} entity - 实体数据
   * @param {Object} options - 选项
   */
  updateEntity(entity, options = {}) {
    const cesiumEntity = this.cesiumEntities.get(entity.id)
    if (!cesiumEntity) return

    // 更新位置
    if (entity.position) {
      cesiumEntity.position = Cesium.Cartesian3.fromDegrees(
        entity.position.longitude,
        entity.position.latitude,
        entity.position.height || 0,
      )
    }

    // 更新Billboard
    if (cesiumEntity.billboard && entity.billboard !== false) {
      this.updateBillboard(cesiumEntity.billboard, entity, options)
    }

    // 更新Label
    if (cesiumEntity.label && entity.label) {
      this.updateLabel(cesiumEntity.label, entity, options)
    }

    // 更新Point
    if (cesiumEntity.point) {
      this.updatePoint(cesiumEntity.point, entity, options)
    }

    // 更新属性
    if (entity.properties) {
      cesiumEntity.properties = entity.properties
    }

    // 更新存储的实体数据
    this.entities.set(entity.id, entity)

    // 更新LOD
    if (this.lodManager.enabled) {
      this.setEntityLOD(entity.id, this.calculateLOD(entity))
    }
  }

  /**
   * 更新Billboard
   * @param {Object} billboard - Billboard对象
   * @param {Object} entity - 实体数据
   * @param {Object} options - 选项
   */
  updateBillboard(billboard, entity, options) {
    if (entity.image !== undefined) billboard.image = entity.image
    if (entity.scale !== undefined) billboard.scale = entity.scale
    if (entity.color !== undefined) billboard.color = Cesium.Color.fromCssColorString(entity.color)
    if (entity.visible !== undefined) billboard.show = entity.visible
  }

  /**
   * 更新Label
   * @param {Object} label - Label对象
   * @param {Object} entity - 实体数据
   * @param {Object} options - 选项
   */
  updateLabel(label, entity, options) {
    if (entity.label.text !== undefined) label.text = entity.label.text
    if (entity.label.fillColor !== undefined)
      label.fillColor = Cesium.Color.fromCssColorString(entity.label.fillColor)
    if (entity.label.show !== undefined) label.show = entity.label.show
  }

  /**
   * 更新Point
   * @param {Object} point - Point对象
   * @param {Object} entity - 实体数据
   * @param {Object} options - 选项
   */
  updatePoint(point, entity, options) {
    if (entity.pointSize !== undefined) point.pixelSize = entity.pointSize
    if (entity.pointColor !== undefined)
      point.color = Cesium.Color.fromCssColorString(entity.pointColor)
  }

  /**
   * 移除实体
   * @param {string} entityId - 实体ID
   */
  removeEntity(entityId) {
    const cesiumEntity = this.cesiumEntities.get(entityId)
    if (cesiumEntity) {
      this.dataSource.entities.remove(cesiumEntity)
      this.cesiumEntities.delete(entityId)
    }

    this.entities.delete(entityId)
    this.lodManager.entityLOD.delete(entityId)
  }

  /**
   * 批量移除实体
   * @param {Array} entityIds - 实体ID数组
   */
  removeEntities(entityIds) {
    entityIds.forEach((entityId) => this.removeEntity(entityId))
  }

  /**
   * 清空所有实体
   */
  clear() {
    this.dataSource.entities.removeAll()
    this.entities.clear()
    this.cesiumEntities.clear()
    this.lodManager.entityLOD.clear()
    this.clusterManager.clusters.clear()
  }

  /**
   * 更新LOD
   */
  updateLOD() {
    const now = Date.now()
    if (now - this.lodManager.lastUpdateTime < this.lodManager.updateInterval) {
      return
    }

    const cameraPosition = this.viewer.camera.position

    this.entities.forEach((entity, entityId) => {
      const newLOD = this.calculateLOD(entity, cameraPosition)
      const currentLOD = this.lodManager.entityLOD.get(entityId)

      if (newLOD !== currentLOD) {
        this.setEntityLOD(entityId, newLOD)
      }
    })

    this.lodManager.lastUpdateTime = now
  }

  /**
   * 计算实体LOD级别
   * @param {Object} entity - 实体数据
   * @param {Cesium.Cartesian3} cameraPosition - 相机位置
   * @returns {number} LOD级别
   */
  calculateLOD(entity, cameraPosition = null) {
    if (!cameraPosition) {
      cameraPosition = this.viewer.camera.position
    }

    const entityPosition = Cesium.Cartesian3.fromDegrees(
      entity.position.longitude,
      entity.position.latitude,
      entity.position.height || 0,
    )

    const distance = Cesium.Cartesian3.distance(cameraPosition, entityPosition)

    // 根据距离确定LOD级别
    for (let i = 0; i < this.lodManager.distances.length; i++) {
      if (distance <= this.lodManager.distances[i]) {
        return i
      }
    }

    return this.lodManager.distances.length
  }

  /**
   * 设置实体LOD级别
   * @param {string} entityId - 实体ID
   * @param {number} lodLevel - LOD级别
   */
  setEntityLOD(entityId, lodLevel) {
    const cesiumEntity = this.cesiumEntities.get(entityId)
    if (!cesiumEntity) return

    this.lodManager.entityLOD.set(entityId, lodLevel)

    // 根据LOD级别调整显示
    switch (lodLevel) {
      case 0: // 最近距离 - 显示所有细节
        if (cesiumEntity.billboard) cesiumEntity.billboard.show = true
        if (cesiumEntity.label) cesiumEntity.label.show = true
        if (cesiumEntity.point) cesiumEntity.point.show = false
        break

      case 1: // 中等距离 - 显示主要元素
        if (cesiumEntity.billboard) cesiumEntity.billboard.show = true
        if (cesiumEntity.label) cesiumEntity.label.show = false
        if (cesiumEntity.point) cesiumEntity.point.show = false
        break

      case 2: // 远距离 - 只显示点
        if (cesiumEntity.billboard) cesiumEntity.billboard.show = false
        if (cesiumEntity.label) cesiumEntity.label.show = false
        if (cesiumEntity.point) cesiumEntity.point.show = true
        break

      default: // 极远距离 - 隐藏
        if (cesiumEntity.billboard) cesiumEntity.billboard.show = false
        if (cesiumEntity.label) cesiumEntity.label.show = false
        if (cesiumEntity.point) cesiumEntity.point.show = false
        break
    }
  }

  /**
   * 更新聚类
   */
  updateClustering() {
    if (!this.clusterManager.enabled) return

    const cameraPosition = this.viewer.camera.position

    // 检查相机是否有显著移动
    if (this.clusterManager.lastCameraPosition) {
      const distance = Cesium.Cartesian3.distance(
        cameraPosition,
        this.clusterManager.lastCameraPosition,
      )
      if (distance < this.clusterManager.updateThreshold) {
        return
      }
    }

    // 更新聚类参数
    const height = this.viewer.camera.positionCartographic.height
    const dynamicPixelRange = Math.max(
      50,
      Math.min(150, this.clusterManager.pixelRange * (height / 10000)),
    )

    this.dataSource.clustering.pixelRange = dynamicPixelRange

    this.clusterManager.lastCameraPosition = cameraPosition.clone()
  }

  /**
   * 聚类事件处理
   * @param {Array} clusteredEntities - 聚类实体
   * @param {Object} cluster - 聚类对象
   */
  onClusterEvent(clusteredEntities, cluster) {
    // 自定义聚类样式
    cluster.label.show = false
    cluster.billboard.show = true
    cluster.billboard.id = cluster.id
    cluster.billboard.image = this.createClusterImage(clusteredEntities.length)
    cluster.billboard.scale = this.calculateClusterScale(clusteredEntities.length)

    // 存储聚类信息
    this.clusterManager.clusters.set(cluster.id, {
      cluster,
      entities: clusteredEntities,
      count: clusteredEntities.length,
    })
  }

  /**
   * 创建聚类图标
   * @param {number} count - 聚类数量
   * @returns {string} 图标URL或Canvas
   */
  createClusterImage(count) {
    // 创建Canvas绘制聚类图标
    const canvas = document.createElement('canvas')
    const size = 64
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')

    // 绘制圆形背景
    const radius = size / 2 - 4
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, radius, 0, 2 * Math.PI)
    ctx.fillStyle = this.getClusterColor(count)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.stroke()

    // 绘制数字
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(count.toString(), size / 2, size / 2)

    return canvas
  }

  /**
   * 获取聚类颜色
   * @param {number} count - 聚类数量
   * @returns {string} 颜色值
   */
  getClusterColor(count) {
    if (count < 10) return '#3498db'
    if (count < 50) return '#f39c12'
    if (count < 100) return '#e74c3c'
    return '#9b59b6'
  }

  /**
   * 计算聚类缩放
   * @param {number} count - 聚类数量
   * @returns {number} 缩放值
   */
  calculateClusterScale(count) {
    return Math.min(2.0, 0.8 + Math.log10(count) * 0.3)
  }

  /**
   * 实体点击事件
   * @param {Object} event - 点击事件
   */
  onEntityClick(event) {
    const pickedObject = this.viewer.scene.pick(event.position)
    if (!pickedObject || !pickedObject.id) return

    const entityId = pickedObject.id.id || pickedObject.id
    const entity = this.entities.get(entityId)

    if (entity) {
      // 取消之前的选择
      if (this.interactionManager.selectedEntity) {
        this.setEntitySelected(this.interactionManager.selectedEntity, false)
      }

      // 设置新的选择
      this.interactionManager.selectedEntity = entityId
      this.setEntitySelected(entityId, true)

      // 触发选择事件
      this.onEntitySelected(entity, event)
    }
  }

  /**
   * 实体悬停事件
   * @param {Object} event - 鼠标移动事件
   */
  onEntityHover(event) {
    const pickedObject = this.viewer.scene.pick(event.endPosition)
    const entityId = pickedObject && pickedObject.id ? pickedObject.id.id || pickedObject.id : null

    // 取消之前的悬停
    if (
      this.interactionManager.hoveredEntity &&
      this.interactionManager.hoveredEntity !== entityId
    ) {
      this.setEntityHovered(this.interactionManager.hoveredEntity, false)
    }

    // 设置新的悬停
    if (entityId && entityId !== this.interactionManager.hoveredEntity) {
      this.interactionManager.hoveredEntity = entityId
      this.setEntityHovered(entityId, true)

      const entity = this.entities.get(entityId)
      if (entity) {
        this.onEntityHovered(entity, event)
      }
    } else if (!entityId) {
      this.interactionManager.hoveredEntity = null
    }
  }

  /**
   * 设置实体选中状态
   * @param {string} entityId - 实体ID
   * @param {boolean} selected - 是否选中
   */
  setEntitySelected(entityId, selected) {
    const cesiumEntity = this.cesiumEntities.get(entityId)
    if (!cesiumEntity) return

    if (cesiumEntity.billboard) {
      cesiumEntity.billboard.scale = selected ? 1.5 : 1.0
      cesiumEntity.billboard.color = selected ? Cesium.Color.YELLOW : Cesium.Color.WHITE
    }

    if (cesiumEntity.point) {
      cesiumEntity.point.pixelSize = selected ? 12 : 8
      cesiumEntity.point.color = selected ? Cesium.Color.YELLOW : Cesium.Color.WHITE
    }
  }

  /**
   * 设置实体悬停状态
   * @param {string} entityId - 实体ID
   * @param {boolean} hovered - 是否悬停
   */
  setEntityHovered(entityId, hovered) {
    const cesiumEntity = this.cesiumEntities.get(entityId)
    if (!cesiumEntity) return

    if (cesiumEntity.billboard) {
      cesiumEntity.billboard.scale = hovered ? 1.2 : 1.0
    }

    if (cesiumEntity.point) {
      cesiumEntity.point.outlineWidth = hovered ? 2 : 1
    }
  }

  /**
   * 实体选择事件（可重写）
   * @param {Object} entity - 实体数据
   * @param {Object} event - 事件对象
   */
  onEntitySelected(entity, event) {
    console.log('Entity selected:', entity)
  }

  /**
   * 实体悬停事件（可重写）
   * @param {Object} entity - 实体数据
   * @param {Object} event - 事件对象
   */
  onEntityHovered(entity, event) {
    // 可以在这里显示tooltip等
  }

  /**
   * 相机变化事件
   */
  onCameraChanged() {
    // 更新LOD
    if (this.lodManager.enabled) {
      this.updateLOD()
    }

    // 更新聚类
    if (this.clusterManager.enabled) {
      this.updateClustering()
    }
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    this.stats.totalPoints = this.entities.size
    this.stats.visiblePoints = Array.from(this.cesiumEntities.values()).filter((entity) => {
      return (
        (entity.billboard && entity.billboard.show) ||
        (entity.point && entity.point.show) ||
        (entity.label && entity.label.show)
      )
    }).length
    this.stats.clusteredPoints = this.clusterManager.clusters.size
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * 获取实体
   * @param {string} entityId - 实体ID
   * @returns {Object|null} 实体数据
   */
  getEntity(entityId) {
    return this.entities.get(entityId) || null
  }

  /**
   * 获取所有实体
   * @returns {Array} 实体数组
   */
  getAllEntities() {
    return Array.from(this.entities.values())
  }

  /**
   * 检查是否可以销毁
   * @returns {boolean} 是否可以销毁
   */
  canDestroy() {
    return this.entities.size === 0
  }

  /**
   * 销毁渲染器
   */
  destroy() {
    // 移除事件监听
    if (this.interactionManager.clickHandler) {
      this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_CLICK,
      )
    }

    if (this.interactionManager.mouseMoveHandler) {
      this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.MOUSE_MOVE,
      )
    }

    // 移除相机监听
    this.viewer.camera.changed.removeEventListener(this.onCameraChanged)

    // 清理数据源
    this.viewer.dataSources.remove(this.dataSource)

    // 清理数据
    this.clear()
  }
}

export default PointRenderer
