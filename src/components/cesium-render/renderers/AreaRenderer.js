/**
 * 区域渲染器 - 负责渲染多边形区域、圆形区域等地理区域
 * 支持动态区域、区域动画、LOD 和交互
 */

class AreaRenderer {
  constructor(options = {}) {
    this.viewer = options.viewer
    this.scene = this.viewer.scene
    this.factory = options.factory
    
    // 配置选项
    this.options = {
      enableLOD: true,
      lodDistances: [10000, 30000, 100000],
      maxAreas: 5000,
      enableSelection: true,
      enableHover: true,
      enableAnimation: true,
      enableOutline: true,
      enableExtrusion: false,
      defaultHeight: 0,
      defaultExtrudedHeight: 1000,
      enableClampToGround: true,
      enableShadows: false,
      ...options
    }
    
    // 渲染状态
    this.isInitialized = false
    this.isAnimating = false
    
    // 区域管理
    this.areas = new Map() // areaId -> area
    this.cesiumEntities = new Map() // areaId -> cesiumEntity
    this.outlineEntities = new Map() // areaId -> outlineEntity
    
    // 数据源
    this.dataSource = new Cesium.CustomDataSource('AreaRenderer')
    this.viewer.dataSources.add(this.dataSource)
    
    // 区域类型样式
    this.areaStyles = {
      'default': {
        material: Cesium.Color.BLUE.withAlpha(0.3),
        outlineColor: Cesium.Color.BLUE,
        outlineWidth: 2,
        height: 0,
        extrudedHeight: undefined,
        classificationType: Cesium.ClassificationType.BOTH
      },
      'zone': {
        material: Cesium.Color.GREEN.withAlpha(0.2),
        outlineColor: Cesium.Color.GREEN,
        outlineWidth: 2,
        height: 0,
        extrudedHeight: undefined,
        classificationType: Cesium.ClassificationType.BOTH
      },
      'restricted': {
        material: Cesium.Color.RED.withAlpha(0.4),
        outlineColor: Cesium.Color.RED,
        outlineWidth: 3,
        height: 0,
        extrudedHeight: undefined,
        classificationType: Cesium.ClassificationType.BOTH
      },
      'warning': {
        material: Cesium.Color.YELLOW.withAlpha(0.3),
        outlineColor: Cesium.Color.ORANGE,
        outlineWidth: 2,
        height: 0,
        extrudedHeight: undefined,
        classificationType: Cesium.ClassificationType.BOTH
      },
      'safe': {
        material: Cesium.Color.CYAN.withAlpha(0.2),
        outlineColor: Cesium.Color.CYAN,
        outlineWidth: 1,
        height: 0,
        extrudedHeight: undefined,
        classificationType: Cesium.ClassificationType.BOTH
      },
      'selected': {
        material: Cesium.Color.MAGENTA.withAlpha(0.5),
        outlineColor: Cesium.Color.MAGENTA,
        outlineWidth: 4,
        height: 0,
        extrudedHeight: undefined,
        classificationType: Cesium.ClassificationType.BOTH
      }
    }
    
    // LOD管理
    this.lodManager = {
      enabled: this.options.enableLOD,
      distances: this.options.lodDistances,
      areaLOD: new Map(), // areaId -> lodLevel
      lastUpdateTime: 0,
      updateInterval: 300
    }
    
    // 动画管理
    this.animationManager = {
      activeAnimations: new Map(),
      pulseAnimations: new Map(),
      fadeAnimations: new Map(),
      frameRate: 30,
      lastFrameTime: 0
    }
    
    // 交互管理
    this.interactionManager = {
      selectedArea: null,
      hoveredArea: null,
      clickHandler: null,
      mouseMoveHandler: null
    }
    
    // 性能统计
    this.stats = {
      totalAreas: 0,
      visibleAreas: 0,
      animatingAreas: 0,
      renderTime: 0,
      animationTime: 0
    }
    
    this.init()
  }
  
  /**
   * 初始化渲染器
   */
  init() {
    // 设置动画管理
    if (this.options.enableAnimation) {
      this.initAnimationManager()
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
   * 初始化动画管理
   */
  initAnimationManager() {
    if (this.options.enableAnimation) {
      this.startAnimationLoop()
    }
  }
  
  /**
   * 初始化交互
   */
  initInteraction() {
    // 点击事件
    if (this.options.enableSelection) {
      this.interactionManager.clickHandler = this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
        this.onAreaClick.bind(this),
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      )
    }
    
    // 鼠标移动事件
    if (this.options.enableHover) {
      this.interactionManager.mouseMoveHandler = this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
        this.onAreaHover.bind(this),
        Cesium.ScreenSpaceEventType.MOUSE_MOVE
      )
    }
  }
  
  /**
   * 渲染区域
   * @param {Array} areas - 区域数组
   * @param {Object} options - 渲染选项
   * @returns {Promise} 渲染结果
   */
  async render(areas, options = {}) {
    const startTime = performance.now()
    
    try {
      // 清理现有区域
      if (options.clearExisting !== false) {
        this.clear()
      }
      
      // 批量添加区域
      await this.addAreas(areas, options)
      
      // 更新LOD
      if (this.lodManager.enabled) {
        this.updateLOD()
      }
      
      // 启动动画
      if (this.options.enableAnimation && options.startAnimation !== false) {
        this.startAnimations()
      }
      
      // 更新统计
      this.updateStats()
      
      return {
        success: true,
        areaCount: areas.length,
        renderTime: performance.now() - startTime
      }
    } catch (error) {
      console.error('Area render error:', error)
      return {
        success: false,
        error: error.message,
        renderTime: performance.now() - startTime
      }
    } finally {
      this.stats.renderTime = performance.now() - startTime
    }
  }
  
  /**
   * 批量添加区域
   * @param {Array} areas - 区域数组
   * @param {Object} options - 选项
   */
  async addAreas(areas, options = {}) {
    const batchSize = options.batchSize || 50
    
    for (let i = 0; i < areas.length; i += batchSize) {
      const batch = areas.slice(i, i + batchSize)
      
      // 处理批次
      await this.processBatch(batch, options)
      
      // 让出控制权
      if (i + batchSize < areas.length) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
  }
  
  /**
   * 处理区域批次
   * @param {Array} batch - 区域批次
   * @param {Object} options - 选项
   */
  async processBatch(batch, options) {
    batch.forEach(area => {
      try {
        this.addArea(area, options)
      } catch (error) {
        console.warn('Failed to add area:', area.id, error)
      }
    })
  }
  
  /**
   * 添加单个区域
   * @param {Object} area - 区域数据
   * @param {Object} options - 选项
   */
  addArea(area, options = {}) {
    if (!area.id) {
      throw new Error('Area must have id')
    }
    
    // 检查是否已存在
    if (this.areas.has(area.id)) {
      this.updateArea(area, options)
      return
    }
    
    // 处理区域数据
    const processedArea = this.processArea(area)
    
    // 创建Cesium实体
    const cesiumEntity = this.createCesiumArea(processedArea, options)
    
    // 添加到数据源
    this.dataSource.entities.add(cesiumEntity)
    
    // 创建轮廓线（如果需要）
    if (this.options.enableOutline && processedArea.showOutline !== false) {
      const outlineEntity = this.createOutlineEntity(processedArea, options)
      if (outlineEntity) {
        this.dataSource.entities.add(outlineEntity)
        this.outlineEntities.set(area.id, outlineEntity)
      }
    }
    
    // 存储引用
    this.areas.set(area.id, processedArea)
    this.cesiumEntities.set(area.id, cesiumEntity)
    
    // 设置初始LOD
    if (this.lodManager.enabled) {
      this.setAreaLOD(area.id, this.calculateLOD(processedArea))
    }
  }
  
  /**
   * 处理区域数据
   * @param {Object} area - 原始区域数据
   * @returns {Object} 处理后的区域数据
   */
  processArea(area) {
    const processed = {
      ...area,
      positions: null,
      hierarchy: null,
      center: null,
      radius: null
    }
    
    // 处理几何形状
    if (area.type === 'circle' || area.type === 'circular') {
      // 圆形区域
      if (area.center && area.radius) {
        processed.center = Cesium.Cartesian3.fromDegrees(
          area.center.longitude,
          area.center.latitude,
          area.center.height || 0
        )
        processed.radius = area.radius
      }
    } else {
      // 多边形区域
      if (area.positions && Array.isArray(area.positions)) {
        processed.positions = area.positions.map(pos => {
          if (Array.isArray(pos)) {
            return Cesium.Cartesian3.fromDegrees(pos[0], pos[1], pos[2] || 0)
          } else {
            return Cesium.Cartesian3.fromDegrees(
              pos.longitude,
              pos.latitude,
              pos.height || 0
            )
          }
        })
        
        // 创建多边形层次结构
        processed.hierarchy = new Cesium.PolygonHierarchy(processed.positions)
      }
    }
    
    return processed
  }
  
  /**
   * 创建Cesium区域实体
   * @param {Object} area - 区域数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity} Cesium实体
   */
  createCesiumArea(area, options) {
    const cesiumEntity = new Cesium.Entity({
      id: area.id,
      properties: area.properties || {}
    })
    
    // 根据区域类型创建几何体
    if (area.type === 'circle' || area.type === 'circular') {
      cesiumEntity.position = area.center
      cesiumEntity.ellipse = this.createCircleGeometry(area, options)
    } else {
      cesiumEntity.polygon = this.createPolygonGeometry(area, options)
    }
    
    // 添加标签（如果需要）
    if (area.label) {
      cesiumEntity.label = this.createAreaLabel(area, options)
      cesiumEntity.position = this.calculateAreaCenter(area)
    }
    
    return cesiumEntity
  }
  
  /**
   * 创建圆形几何体
   * @param {Object} area - 区域数据
   * @param {Object} options - 选项
   * @returns {Object} 圆形配置
   */
  createCircleGeometry(area, options) {
    const style = this.getAreaStyle(area)
    
    const ellipse = {
      semiMajorAxis: area.radius,
      semiMinorAxis: area.radius,
      material: area.material || style.material,
      show: area.visible !== false,
      outline: this.options.enableOutline && area.showOutline !== false,
      outlineColor: area.outlineColor ? Cesium.Color.fromCssColorString(area.outlineColor) : style.outlineColor,
      outlineWidth: area.outlineWidth || style.outlineWidth
    }
    
    // 高度设置
    if (area.height !== undefined) {
      ellipse.height = area.height
    } else if (style.height !== undefined) {
      ellipse.height = style.height
    } else {
      ellipse.height = this.options.defaultHeight
    }
    
    // 拉伸高度
    if (this.options.enableExtrusion && (area.extrudedHeight !== undefined || style.extrudedHeight !== undefined)) {
      ellipse.extrudedHeight = area.extrudedHeight || style.extrudedHeight || this.options.defaultExtrudedHeight
    }
    
    // 高度参考
    if (area.heightReference) {
      ellipse.heightReference = this.parseHeightReference(area.heightReference)
    } else if (this.options.enableClampToGround) {
      ellipse.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND
    }
    
    // 分类类型
    if (area.classificationType) {
      ellipse.classificationType = this.parseClassificationType(area.classificationType)
    } else {
      ellipse.classificationType = style.classificationType
    }
    
    // 阴影
    if (this.options.enableShadows) {
      ellipse.shadows = Cesium.ShadowMode.ENABLED
    }
    
    return ellipse
  }
  
  /**
   * 创建多边形几何体
   * @param {Object} area - 区域数据
   * @param {Object} options - 选项
   * @returns {Object} 多边形配置
   */
  createPolygonGeometry(area, options) {
    const style = this.getAreaStyle(area)
    
    const polygon = {
      hierarchy: area.hierarchy,
      material: area.material || style.material,
      show: area.visible !== false,
      outline: this.options.enableOutline && area.showOutline !== false,
      outlineColor: area.outlineColor ? Cesium.Color.fromCssColorString(area.outlineColor) : style.outlineColor,
      outlineWidth: area.outlineWidth || style.outlineWidth
    }
    
    // 高度设置
    if (area.height !== undefined) {
      polygon.height = area.height
    } else if (style.height !== undefined) {
      polygon.height = style.height
    } else {
      polygon.height = this.options.defaultHeight
    }
    
    // 拉伸高度
    if (this.options.enableExtrusion && (area.extrudedHeight !== undefined || style.extrudedHeight !== undefined)) {
      polygon.extrudedHeight = area.extrudedHeight || style.extrudedHeight || this.options.defaultExtrudedHeight
    }
    
    // 高度参考
    if (area.heightReference) {
      polygon.heightReference = this.parseHeightReference(area.heightReference)
    } else if (this.options.enableClampToGround) {
      polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND
    }
    
    // 分类类型
    if (area.classificationType) {
      polygon.classificationType = this.parseClassificationType(area.classificationType)
    } else {
      polygon.classificationType = style.classificationType
    }
    
    // 阴影
    if (this.options.enableShadows) {
      polygon.shadows = Cesium.ShadowMode.ENABLED
    }
    
    return polygon
  }
  
  /**
   * 创建轮廓线实体
   * @param {Object} area - 区域数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity|null} 轮廓线实体
   */
  createOutlineEntity(area, options) {
    if (!area.positions && !area.center) return null
    
    const outlineEntity = new Cesium.Entity({
      id: `${area.id}_outline`,
      properties: {
        areaId: area.id,
        isOutline: true
      }
    })
    
    const style = this.getAreaStyle(area)
    
    if (area.type === 'circle' || area.type === 'circular') {
      // 圆形轮廓
      outlineEntity.position = area.center
      outlineEntity.ellipse = {
        semiMajorAxis: area.radius,
        semiMinorAxis: area.radius,
        fill: false,
        outline: true,
        outlineColor: area.outlineColor ? Cesium.Color.fromCssColorString(area.outlineColor) : style.outlineColor,
        outlineWidth: (area.outlineWidth || style.outlineWidth) + 1,
        height: area.height || style.height || this.options.defaultHeight
      }
    } else {
      // 多边形轮廓
      const positions = [...area.positions]
      if (positions.length > 0 && !Cesium.Cartesian3.equals(positions[0], positions[positions.length - 1])) {
        positions.push(positions[0]) // 闭合多边形
      }
      
      outlineEntity.polyline = {
        positions: positions,
        width: (area.outlineWidth || style.outlineWidth) + 1,
        material: area.outlineColor ? Cesium.Color.fromCssColorString(area.outlineColor) : style.outlineColor,
        clampToGround: this.options.enableClampToGround,
        show: area.visible !== false
      }
    }
    
    return outlineEntity
  }
  
  /**
   * 创建区域标签
   * @param {Object} area - 区域数据
   * @param {Object} options - 选项
   * @returns {Object} Label配置
   */
  createAreaLabel(area, options) {
    return {
      text: area.label.text || area.name || area.type || '',
      font: area.label.font || '14pt sans-serif',
      fillColor: area.label.fillColor ? Cesium.Color.fromCssColorString(area.label.fillColor) : Cesium.Color.WHITE,
      outlineColor: area.label.outlineColor ? Cesium.Color.fromCssColorString(area.label.outlineColor) : Cesium.Color.BLACK,
      outlineWidth: area.label.outlineWidth || 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      pixelOffset: area.label.pixelOffset ? new Cesium.Cartesian2(area.label.pixelOffset.x, area.label.pixelOffset.y) : Cesium.Cartesian2.ZERO,
      show: area.label.show !== false,
      showBackground: area.label.showBackground || false,
      backgroundColor: area.label.backgroundColor ? Cesium.Color.fromCssColorString(area.label.backgroundColor) : Cesium.Color.BLACK.withAlpha(0.7),
      backgroundPadding: area.label.backgroundPadding ? new Cesium.Cartesian2(area.label.backgroundPadding.x, area.label.backgroundPadding.y) : new Cesium.Cartesian2(7, 5)
    }
  }
  
  /**
   * 计算区域中心
   * @param {Object} area - 区域数据
   * @returns {Cesium.Cartesian3} 中心位置
   */
  calculateAreaCenter(area) {
    if (area.center) {
      return area.center
    }
    
    if (area.positions && area.positions.length > 0) {
      // 计算多边形中心
      let x = 0, y = 0, z = 0
      area.positions.forEach(pos => {
        x += pos.x
        y += pos.y
        z += pos.z
      })
      
      return new Cesium.Cartesian3(
        x / area.positions.length,
        y / area.positions.length,
        z / area.positions.length
      )
    }
    
    return Cesium.Cartesian3.ZERO
  }
  
  /**
   * 获取区域样式
   * @param {Object} area - 区域数据
   * @returns {Object} 样式配置
   */
  getAreaStyle(area) {
    const type = area.type || 'default'
    const isSelected = this.interactionManager.selectedArea === area.id
    
    if (isSelected) {
      return this.areaStyles.selected
    }
    
    return this.areaStyles[type] || this.areaStyles.default
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
   * 解析分类类型
   * @param {string} classificationType - 分类类型字符串
   * @returns {Cesium.ClassificationType} 分类类型枚举
   */
  parseClassificationType(classificationType) {
    switch (classificationType.toLowerCase()) {
      case 'terrain':
        return Cesium.ClassificationType.TERRAIN
      case 'cesium_3d_tile':
        return Cesium.ClassificationType.CESIUM_3D_TILE
      case 'both':
      default:
        return Cesium.ClassificationType.BOTH
    }
  }
  
  /**
   * 更新区域
   * @param {Object} area - 区域数据
   * @param {Object} options - 选项
   */
  updateArea(area, options = {}) {
    const cesiumEntity = this.cesiumEntities.get(area.id)
    if (!cesiumEntity) return
    
    // 处理新的区域数据
    const processedArea = this.processArea(area)
    
    // 更新几何体
    if (processedArea.type === 'circle' || processedArea.type === 'circular') {
      if (cesiumEntity.ellipse) {
        cesiumEntity.position = processedArea.center
        cesiumEntity.ellipse.semiMajorAxis = processedArea.radius
        cesiumEntity.ellipse.semiMinorAxis = processedArea.radius
      }
    } else {
      if (cesiumEntity.polygon) {
        cesiumEntity.polygon.hierarchy = processedArea.hierarchy
      }
    }
    
    // 更新样式
    this.updateAreaStyle(area.id, processedArea)
    
    // 更新存储的区域数据
    this.areas.set(area.id, processedArea)
  }
  
  /**
   * 更新区域样式
   * @param {string} areaId - 区域ID
   * @param {Object} area - 区域数据
   */
  updateAreaStyle(areaId, area = null) {
    const areaData = area || this.areas.get(areaId)
    const cesiumEntity = this.cesiumEntities.get(areaId)
    
    if (!areaData || !cesiumEntity) return
    
    const style = this.getAreaStyle(areaData)
    
    // 更新圆形样式
    if (cesiumEntity.ellipse) {
      cesiumEntity.ellipse.material = areaData.material || style.material
      cesiumEntity.ellipse.outlineColor = areaData.outlineColor ? Cesium.Color.fromCssColorString(areaData.outlineColor) : style.outlineColor
      cesiumEntity.ellipse.outlineWidth = areaData.outlineWidth || style.outlineWidth
    }
    
    // 更新多边形样式
    if (cesiumEntity.polygon) {
      cesiumEntity.polygon.material = areaData.material || style.material
      cesiumEntity.polygon.outlineColor = areaData.outlineColor ? Cesium.Color.fromCssColorString(areaData.outlineColor) : style.outlineColor
      cesiumEntity.polygon.outlineWidth = areaData.outlineWidth || style.outlineWidth
    }
  }
  
  /**
   * 移除区域
   * @param {string} areaId - 区域ID
   */
  removeArea(areaId) {
    // 移除主实体
    const cesiumEntity = this.cesiumEntities.get(areaId)
    if (cesiumEntity) {
      this.dataSource.entities.remove(cesiumEntity)
      this.cesiumEntities.delete(areaId)
    }
    
    // 移除轮廓线实体
    const outlineEntity = this.outlineEntities.get(areaId)
    if (outlineEntity) {
      this.dataSource.entities.remove(outlineEntity)
      this.outlineEntities.delete(areaId)
    }
    
    // 清理数据
    this.areas.delete(areaId)
    this.lodManager.areaLOD.delete(areaId)
    
    // 清理动画
    this.animationManager.pulseAnimations.delete(areaId)
    this.animationManager.fadeAnimations.delete(areaId)
  }
  
  /**
   * 批量移除区域
   * @param {Array} areaIds - 区域ID数组
   */
  removeAreas(areaIds) {
    areaIds.forEach(areaId => this.removeArea(areaId))
  }
  
  /**
   * 清空所有区域
   */
  clear() {
    this.dataSource.entities.removeAll()
    this.areas.clear()
    this.cesiumEntities.clear()
    this.outlineEntities.clear()
    this.lodManager.areaLOD.clear()
    
    // 清理动画
    this.animationManager.pulseAnimations.clear()
    this.animationManager.fadeAnimations.clear()
  }
  
  /**
   * 启动动画循环
   */
  startAnimationLoop() {
    const animate = (timestamp) => {
      if (timestamp - this.animationManager.lastFrameTime >= 1000 / this.animationManager.frameRate) {
        this.updateAnimations(timestamp)
        this.animationManager.lastFrameTime = timestamp
      }
      
      if (this.isAnimating) {
        requestAnimationFrame(animate)
      }
    }
    
    this.isAnimating = true
    requestAnimationFrame(animate)
  }
  
  /**
   * 更新动画
   * @param {number} timestamp - 时间戳
   */
  updateAnimations(timestamp) {
    const startTime = performance.now()
    
    // 更新脉冲动画
    this.updatePulseAnimations(timestamp)
    
    // 更新淡入淡出动画
    this.updateFadeAnimations(timestamp)
    
    this.stats.animationTime = performance.now() - startTime
  }
  
  /**
   * 更新脉冲动画
   * @param {number} timestamp - 时间戳
   */
  updatePulseAnimations(timestamp) {
    const toRemove = []
    
    this.animationManager.pulseAnimations.forEach((animation, areaId) => {
      const elapsed = timestamp - animation.startTime
      animation.progress = Math.min(elapsed / animation.duration, 1)
      
      if (animation.progress >= 1) {
        toRemove.push(areaId)
        return
      }
      
      // 使用正弦波创建脉冲效果
      const pulseValue = Math.sin(animation.progress * Math.PI * 2) * 0.3 + 0.7
      
      const cesiumEntity = this.cesiumEntities.get(areaId)
      if (cesiumEntity) {
        if (cesiumEntity.ellipse && cesiumEntity.ellipse.material) {
          cesiumEntity.ellipse.material = cesiumEntity.ellipse.material.color.withAlpha(pulseValue)
        }
        
        if (cesiumEntity.polygon && cesiumEntity.polygon.material) {
          cesiumEntity.polygon.material = cesiumEntity.polygon.material.color.withAlpha(pulseValue)
        }
      }
    })
    
    // 清理完成的动画
    toRemove.forEach(areaId => {
      this.animationManager.pulseAnimations.delete(areaId)
    })
  }
  
  /**
   * 更新淡入淡出动画
   * @param {number} timestamp - 时间戳
   */
  updateFadeAnimations(timestamp) {
    const toRemove = []
    
    this.animationManager.fadeAnimations.forEach((animation, areaId) => {
      const elapsed = timestamp - animation.startTime
      animation.progress = Math.min(elapsed / animation.duration, 1)
      
      if (animation.progress >= 1) {
        toRemove.push(areaId)
        return
      }
      
      // 计算当前透明度
      const alpha = animation.startAlpha + (animation.endAlpha - animation.startAlpha) * animation.progress
      
      const cesiumEntity = this.cesiumEntities.get(areaId)
      if (cesiumEntity) {
        if (cesiumEntity.ellipse && cesiumEntity.ellipse.material) {
          cesiumEntity.ellipse.material = cesiumEntity.ellipse.material.color.withAlpha(alpha)
        }
        
        if (cesiumEntity.polygon && cesiumEntity.polygon.material) {
          cesiumEntity.polygon.material = cesiumEntity.polygon.material.color.withAlpha(alpha)
        }
      }
    })
    
    // 清理完成的动画
    toRemove.forEach(areaId => {
      this.animationManager.fadeAnimations.delete(areaId)
    })
  }
  
  /**
   * 启动动画
   */
  startAnimations() {
    // 为所有区域启动脉冲动画
    this.areas.forEach((area, areaId) => {
      if (area.enablePulse) {
        this.startPulseAnimation(areaId)
      }
    })
  }
  
  /**
   * 启动脉冲动画
   * @param {string} areaId - 区域ID
   */
  startPulseAnimation(areaId) {
    const animation = {
      startTime: Date.now(),
      duration: 3000,
      progress: 0
    }
    
    this.animationManager.pulseAnimations.set(areaId, animation)
  }
  
  /**
   * 启动淡入动画
   * @param {string} areaId - 区域ID
   */
  startFadeInAnimation(areaId) {
    const animation = {
      startTime: Date.now(),
      duration: 1000,
      startAlpha: 0,
      endAlpha: 1,
      progress: 0
    }
    
    this.animationManager.fadeAnimations.set(areaId, animation)
  }
  
  /**
   * 启动淡出动画
   * @param {string} areaId - 区域ID
   */
  startFadeOutAnimation(areaId) {
    const animation = {
      startTime: Date.now(),
      duration: 1000,
      startAlpha: 1,
      endAlpha: 0,
      progress: 0
    }
    
    this.animationManager.fadeAnimations.set(areaId, animation)
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
    
    this.areas.forEach((area, areaId) => {
      const newLOD = this.calculateLOD(area, cameraPosition)
      const currentLOD = this.lodManager.areaLOD.get(areaId)
      
      if (newLOD !== currentLOD) {
        this.setAreaLOD(areaId, newLOD)
      }
    })
    
    this.lodManager.lastUpdateTime = now
  }
  
  /**
   * 计算区域LOD级别
   * @param {Object} area - 区域数据
   * @param {Cesium.Cartesian3} cameraPosition - 相机位置
   * @returns {number} LOD级别
   */
  calculateLOD(area, cameraPosition = null) {
    if (!cameraPosition) {
      cameraPosition = this.viewer.camera.position
    }
    
    const areaCenter = this.calculateAreaCenter(area)
    const distance = Cesium.Cartesian3.distance(cameraPosition, areaCenter)
    
    // 根据距离确定LOD级别
    for (let i = 0; i < this.lodManager.distances.length; i++) {
      if (distance <= this.lodManager.distances[i]) {
        return i
      }
    }
    
    return this.lodManager.distances.length
  }
  
  /**
   * 设置区域LOD级别
   * @param {string} areaId - 区域ID
   * @param {number} lodLevel - LOD级别
   */
  setAreaLOD(areaId, lodLevel) {
    const cesiumEntity = this.cesiumEntities.get(areaId)
    const outlineEntity = this.outlineEntities.get(areaId)
    
    if (!cesiumEntity) return
    
    this.lodManager.areaLOD.set(areaId, lodLevel)
    
    // 根据LOD级别调整显示
    switch (lodLevel) {
      case 0: // 最近距离 - 显示所有细节
        this.setAreaVisible(cesiumEntity, true)
        this.setAreaVisible(outlineEntity, true)
        if (cesiumEntity.label) cesiumEntity.label.show = true
        break
      
      case 1: // 中等距离 - 显示主要元素
        this.setAreaVisible(cesiumEntity, true)
        this.setAreaVisible(outlineEntity, true)
        if (cesiumEntity.label) cesiumEntity.label.show = false
        break
      
      case 2: // 远距离 - 只显示区域
        this.setAreaVisible(cesiumEntity, true)
        this.setAreaVisible(outlineEntity, false)
        if (cesiumEntity.label) cesiumEntity.label.show = false
        break
      
      default: // 极远距离 - 隐藏
        this.setAreaVisible(cesiumEntity, false)
        this.setAreaVisible(outlineEntity, false)
        if (cesiumEntity.label) cesiumEntity.label.show = false
        break
    }
  }
  
  /**
   * 设置区域可见性
   * @param {Cesium.Entity} entity - 实体
   * @param {boolean} visible - 是否可见
   */
  setAreaVisible(entity, visible) {
    if (!entity) return
    
    if (entity.ellipse) {
      entity.ellipse.show = visible
    }
    
    if (entity.polygon) {
      entity.polygon.show = visible
    }
    
    if (entity.polyline) {
      entity.polyline.show = visible
    }
  }
  
  /**
   * 区域点击事件
   * @param {Object} event - 点击事件
   */
  onAreaClick(event) {
    const pickedObject = this.viewer.scene.pick(event.position)
    if (!pickedObject || !pickedObject.id) return
    
    const entityId = pickedObject.id.id || pickedObject.id
    const areaId = this.extractAreaId(entityId)
    const areaData = this.areas.get(areaId)
    
    if (areaData) {
      // 取消之前的选择
      if (this.interactionManager.selectedArea) {
        this.setAreaSelected(this.interactionManager.selectedArea, false)
      }
      
      // 设置新的选择
      this.interactionManager.selectedArea = areaId
      this.setAreaSelected(areaId, true)
      
      // 触发选择事件
      this.onAreaSelected(areaData, event)
    }
  }
  
  /**
   * 区域悬停事件
   * @param {Object} event - 鼠标移动事件
   */
  onAreaHover(event) {
    const pickedObject = this.viewer.scene.pick(event.endPosition)
    const entityId = pickedObject && pickedObject.id ? (pickedObject.id.id || pickedObject.id) : null
    const areaId = entityId ? this.extractAreaId(entityId) : null
    
    // 取消之前的悬停
    if (this.interactionManager.hoveredArea && this.interactionManager.hoveredArea !== areaId) {
      this.setAreaHovered(this.interactionManager.hoveredArea, false)
    }
    
    // 设置新的悬停
    if (areaId && areaId !== this.interactionManager.hoveredArea) {
      this.interactionManager.hoveredArea = areaId
      this.setAreaHovered(areaId, true)
      
      const areaData = this.areas.get(areaId)
      if (areaData) {
        this.onAreaHovered(areaData, event)
      }
    } else if (!areaId) {
      this.interactionManager.hoveredArea = null
    }
  }
  
  /**
   * 提取区域ID
   * @param {string} entityId - 实体ID
   * @returns {string} 区域ID
   */
  extractAreaId(entityId) {
    // 移除后缀（_outline）
    return entityId.replace(/_outline$/, '')
  }
  
  /**
   * 设置区域选中状态
   * @param {string} areaId - 区域ID
   * @param {boolean} selected - 是否选中
   */
  setAreaSelected(areaId, selected) {
    if (selected) {
      this.updateAreaStyle(areaId)
    } else {
      this.updateAreaStyle(areaId)
    }
  }
  
  /**
   * 设置区域悬停状态
   * @param {string} areaId - 区域ID
   * @param {boolean} hovered - 是否悬停
   */
  setAreaHovered(areaId, hovered) {
    const cesiumEntity = this.cesiumEntities.get(areaId)
    if (!cesiumEntity) return
    
    if (hovered) {
      // 增加透明度
      if (cesiumEntity.ellipse && cesiumEntity.ellipse.material) {
        const currentColor = cesiumEntity.ellipse.material.color || cesiumEntity.ellipse.material
        cesiumEntity.ellipse.material = currentColor.withAlpha(Math.min(currentColor.alpha + 0.2, 1.0))
      }
      
      if (cesiumEntity.polygon && cesiumEntity.polygon.material) {
        const currentColor = cesiumEntity.polygon.material.color || cesiumEntity.polygon.material
        cesiumEntity.polygon.material = currentColor.withAlpha(Math.min(currentColor.alpha + 0.2, 1.0))
      }
    } else {
      // 恢复原始样式
      this.updateAreaStyle(areaId)
    }
  }
  
  /**
   * 区域选择事件（可重写）
   * @param {Object} area - 区域数据
   * @param {Object} clickEvent - 点击事件对象
   */
  onAreaSelected(area, clickEvent) {
    console.log('Area selected:', area)
  }
  
  /**
   * 区域悬停事件（可重写）
   * @param {Object} area - 区域数据
   * @param {Object} hoverEvent - 悬停事件对象
   */
  onAreaHovered(area, hoverEvent) {
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
  }
  
  /**
   * 设置区域样式
   * @param {string} type - 区域类型
   * @param {Object} style - 样式配置
   */
  setAreaStyle(type, style) {
    this.areaStyles[type] = { ...this.areaStyles[type], ...style }
    
    // 更新现有区域的样式
    this.areas.forEach((area, areaId) => {
      if (area.type === type) {
        this.updateAreaStyle(areaId)
      }
    })
  }
  
  /**
   * 更新统计信息
   */
  updateStats() {
    this.stats.totalAreas = this.areas.size
    this.stats.visibleAreas = Array.from(this.cesiumEntities.values()).filter(entity => {
      return (entity.ellipse && entity.ellipse.show) || (entity.polygon && entity.polygon.show)
    }).length
    this.stats.animatingAreas = this.animationManager.pulseAnimations.size + this.animationManager.fadeAnimations.size
  }
  
  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return { ...this.stats }
  }
  
  /**
   * 获取区域
   * @param {string} areaId - 区域ID
   * @returns {Object|null} 区域数据
   */
  getArea(areaId) {
    return this.areas.get(areaId) || null
  }
  
  /**
   * 获取所有区域
   * @returns {Array} 区域数组
   */
  getAllAreas() {
    return Array.from(this.areas.values())
  }
  
  /**
   * 设置可见性
   * @param {boolean} visible - 是否可见
   */
  setVisible(visible) {
    this.dataSource.show = visible
  }
  
  /**
   * 获取可见性
   * @returns {boolean} 是否可见
   */
  getVisible() {
    return this.dataSource.show
  }
  
  /**
   * 销毁渲染器
   */
  destroy() {
    // 停止动画
    this.isAnimating = false
    
    // 移除事件监听
    if (this.interactionManager.clickHandler) {
      this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      )
    }
    
    if (this.interactionManager.mouseMoveHandler) {
      this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.MOUSE_MOVE
      )
    }
    
    // 移除相机事件监听
    this.viewer.camera.changed.removeEventListener(this.onCameraChanged.bind(this))
    
    // 清理数据源
    this.viewer.dataSources.remove(this.dataSource)
    
    // 清理数据
    this.clear()
    
    // 重置状态
    this.isInitialized = false
  }
}

export default AreaRenderer