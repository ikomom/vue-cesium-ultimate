/**
 * 路线渲染器 - 负责渲染路径、路线和导航线等线性数据
 * 支持动态路线、路线动画、导航指示和交互
 */

class RouteRenderer {
  constructor(options = {}) {
    this.viewer = options.viewer
    this.scene = this.viewer.scene
    this.factory = options.factory

    // 配置选项
    this.options = {
      enableLOD: true,
      lodDistances: [5000, 15000, 50000],
      maxRoutes: 2000,
      enableSelection: true,
      enableHover: true,
      enableAnimation: true,
      enableArrows: true,
      enableLabels: true,
      defaultWidth: 3,
      defaultHeight: 0,
      enableClampToGround: true,
      enableShadows: false,
      animationSpeed: 1.0,
      arrowSpacing: 100,
      ...options,
    }

    // 渲染状态
    this.isInitialized = false
    this.isAnimating = false

    // 路线管理
    this.routes = new Map() // routeId -> route
    this.cesiumEntities = new Map() // routeId -> cesiumEntity
    this.arrowEntities = new Map() // routeId -> arrowEntities[]
    this.labelEntities = new Map() // routeId -> labelEntity

    // 数据源
    this.dataSource = new Cesium.CustomDataSource('RouteRenderer')
    this.viewer.dataSources.add(this.dataSource)

    // 路线类型样式
    this.routeStyles = {
      default: {
        material: Cesium.Color.BLUE,
        width: 3,
        clampToGround: true,
        shadows: Cesium.ShadowMode.DISABLED,
        classificationType: Cesium.ClassificationType.BOTH,
      },
      highway: {
        material: Cesium.Color.RED,
        width: 5,
        clampToGround: true,
        shadows: Cesium.ShadowMode.DISABLED,
        classificationType: Cesium.ClassificationType.BOTH,
      },
      street: {
        material: Cesium.Color.GRAY,
        width: 2,
        clampToGround: true,
        shadows: Cesium.ShadowMode.DISABLED,
        classificationType: Cesium.ClassificationType.BOTH,
      },
      path: {
        material: Cesium.Color.GREEN,
        width: 2,
        clampToGround: true,
        shadows: Cesium.ShadowMode.DISABLED,
        classificationType: Cesium.ClassificationType.BOTH,
      },
      navigation: {
        material: Cesium.Color.CYAN,
        width: 4,
        clampToGround: true,
        shadows: Cesium.ShadowMode.DISABLED,
        classificationType: Cesium.ClassificationType.BOTH,
      },
      planned: {
        material: Cesium.Color.YELLOW,
        width: 3,
        clampToGround: true,
        shadows: Cesium.ShadowMode.DISABLED,
        classificationType: Cesium.ClassificationType.BOTH,
      },
      active: {
        material: Cesium.Color.ORANGE,
        width: 4,
        clampToGround: true,
        shadows: Cesium.ShadowMode.DISABLED,
        classificationType: Cesium.ClassificationType.BOTH,
      },
      selected: {
        material: Cesium.Color.MAGENTA,
        width: 6,
        clampToGround: true,
        shadows: Cesium.ShadowMode.DISABLED,
        classificationType: Cesium.ClassificationType.BOTH,
      },
    }

    // LOD管理
    this.lodManager = {
      enabled: this.options.enableLOD,
      distances: this.options.lodDistances,
      routeLOD: new Map(), // routeId -> lodLevel
      lastUpdateTime: 0,
      updateInterval: 300,
    }

    // 动画管理
    this.animationManager = {
      activeAnimations: new Map(),
      flowAnimations: new Map(),
      pulseAnimations: new Map(),
      frameRate: 30,
      lastFrameTime: 0,
    }

    // 交互管理
    this.interactionManager = {
      selectedRoute: null,
      hoveredRoute: null,
      clickHandler: null,
      mouseMoveHandler: null,
    }

    // 性能统计
    this.stats = {
      totalRoutes: 0,
      visibleRoutes: 0,
      animatingRoutes: 0,
      renderTime: 0,
      animationTime: 0,
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
      this.interactionManager.clickHandler =
        this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
          this.onRouteClick.bind(this),
          Cesium.ScreenSpaceEventType.LEFT_CLICK,
        )
    }

    // 鼠标移动事件
    if (this.options.enableHover) {
      this.interactionManager.mouseMoveHandler =
        this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
          this.onRouteHover.bind(this),
          Cesium.ScreenSpaceEventType.MOUSE_MOVE,
        )
    }
  }

  /**
   * 渲染路线
   * @param {Array} routes - 路线数组
   * @param {Object} options - 渲染选项
   * @returns {Promise} 渲染结果
   */
  async render(routes, options = {}) {
    const startTime = performance.now()

    try {
      // 清理现有路线
      if (options.clearExisting !== false) {
        this.clear()
      }

      // 批量添加路线
      await this.addRoutes(routes, options)

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
        routeCount: routes.length,
        renderTime: performance.now() - startTime,
      }
    } catch (error) {
      console.error('Route render error:', error)
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
   * 批量添加路线
   * @param {Array} routes - 路线数组
   * @param {Object} options - 选项
   */
  async addRoutes(routes, options = {}) {
    const batchSize = options.batchSize || 50

    for (let i = 0; i < routes.length; i += batchSize) {
      const batch = routes.slice(i, i + batchSize)

      // 处理批次
      await this.processBatch(batch, options)

      // 让出控制权
      if (i + batchSize < routes.length) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }
  }

  /**
   * 处理路线批次
   * @param {Array} batch - 路线批次
   * @param {Object} options - 选项
   */
  async processBatch(batch, options) {
    batch.forEach((route) => {
      try {
        this.addRoute(route, options)
      } catch (error) {
        console.warn('Failed to add route:', route.id, error)
      }
    })
  }

  /**
   * 添加单个路线
   * @param {Object} route - 路线数据
   * @param {Object} options - 选项
   */
  addRoute(route, options = {}) {
    if (!route.id) {
      throw new Error('Route must have id')
    }

    // 检查是否已存在
    if (this.routes.has(route.id)) {
      this.updateRoute(route, options)
      return
    }

    // 处理路线数据
    const processedRoute = this.processRoute(route)

    // 创建Cesium实体
    const cesiumEntity = this.createCesiumRoute(processedRoute, options)

    // 添加到数据源
    this.dataSource.entities.add(cesiumEntity)

    // 创建箭头（如果需要）
    if (this.options.enableArrows && processedRoute.showArrows !== false) {
      const arrowEntities = this.createArrowEntities(processedRoute, options)
      arrowEntities.forEach((arrow) => this.dataSource.entities.add(arrow))
      this.arrowEntities.set(route.id, arrowEntities)
    }

    // 创建标签（如果需要）
    if (this.options.enableLabels && processedRoute.label) {
      const labelEntity = this.createLabelEntity(processedRoute, options)
      if (labelEntity) {
        this.dataSource.entities.add(labelEntity)
        this.labelEntities.set(route.id, labelEntity)
      }
    }

    // 存储引用
    this.routes.set(route.id, processedRoute)
    this.cesiumEntities.set(route.id, cesiumEntity)

    // 设置初始LOD
    if (this.lodManager.enabled) {
      this.setRouteLOD(route.id, this.calculateLOD(processedRoute))
    }
  }

  /**
   * 处理路线数据
   * @param {Object} route - 原始路线数据
   * @returns {Object} 处理后的路线数据
   */
  processRoute(route) {
    const processed = {
      ...route,
      positions: null,
      center: null,
      length: 0,
    }

    // 处理位置数据
    if (route.positions && Array.isArray(route.positions)) {
      processed.positions = route.positions.map((pos) => {
        if (Array.isArray(pos)) {
          return Cesium.Cartesian3.fromDegrees(pos[0], pos[1], pos[2] || 0)
        } else {
          return Cesium.Cartesian3.fromDegrees(pos.longitude, pos.latitude, pos.height || 0)
        }
      })

      // 计算路线长度
      processed.length = this.calculateRouteLength(processed.positions)

      // 计算中心点
      processed.center = this.calculateRouteCenter(processed.positions)
    }

    return processed
  }

  /**
   * 创建Cesium路线实体
   * @param {Object} route - 路线数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity} Cesium实体
   */
  createCesiumRoute(route, options) {
    const cesiumEntity = new Cesium.Entity({
      id: route.id,
      properties: route.properties || {},
    })

    // 创建线条几何体
    cesiumEntity.polyline = this.createPolylineGeometry(route, options)

    return cesiumEntity
  }

  /**
   * 创建线条几何体
   * @param {Object} route - 路线数据
   * @param {Object} options - 选项
   * @returns {Object} 线条配置
   */
  createPolylineGeometry(route, options) {
    const style = this.getRouteStyle(route)

    const polyline = {
      positions: route.positions,
      width: route.width || style.width || this.options.defaultWidth,
      material: route.material || style.material,
      show: route.visible !== false,
      clampToGround:
        route.clampToGround !== undefined
          ? route.clampToGround
          : style.clampToGround || this.options.enableClampToGround,
      shadows: this.options.enableShadows ? Cesium.ShadowMode.ENABLED : Cesium.ShadowMode.DISABLED,
    }

    // 高度设置
    if (route.height !== undefined) {
      polyline.height = route.height
    } else {
      polyline.height = this.options.defaultHeight
    }

    // 高度参考
    if (route.heightReference) {
      polyline.heightReference = this.parseHeightReference(route.heightReference)
    } else if (this.options.enableClampToGround) {
      polyline.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND
    }

    // 分类类型
    if (route.classificationType) {
      polyline.classificationType = this.parseClassificationType(route.classificationType)
    } else {
      polyline.classificationType = style.classificationType
    }

    // 深度测试
    if (route.depthFailMaterial) {
      polyline.depthFailMaterial = route.depthFailMaterial
    }

    return polyline
  }

  /**
   * 创建箭头实体
   * @param {Object} route - 路线数据
   * @param {Object} options - 选项
   * @returns {Array} 箭头实体数组
   */
  createArrowEntities(route, options) {
    const arrowEntities = []
    const positions = route.positions

    if (!positions || positions.length < 2) return arrowEntities

    const spacing = route.arrowSpacing || this.options.arrowSpacing
    const arrowSize = route.arrowSize || 20
    const arrowColor = route.arrowColor || route.material || Cesium.Color.WHITE

    // 计算箭头位置
    const arrowPositions = this.calculateArrowPositions(positions, spacing)

    arrowPositions.forEach((arrowPos, index) => {
      const arrowEntity = new Cesium.Entity({
        id: `${route.id}_arrow_${index}`,
        position: arrowPos.position,
        properties: {
          routeId: route.id,
          isArrow: true,
        },
        billboard: {
          image: this.createArrowImage(arrowColor, arrowSize),
          scale: 1.0,
          rotation: arrowPos.heading,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          show: route.visible !== false,
          heightReference: this.options.enableClampToGround
            ? Cesium.HeightReference.CLAMP_TO_GROUND
            : Cesium.HeightReference.NONE,
        },
      })

      arrowEntities.push(arrowEntity)
    })

    return arrowEntities
  }

  /**
   * 创建标签实体
   * @param {Object} route - 路线数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity|null} 标签实体
   */
  createLabelEntity(route, options) {
    if (!route.label || !route.center) return null

    const labelEntity = new Cesium.Entity({
      id: `${route.id}_label`,
      position: route.center,
      properties: {
        routeId: route.id,
        isLabel: true,
      },
      label: {
        text: route.label.text || route.name || route.type || '',
        font: route.label.font || '12pt sans-serif',
        fillColor: route.label.fillColor
          ? Cesium.Color.fromCssColorString(route.label.fillColor)
          : Cesium.Color.WHITE,
        outlineColor: route.label.outlineColor
          ? Cesium.Color.fromCssColorString(route.label.outlineColor)
          : Cesium.Color.BLACK,
        outlineWidth: route.label.outlineWidth || 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        pixelOffset: route.label.pixelOffset
          ? new Cesium.Cartesian2(route.label.pixelOffset.x, route.label.pixelOffset.y)
          : Cesium.Cartesian2.ZERO,
        show: route.label.show !== false,
        showBackground: route.label.showBackground || false,
        backgroundColor: route.label.backgroundColor
          ? Cesium.Color.fromCssColorString(route.label.backgroundColor)
          : Cesium.Color.BLACK.withAlpha(0.7),
        backgroundPadding: route.label.backgroundPadding
          ? new Cesium.Cartesian2(route.label.backgroundPadding.x, route.label.backgroundPadding.y)
          : new Cesium.Cartesian2(7, 5),
        heightReference: this.options.enableClampToGround
          ? Cesium.HeightReference.CLAMP_TO_GROUND
          : Cesium.HeightReference.NONE,
      },
    })

    return labelEntity
  }

  /**
   * 计算箭头位置
   * @param {Array} positions - 路线位置数组
   * @param {number} spacing - 箭头间距
   * @returns {Array} 箭头位置和方向数组
   */
  calculateArrowPositions(positions, spacing) {
    const arrowPositions = []
    let totalDistance = 0
    let nextArrowDistance = spacing

    for (let i = 0; i < positions.length - 1; i++) {
      const start = positions[i]
      const end = positions[i + 1]
      const segmentDistance = Cesium.Cartesian3.distance(start, end)

      // 检查这个线段是否包含下一个箭头位置
      while (totalDistance + segmentDistance >= nextArrowDistance) {
        const distanceInSegment = nextArrowDistance - totalDistance
        const ratio = distanceInSegment / segmentDistance

        // 插值计算箭头位置
        const arrowPosition = Cesium.Cartesian3.lerp(start, end, ratio, new Cesium.Cartesian3())

        // 计算箭头方向
        const direction = Cesium.Cartesian3.subtract(end, start, new Cesium.Cartesian3())
        Cesium.Cartesian3.normalize(direction, direction)
        const heading = Math.atan2(direction.y, direction.x)

        arrowPositions.push({
          position: arrowPosition,
          heading: heading,
        })

        nextArrowDistance += spacing
      }

      totalDistance += segmentDistance
    }

    return arrowPositions
  }

  /**
   * 创建箭头图像
   * @param {Cesium.Color} color - 箭头颜色
   * @param {number} size - 箭头大小
   * @returns {string} 箭头图像数据URL
   */
  createArrowImage(color, size) {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // 绘制箭头
    ctx.fillStyle = color.toCssColorString()
    ctx.beginPath()
    ctx.moveTo(size * 0.8, size * 0.5)
    ctx.lineTo(size * 0.2, size * 0.2)
    ctx.lineTo(size * 0.2, size * 0.4)
    ctx.lineTo(0, size * 0.4)
    ctx.lineTo(0, size * 0.6)
    ctx.lineTo(size * 0.2, size * 0.6)
    ctx.lineTo(size * 0.2, size * 0.8)
    ctx.closePath()
    ctx.fill()

    return canvas.toDataURL()
  }

  /**
   * 计算路线长度
   * @param {Array} positions - 位置数组
   * @returns {number} 路线长度（米）
   */
  calculateRouteLength(positions) {
    let length = 0

    for (let i = 0; i < positions.length - 1; i++) {
      length += Cesium.Cartesian3.distance(positions[i], positions[i + 1])
    }

    return length
  }

  /**
   * 计算路线中心
   * @param {Array} positions - 位置数组
   * @returns {Cesium.Cartesian3} 中心位置
   */
  calculateRouteCenter(positions) {
    if (positions.length === 0) return Cesium.Cartesian3.ZERO

    let x = 0,
      y = 0,
      z = 0
    positions.forEach((pos) => {
      x += pos.x
      y += pos.y
      z += pos.z
    })

    return new Cesium.Cartesian3(x / positions.length, y / positions.length, z / positions.length)
  }

  /**
   * 获取路线样式
   * @param {Object} route - 路线数据
   * @returns {Object} 样式配置
   */
  getRouteStyle(route) {
    const type = route.type || 'default'
    const isSelected = this.interactionManager.selectedRoute === route.id

    if (isSelected) {
      return this.routeStyles.selected
    }

    return this.routeStyles[type] || this.routeStyles.default
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
   * 更新路线
   * @param {Object} route - 路线数据
   * @param {Object} options - 选项
   */
  updateRoute(route, options = {}) {
    const cesiumEntity = this.cesiumEntities.get(route.id)
    if (!cesiumEntity) return

    // 处理新的路线数据
    const processedRoute = this.processRoute(route)

    // 更新线条
    if (cesiumEntity.polyline) {
      cesiumEntity.polyline.positions = processedRoute.positions
    }

    // 更新样式
    this.updateRouteStyle(route.id, processedRoute)

    // 更新箭头
    if (this.options.enableArrows && processedRoute.showArrows !== false) {
      this.updateArrowEntities(route.id, processedRoute)
    }

    // 更新标签
    if (this.options.enableLabels && processedRoute.label) {
      this.updateLabelEntity(route.id, processedRoute)
    }

    // 更新存储的路线数据
    this.routes.set(route.id, processedRoute)
  }

  /**
   * 更新路线样式
   * @param {string} routeId - 路线ID
   * @param {Object} route - 路线数据
   */
  updateRouteStyle(routeId, route = null) {
    const routeData = route || this.routes.get(routeId)
    const cesiumEntity = this.cesiumEntities.get(routeId)

    if (!routeData || !cesiumEntity || !cesiumEntity.polyline) return

    const style = this.getRouteStyle(routeData)

    cesiumEntity.polyline.material = routeData.material || style.material
    cesiumEntity.polyline.width = routeData.width || style.width || this.options.defaultWidth
  }

  /**
   * 更新箭头实体
   * @param {string} routeId - 路线ID
   * @param {Object} route - 路线数据
   */
  updateArrowEntities(routeId, route) {
    // 移除旧箭头
    const oldArrows = this.arrowEntities.get(routeId)
    if (oldArrows) {
      oldArrows.forEach((arrow) => this.dataSource.entities.remove(arrow))
    }

    // 创建新箭头
    const newArrows = this.createArrowEntities(route)
    newArrows.forEach((arrow) => this.dataSource.entities.add(arrow))
    this.arrowEntities.set(routeId, newArrows)
  }

  /**
   * 更新标签实体
   * @param {string} routeId - 路线ID
   * @param {Object} route - 路线数据
   */
  updateLabelEntity(routeId, route) {
    const labelEntity = this.labelEntities.get(routeId)

    if (labelEntity && route.label) {
      labelEntity.position = route.center
      labelEntity.label.text = route.label.text || route.name || route.type || ''
    }
  }

  /**
   * 移除路线
   * @param {string} routeId - 路线ID
   */
  removeRoute(routeId) {
    // 移除主实体
    const cesiumEntity = this.cesiumEntities.get(routeId)
    if (cesiumEntity) {
      this.dataSource.entities.remove(cesiumEntity)
      this.cesiumEntities.delete(routeId)
    }

    // 移除箭头实体
    const arrowEntities = this.arrowEntities.get(routeId)
    if (arrowEntities) {
      arrowEntities.forEach((arrow) => this.dataSource.entities.remove(arrow))
      this.arrowEntities.delete(routeId)
    }

    // 移除标签实体
    const labelEntity = this.labelEntities.get(routeId)
    if (labelEntity) {
      this.dataSource.entities.remove(labelEntity)
      this.labelEntities.delete(routeId)
    }

    // 清理数据
    this.routes.delete(routeId)
    this.lodManager.routeLOD.delete(routeId)

    // 清理动画
    this.animationManager.flowAnimations.delete(routeId)
    this.animationManager.pulseAnimations.delete(routeId)
  }

  /**
   * 批量移除路线
   * @param {Array} routeIds - 路线ID数组
   */
  removeRoutes(routeIds) {
    routeIds.forEach((routeId) => this.removeRoute(routeId))
  }

  /**
   * 清空所有路线
   */
  clear() {
    this.dataSource.entities.removeAll()
    this.routes.clear()
    this.cesiumEntities.clear()
    this.arrowEntities.clear()
    this.labelEntities.clear()
    this.lodManager.routeLOD.clear()

    // 清理动画
    this.animationManager.flowAnimations.clear()
    this.animationManager.pulseAnimations.clear()
  }

  /**
   * 启动动画循环
   */
  startAnimationLoop() {
    const animate = (timestamp) => {
      if (
        timestamp - this.animationManager.lastFrameTime >=
        1000 / this.animationManager.frameRate
      ) {
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

    // 更新流动动画
    this.updateFlowAnimations(timestamp)

    // 更新脉冲动画
    this.updatePulseAnimations(timestamp)

    this.stats.animationTime = performance.now() - startTime
  }

  /**
   * 更新流动动画
   * @param {number} timestamp - 时间戳
   */
  updateFlowAnimations(timestamp) {
    this.animationManager.flowAnimations.forEach((animation, routeId) => {
      const elapsed = timestamp - animation.startTime
      animation.progress = (elapsed / animation.duration) % 1

      const cesiumEntity = this.cesiumEntities.get(routeId)
      if (cesiumEntity && cesiumEntity.polyline) {
        // 创建流动效果材质
        const flowMaterial = new Cesium.PolylineDashMaterialProperty({
          color: animation.color || Cesium.Color.CYAN,
          dashLength: animation.dashLength || 20,
          dashPattern: animation.dashPattern || 255,
          animationTime: animation.progress * animation.duration,
        })

        cesiumEntity.polyline.material = flowMaterial
      }
    })
  }

  /**
   * 更新脉冲动画
   * @param {number} timestamp - 时间戳
   */
  updatePulseAnimations(timestamp) {
    const toRemove = []

    this.animationManager.pulseAnimations.forEach((animation, routeId) => {
      const elapsed = timestamp - animation.startTime
      animation.progress = Math.min(elapsed / animation.duration, 1)

      if (animation.progress >= 1) {
        toRemove.push(routeId)
        return
      }

      // 使用正弦波创建脉冲效果
      const pulseValue = Math.sin(animation.progress * Math.PI * 2) * 2 + 3

      const cesiumEntity = this.cesiumEntities.get(routeId)
      if (cesiumEntity && cesiumEntity.polyline) {
        cesiumEntity.polyline.width = pulseValue
      }
    })

    // 清理完成的动画
    toRemove.forEach((routeId) => {
      this.animationManager.pulseAnimations.delete(routeId)
    })
  }

  /**
   * 启动动画
   */
  startAnimations() {
    // 为所有路线启动流动动画
    this.routes.forEach((route, routeId) => {
      if (route.enableFlow) {
        this.startFlowAnimation(routeId)
      }

      if (route.enablePulse) {
        this.startPulseAnimation(routeId)
      }
    })
  }

  /**
   * 启动流动动画
   * @param {string} routeId - 路线ID
   */
  startFlowAnimation(routeId) {
    const route = this.routes.get(routeId)
    if (!route) return

    const animation = {
      startTime: Date.now(),
      duration: route.flowDuration || 3000,
      color: route.flowColor || Cesium.Color.CYAN,
      dashLength: route.flowDashLength || 20,
      dashPattern: route.flowDashPattern || 255,
      progress: 0,
    }

    this.animationManager.flowAnimations.set(routeId, animation)
  }

  /**
   * 启动脉冲动画
   * @param {string} routeId - 路线ID
   */
  startPulseAnimation(routeId) {
    const animation = {
      startTime: Date.now(),
      duration: 2000,
      progress: 0,
    }

    this.animationManager.pulseAnimations.set(routeId, animation)
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

    this.routes.forEach((route, routeId) => {
      const newLOD = this.calculateLOD(route, cameraPosition)
      const currentLOD = this.lodManager.routeLOD.get(routeId)

      if (newLOD !== currentLOD) {
        this.setRouteLOD(routeId, newLOD)
      }
    })

    this.lodManager.lastUpdateTime = now
  }

  /**
   * 计算路线LOD级别
   * @param {Object} route - 路线数据
   * @param {Cesium.Cartesian3} cameraPosition - 相机位置
   * @returns {number} LOD级别
   */
  calculateLOD(route, cameraPosition = null) {
    if (!cameraPosition) {
      cameraPosition = this.viewer.camera.position
    }

    const routeCenter = route.center || this.calculateRouteCenter(route.positions)
    const distance = Cesium.Cartesian3.distance(cameraPosition, routeCenter)

    // 根据距离确定LOD级别
    for (let i = 0; i < this.lodManager.distances.length; i++) {
      if (distance <= this.lodManager.distances[i]) {
        return i
      }
    }

    return this.lodManager.distances.length
  }

  /**
   * 设置路线LOD级别
   * @param {string} routeId - 路线ID
   * @param {number} lodLevel - LOD级别
   */
  setRouteLOD(routeId, lodLevel) {
    const cesiumEntity = this.cesiumEntities.get(routeId)
    const arrowEntities = this.arrowEntities.get(routeId)
    const labelEntity = this.labelEntities.get(routeId)

    if (!cesiumEntity) return

    this.lodManager.routeLOD.set(routeId, lodLevel)

    // 根据LOD级别调整显示
    switch (lodLevel) {
      case 0: // 最近距离 - 显示所有细节
        this.setRouteVisible(cesiumEntity, true)
        this.setArrowsVisible(arrowEntities, true)
        this.setLabelVisible(labelEntity, true)
        break

      case 1: // 中等距离 - 显示主要元素
        this.setRouteVisible(cesiumEntity, true)
        this.setArrowsVisible(arrowEntities, true)
        this.setLabelVisible(labelEntity, false)
        break

      case 2: // 远距离 - 只显示路线
        this.setRouteVisible(cesiumEntity, true)
        this.setArrowsVisible(arrowEntities, false)
        this.setLabelVisible(labelEntity, false)
        break

      default: // 极远距离 - 隐藏
        this.setRouteVisible(cesiumEntity, false)
        this.setArrowsVisible(arrowEntities, false)
        this.setLabelVisible(labelEntity, false)
        break
    }
  }

  /**
   * 设置路线可见性
   * @param {Cesium.Entity} entity - 实体
   * @param {boolean} visible - 是否可见
   */
  setRouteVisible(entity, visible) {
    if (entity && entity.polyline) {
      entity.polyline.show = visible
    }
  }

  /**
   * 设置箭头可见性
   * @param {Array} arrowEntities - 箭头实体数组
   * @param {boolean} visible - 是否可见
   */
  setArrowsVisible(arrowEntities, visible) {
    if (arrowEntities) {
      arrowEntities.forEach((arrow) => {
        if (arrow.billboard) {
          arrow.billboard.show = visible
        }
      })
    }
  }

  /**
   * 设置标签可见性
   * @param {Cesium.Entity} labelEntity - 标签实体
   * @param {boolean} visible - 是否可见
   */
  setLabelVisible(labelEntity, visible) {
    if (labelEntity && labelEntity.label) {
      labelEntity.label.show = visible
    }
  }

  /**
   * 路线点击事件
   * @param {Object} event - 点击事件
   */
  onRouteClick(event) {
    const pickedObject = this.viewer.scene.pick(event.position)
    if (!pickedObject || !pickedObject.id) return

    const entityId = pickedObject.id.id || pickedObject.id
    const routeId = this.extractRouteId(entityId)
    const routeData = this.routes.get(routeId)

    if (routeData) {
      // 取消之前的选择
      if (this.interactionManager.selectedRoute) {
        this.setRouteSelected(this.interactionManager.selectedRoute, false)
      }

      // 设置新的选择
      this.interactionManager.selectedRoute = routeId
      this.setRouteSelected(routeId, true)

      // 触发选择事件
      this.onRouteSelected(routeData, event)
    }
  }

  /**
   * 路线悬停事件
   * @param {Object} event - 鼠标移动事件
   */
  onRouteHover(event) {
    const pickedObject = this.viewer.scene.pick(event.endPosition)
    const entityId = pickedObject && pickedObject.id ? pickedObject.id.id || pickedObject.id : null
    const routeId = entityId ? this.extractRouteId(entityId) : null

    // 取消之前的悬停
    if (this.interactionManager.hoveredRoute && this.interactionManager.hoveredRoute !== routeId) {
      this.setRouteHovered(this.interactionManager.hoveredRoute, false)
    }

    // 设置新的悬停
    if (routeId && routeId !== this.interactionManager.hoveredRoute) {
      this.interactionManager.hoveredRoute = routeId
      this.setRouteHovered(routeId, true)

      const routeData = this.routes.get(routeId)
      if (routeData) {
        this.onRouteHovered(routeData, event)
      }
    } else if (!routeId) {
      this.interactionManager.hoveredRoute = null
    }
  }

  /**
   * 提取路线ID
   * @param {string} entityId - 实体ID
   * @returns {string} 路线ID
   */
  extractRouteId(entityId) {
    // 移除后缀（_arrow_*, _label）
    return entityId.replace(/_arrow_\d+$/, '').replace(/_label$/, '')
  }

  /**
   * 设置路线选中状态
   * @param {string} routeId - 路线ID
   * @param {boolean} selected - 是否选中
   */
  setRouteSelected(routeId, selected) {
    this.updateRouteStyle(routeId)
  }

  /**
   * 设置路线悬停状态
   * @param {string} routeId - 路线ID
   * @param {boolean} hovered - 是否悬停
   */
  setRouteHovered(routeId, hovered) {
    const cesiumEntity = this.cesiumEntities.get(routeId)
    if (!cesiumEntity || !cesiumEntity.polyline) return

    if (hovered) {
      // 增加线宽
      const currentWidth = cesiumEntity.polyline.width || this.options.defaultWidth
      cesiumEntity.polyline.width = currentWidth + 2
    } else {
      // 恢复原始样式
      this.updateRouteStyle(routeId)
    }
  }

  /**
   * 路线选择事件（可重写）
   * @param {Object} route - 路线数据
   * @param {Object} clickEvent - 点击事件对象
   */
  onRouteSelected(route, clickEvent) {
    console.log('Route selected:', route)
  }

  /**
   * 路线悬停事件（可重写）
   * @param {Object} route - 路线数据
   * @param {Object} hoverEvent - 悬停事件对象
   */
  onRouteHovered(route, hoverEvent) {
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
   * 设置路线样式
   * @param {string} type - 路线类型
   * @param {Object} style - 样式配置
   */
  setRouteStyle(type, style) {
    this.routeStyles[type] = { ...this.routeStyles[type], ...style }

    // 更新现有路线的样式
    this.routes.forEach((route, routeId) => {
      if (route.type === type) {
        this.updateRouteStyle(routeId)
      }
    })
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    this.stats.totalRoutes = this.routes.size
    this.stats.visibleRoutes = Array.from(this.cesiumEntities.values()).filter((entity) => {
      return entity.polyline && entity.polyline.show
    }).length
    this.stats.animatingRoutes =
      this.animationManager.flowAnimations.size + this.animationManager.pulseAnimations.size
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * 获取路线
   * @param {string} routeId - 路线ID
   * @returns {Object|null} 路线数据
   */
  getRoute(routeId) {
    return this.routes.get(routeId) || null
  }

  /**
   * 获取所有路线
   * @returns {Array} 路线数组
   */
  getAllRoutes() {
    return Array.from(this.routes.values())
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
        Cesium.ScreenSpaceEventType.LEFT_CLICK,
      )
    }

    if (this.interactionManager.mouseMoveHandler) {
      this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.MOUSE_MOVE,
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

export default RouteRenderer
