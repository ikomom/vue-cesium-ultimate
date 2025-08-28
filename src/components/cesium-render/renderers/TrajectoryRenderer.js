/**
 * 轨迹渲染器 - 负责渲染动态轨迹线、路径动画和时间相关的轨迹数据
 * 支持实时轨迹、历史轨迹、路径预测、动画播放和性能优化
 */

class TrajectoryRenderer {
  constructor(options = {}) {
    this.viewer = options.viewer
    this.scene = this.viewer.scene
    this.factory = options.factory

    // 配置选项
    this.options = {
      enableRealtime: true,
      enableHistory: true,
      enablePrediction: true,
      enableAnimation: true,
      enableTrail: true,
      maxTrajectoryPoints: 1000,
      trailLength: 100,
      animationSpeed: 1.0,
      enableLOD: true,
      lodDistances: [5000, 20000, 50000],
      enableClustering: false,
      enableSelection: true,
      enableHover: true,
      ...options,
    }

    // 渲染状态
    this.isInitialized = false
    this.isAnimating = false
    this.animationTime = null

    // 轨迹管理
    this.trajectories = new Map() // trajectoryId -> trajectory
    this.cesiumEntities = new Map() // trajectoryId -> cesiumEntity
    this.animationEntities = new Map() // trajectoryId -> animationEntity
    this.trailEntities = new Map() // trajectoryId -> trailEntity

    // 数据源
    this.dataSource = new Cesium.CustomDataSource('TrajectoryRenderer')
    this.viewer.dataSources.add(this.dataSource)

    // 时间管理
    this.timeManager = {
      currentTime: null,
      startTime: null,
      endTime: null,
      timeRange: null,
      playbackRate: 1.0,
      isPlaying: false,
    }

    // 动画管理
    this.animationManager = {
      activeAnimations: new Map(),
      animationQueue: [],
      frameRate: 60,
      lastFrameTime: 0,
    }

    // LOD管理
    this.lodManager = {
      enabled: this.options.enableLOD,
      distances: this.options.lodDistances,
      trajectoryLOD: new Map(), // trajectoryId -> lodLevel
      lastUpdateTime: 0,
      updateInterval: 200,
    }

    // 轨迹样式
    this.styles = {
      realtime: {
        color: Cesium.Color.LIME,
        width: 3,
        material: Cesium.Color.LIME.withAlpha(0.8),
      },
      history: {
        color: Cesium.Color.CYAN,
        width: 2,
        material: Cesium.Color.CYAN.withAlpha(0.6),
      },
      prediction: {
        color: Cesium.Color.YELLOW,
        width: 2,
        material: Cesium.Color.YELLOW.withAlpha(0.5),
        dashLength: 16,
        dashPattern: 255,
      },
      selected: {
        color: Cesium.Color.RED,
        width: 4,
        material: Cesium.Color.RED.withAlpha(0.9),
      },
    }

    // 交互管理
    this.interactionManager = {
      selectedTrajectory: null,
      hoveredTrajectory: null,
      clickHandler: null,
      mouseMoveHandler: null,
    }

    // 性能统计
    this.stats = {
      totalTrajectories: 0,
      visibleTrajectories: 0,
      animatingTrajectories: 0,
      totalPoints: 0,
      renderTime: 0,
      animationTime: 0,
    }

    this.init()
  }

  /**
   * 初始化渲染器
   */
  init() {
    // 设置时间管理
    this.initTimeManager()

    // 设置动画管理
    this.initAnimationManager()

    // 设置交互
    if (this.options.enableSelection || this.options.enableHover) {
      this.initInteraction()
    }

    // 监听相机变化
    this.viewer.camera.changed.addEventListener(this.onCameraChanged.bind(this))

    // 监听时钟变化
    this.viewer.clock.onTick.addEventListener(this.onClockTick.bind(this))

    this.isInitialized = true
  }

  /**
   * 初始化时间管理
   */
  initTimeManager() {
    this.timeManager.currentTime = this.viewer.clock.currentTime.clone()
    this.timeManager.startTime = this.viewer.clock.startTime.clone()
    this.timeManager.endTime = this.viewer.clock.stopTime.clone()
    this.timeManager.timeRange = Cesium.TimeInterval.fromIso8601({
      iso8601: `${this.timeManager.startTime.toString()}/${this.timeManager.endTime.toString()}`,
    })
  }

  /**
   * 初始化动画管理
   */
  initAnimationManager() {
    // 启动动画循环
    this.startAnimationLoop()
  }

  /**
   * 初始化交互
   */
  initInteraction() {
    // 点击事件
    if (this.options.enableSelection) {
      this.interactionManager.clickHandler =
        this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
          this.onTrajectoryClick.bind(this),
          Cesium.ScreenSpaceEventType.LEFT_CLICK,
        )
    }

    // 鼠标移动事件
    if (this.options.enableHover) {
      this.interactionManager.mouseMoveHandler =
        this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
          this.onTrajectoryHover.bind(this),
          Cesium.ScreenSpaceEventType.MOUSE_MOVE,
        )
    }
  }

  /**
   * 渲染轨迹
   * @param {Array} trajectories - 轨迹数组
   * @param {Object} options - 渲染选项
   * @returns {Promise} 渲染结果
   */
  async render(trajectories, options = {}) {
    const startTime = performance.now()

    try {
      // 清理现有轨迹
      if (options.clearExisting !== false) {
        this.clear()
      }

      // 批量添加轨迹
      await this.addTrajectories(trajectories, options)

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
        trajectoryCount: trajectories.length,
        renderTime: performance.now() - startTime,
      }
    } catch (error) {
      console.error('Trajectory render error:', error)
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
   * 批量添加轨迹
   * @param {Array} trajectories - 轨迹数组
   * @param {Object} options - 选项
   */
  async addTrajectories(trajectories, options = {}) {
    const batchSize = options.batchSize || 50

    for (let i = 0; i < trajectories.length; i += batchSize) {
      const batch = trajectories.slice(i, i + batchSize)

      // 处理批次
      await this.processBatch(batch, options)

      // 让出控制权
      if (i + batchSize < trajectories.length) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }
  }

  /**
   * 处理轨迹批次
   * @param {Array} batch - 轨迹批次
   * @param {Object} options - 选项
   */
  async processBatch(batch, options) {
    batch.forEach((trajectory) => {
      try {
        this.addTrajectory(trajectory, options)
      } catch (error) {
        console.warn('Failed to add trajectory:', trajectory.id, error)
      }
    })
  }

  /**
   * 添加单个轨迹
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} options - 选项
   */
  addTrajectory(trajectory, options = {}) {
    if (!trajectory.id || !trajectory.points || trajectory.points.length < 2) {
      throw new Error('Trajectory must have id and at least 2 points')
    }

    // 检查是否已存在
    if (this.trajectories.has(trajectory.id)) {
      this.updateTrajectory(trajectory, options)
      return
    }

    // 处理轨迹点
    const processedTrajectory = this.processTrajectory(trajectory)

    // 创建Cesium实体
    const cesiumEntity = this.createCesiumTrajectory(processedTrajectory, options)

    // 添加到数据源
    this.dataSource.entities.add(cesiumEntity)

    // 创建动画实体（如果需要）
    if (this.options.enableAnimation && processedTrajectory.animated) {
      const animationEntity = this.createAnimationEntity(processedTrajectory, options)
      if (animationEntity) {
        this.dataSource.entities.add(animationEntity)
        this.animationEntities.set(trajectory.id, animationEntity)
      }
    }

    // 创建轨迹尾迹（如果需要）
    if (this.options.enableTrail && processedTrajectory.showTrail) {
      const trailEntity = this.createTrailEntity(processedTrajectory, options)
      if (trailEntity) {
        this.dataSource.entities.add(trailEntity)
        this.trailEntities.set(trajectory.id, trailEntity)
      }
    }

    // 存储引用
    this.trajectories.set(trajectory.id, processedTrajectory)
    this.cesiumEntities.set(trajectory.id, cesiumEntity)

    // 设置初始LOD
    if (this.lodManager.enabled) {
      this.setTrajectoryLOD(trajectory.id, this.calculateLOD(processedTrajectory))
    }
  }

  /**
   * 处理轨迹数据
   * @param {Object} trajectory - 原始轨迹数据
   * @returns {Object} 处理后的轨迹数据
   */
  processTrajectory(trajectory) {
    const processed = {
      ...trajectory,
      positions: [],
      times: [],
      segments: [],
    }

    // 处理轨迹点
    trajectory.points.forEach((point, index) => {
      const position = Cesium.Cartesian3.fromDegrees(
        point.longitude,
        point.latitude,
        point.height || 0,
      )

      processed.positions.push(position)

      // 处理时间
      if (point.time) {
        processed.times.push(Cesium.JulianDate.fromIso8601(point.time))
      } else {
        // 如果没有时间，使用索引生成时间
        const time = Cesium.JulianDate.addSeconds(
          this.timeManager.startTime,
          index * 10, // 每10秒一个点
          new Cesium.JulianDate(),
        )
        processed.times.push(time)
      }
    })

    // 分段处理（实时、历史、预测）
    this.segmentTrajectory(processed)

    return processed
  }

  /**
   * 分段轨迹
   * @param {Object} trajectory - 轨迹数据
   */
  segmentTrajectory(trajectory) {
    const currentTime = this.timeManager.currentTime
    const segments = {
      history: { positions: [], times: [], indices: [] },
      realtime: { positions: [], times: [], indices: [] },
      prediction: { positions: [], times: [], indices: [] },
    }

    trajectory.times.forEach((time, index) => {
      const comparison = Cesium.JulianDate.compare(time, currentTime)

      if (comparison < 0) {
        // 历史数据
        segments.history.positions.push(trajectory.positions[index])
        segments.history.times.push(time)
        segments.history.indices.push(index)
      } else if (comparison === 0) {
        // 实时数据
        segments.realtime.positions.push(trajectory.positions[index])
        segments.realtime.times.push(time)
        segments.realtime.indices.push(index)
      } else {
        // 预测数据
        segments.prediction.positions.push(trajectory.positions[index])
        segments.prediction.times.push(time)
        segments.prediction.indices.push(index)
      }
    })

    trajectory.segments = segments
  }

  /**
   * 创建Cesium轨迹实体
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity} Cesium实体
   */
  createCesiumTrajectory(trajectory, options) {
    const cesiumEntity = new Cesium.Entity({
      id: trajectory.id,
      properties: trajectory.properties || {},
    })

    // 创建轨迹线
    if (trajectory.positions.length >= 2) {
      cesiumEntity.polyline = this.createPolyline(trajectory, options)
    }

    // 创建轨迹点（起点和终点）
    if (trajectory.showPoints !== false) {
      this.addTrajectoryPoints(cesiumEntity, trajectory, options)
    }

    return cesiumEntity
  }

  /**
   * 创建轨迹线
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} options - 选项
   * @returns {Object} Polyline配置
   */
  createPolyline(trajectory, options) {
    const style = this.getTrajectoryStyle(trajectory)

    const polyline = {
      positions: trajectory.positions,
      width: trajectory.width || style.width,
      material: this.createTrajectoryMaterial(trajectory, style),
      clampToGround: trajectory.clampToGround || false,
      show: trajectory.visible !== false,
    }

    // 高度参考
    if (trajectory.heightReference) {
      polyline.heightReference = this.parseHeightReference(trajectory.heightReference)
    }

    // 距离显示条件
    if (trajectory.distanceDisplayCondition) {
      polyline.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(
        trajectory.distanceDisplayCondition.near || 0,
        trajectory.distanceDisplayCondition.far || Number.MAX_VALUE,
      )
    }

    return polyline
  }

  /**
   * 创建轨迹材质
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} style - 样式配置
   * @returns {Cesium.Material} 材质
   */
  createTrajectoryMaterial(trajectory, style) {
    const type = trajectory.type || 'realtime'

    switch (type) {
      case 'history':
        return this.createGradientMaterial(trajectory, style)

      case 'prediction':
        return this.createDashedMaterial(trajectory, style)

      case 'realtime':
      default:
        return style.material || Cesium.Color.LIME.withAlpha(0.8)
    }
  }

  /**
   * 创建渐变材质
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} style - 样式配置
   * @returns {Cesium.Material} 渐变材质
   */
  createGradientMaterial(trajectory, style) {
    // 创建渐变材质，从起点到终点颜色渐变
    return new Cesium.PolylineGradientMaterial({
      color: style.color || Cesium.Color.CYAN,
      glow: 0.2,
      taperPower: 0.5,
    })
  }

  /**
   * 创建虚线材质
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} style - 样式配置
   * @returns {Cesium.Material} 虚线材质
   */
  createDashedMaterial(trajectory, style) {
    return new Cesium.PolylineDashMaterial({
      color: style.color || Cesium.Color.YELLOW,
      dashLength: style.dashLength || 16,
      dashPattern: style.dashPattern || 255,
    })
  }

  /**
   * 添加轨迹点
   * @param {Cesium.Entity} cesiumEntity - Cesium实体
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} options - 选项
   */
  addTrajectoryPoints(cesiumEntity, trajectory, options) {
    // 起点
    if (trajectory.positions.length > 0) {
      const startPoint = new Cesium.Entity({
        id: `${trajectory.id}_start`,
        position: trajectory.positions[0],
        point: {
          pixelSize: 8,
          color: Cesium.Color.GREEN,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: '起点',
          font: '12pt sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -30),
          show: trajectory.showLabels !== false,
        },
      })

      this.dataSource.entities.add(startPoint)
    }

    // 终点
    if (trajectory.positions.length > 1) {
      const endPoint = new Cesium.Entity({
        id: `${trajectory.id}_end`,
        position: trajectory.positions[trajectory.positions.length - 1],
        point: {
          pixelSize: 8,
          color: Cesium.Color.RED,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: '终点',
          font: '12pt sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -30),
          show: trajectory.showLabels !== false,
        },
      })

      this.dataSource.entities.add(endPoint)
    }
  }

  /**
   * 创建动画实体
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity|null} 动画实体
   */
  createAnimationEntity(trajectory, options) {
    if (!trajectory.times || trajectory.times.length === 0) {
      return null
    }

    // 创建时间-位置属性
    const positionProperty = new Cesium.SampledPositionProperty()

    trajectory.positions.forEach((position, index) => {
      if (trajectory.times[index]) {
        positionProperty.addSample(trajectory.times[index], position)
      }
    })

    // 设置插值
    positionProperty.setInterpolationOptions({
      interpolationDegree: 2,
      interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
    })

    const animationEntity = new Cesium.Entity({
      id: `${trajectory.id}_animation`,
      position: positionProperty,
      availability: new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({
          start: trajectory.times[0],
          stop: trajectory.times[trajectory.times.length - 1],
        }),
      ]),
      properties: trajectory.properties || {},
    })

    // 添加移动对象（飞机、船只等）
    if (trajectory.model) {
      animationEntity.model = this.createAnimationModel(trajectory, options)
    } else {
      animationEntity.billboard = this.createAnimationBillboard(trajectory, options)
    }

    // 添加路径显示
    if (trajectory.showPath !== false) {
      animationEntity.path = this.createAnimationPath(trajectory, options)
    }

    return animationEntity
  }

  /**
   * 创建动画模型
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} options - 选项
   * @returns {Object} 模型配置
   */
  createAnimationModel(trajectory, options) {
    return {
      uri: trajectory.model.uri,
      scale: trajectory.model.scale || 1.0,
      minimumPixelSize: trajectory.model.minimumPixelSize || 64,
      maximumScale: trajectory.model.maximumScale || 20000,
      incrementallyLoadTextures: true,
      runAnimations: trajectory.model.runAnimations !== false,
      clampAnimations: trajectory.model.clampAnimations !== false,
      shadows: trajectory.model.shadows || Cesium.ShadowMode.ENABLED,
      heightReference: this.parseHeightReference(trajectory.model.heightReference || 'none'),
      silhouetteColor: trajectory.model.silhouetteColor
        ? Cesium.Color.fromCssColorString(trajectory.model.silhouetteColor)
        : undefined,
      silhouetteSize: trajectory.model.silhouetteSize || 0,
      color: trajectory.model.color
        ? Cesium.Color.fromCssColorString(trajectory.model.color)
        : Cesium.Color.WHITE,
      colorBlendMode: trajectory.model.colorBlendMode || Cesium.ColorBlendMode.HIGHLIGHT,
      colorBlendAmount: trajectory.model.colorBlendAmount || 0.5,
    }
  }

  /**
   * 创建动画Billboard
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} options - 选项
   * @returns {Object} Billboard配置
   */
  createAnimationBillboard(trajectory, options) {
    return {
      image: trajectory.icon || this.getDefaultTrajectoryIcon(trajectory),
      scale: trajectory.iconScale || 1.0,
      color: trajectory.iconColor
        ? Cesium.Color.fromCssColorString(trajectory.iconColor)
        : Cesium.Color.WHITE,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      alignedAxis: Cesium.Cartesian3.UNIT_Z,
      rotation: trajectory.rotation || 0,
      show: trajectory.showIcon !== false,
    }
  }

  /**
   * 创建动画路径
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} options - 选项
   * @returns {Object} 路径配置
   */
  createAnimationPath(trajectory, options) {
    return {
      material: trajectory.pathColor
        ? Cesium.Color.fromCssColorString(trajectory.pathColor)
        : Cesium.Color.YELLOW.withAlpha(0.8),
      width: trajectory.pathWidth || 2,
      leadTime: trajectory.pathLeadTime || 0,
      trailTime: trajectory.pathTrailTime || 60,
      resolution: trajectory.pathResolution || 1,
      show: trajectory.showPath !== false,
    }
  }

  /**
   * 创建轨迹尾迹
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity|null} 尾迹实体
   */
  createTrailEntity(trajectory, options) {
    if (!this.options.enableTrail || trajectory.positions.length < 2) {
      return null
    }

    const trailLength = Math.min(trajectory.positions.length, this.options.trailLength)
    const trailPositions = trajectory.positions.slice(-trailLength)

    const trailEntity = new Cesium.Entity({
      id: `${trajectory.id}_trail`,
      polyline: {
        positions: trailPositions,
        width: (trajectory.width || 2) * 0.5,
        material: new Cesium.PolylineGradientMaterial({
          color: trajectory.trailColor
            ? Cesium.Color.fromCssColorString(trajectory.trailColor)
            : Cesium.Color.WHITE,
          glow: 0.1,
          taperPower: 2.0,
        }),
        clampToGround: trajectory.clampToGround || false,
        show: trajectory.showTrail !== false,
      },
    })

    return trailEntity
  }

  /**
   * 获取轨迹样式
   * @param {Object} trajectory - 轨迹数据
   * @returns {Object} 样式配置
   */
  getTrajectoryStyle(trajectory) {
    const type = trajectory.type || 'realtime'
    const isSelected = this.interactionManager.selectedTrajectory === trajectory.id

    if (isSelected) {
      return this.styles.selected
    }

    return this.styles[type] || this.styles.realtime
  }

  /**
   * 获取默认轨迹图标
   * @param {Object} trajectory - 轨迹数据
   * @returns {string} 图标URL
   */
  getDefaultTrajectoryIcon(trajectory) {
    const type = trajectory.entityType || 'default'

    const iconMap = {
      ship: '/icons/ship-moving.png',
      aircraft: '/icons/aircraft-moving.png',
      vehicle: '/icons/vehicle-moving.png',
      person: '/icons/person-moving.png',
      default: '/icons/trajectory-moving.png',
    }

    return iconMap[type] || iconMap['default']
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
   * 更新轨迹
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} options - 选项
   */
  updateTrajectory(trajectory, options = {}) {
    const cesiumEntity = this.cesiumEntities.get(trajectory.id)
    if (!cesiumEntity) return

    // 处理新的轨迹数据
    const processedTrajectory = this.processTrajectory(trajectory)

    // 更新轨迹线
    if (cesiumEntity.polyline && processedTrajectory.positions.length >= 2) {
      cesiumEntity.polyline.positions = processedTrajectory.positions
      cesiumEntity.polyline.material = this.createTrajectoryMaterial(
        processedTrajectory,
        this.getTrajectoryStyle(processedTrajectory),
      )
    }

    // 更新动画实体
    const animationEntity = this.animationEntities.get(trajectory.id)
    if (animationEntity && processedTrajectory.times) {
      this.updateAnimationEntity(animationEntity, processedTrajectory)
    }

    // 更新尾迹实体
    const trailEntity = this.trailEntities.get(trajectory.id)
    if (trailEntity) {
      this.updateTrailEntity(trailEntity, processedTrajectory)
    }

    // 更新存储的轨迹数据
    this.trajectories.set(trajectory.id, processedTrajectory)

    // 更新LOD
    if (this.lodManager.enabled) {
      this.setTrajectoryLOD(trajectory.id, this.calculateLOD(processedTrajectory))
    }
  }

  /**
   * 更新动画实体
   * @param {Cesium.Entity} animationEntity - 动画实体
   * @param {Object} trajectory - 轨迹数据
   */
  updateAnimationEntity(animationEntity, trajectory) {
    // 更新位置属性
    const positionProperty = new Cesium.SampledPositionProperty()

    trajectory.positions.forEach((position, index) => {
      if (trajectory.times[index]) {
        positionProperty.addSample(trajectory.times[index], position)
      }
    })

    positionProperty.setInterpolationOptions({
      interpolationDegree: 2,
      interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
    })

    animationEntity.position = positionProperty

    // 更新可用性
    animationEntity.availability = new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: trajectory.times[0],
        stop: trajectory.times[trajectory.times.length - 1],
      }),
    ])
  }

  /**
   * 更新尾迹实体
   * @param {Cesium.Entity} trailEntity - 尾迹实体
   * @param {Object} trajectory - 轨迹数据
   */
  updateTrailEntity(trailEntity, trajectory) {
    const trailLength = Math.min(trajectory.positions.length, this.options.trailLength)
    const trailPositions = trajectory.positions.slice(-trailLength)

    if (trailEntity.polyline) {
      trailEntity.polyline.positions = trailPositions
    }
  }

  /**
   * 移除轨迹
   * @param {string} trajectoryId - 轨迹ID
   */
  removeTrajectory(trajectoryId) {
    // 移除主实体
    const cesiumEntity = this.cesiumEntities.get(trajectoryId)
    if (cesiumEntity) {
      this.dataSource.entities.remove(cesiumEntity)
      this.cesiumEntities.delete(trajectoryId)
    }

    // 移除动画实体
    const animationEntity = this.animationEntities.get(trajectoryId)
    if (animationEntity) {
      this.dataSource.entities.remove(animationEntity)
      this.animationEntities.delete(trajectoryId)
    }

    // 移除尾迹实体
    const trailEntity = this.trailEntities.get(trajectoryId)
    if (trailEntity) {
      this.dataSource.entities.remove(trailEntity)
      this.trailEntities.delete(trajectoryId)
    }

    // 移除起点终点
    const startPoint = this.dataSource.entities.getById(`${trajectoryId}_start`)
    if (startPoint) {
      this.dataSource.entities.remove(startPoint)
    }

    const endPoint = this.dataSource.entities.getById(`${trajectoryId}_end`)
    if (endPoint) {
      this.dataSource.entities.remove(endPoint)
    }

    // 清理数据
    this.trajectories.delete(trajectoryId)
    this.lodManager.trajectoryLOD.delete(trajectoryId)
    this.animationManager.activeAnimations.delete(trajectoryId)
  }

  /**
   * 批量移除轨迹
   * @param {Array} trajectoryIds - 轨迹ID数组
   */
  removeTrajectories(trajectoryIds) {
    trajectoryIds.forEach((trajectoryId) => this.removeTrajectory(trajectoryId))
  }

  /**
   * 清空所有轨迹
   */
  clear() {
    this.dataSource.entities.removeAll()
    this.trajectories.clear()
    this.cesiumEntities.clear()
    this.animationEntities.clear()
    this.trailEntities.clear()
    this.lodManager.trajectoryLOD.clear()
    this.animationManager.activeAnimations.clear()
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

    // 更新动画队列
    this.processAnimationQueue()

    // 更新活动动画
    this.animationManager.activeAnimations.forEach((animation, trajectoryId) => {
      this.updateAnimation(trajectoryId, animation, timestamp)
    })

    this.stats.animationTime = performance.now() - startTime
  }

  /**
   * 处理动画队列
   */
  processAnimationQueue() {
    while (this.animationManager.animationQueue.length > 0) {
      const animation = this.animationManager.animationQueue.shift()
      this.animationManager.activeAnimations.set(animation.trajectoryId, animation)
    }
  }

  /**
   * 更新单个动画
   * @param {string} trajectoryId - 轨迹ID
   * @param {Object} animation - 动画对象
   * @param {number} timestamp - 时间戳
   */
  updateAnimation(trajectoryId, animation, timestamp) {
    // 动画逻辑实现
    // 这里可以添加自定义动画效果
  }

  /**
   * 启动动画
   */
  startAnimations() {
    this.trajectories.forEach((trajectory, trajectoryId) => {
      if (trajectory.animated && this.animationEntities.has(trajectoryId)) {
        this.startTrajectoryAnimation(trajectoryId)
      }
    })
  }

  /**
   * 启动轨迹动画
   * @param {string} trajectoryId - 轨迹ID
   */
  startTrajectoryAnimation(trajectoryId) {
    const trajectory = this.trajectories.get(trajectoryId)
    if (!trajectory || !trajectory.times) return

    const animation = {
      trajectoryId,
      startTime: trajectory.times[0],
      endTime: trajectory.times[trajectory.times.length - 1],
      duration: Cesium.JulianDate.secondsDifference(
        trajectory.times[trajectory.times.length - 1],
        trajectory.times[0],
      ),
      isPlaying: true,
      currentTime: trajectory.times[0],
    }

    this.animationManager.animationQueue.push(animation)
  }

  /**
   * 停止动画
   */
  stopAnimations() {
    this.animationManager.activeAnimations.clear()
    this.animationManager.animationQueue = []
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

    this.trajectories.forEach((trajectory, trajectoryId) => {
      const newLOD = this.calculateLOD(trajectory, cameraPosition)
      const currentLOD = this.lodManager.trajectoryLOD.get(trajectoryId)

      if (newLOD !== currentLOD) {
        this.setTrajectoryLOD(trajectoryId, newLOD)
      }
    })

    this.lodManager.lastUpdateTime = now
  }

  /**
   * 计算轨迹LOD级别
   * @param {Object} trajectory - 轨迹数据
   * @param {Cesium.Cartesian3} cameraPosition - 相机位置
   * @returns {number} LOD级别
   */
  calculateLOD(trajectory, cameraPosition = null) {
    if (!cameraPosition) {
      cameraPosition = this.viewer.camera.position
    }

    // 计算轨迹中心点
    const center = this.calculateTrajectoryCenter(trajectory)
    const distance = Cesium.Cartesian3.distance(cameraPosition, center)

    // 根据距离确定LOD级别
    for (let i = 0; i < this.lodManager.distances.length; i++) {
      if (distance <= this.lodManager.distances[i]) {
        return i
      }
    }

    return this.lodManager.distances.length
  }

  /**
   * 计算轨迹中心点
   * @param {Object} trajectory - 轨迹数据
   * @returns {Cesium.Cartesian3} 中心点
   */
  calculateTrajectoryCenter(trajectory) {
    if (trajectory.positions.length === 0) {
      return Cesium.Cartesian3.ZERO
    }

    const sum = trajectory.positions.reduce((acc, pos) => {
      return Cesium.Cartesian3.add(acc, pos, new Cesium.Cartesian3())
    }, Cesium.Cartesian3.ZERO)

    return Cesium.Cartesian3.divideByScalar(
      sum,
      trajectory.positions.length,
      new Cesium.Cartesian3(),
    )
  }

  /**
   * 设置轨迹LOD级别
   * @param {string} trajectoryId - 轨迹ID
   * @param {number} lodLevel - LOD级别
   */
  setTrajectoryLOD(trajectoryId, lodLevel) {
    const cesiumEntity = this.cesiumEntities.get(trajectoryId)
    if (!cesiumEntity) return

    this.lodManager.trajectoryLOD.set(trajectoryId, lodLevel)

    // 根据LOD级别调整显示
    switch (lodLevel) {
      case 0: // 最近距离 - 显示所有细节
        if (cesiumEntity.polyline) cesiumEntity.polyline.show = true
        this.setTrajectoryPointsVisible(trajectoryId, true)
        this.setAnimationEntityVisible(trajectoryId, true)
        this.setTrailEntityVisible(trajectoryId, true)
        break

      case 1: // 中等距离 - 显示主要元素
        if (cesiumEntity.polyline) cesiumEntity.polyline.show = true
        this.setTrajectoryPointsVisible(trajectoryId, false)
        this.setAnimationEntityVisible(trajectoryId, true)
        this.setTrailEntityVisible(trajectoryId, false)
        break

      case 2: // 远距离 - 只显示轨迹线
        if (cesiumEntity.polyline) cesiumEntity.polyline.show = true
        this.setTrajectoryPointsVisible(trajectoryId, false)
        this.setAnimationEntityVisible(trajectoryId, false)
        this.setTrailEntityVisible(trajectoryId, false)
        break

      default: // 极远距离 - 隐藏
        if (cesiumEntity.polyline) cesiumEntity.polyline.show = false
        this.setTrajectoryPointsVisible(trajectoryId, false)
        this.setAnimationEntityVisible(trajectoryId, false)
        this.setTrailEntityVisible(trajectoryId, false)
        break
    }
  }

  /**
   * 设置轨迹点可见性
   * @param {string} trajectoryId - 轨迹ID
   * @param {boolean} visible - 是否可见
   */
  setTrajectoryPointsVisible(trajectoryId, visible) {
    const startPoint = this.dataSource.entities.getById(`${trajectoryId}_start`)
    if (startPoint && startPoint.point) {
      startPoint.point.show = visible
    }
    if (startPoint && startPoint.label) {
      startPoint.label.show = visible
    }

    const endPoint = this.dataSource.entities.getById(`${trajectoryId}_end`)
    if (endPoint && endPoint.point) {
      endPoint.point.show = visible
    }
    if (endPoint && endPoint.label) {
      endPoint.label.show = visible
    }
  }

  /**
   * 设置动画实体可见性
   * @param {string} trajectoryId - 轨迹ID
   * @param {boolean} visible - 是否可见
   */
  setAnimationEntityVisible(trajectoryId, visible) {
    const animationEntity = this.animationEntities.get(trajectoryId)
    if (!animationEntity) return

    if (animationEntity.billboard) {
      animationEntity.billboard.show = visible
    }

    if (animationEntity.model) {
      animationEntity.model.show = visible
    }

    if (animationEntity.path) {
      animationEntity.path.show = visible
    }
  }

  /**
   * 设置尾迹实体可见性
   * @param {string} trajectoryId - 轨迹ID
   * @param {boolean} visible - 是否可见
   */
  setTrailEntityVisible(trajectoryId, visible) {
    const trailEntity = this.trailEntities.get(trajectoryId)
    if (trailEntity && trailEntity.polyline) {
      trailEntity.polyline.show = visible
    }
  }

  /**
   * 轨迹点击事件
   * @param {Object} event - 点击事件
   */
  onTrajectoryClick(event) {
    const pickedObject = this.viewer.scene.pick(event.position)
    if (!pickedObject || !pickedObject.id) return

    const entityId = pickedObject.id.id || pickedObject.id
    const trajectoryId = this.extractTrajectoryId(entityId)
    const trajectory = this.trajectories.get(trajectoryId)

    if (trajectory) {
      // 取消之前的选择
      if (this.interactionManager.selectedTrajectory) {
        this.setTrajectorySelected(this.interactionManager.selectedTrajectory, false)
      }

      // 设置新的选择
      this.interactionManager.selectedTrajectory = trajectoryId
      this.setTrajectorySelected(trajectoryId, true)

      // 触发选择事件
      this.onTrajectorySelected(trajectory, event)
    }
  }

  /**
   * 轨迹悬停事件
   * @param {Object} event - 鼠标移动事件
   */
  onTrajectoryHover(event) {
    const pickedObject = this.viewer.scene.pick(event.endPosition)
    const entityId = pickedObject && pickedObject.id ? pickedObject.id.id || pickedObject.id : null
    const trajectoryId = entityId ? this.extractTrajectoryId(entityId) : null

    // 取消之前的悬停
    if (
      this.interactionManager.hoveredTrajectory &&
      this.interactionManager.hoveredTrajectory !== trajectoryId
    ) {
      this.setTrajectoryHovered(this.interactionManager.hoveredTrajectory, false)
    }

    // 设置新的悬停
    if (trajectoryId && trajectoryId !== this.interactionManager.hoveredTrajectory) {
      this.interactionManager.hoveredTrajectory = trajectoryId
      this.setTrajectoryHovered(trajectoryId, true)

      const trajectory = this.trajectories.get(trajectoryId)
      if (trajectory) {
        this.onTrajectoryHovered(trajectory, event)
      }
    } else if (!trajectoryId) {
      this.interactionManager.hoveredTrajectory = null
    }
  }

  /**
   * 提取轨迹ID
   * @param {string} entityId - 实体ID
   * @returns {string} 轨迹ID
   */
  extractTrajectoryId(entityId) {
    // 移除后缀（_start, _end, _animation, _trail）
    return entityId.replace(/_(start|end|animation|trail)$/, '')
  }

  /**
   * 设置轨迹选中状态
   * @param {string} trajectoryId - 轨迹ID
   * @param {boolean} selected - 是否选中
   */
  setTrajectorySelected(trajectoryId, selected) {
    const cesiumEntity = this.cesiumEntities.get(trajectoryId)
    if (!cesiumEntity || !cesiumEntity.polyline) return

    if (selected) {
      cesiumEntity.polyline.material = this.styles.selected.material
      cesiumEntity.polyline.width = this.styles.selected.width
    } else {
      const trajectory = this.trajectories.get(trajectoryId)
      if (trajectory) {
        const style = this.getTrajectoryStyle(trajectory)
        cesiumEntity.polyline.material = this.createTrajectoryMaterial(trajectory, style)
        cesiumEntity.polyline.width = trajectory.width || style.width
      }
    }
  }

  /**
   * 设置轨迹悬停状态
   * @param {string} trajectoryId - 轨迹ID
   * @param {boolean} hovered - 是否悬停
   */
  setTrajectoryHovered(trajectoryId, hovered) {
    const cesiumEntity = this.cesiumEntities.get(trajectoryId)
    if (!cesiumEntity || !cesiumEntity.polyline) return

    if (hovered) {
      cesiumEntity.polyline.width = (cesiumEntity.polyline.width || 2) * 1.5
    } else {
      const trajectory = this.trajectories.get(trajectoryId)
      if (trajectory) {
        const style = this.getTrajectoryStyle(trajectory)
        cesiumEntity.polyline.width = trajectory.width || style.width
      }
    }
  }

  /**
   * 轨迹选择事件（可重写）
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} event - 事件对象
   */
  onTrajectorySelected(trajectory, event) {
    console.log('Trajectory selected:', trajectory)
  }

  /**
   * 轨迹悬停事件（可重写）
   * @param {Object} trajectory - 轨迹数据
   * @param {Object} event - 事件对象
   */
  onTrajectoryHovered(trajectory, event) {
    // 可以在这里显示tooltip等
  }

  /**
   * 时钟tick事件
   * @param {Cesium.Clock} clock - 时钟对象
   */
  onClockTick(clock) {
    this.timeManager.currentTime = clock.currentTime.clone()

    // 更新时间相关的轨迹显示
    this.updateTimeBasedDisplay()
  }

  /**
   * 更新基于时间的显示
   */
  updateTimeBasedDisplay() {
    // 根据当前时间更新轨迹的可见性和样式
    this.trajectories.forEach((trajectory, trajectoryId) => {
      this.updateTrajectoryTimeDisplay(trajectoryId, trajectory)
    })
  }

  /**
   * 更新轨迹时间显示
   * @param {string} trajectoryId - 轨迹ID
   * @param {Object} trajectory - 轨迹数据
   */
  updateTrajectoryTimeDisplay(trajectoryId, trajectory) {
    if (!trajectory.times || trajectory.times.length === 0) return

    const currentTime = this.timeManager.currentTime
    const animationEntity = this.animationEntities.get(trajectoryId)

    if (animationEntity && animationEntity.availability) {
      const isVisible = animationEntity.availability.contains(currentTime)

      if (animationEntity.billboard) {
        animationEntity.billboard.show = isVisible
      }

      if (animationEntity.model) {
        animationEntity.model.show = isVisible
      }
    }
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
   * 更新统计信息
   */
  updateStats() {
    this.stats.totalTrajectories = this.trajectories.size
    this.stats.visibleTrajectories = Array.from(this.cesiumEntities.values()).filter((entity) => {
      return entity.polyline && entity.polyline.show
    }).length
    this.stats.animatingTrajectories = this.animationManager.activeAnimations.size
    this.stats.totalPoints = Array.from(this.trajectories.values()).reduce((sum, trajectory) => {
      return sum + (trajectory.positions ? trajectory.positions.length : 0)
    }, 0)
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * 获取轨迹
   * @param {string} trajectoryId - 轨迹ID
   * @returns {Object|null} 轨迹数据
   */
  getTrajectory(trajectoryId) {
    return this.trajectories.get(trajectoryId) || null
  }

  /**
   * 获取所有轨迹
   * @returns {Array} 轨迹数组
   */
  getAllTrajectories() {
    return Array.from(this.trajectories.values())
  }

  /**
   * 检查是否可以销毁
   * @returns {boolean} 是否可以销毁
   */
  canDestroy() {
    return this.trajectories.size === 0
  }

  /**
   * 销毁渲染器
   */
  destroy() {
    // 停止动画
    this.isAnimating = false
    this.stopAnimations()

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

    // 移除相机和时钟监听
    this.viewer.camera.changed.removeEventListener(this.onCameraChanged)
    this.viewer.clock.onTick.removeEventListener(this.onClockTick)

    // 清理数据源
    this.viewer.dataSources.remove(this.dataSource)

    // 清理数据
    this.clear()
  }
}

export default TrajectoryRenderer
