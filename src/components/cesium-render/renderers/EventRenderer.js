/**
 * 事件渲染器 - 负责渲染时间相关的事件数据
 * 支持时间轴播放、事件动画、时间范围过滤和动态更新
 */

class EventRenderer {
  constructor(options = {}) {
    this.viewer = options.viewer
    this.scene = this.viewer.scene
    this.factory = options.factory

    // 配置选项
    this.options = {
      enableTimeFilter: true,
      enableAnimation: true,
      enableLOD: true,
      lodDistances: [5000, 15000, 50000],
      maxEvents: 10000,
      enableClustering: false,
      enableSelection: true,
      enableHover: true,
      eventDuration: 5000, // 事件显示持续时间（毫秒）
      fadeInDuration: 1000, // 淡入时间
      fadeOutDuration: 1000, // 淡出时间
      enableRippleEffect: true,
      rippleRadius: 100,
      enablePulseEffect: true,
      pulseScale: 2.0,
      ...options,
    }

    // 渲染状态
    this.isInitialized = false
    this.isAnimating = false

    // 事件管理
    this.events = new Map() // eventId -> event
    this.cesiumEntities = new Map() // eventId -> cesiumEntity
    this.rippleEntities = new Map() // eventId -> rippleEntity
    this.pulseEntities = new Map() // eventId -> pulseEntity
    this.timelineEvents = new Map() // timestamp -> eventIds[]

    // 数据源
    this.dataSource = new Cesium.CustomDataSource('EventRenderer')
    this.viewer.dataSources.add(this.dataSource)

    // 时间管理
    this.timeManager = {
      currentTime: null,
      timeRange: null,
      playbackRate: 1.0,
      isPlaying: false,
      activeEvents: new Set(), // 当前时间活跃的事件
      scheduledEvents: new Map(), // 计划执行的事件
      eventTimeline: [], // 按时间排序的事件列表
    }

    // 事件类型样式
    this.eventStyles = {
      default: {
        color: Cesium.Color.WHITE,
        scale: 1.0,
        image: null,
        showRipple: true,
        showPulse: true,
      },
      alert: {
        color: Cesium.Color.RED,
        scale: 1.2,
        image: null,
        showRipple: true,
        showPulse: true,
      },
      warning: {
        color: Cesium.Color.YELLOW,
        scale: 1.0,
        image: null,
        showRipple: true,
        showPulse: true,
      },
      info: {
        color: Cesium.Color.CYAN,
        scale: 0.8,
        image: null,
        showRipple: false,
        showPulse: false,
      },
      success: {
        color: Cesium.Color.GREEN,
        scale: 1.0,
        image: null,
        showRipple: true,
        showPulse: false,
      },
      error: {
        color: Cesium.Color.DARKRED,
        scale: 1.5,
        image: null,
        showRipple: true,
        showPulse: true,
      },
      selected: {
        color: Cesium.Color.MAGENTA,
        scale: 1.5,
        image: null,
        showRipple: true,
        showPulse: true,
      },
    }

    // LOD管理
    this.lodManager = {
      enabled: this.options.enableLOD,
      distances: this.options.lodDistances,
      eventLOD: new Map(), // eventId -> lodLevel
      lastUpdateTime: 0,
      updateInterval: 200,
    }

    // 动画管理
    this.animationManager = {
      activeAnimations: new Map(),
      rippleAnimations: new Map(),
      pulseAnimations: new Map(),
      fadeAnimations: new Map(),
      frameRate: 60,
      lastFrameTime: 0,
    }

    // 交互管理
    this.interactionManager = {
      selectedEvent: null,
      hoveredEvent: null,
      clickHandler: null,
      mouseMoveHandler: null,
    }

    // 性能统计
    this.stats = {
      totalEvents: 0,
      visibleEvents: 0,
      activeEvents: 0,
      animatingEvents: 0,
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
    // 设置默认时间
    this.timeManager.currentTime = this.viewer.clock.currentTime.clone()

    // 设置时间范围
    if (this.viewer.clock.startTime && this.viewer.clock.stopTime) {
      this.timeManager.timeRange = {
        start: this.viewer.clock.startTime.clone(),
        stop: this.viewer.clock.stopTime.clone(),
      }
    }
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
          this.onEventClick.bind(this),
          Cesium.ScreenSpaceEventType.LEFT_CLICK,
        )
    }

    // 鼠标移动事件
    if (this.options.enableHover) {
      this.interactionManager.mouseMoveHandler =
        this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
          this.onEventHover.bind(this),
          Cesium.ScreenSpaceEventType.MOUSE_MOVE,
        )
    }
  }

  /**
   * 渲染事件
   * @param {Array} events - 事件数组
   * @param {Object} options - 渲染选项
   * @returns {Promise} 渲染结果
   */
  async render(events, options = {}) {
    const startTime = performance.now()

    try {
      // 清理现有事件
      if (options.clearExisting !== false) {
        this.clear()
      }

      // 批量添加事件
      await this.addEvents(events, options)

      // 构建时间轴
      this.buildTimeline()

      // 更新LOD
      if (this.lodManager.enabled) {
        this.updateLOD()
      }

      // 启动动画
      if (this.options.enableAnimation && options.startAnimation !== false) {
        this.startAnimations()
      }

      // 更新时间过滤
      if (this.options.enableTimeFilter) {
        this.updateTimeFilter()
      }

      // 更新统计
      this.updateStats()

      return {
        success: true,
        eventCount: events.length,
        renderTime: performance.now() - startTime,
      }
    } catch (error) {
      console.error('Event render error:', error)
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
   * 批量添加事件
   * @param {Array} events - 事件数组
   * @param {Object} options - 选项
   */
  async addEvents(events, options = {}) {
    const batchSize = options.batchSize || 100

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize)

      // 处理批次
      await this.processBatch(batch, options)

      // 让出控制权
      if (i + batchSize < events.length) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }
  }

  /**
   * 处理事件批次
   * @param {Array} batch - 事件批次
   * @param {Object} options - 选项
   */
  async processBatch(batch, options) {
    batch.forEach((event) => {
      try {
        this.addEvent(event, options)
      } catch (error) {
        console.warn('Failed to add event:', event.id, error)
      }
    })
  }

  /**
   * 添加单个事件
   * @param {Object} event - 事件数据
   * @param {Object} options - 选项
   */
  addEvent(event, options = {}) {
    if (!event.id || !event.timestamp) {
      throw new Error('Event must have id and timestamp')
    }

    // 检查是否已存在
    if (this.events.has(event.id)) {
      this.updateEvent(event, options)
      return
    }

    // 处理事件数据
    const processedEvent = this.processEvent(event)

    // 创建Cesium实体
    const cesiumEntity = this.createCesiumEvent(processedEvent, options)

    // 添加到数据源
    this.dataSource.entities.add(cesiumEntity)

    // 创建涟漪效果（如果需要）
    if (this.options.enableRippleEffect && processedEvent.showRipple) {
      const rippleEntity = this.createRippleEntity(processedEvent, options)
      if (rippleEntity) {
        this.dataSource.entities.add(rippleEntity)
        this.rippleEntities.set(event.id, rippleEntity)
      }
    }

    // 创建脉冲效果（如果需要）
    if (this.options.enablePulseEffect && processedEvent.showPulse) {
      const pulseEntity = this.createPulseEntity(processedEvent, options)
      if (pulseEntity) {
        this.dataSource.entities.add(pulseEntity)
        this.pulseEntities.set(event.id, pulseEntity)
      }
    }

    // 存储引用
    this.events.set(event.id, processedEvent)
    this.cesiumEntities.set(event.id, cesiumEntity)

    // 设置初始LOD
    if (this.lodManager.enabled) {
      this.setEventLOD(event.id, this.calculateLOD(processedEvent))
    }

    // 设置初始可见性（基于时间）
    this.updateEventVisibility(event.id)
  }

  /**
   * 处理事件数据
   * @param {Object} event - 原始事件数据
   * @returns {Object} 处理后的事件数据
   */
  processEvent(event) {
    const processed = {
      ...event,
      position: null,
      julianDate: null,
      endTime: null,
    }

    // 处理位置
    if (event.position) {
      processed.position = Cesium.Cartesian3.fromDegrees(
        event.position.longitude,
        event.position.latitude,
        event.position.height || 0,
      )
    }

    // 处理时间
    if (event.timestamp) {
      if (typeof event.timestamp === 'string') {
        processed.julianDate = Cesium.JulianDate.fromIso8601(event.timestamp)
      } else if (event.timestamp instanceof Date) {
        processed.julianDate = Cesium.JulianDate.fromDate(event.timestamp)
      } else if (typeof event.timestamp === 'number') {
        processed.julianDate = Cesium.JulianDate.fromDate(new Date(event.timestamp))
      }
    }

    // 处理结束时间
    if (event.endTime) {
      if (typeof event.endTime === 'string') {
        processed.endTime = Cesium.JulianDate.fromIso8601(event.endTime)
      } else if (event.endTime instanceof Date) {
        processed.endTime = Cesium.JulianDate.fromDate(event.endTime)
      } else if (typeof event.endTime === 'number') {
        processed.endTime = Cesium.JulianDate.fromDate(new Date(event.endTime))
      }
    } else if (processed.julianDate && event.duration) {
      // 根据持续时间计算结束时间
      processed.endTime = Cesium.JulianDate.addSeconds(
        processed.julianDate,
        event.duration / 1000,
        new Cesium.JulianDate(),
      )
    } else if (processed.julianDate) {
      // 使用默认持续时间
      processed.endTime = Cesium.JulianDate.addSeconds(
        processed.julianDate,
        this.options.eventDuration / 1000,
        new Cesium.JulianDate(),
      )
    }

    return processed
  }

  /**
   * 创建Cesium事件实体
   * @param {Object} event - 事件数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity} Cesium实体
   */
  createCesiumEvent(event, options) {
    const cesiumEntity = new Cesium.Entity({
      id: event.id,
      position: event.position,
      properties: event.properties || {},
    })

    // 创建图标
    if (event.position) {
      cesiumEntity.billboard = this.createEventBillboard(event, options)
    }

    // 添加标签（如果需要）
    if (event.label) {
      cesiumEntity.label = this.createEventLabel(event, options)
    }

    // 设置时间可用性
    if (event.julianDate && event.endTime) {
      cesiumEntity.availability = new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({
          start: event.julianDate,
          stop: event.endTime,
        }),
      ])
    }

    return cesiumEntity
  }

  /**
   * 创建事件图标
   * @param {Object} event - 事件数据
   * @param {Object} options - 选项
   * @returns {Object} Billboard配置
   */
  createEventBillboard(event, options) {
    const style = this.getEventStyle(event)

    const billboard = {
      image: event.image || style.image || this.createEventImage(event),
      scale: event.scale || style.scale,
      color: event.color ? Cesium.Color.fromCssColorString(event.color) : style.color,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      show: event.visible !== false,
      pixelOffset: event.pixelOffset
        ? new Cesium.Cartesian2(event.pixelOffset.x, event.pixelOffset.y)
        : Cesium.Cartesian2.ZERO,
    }

    // 高度参考
    if (event.heightReference) {
      billboard.heightReference = this.parseHeightReference(event.heightReference)
    }

    // 距离显示条件
    if (event.distanceDisplayCondition) {
      billboard.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(
        event.distanceDisplayCondition.near || 0,
        event.distanceDisplayCondition.far || Number.MAX_VALUE,
      )
    }

    return billboard
  }

  /**
   * 创建事件图像
   * @param {Object} event - 事件数据
   * @returns {Canvas} 事件图像
   */
  createEventImage(event) {
    const canvas = document.createElement('canvas')
    const size = 32
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')
    const style = this.getEventStyle(event)

    // 绘制圆形背景
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI)
    ctx.fillStyle = style.color.toCssColorString()
    ctx.fill()

    // 绘制边框
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.stroke()

    // 绘制事件类型图标
    this.drawEventTypeIcon(ctx, event, size)

    return canvas
  }

  /**
   * 绘制事件类型图标
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {Object} event - 事件数据
   * @param {number} size - 图标大小
   */
  drawEventTypeIcon(ctx, event, size) {
    const centerX = size / 2
    const centerY = size / 2
    const iconSize = size * 0.4

    ctx.fillStyle = 'white'
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2

    switch (event.type) {
      case 'alert':
        // 绘制感叹号
        ctx.font = `${iconSize}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('!', centerX, centerY)
        break

      case 'warning':
        // 绘制三角形
        ctx.beginPath()
        ctx.moveTo(centerX, centerY - iconSize / 2)
        ctx.lineTo(centerX - iconSize / 2, centerY + iconSize / 2)
        ctx.lineTo(centerX + iconSize / 2, centerY + iconSize / 2)
        ctx.closePath()
        ctx.stroke()
        break

      case 'info':
        // 绘制i字母
        ctx.font = `${iconSize}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('i', centerX, centerY)
        break

      case 'success':
        // 绘制对勾
        ctx.beginPath()
        ctx.moveTo(centerX - iconSize / 3, centerY)
        ctx.lineTo(centerX - iconSize / 6, centerY + iconSize / 3)
        ctx.lineTo(centerX + iconSize / 3, centerY - iconSize / 3)
        ctx.stroke()
        break

      case 'error':
        // 绘制X
        ctx.beginPath()
        ctx.moveTo(centerX - iconSize / 3, centerY - iconSize / 3)
        ctx.lineTo(centerX + iconSize / 3, centerY + iconSize / 3)
        ctx.moveTo(centerX + iconSize / 3, centerY - iconSize / 3)
        ctx.lineTo(centerX - iconSize / 3, centerY + iconSize / 3)
        ctx.stroke()
        break

      default:
        // 绘制圆点
        ctx.beginPath()
        ctx.arc(centerX, centerY, iconSize / 4, 0, 2 * Math.PI)
        ctx.fill()
        break
    }
  }

  /**
   * 创建事件标签
   * @param {Object} event - 事件数据
   * @param {Object} options - 选项
   * @returns {Object} Label配置
   */
  createEventLabel(event, options) {
    return {
      text: event.label.text || event.name || event.type || '',
      font: event.label.font || '12pt sans-serif',
      fillColor: event.label.fillColor
        ? Cesium.Color.fromCssColorString(event.label.fillColor)
        : Cesium.Color.WHITE,
      outlineColor: event.label.outlineColor
        ? Cesium.Color.fromCssColorString(event.label.outlineColor)
        : Cesium.Color.BLACK,
      outlineWidth: event.label.outlineWidth || 1,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      pixelOffset: event.label.pixelOffset
        ? new Cesium.Cartesian2(event.label.pixelOffset.x, event.label.pixelOffset.y)
        : new Cesium.Cartesian2(20, 0),
      show: event.label.show !== false,
      showBackground: event.label.showBackground || false,
      backgroundColor: event.label.backgroundColor
        ? Cesium.Color.fromCssColorString(event.label.backgroundColor)
        : Cesium.Color.BLACK.withAlpha(0.7),
      backgroundPadding: event.label.backgroundPadding
        ? new Cesium.Cartesian2(event.label.backgroundPadding.x, event.label.backgroundPadding.y)
        : new Cesium.Cartesian2(7, 5),
    }
  }

  /**
   * 创建涟漪实体
   * @param {Object} event - 事件数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity|null} 涟漪实体
   */
  createRippleEntity(event, options) {
    if (!event.position) return null

    const rippleEntity = new Cesium.Entity({
      id: `${event.id}_ripple`,
      position: event.position,
      ellipse: {
        semiMajorAxis: 0,
        semiMinorAxis: 0,
        material: this.getEventStyle(event).color.withAlpha(0.3),
        outline: true,
        outlineColor: this.getEventStyle(event).color.withAlpha(0.6),
        outlineWidth: 2,
        show: false,
      },
      properties: {
        eventId: event.id,
        isRippleEffect: true,
      },
    })

    return rippleEntity
  }

  /**
   * 创建脉冲实体
   * @param {Object} event - 事件数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity|null} 脉冲实体
   */
  createPulseEntity(event, options) {
    if (!event.position) return null

    const pulseEntity = new Cesium.Entity({
      id: `${event.id}_pulse`,
      position: event.position,
      billboard: {
        image: this.createPulseImage(event),
        scale: 1.0,
        color: this.getEventStyle(event).color.withAlpha(0.5),
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        show: false,
      },
      properties: {
        eventId: event.id,
        isPulseEffect: true,
      },
    })

    return pulseEntity
  }

  /**
   * 创建脉冲图像
   * @param {Object} event - 事件数据
   * @returns {Canvas} 脉冲图像
   */
  createPulseImage(event) {
    const canvas = document.createElement('canvas')
    const size = 64
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')
    const style = this.getEventStyle(event)

    // 创建径向渐变
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, style.color.withAlpha(0.8).toCssColorString())
    gradient.addColorStop(0.7, style.color.withAlpha(0.3).toCssColorString())
    gradient.addColorStop(1, style.color.withAlpha(0).toCssColorString())

    // 绘制脉冲圆
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI)
    ctx.fillStyle = gradient
    ctx.fill()

    return canvas
  }

  /**
   * 构建时间轴
   */
  buildTimeline() {
    // 清空现有时间轴
    this.timelineEvents.clear()
    this.timeManager.eventTimeline = []

    // 按时间分组事件
    this.events.forEach((event, eventId) => {
      if (event.julianDate) {
        const timestamp = Cesium.JulianDate.toDate(event.julianDate).getTime()

        if (!this.timelineEvents.has(timestamp)) {
          this.timelineEvents.set(timestamp, [])
        }

        this.timelineEvents.get(timestamp).push(eventId)

        // 添加到时间轴
        this.timeManager.eventTimeline.push({
          timestamp,
          eventId,
          julianDate: event.julianDate,
          endTime: event.endTime,
        })
      }
    })

    // 按时间排序
    this.timeManager.eventTimeline.sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * 更新时间过滤
   */
  updateTimeFilter() {
    const currentTime = this.timeManager.currentTime || this.viewer.clock.currentTime

    this.events.forEach((event, eventId) => {
      this.updateEventVisibility(eventId, currentTime)
    })
  }

  /**
   * 更新事件可见性
   * @param {string} eventId - 事件ID
   * @param {Cesium.JulianDate} currentTime - 当前时间
   */
  updateEventVisibility(eventId, currentTime = null) {
    const event = this.events.get(eventId)
    const cesiumEntity = this.cesiumEntities.get(eventId)

    if (!event || !cesiumEntity) return

    currentTime = currentTime || this.timeManager.currentTime || this.viewer.clock.currentTime

    let isVisible = true

    // 检查时间范围
    if (this.options.enableTimeFilter && event.julianDate) {
      const eventTime = event.julianDate
      const endTime = event.endTime

      if (endTime) {
        // 事件有结束时间
        isVisible =
          Cesium.JulianDate.greaterThanOrEquals(currentTime, eventTime) &&
          Cesium.JulianDate.lessThanOrEquals(currentTime, endTime)
      } else {
        // 事件只有开始时间，检查是否在显示持续时间内
        const eventEndTime = Cesium.JulianDate.addSeconds(
          eventTime,
          this.options.eventDuration / 1000,
          new Cesium.JulianDate(),
        )

        isVisible =
          Cesium.JulianDate.greaterThanOrEquals(currentTime, eventTime) &&
          Cesium.JulianDate.lessThanOrEquals(currentTime, eventEndTime)
      }
    }

    // 更新主实体可见性
    if (cesiumEntity.billboard) {
      cesiumEntity.billboard.show = isVisible && event.visible !== false
    }

    if (cesiumEntity.label) {
      cesiumEntity.label.show = isVisible && event.visible !== false
    }

    // 更新效果实体可见性
    this.updateEffectVisibility(eventId, isVisible)

    // 管理活跃事件
    if (isVisible) {
      this.timeManager.activeEvents.add(eventId)

      // 触发事件激活
      if (this.options.enableAnimation) {
        this.triggerEventEffects(eventId)
      }
    } else {
      this.timeManager.activeEvents.delete(eventId)
    }
  }

  /**
   * 更新效果可见性
   * @param {string} eventId - 事件ID
   * @param {boolean} visible - 是否可见
   */
  updateEffectVisibility(eventId, visible) {
    // 更新涟漪效果
    const rippleEntity = this.rippleEntities.get(eventId)
    if (rippleEntity && rippleEntity.ellipse) {
      rippleEntity.ellipse.show = visible
    }

    // 更新脉冲效果
    const pulseEntity = this.pulseEntities.get(eventId)
    if (pulseEntity && pulseEntity.billboard) {
      pulseEntity.billboard.show = visible
    }
  }

  /**
   * 触发事件效果
   * @param {string} eventId - 事件ID
   */
  triggerEventEffects(eventId) {
    const event = this.events.get(eventId)
    if (!event) return

    // 触发涟漪效果
    if (this.options.enableRippleEffect && event.showRipple) {
      this.startRippleAnimation(eventId)
    }

    // 触发脉冲效果
    if (this.options.enablePulseEffect && event.showPulse) {
      this.startPulseAnimation(eventId)
    }

    // 触发淡入效果
    this.startFadeInAnimation(eventId)
  }

  /**
   * 启动涟漪动画
   * @param {string} eventId - 事件ID
   */
  startRippleAnimation(eventId) {
    const rippleEntity = this.rippleEntities.get(eventId)
    if (!rippleEntity) return

    const animation = {
      entity: rippleEntity,
      startTime: Date.now(),
      duration: 2000,
      maxRadius: this.options.rippleRadius,
      progress: 0,
    }

    this.animationManager.rippleAnimations.set(eventId, animation)
  }

  /**
   * 启动脉冲动画
   * @param {string} eventId - 事件ID
   */
  startPulseAnimation(eventId) {
    const pulseEntity = this.pulseEntities.get(eventId)
    if (!pulseEntity) return

    const animation = {
      entity: pulseEntity,
      startTime: Date.now(),
      duration: 1500,
      maxScale: this.options.pulseScale,
      progress: 0,
    }

    this.animationManager.pulseAnimations.set(eventId, animation)
  }

  /**
   * 启动淡入动画
   * @param {string} eventId - 事件ID
   */
  startFadeInAnimation(eventId) {
    const cesiumEntity = this.cesiumEntities.get(eventId)
    if (!cesiumEntity) return

    const animation = {
      entity: cesiumEntity,
      startTime: Date.now(),
      duration: this.options.fadeInDuration,
      startAlpha: 0,
      endAlpha: 1,
      progress: 0,
    }

    this.animationManager.fadeAnimations.set(eventId, animation)
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

    // 更新涟漪动画
    this.updateRippleAnimations(timestamp)

    // 更新脉冲动画
    this.updatePulseAnimations(timestamp)

    // 更新淡入淡出动画
    this.updateFadeAnimations(timestamp)

    this.stats.animationTime = performance.now() - startTime
  }

  /**
   * 更新涟漪动画
   * @param {number} timestamp - 时间戳
   */
  updateRippleAnimations(timestamp) {
    const toRemove = []

    this.animationManager.rippleAnimations.forEach((animation, eventId) => {
      const elapsed = timestamp - animation.startTime
      animation.progress = Math.min(elapsed / animation.duration, 1)

      if (animation.progress >= 1) {
        toRemove.push(eventId)
        return
      }

      // 更新涟漪大小
      const radius = animation.maxRadius * animation.progress
      const alpha = 1 - animation.progress

      if (animation.entity.ellipse) {
        animation.entity.ellipse.semiMajorAxis = radius
        animation.entity.ellipse.semiMinorAxis = radius
        animation.entity.ellipse.material = animation.entity.ellipse.material.color.withAlpha(
          alpha * 0.3,
        )
        animation.entity.ellipse.outlineColor = animation.entity.ellipse.outlineColor.withAlpha(
          alpha * 0.6,
        )
      }
    })

    // 清理完成的动画
    toRemove.forEach((eventId) => {
      this.animationManager.rippleAnimations.delete(eventId)
    })
  }

  /**
   * 更新脉冲动画
   * @param {number} timestamp - 时间戳
   */
  updatePulseAnimations(timestamp) {
    const toRemove = []

    this.animationManager.pulseAnimations.forEach((animation, eventId) => {
      const elapsed = timestamp - animation.startTime
      animation.progress = Math.min(elapsed / animation.duration, 1)

      if (animation.progress >= 1) {
        toRemove.push(eventId)
        return
      }

      // 使用正弦波创建脉冲效果
      const pulseValue = Math.sin(animation.progress * Math.PI * 4) * 0.5 + 0.5
      const scale = 1 + (animation.maxScale - 1) * pulseValue
      const alpha = 1 - animation.progress * 0.5

      if (animation.entity.billboard) {
        animation.entity.billboard.scale = scale
        animation.entity.billboard.color = animation.entity.billboard.color.withAlpha(alpha)
      }
    })

    // 清理完成的动画
    toRemove.forEach((eventId) => {
      this.animationManager.pulseAnimations.delete(eventId)
    })
  }

  /**
   * 更新淡入淡出动画
   * @param {number} timestamp - 时间戳
   */
  updateFadeAnimations(timestamp) {
    const toRemove = []

    this.animationManager.fadeAnimations.forEach((animation, eventId) => {
      const elapsed = timestamp - animation.startTime
      animation.progress = Math.min(elapsed / animation.duration, 1)

      if (animation.progress >= 1) {
        toRemove.push(eventId)
        return
      }

      // 计算当前透明度
      const alpha =
        animation.startAlpha + (animation.endAlpha - animation.startAlpha) * animation.progress

      // 更新实体透明度
      if (animation.entity.billboard) {
        animation.entity.billboard.color = animation.entity.billboard.color.withAlpha(alpha)
      }

      if (animation.entity.label) {
        animation.entity.label.fillColor = animation.entity.label.fillColor.withAlpha(alpha)
      }
    })

    // 清理完成的动画
    toRemove.forEach((eventId) => {
      this.animationManager.fadeAnimations.delete(eventId)
    })
  }

  /**
   * 时钟tick事件
   * @param {Cesium.Clock} clock - 时钟对象
   */
  onClockTick(clock) {
    this.timeManager.currentTime = clock.currentTime.clone()

    // 更新时间过滤
    if (this.options.enableTimeFilter) {
      this.updateTimeFilter()
    }
  }

  /**
   * 获取事件样式
   * @param {Object} event - 事件数据
   * @returns {Object} 样式配置
   */
  getEventStyle(event) {
    const type = event.type || 'default'
    const isSelected = this.interactionManager.selectedEvent === event.id

    if (isSelected) {
      return this.eventStyles.selected
    }

    return this.eventStyles[type] || this.eventStyles.default
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
   * 更新事件
   * @param {Object} event - 事件数据
   * @param {Object} options - 选项
   */
  updateEvent(event, options = {}) {
    const cesiumEntity = this.cesiumEntities.get(event.id)
    if (!cesiumEntity) return

    // 处理新的事件数据
    const processedEvent = this.processEvent(event)

    // 更新位置
    if (processedEvent.position) {
      cesiumEntity.position = processedEvent.position
    }

    // 更新图标
    if (cesiumEntity.billboard) {
      cesiumEntity.billboard.image = event.image || this.createEventImage(processedEvent)
      cesiumEntity.billboard.color = event.color
        ? Cesium.Color.fromCssColorString(event.color)
        : this.getEventStyle(processedEvent).color
    }

    // 更新标签
    if (cesiumEntity.label && processedEvent.label) {
      cesiumEntity.label.text =
        processedEvent.label.text || processedEvent.name || processedEvent.type || ''
    }

    // 更新时间可用性
    if (processedEvent.julianDate && processedEvent.endTime) {
      cesiumEntity.availability = new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({
          start: processedEvent.julianDate,
          stop: processedEvent.endTime,
        }),
      ])
    }

    // 更新存储的事件数据
    this.events.set(event.id, processedEvent)

    // 重新构建时间轴
    this.buildTimeline()

    // 更新可见性
    this.updateEventVisibility(event.id)
  }

  /**
   * 移除事件
   * @param {string} eventId - 事件ID
   */
  removeEvent(eventId) {
    // 移除主实体
    const cesiumEntity = this.cesiumEntities.get(eventId)
    if (cesiumEntity) {
      this.dataSource.entities.remove(cesiumEntity)
      this.cesiumEntities.delete(eventId)
    }

    // 移除涟漪实体
    const rippleEntity = this.rippleEntities.get(eventId)
    if (rippleEntity) {
      this.dataSource.entities.remove(rippleEntity)
      this.rippleEntities.delete(eventId)
    }

    // 移除脉冲实体
    const pulseEntity = this.pulseEntities.get(eventId)
    if (pulseEntity) {
      this.dataSource.entities.remove(pulseEntity)
      this.pulseEntities.delete(eventId)
    }

    // 清理数据
    this.events.delete(eventId)
    this.lodManager.eventLOD.delete(eventId)
    this.timeManager.activeEvents.delete(eventId)

    // 清理动画
    this.animationManager.rippleAnimations.delete(eventId)
    this.animationManager.pulseAnimations.delete(eventId)
    this.animationManager.fadeAnimations.delete(eventId)

    // 重新构建时间轴
    this.buildTimeline()
  }

  /**
   * 批量移除事件
   * @param {Array} eventIds - 事件ID数组
   */
  removeEvents(eventIds) {
    eventIds.forEach((eventId) => this.removeEvent(eventId))
  }

  /**
   * 清空所有事件
   */
  clear() {
    this.dataSource.entities.removeAll()
    this.events.clear()
    this.cesiumEntities.clear()
    this.rippleEntities.clear()
    this.pulseEntities.clear()
    this.timelineEvents.clear()
    this.lodManager.eventLOD.clear()
    this.timeManager.activeEvents.clear()
    this.timeManager.eventTimeline = []

    // 清理动画
    this.animationManager.rippleAnimations.clear()
    this.animationManager.pulseAnimations.clear()
    this.animationManager.fadeAnimations.clear()
  }

  /**
   * 启动动画
   */
  startAnimations() {
    this.timeManager.activeEvents.forEach((eventId) => {
      this.triggerEventEffects(eventId)
    })
  }

  /**
   * 停止动画
   */
  stopAnimations() {
    this.animationManager.rippleAnimations.clear()
    this.animationManager.pulseAnimations.clear()
    this.animationManager.fadeAnimations.clear()
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

    this.events.forEach((event, eventId) => {
      const newLOD = this.calculateLOD(event, cameraPosition)
      const currentLOD = this.lodManager.eventLOD.get(eventId)

      if (newLOD !== currentLOD) {
        this.setEventLOD(eventId, newLOD)
      }
    })

    this.lodManager.lastUpdateTime = now
  }

  /**
   * 计算事件LOD级别
   * @param {Object} event - 事件数据
   * @param {Cesium.Cartesian3} cameraPosition - 相机位置
   * @returns {number} LOD级别
   */
  calculateLOD(event, cameraPosition = null) {
    if (!cameraPosition) {
      cameraPosition = this.viewer.camera.position
    }

    if (!event.position) {
      return this.lodManager.distances.length // 最低LOD
    }

    const distance = Cesium.Cartesian3.distance(cameraPosition, event.position)

    // 根据距离确定LOD级别
    for (let i = 0; i < this.lodManager.distances.length; i++) {
      if (distance <= this.lodManager.distances[i]) {
        return i
      }
    }

    return this.lodManager.distances.length
  }

  /**
   * 设置事件LOD级别
   * @param {string} eventId - 事件ID
   * @param {number} lodLevel - LOD级别
   */
  setEventLOD(eventId, lodLevel) {
    const cesiumEntity = this.cesiumEntities.get(eventId)
    if (!cesiumEntity) return

    this.lodManager.eventLOD.set(eventId, lodLevel)

    // 根据LOD级别调整显示
    switch (lodLevel) {
      case 0: // 最近距离 - 显示所有细节
        if (cesiumEntity.billboard) cesiumEntity.billboard.show = true
        if (cesiumEntity.label) cesiumEntity.label.show = true
        this.setEffectVisible(eventId, true)
        break

      case 1: // 中等距离 - 显示主要元素
        if (cesiumEntity.billboard) cesiumEntity.billboard.show = true
        if (cesiumEntity.label) cesiumEntity.label.show = false
        this.setEffectVisible(eventId, true)
        break

      case 2: // 远距离 - 只显示图标
        if (cesiumEntity.billboard) cesiumEntity.billboard.show = true
        if (cesiumEntity.label) cesiumEntity.label.show = false
        this.setEffectVisible(eventId, false)
        break

      default: // 极远距离 - 隐藏
        if (cesiumEntity.billboard) cesiumEntity.billboard.show = false
        if (cesiumEntity.label) cesiumEntity.label.show = false
        this.setEffectVisible(eventId, false)
        break
    }
  }

  /**
   * 设置效果可见性
   * @param {string} eventId - 事件ID
   * @param {boolean} visible - 是否可见
   */
  setEffectVisible(eventId, visible) {
    // 设置涟漪效果可见性
    const rippleEntity = this.rippleEntities.get(eventId)
    if (rippleEntity && rippleEntity.ellipse) {
      rippleEntity.ellipse.show = visible
    }

    // 设置脉冲效果可见性
    const pulseEntity = this.pulseEntities.get(eventId)
    if (pulseEntity && pulseEntity.billboard) {
      pulseEntity.billboard.show = visible
    }
  }

  /**
   * 事件点击事件
   * @param {Object} event - 点击事件
   */
  onEventClick(event) {
    const pickedObject = this.viewer.scene.pick(event.position)
    if (!pickedObject || !pickedObject.id) return

    const entityId = pickedObject.id.id || pickedObject.id
    const eventId = this.extractEventId(entityId)
    const eventData = this.events.get(eventId)

    if (eventData) {
      // 取消之前的选择
      if (this.interactionManager.selectedEvent) {
        this.setEventSelected(this.interactionManager.selectedEvent, false)
      }

      // 设置新的选择
      this.interactionManager.selectedEvent = eventId
      this.setEventSelected(eventId, true)

      // 触发选择事件
      this.onEventSelected(eventData, event)
    }
  }

  /**
   * 事件悬停事件
   * @param {Object} event - 鼠标移动事件
   */
  onEventHover(event) {
    const pickedObject = this.viewer.scene.pick(event.endPosition)
    const entityId = pickedObject && pickedObject.id ? pickedObject.id.id || pickedObject.id : null
    const eventId = entityId ? this.extractEventId(entityId) : null

    // 取消之前的悬停
    if (this.interactionManager.hoveredEvent && this.interactionManager.hoveredEvent !== eventId) {
      this.setEventHovered(this.interactionManager.hoveredEvent, false)
    }

    // 设置新的悬停
    if (eventId && eventId !== this.interactionManager.hoveredEvent) {
      this.interactionManager.hoveredEvent = eventId
      this.setEventHovered(eventId, true)

      const eventData = this.events.get(eventId)
      if (eventData) {
        this.onEventHovered(eventData, event)
      }
    } else if (!eventId) {
      this.interactionManager.hoveredEvent = null
    }
  }

  /**
   * 提取事件ID
   * @param {string} entityId - 实体ID
   * @returns {string} 事件ID
   */
  extractEventId(entityId) {
    // 移除后缀（_ripple, _pulse）
    return entityId.replace(/_(ripple|pulse)$/, '')
  }

  /**
   * 设置事件选中状态
   * @param {string} eventId - 事件ID
   * @param {boolean} selected - 是否选中
   */
  setEventSelected(eventId, selected) {
    const cesiumEntity = this.cesiumEntities.get(eventId)
    if (!cesiumEntity || !cesiumEntity.billboard) return

    if (selected) {
      cesiumEntity.billboard.color = this.eventStyles.selected.color
      cesiumEntity.billboard.scale = this.eventStyles.selected.scale
    } else {
      const event = this.events.get(eventId)
      if (event) {
        const style = this.getEventStyle(event)
        cesiumEntity.billboard.color = event.color
          ? Cesium.Color.fromCssColorString(event.color)
          : style.color
        cesiumEntity.billboard.scale = event.scale || style.scale
      }
    }
  }

  /**
   * 设置事件悬停状态
   * @param {string} eventId - 事件ID
   * @param {boolean} hovered - 是否悬停
   */
  setEventHovered(eventId, hovered) {
    const cesiumEntity = this.cesiumEntities.get(eventId)
    if (!cesiumEntity || !cesiumEntity.billboard) return

    if (hovered) {
      cesiumEntity.billboard.scale = (cesiumEntity.billboard.scale || 1.0) * 1.2
    } else {
      const event = this.events.get(eventId)
      if (event) {
        const style = this.getEventStyle(event)
        cesiumEntity.billboard.scale = event.scale || style.scale
      }
    }
  }

  /**
   * 事件选择事件（可重写）
   * @param {Object} event - 事件数据
   * @param {Object} clickEvent - 点击事件对象
   */
  onEventSelected(event, clickEvent) {
    console.log('Event selected:', event)
  }

  /**
   * 事件悬停事件（可重写）
   * @param {Object} event - 事件数据
   * @param {Object} hoverEvent - 悬停事件对象
   */
  onEventHovered(event, hoverEvent) {
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
   * 更新统计信息
   */
  updateStats() {
    this.stats.totalEvents = this.events.size
    this.stats.activeEvents = this.timeManager.activeEvents.size
    this.stats.visibleEvents = Array.from(this.cesiumEntities.values()).filter((entity) => {
      return entity.billboard && entity.billboard.show
    }).length
    this.stats.animatingEvents =
      this.animationManager.rippleAnimations.size +
      this.animationManager.pulseAnimations.size +
      this.animationManager.fadeAnimations.size
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * 获取事件
   * @param {string} eventId - 事件ID
   * @returns {Object|null} 事件数据
   */
  getEvent(eventId) {
    return this.events.get(eventId) || null
  }

  /**
   * 获取所有事件
   * @returns {Array} 事件数组
   */
  getAllEvents() {
    return Array.from(this.events.values())
  }

  /**
   * 获取活跃事件
   * @returns {Array} 活跃事件数组
   */
  getActiveEvents() {
    return Array.from(this.timeManager.activeEvents)
      .map((eventId) => this.events.get(eventId))
      .filter(Boolean)
  }

  /**
   * 设置时间范围
   * @param {Date|Cesium.JulianDate} startTime - 开始时间
   * @param {Date|Cesium.JulianDate} endTime - 结束时间
   */
  setTimeRange(startTime, endTime) {
    // 转换为JulianDate
    const start = startTime instanceof Date ? Cesium.JulianDate.fromDate(startTime) : startTime
    const end = endTime instanceof Date ? Cesium.JulianDate.fromDate(endTime) : endTime

    this.timeManager.timeRange = { start, end }

    // 更新时间过滤
    this.updateTimeFilter()
  }

  /**
   * 设置当前时间
   * @param {Date|Cesium.JulianDate} time - 当前时间
   */
  setCurrentTime(time) {
    this.timeManager.currentTime = time instanceof Date ? Cesium.JulianDate.fromDate(time) : time

    // 更新时间过滤
    this.updateTimeFilter()
  }

  /**
   * 设置播放速率
   * @param {number} rate - 播放速率
   */
  setPlaybackRate(rate) {
    this.timeManager.playbackRate = rate
  }

  /**
   * 开始播放
   */
  play() {
    this.timeManager.isPlaying = true
  }

  /**
   * 暂停播放
   */
  pause() {
    this.timeManager.isPlaying = false
  }

  /**
   * 停止播放
   */
  stop() {
    this.timeManager.isPlaying = false
    this.stopAnimations()
  }

  /**
   * 设置事件样式
   * @param {string} type - 事件类型
   * @param {Object} style - 样式配置
   */
  setEventStyle(type, style) {
    this.eventStyles[type] = { ...this.eventStyles[type], ...style }

    // 更新现有事件的样式
    this.events.forEach((event, eventId) => {
      if (event.type === type) {
        this.updateEventStyle(eventId)
      }
    })
  }

  /**
   * 更新事件样式
   * @param {string} eventId - 事件ID
   */
  updateEventStyle(eventId) {
    const event = this.events.get(eventId)
    const cesiumEntity = this.cesiumEntities.get(eventId)

    if (!event || !cesiumEntity) return

    const style = this.getEventStyle(event)

    if (cesiumEntity.billboard) {
      cesiumEntity.billboard.color = event.color
        ? Cesium.Color.fromCssColorString(event.color)
        : style.color
      cesiumEntity.billboard.scale = event.scale || style.scale
    }
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

    // 移除相机事件监听
    this.viewer.camera.changed.removeEventListener(this.onCameraChanged.bind(this))

    // 移除时钟事件监听
    this.viewer.clock.onTick.removeEventListener(this.onClockTick.bind(this))

    // 清理数据源
    this.viewer.dataSources.remove(this.dataSource)

    // 清理数据
    this.clear()

    // 重置状态
    this.isInitialized = false
  }
}

export default EventRenderer
