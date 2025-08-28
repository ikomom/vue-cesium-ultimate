/**
 * 关系渲染器 - 负责渲染实体之间的连线关系
 * 支持动态连线、关系类型、动画效果、LOD和交互
 */

class RelationRenderer {
  constructor(options = {}) {
    this.viewer = options.viewer
    this.scene = this.viewer.scene
    this.factory = options.factory

    // 配置选项
    this.options = {
      enableDynamicLines: true,
      enableAnimation: true,
      enableLOD: true,
      lodDistances: [10000, 30000, 100000],
      maxRelations: 5000,
      enableClustering: false,
      enableSelection: true,
      enableHover: true,
      enableFlowAnimation: true,
      flowSpeed: 1.0,
      enableArrows: true,
      arrowSize: 20,
      ...options,
    }

    // 渲染状态
    this.isInitialized = false
    this.isAnimating = false

    // 关系管理
    this.relations = new Map() // relationId -> relation
    this.cesiumEntities = new Map() // relationId -> cesiumEntity
    this.arrowEntities = new Map() // relationId -> arrowEntity
    this.animationEntities = new Map() // relationId -> animationEntity

    // 数据源
    this.dataSource = new Cesium.CustomDataSource('RelationRenderer')
    this.viewer.dataSources.add(this.dataSource)

    // 关系类型样式
    this.relationStyles = {
      default: {
        color: Cesium.Color.WHITE,
        width: 2,
        material: Cesium.Color.WHITE.withAlpha(0.8),
        dashPattern: null,
      },
      communication: {
        color: Cesium.Color.CYAN,
        width: 2,
        material: Cesium.Color.CYAN.withAlpha(0.8),
        dashPattern: null,
      },
      attack: {
        color: Cesium.Color.RED,
        width: 3,
        material: Cesium.Color.RED.withAlpha(0.9),
        dashPattern: null,
      },
      support: {
        color: Cesium.Color.GREEN,
        width: 2,
        material: Cesium.Color.GREEN.withAlpha(0.8),
        dashPattern: null,
      },
      surveillance: {
        color: Cesium.Color.YELLOW,
        width: 2,
        material: Cesium.Color.YELLOW.withAlpha(0.7),
        dashPattern: 255,
      },
      supply: {
        color: Cesium.Color.ORANGE,
        width: 2,
        material: Cesium.Color.ORANGE.withAlpha(0.8),
        dashPattern: 255,
      },
      selected: {
        color: Cesium.Color.MAGENTA,
        width: 4,
        material: Cesium.Color.MAGENTA.withAlpha(1.0),
        dashPattern: null,
      },
    }

    // LOD管理
    this.lodManager = {
      enabled: this.options.enableLOD,
      distances: this.options.lodDistances,
      relationLOD: new Map(), // relationId -> lodLevel
      lastUpdateTime: 0,
      updateInterval: 200,
    }

    // 动画管理
    this.animationManager = {
      activeAnimations: new Map(),
      flowAnimations: new Map(),
      frameRate: 60,
      lastFrameTime: 0,
    }

    // 交互管理
    this.interactionManager = {
      selectedRelation: null,
      hoveredRelation: null,
      clickHandler: null,
      mouseMoveHandler: null,
    }

    // 性能统计
    this.stats = {
      totalRelations: 0,
      visibleRelations: 0,
      animatingRelations: 0,
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
    this.initAnimationManager()

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
    if (this.options.enableAnimation || this.options.enableFlowAnimation) {
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
          this.onRelationClick.bind(this),
          Cesium.ScreenSpaceEventType.LEFT_CLICK,
        )
    }

    // 鼠标移动事件
    if (this.options.enableHover) {
      this.interactionManager.mouseMoveHandler =
        this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
          this.onRelationHover.bind(this),
          Cesium.ScreenSpaceEventType.MOUSE_MOVE,
        )
    }
  }

  /**
   * 渲染关系
   * @param {Array} relations - 关系数组
   * @param {Object} options - 渲染选项
   * @returns {Promise} 渲染结果
   */
  async render(relations, options = {}) {
    const startTime = performance.now()

    try {
      // 清理现有关系
      if (options.clearExisting !== false) {
        this.clear()
      }

      // 批量添加关系
      await this.addRelations(relations, options)

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
        relationCount: relations.length,
        renderTime: performance.now() - startTime,
      }
    } catch (error) {
      console.error('Relation render error:', error)
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
   * 批量添加关系
   * @param {Array} relations - 关系数组
   * @param {Object} options - 选项
   */
  async addRelations(relations, options = {}) {
    const batchSize = options.batchSize || 100

    for (let i = 0; i < relations.length; i += batchSize) {
      const batch = relations.slice(i, i + batchSize)

      // 处理批次
      await this.processBatch(batch, options)

      // 让出控制权
      if (i + batchSize < relations.length) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }
  }

  /**
   * 处理关系批次
   * @param {Array} batch - 关系批次
   * @param {Object} options - 选项
   */
  async processBatch(batch, options) {
    batch.forEach((relation) => {
      try {
        this.addRelation(relation, options)
      } catch (error) {
        console.warn('Failed to add relation:', relation.id, error)
      }
    })
  }

  /**
   * 添加单个关系
   * @param {Object} relation - 关系数据
   * @param {Object} options - 选项
   */
  addRelation(relation, options = {}) {
    if (!relation.id || !relation.source || !relation.target) {
      throw new Error('Relation must have id, source and target')
    }

    // 检查是否已存在
    if (this.relations.has(relation.id)) {
      this.updateRelation(relation, options)
      return
    }

    // 处理关系数据
    const processedRelation = this.processRelation(relation)

    // 创建Cesium实体
    const cesiumEntity = this.createCesiumRelation(processedRelation, options)

    // 添加到数据源
    this.dataSource.entities.add(cesiumEntity)

    // 创建箭头（如果需要）
    if (this.options.enableArrows && processedRelation.showArrow !== false) {
      const arrowEntity = this.createArrowEntity(processedRelation, options)
      if (arrowEntity) {
        this.dataSource.entities.add(arrowEntity)
        this.arrowEntities.set(relation.id, arrowEntity)
      }
    }

    // 创建流动动画（如果需要）
    if (this.options.enableFlowAnimation && processedRelation.animated) {
      const animationEntity = this.createFlowAnimationEntity(processedRelation, options)
      if (animationEntity) {
        this.dataSource.entities.add(animationEntity)
        this.animationEntities.set(relation.id, animationEntity)
      }
    }

    // 存储引用
    this.relations.set(relation.id, processedRelation)
    this.cesiumEntities.set(relation.id, cesiumEntity)

    // 设置初始LOD
    if (this.lodManager.enabled) {
      this.setRelationLOD(relation.id, this.calculateLOD(processedRelation))
    }
  }

  /**
   * 处理关系数据
   * @param {Object} relation - 原始关系数据
   * @returns {Object} 处理后的关系数据
   */
  processRelation(relation) {
    const processed = {
      ...relation,
      sourcePosition: null,
      targetPosition: null,
      midPosition: null,
      distance: 0,
    }

    // 处理源位置
    if (relation.source.position) {
      processed.sourcePosition = Cesium.Cartesian3.fromDegrees(
        relation.source.position.longitude,
        relation.source.position.latitude,
        relation.source.position.height || 0,
      )
    }

    // 处理目标位置
    if (relation.target.position) {
      processed.targetPosition = Cesium.Cartesian3.fromDegrees(
        relation.target.position.longitude,
        relation.target.position.latitude,
        relation.target.position.height || 0,
      )
    }

    // 计算中点和距离
    if (processed.sourcePosition && processed.targetPosition) {
      processed.midPosition = Cesium.Cartesian3.midpoint(
        processed.sourcePosition,
        processed.targetPosition,
        new Cesium.Cartesian3(),
      )

      processed.distance = Cesium.Cartesian3.distance(
        processed.sourcePosition,
        processed.targetPosition,
      )
    }

    return processed
  }

  /**
   * 创建Cesium关系实体
   * @param {Object} relation - 关系数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity} Cesium实体
   */
  createCesiumRelation(relation, options) {
    const cesiumEntity = new Cesium.Entity({
      id: relation.id,
      properties: relation.properties || {},
    })

    // 创建连线
    if (relation.sourcePosition && relation.targetPosition) {
      cesiumEntity.polyline = this.createRelationLine(relation, options)
    }

    // 添加标签（如果需要）
    if (relation.label) {
      cesiumEntity.label = this.createRelationLabel(relation, options)
    }

    return cesiumEntity
  }

  /**
   * 创建关系连线
   * @param {Object} relation - 关系数据
   * @param {Object} options - 选项
   * @returns {Object} Polyline配置
   */
  createRelationLine(relation, options) {
    const style = this.getRelationStyle(relation)
    const positions = [relation.sourcePosition, relation.targetPosition]

    // 如果是弧线，添加中间点
    if (relation.curved) {
      const arcPositions = this.createArcPositions(relation)
      positions.splice(1, 0, ...arcPositions)
    }

    const polyline = {
      positions: positions,
      width: relation.width || style.width,
      material: this.createRelationMaterial(relation, style),
      clampToGround: relation.clampToGround || false,
      show: relation.visible !== false,
    }

    // 高度参考
    if (relation.heightReference) {
      polyline.heightReference = this.parseHeightReference(relation.heightReference)
    }

    // 距离显示条件
    if (relation.distanceDisplayCondition) {
      polyline.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(
        relation.distanceDisplayCondition.near || 0,
        relation.distanceDisplayCondition.far || Number.MAX_VALUE,
      )
    }

    return polyline
  }

  /**
   * 创建弧线位置点
   * @param {Object} relation - 关系数据
   * @returns {Array} 弧线位置点数组
   */
  createArcPositions(relation) {
    const source = relation.sourcePosition
    const target = relation.targetPosition
    const arcHeight = relation.arcHeight || relation.distance * 0.2

    // 计算弧线中点（向上偏移）
    const midpoint = Cesium.Cartesian3.midpoint(source, target, new Cesium.Cartesian3())
    const normal = Cesium.Cartesian3.normalize(midpoint, new Cesium.Cartesian3())
    const arcMidpoint = Cesium.Cartesian3.add(
      midpoint,
      Cesium.Cartesian3.multiplyByScalar(normal, arcHeight, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    )

    // 生成弧线上的多个点
    const arcPositions = []
    const segments = relation.arcSegments || 10

    for (let i = 1; i < segments; i++) {
      const t = i / segments
      const position = this.calculateBezierPoint(source, arcMidpoint, target, t)
      arcPositions.push(position)
    }

    return arcPositions
  }

  /**
   * 计算贝塞尔曲线点
   * @param {Cesium.Cartesian3} p0 - 起点
   * @param {Cesium.Cartesian3} p1 - 控制点
   * @param {Cesium.Cartesian3} p2 - 终点
   * @param {number} t - 参数（0-1）
   * @returns {Cesium.Cartesian3} 曲线上的点
   */
  calculateBezierPoint(p0, p1, p2, t) {
    const u = 1 - t
    const tt = t * t
    const uu = u * u

    const p = Cesium.Cartesian3.multiplyByScalar(p0, uu, new Cesium.Cartesian3())
    Cesium.Cartesian3.add(
      p,
      Cesium.Cartesian3.multiplyByScalar(p1, 2 * u * t, new Cesium.Cartesian3()),
      p,
    )
    Cesium.Cartesian3.add(p, Cesium.Cartesian3.multiplyByScalar(p2, tt, new Cesium.Cartesian3()), p)

    return p
  }

  /**
   * 创建关系材质
   * @param {Object} relation - 关系数据
   * @param {Object} style - 样式配置
   * @returns {Cesium.Material} 材质
   */
  createRelationMaterial(relation, style) {
    const relationType = relation.type || 'default'

    // 虚线材质
    if (style.dashPattern) {
      return new Cesium.PolylineDashMaterial({
        color: style.color,
        dashLength: relation.dashLength || 16,
        dashPattern: style.dashPattern,
      })
    }

    // 流动材质
    if (relation.flow && this.options.enableFlowAnimation) {
      return this.createFlowMaterial(relation, style)
    }

    // 渐变材质
    if (relation.gradient) {
      return this.createGradientMaterial(relation, style)
    }

    // 普通材质
    return style.material || style.color
  }

  /**
   * 创建流动材质
   * @param {Object} relation - 关系数据
   * @param {Object} style - 样式配置
   * @returns {Cesium.Material} 流动材质
   */
  createFlowMaterial(relation, style) {
    return new Cesium.PolylineFlowMaterial({
      color: style.color,
      speed: relation.flowSpeed || this.options.flowSpeed,
      percent: relation.flowPercent || 0.1,
      gradient: relation.flowGradient || 0.01,
    })
  }

  /**
   * 创建渐变材质
   * @param {Object} relation - 关系数据
   * @param {Object} style - 样式配置
   * @returns {Cesium.Material} 渐变材质
   */
  createGradientMaterial(relation, style) {
    return new Cesium.PolylineGradientMaterial({
      color: style.color,
      glow: relation.glow || 0.2,
      taperPower: relation.taperPower || 1.0,
    })
  }

  /**
   * 创建关系标签
   * @param {Object} relation - 关系数据
   * @param {Object} options - 选项
   * @returns {Object} Label配置
   */
  createRelationLabel(relation, options) {
    return {
      text: relation.label.text || relation.name || relation.type || '',
      font: relation.label.font || '12pt sans-serif',
      fillColor: relation.label.fillColor
        ? Cesium.Color.fromCssColorString(relation.label.fillColor)
        : Cesium.Color.WHITE,
      outlineColor: relation.label.outlineColor
        ? Cesium.Color.fromCssColorString(relation.label.outlineColor)
        : Cesium.Color.BLACK,
      outlineWidth: relation.label.outlineWidth || 1,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      position: relation.midPosition,
      pixelOffset: relation.label.pixelOffset
        ? new Cesium.Cartesian2(relation.label.pixelOffset.x, relation.label.pixelOffset.y)
        : Cesium.Cartesian2.ZERO,
      show: relation.label.show !== false,
      showBackground: relation.label.showBackground || false,
      backgroundColor: relation.label.backgroundColor
        ? Cesium.Color.fromCssColorString(relation.label.backgroundColor)
        : Cesium.Color.BLACK.withAlpha(0.7),
      backgroundPadding: relation.label.backgroundPadding
        ? new Cesium.Cartesian2(
            relation.label.backgroundPadding.x,
            relation.label.backgroundPadding.y,
          )
        : new Cesium.Cartesian2(7, 5),
    }
  }

  /**
   * 创建箭头实体
   * @param {Object} relation - 关系数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity|null} 箭头实体
   */
  createArrowEntity(relation, options) {
    if (!relation.sourcePosition || !relation.targetPosition) {
      return null
    }

    // 计算箭头位置（目标点附近）
    const direction = Cesium.Cartesian3.subtract(
      relation.targetPosition,
      relation.sourcePosition,
      new Cesium.Cartesian3(),
    )

    const normalizedDirection = Cesium.Cartesian3.normalize(direction, new Cesium.Cartesian3())
    const arrowOffset = Cesium.Cartesian3.multiplyByScalar(
      normalizedDirection,
      -this.options.arrowSize,
      new Cesium.Cartesian3(),
    )

    const arrowPosition = Cesium.Cartesian3.add(
      relation.targetPosition,
      arrowOffset,
      new Cesium.Cartesian3(),
    )

    // 计算箭头旋转角度
    const heading = Math.atan2(direction.y, direction.x)
    const pitch = Math.asin(direction.z / Cesium.Cartesian3.magnitude(direction))

    const arrowEntity = new Cesium.Entity({
      id: `${relation.id}_arrow`,
      position: arrowPosition,
      billboard: {
        image: this.createArrowImage(relation),
        scale: relation.arrowScale || 1.0,
        color: relation.arrowColor
          ? Cesium.Color.fromCssColorString(relation.arrowColor)
          : this.getRelationStyle(relation).color,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        rotation: heading,
        alignedAxis: Cesium.Cartesian3.UNIT_Z,
        show: relation.showArrow !== false,
      },
    })

    return arrowEntity
  }

  /**
   * 创建箭头图像
   * @param {Object} relation - 关系数据
   * @returns {string|Canvas} 箭头图像
   */
  createArrowImage(relation) {
    // 如果有自定义箭头图像，使用自定义的
    if (relation.arrowImage) {
      return relation.arrowImage
    }

    // 创建Canvas绘制箭头
    const canvas = document.createElement('canvas')
    const size = this.options.arrowSize
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')
    const style = this.getRelationStyle(relation)

    // 绘制箭头
    ctx.fillStyle = style.color.toCssColorString()
    ctx.strokeStyle = style.color.toCssColorString()
    ctx.lineWidth = 2

    // 箭头路径
    ctx.beginPath()
    ctx.moveTo(size * 0.8, size * 0.5)
    ctx.lineTo(size * 0.2, size * 0.2)
    ctx.lineTo(size * 0.2, size * 0.4)
    ctx.lineTo(size * 0.1, size * 0.4)
    ctx.lineTo(size * 0.1, size * 0.6)
    ctx.lineTo(size * 0.2, size * 0.6)
    ctx.lineTo(size * 0.2, size * 0.8)
    ctx.closePath()

    ctx.fill()
    ctx.stroke()

    return canvas
  }

  /**
   * 创建流动动画实体
   * @param {Object} relation - 关系数据
   * @param {Object} options - 选项
   * @returns {Cesium.Entity|null} 动画实体
   */
  createFlowAnimationEntity(relation, options) {
    if (!relation.sourcePosition || !relation.targetPosition) {
      return null
    }

    // 创建移动的粒子或图标
    const animationEntity = new Cesium.Entity({
      id: `${relation.id}_flow`,
      position: relation.sourcePosition.clone(),
      billboard: {
        image: relation.flowImage || this.createFlowParticleImage(relation),
        scale: relation.flowScale || 0.5,
        color: relation.flowColor
          ? Cesium.Color.fromCssColorString(relation.flowColor)
          : Cesium.Color.WHITE,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        show: relation.showFlow !== false,
      },
      properties: {
        relationId: relation.id,
        isFlowAnimation: true,
      },
    })

    return animationEntity
  }

  /**
   * 创建流动粒子图像
   * @param {Object} relation - 关系数据
   * @returns {Canvas} 粒子图像
   */
  createFlowParticleImage(relation) {
    const canvas = document.createElement('canvas')
    const size = 16
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')
    const style = this.getRelationStyle(relation)

    // 绘制圆形粒子
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 4, 0, 2 * Math.PI)
    ctx.fillStyle = style.color.toCssColorString()
    ctx.fill()

    // 添加发光效果
    ctx.shadowColor = style.color.toCssColorString()
    ctx.shadowBlur = 4
    ctx.fill()

    return canvas
  }

  /**
   * 获取关系样式
   * @param {Object} relation - 关系数据
   * @returns {Object} 样式配置
   */
  getRelationStyle(relation) {
    const type = relation.type || 'default'
    const isSelected = this.interactionManager.selectedRelation === relation.id

    if (isSelected) {
      return this.relationStyles.selected
    }

    return this.relationStyles[type] || this.relationStyles.default
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
   * 更新关系
   * @param {Object} relation - 关系数据
   * @param {Object} options - 选项
   */
  updateRelation(relation, options = {}) {
    const cesiumEntity = this.cesiumEntities.get(relation.id)
    if (!cesiumEntity) return

    // 处理新的关系数据
    const processedRelation = this.processRelation(relation)

    // 更新连线
    if (
      cesiumEntity.polyline &&
      processedRelation.sourcePosition &&
      processedRelation.targetPosition
    ) {
      const positions = [processedRelation.sourcePosition, processedRelation.targetPosition]

      // 如果是弧线，添加中间点
      if (processedRelation.curved) {
        const arcPositions = this.createArcPositions(processedRelation)
        positions.splice(1, 0, ...arcPositions)
      }

      cesiumEntity.polyline.positions = positions
      cesiumEntity.polyline.material = this.createRelationMaterial(
        processedRelation,
        this.getRelationStyle(processedRelation),
      )
    }

    // 更新标签
    if (cesiumEntity.label && processedRelation.label) {
      cesiumEntity.label.text =
        processedRelation.label.text || processedRelation.name || processedRelation.type || ''
      cesiumEntity.label.position = processedRelation.midPosition
    }

    // 更新箭头
    const arrowEntity = this.arrowEntities.get(relation.id)
    if (arrowEntity) {
      this.updateArrowEntity(arrowEntity, processedRelation)
    }

    // 更新动画实体
    const animationEntity = this.animationEntities.get(relation.id)
    if (animationEntity) {
      this.updateFlowAnimationEntity(animationEntity, processedRelation)
    }

    // 更新存储的关系数据
    this.relations.set(relation.id, processedRelation)

    // 更新LOD
    if (this.lodManager.enabled) {
      this.setRelationLOD(relation.id, this.calculateLOD(processedRelation))
    }
  }

  /**
   * 更新箭头实体
   * @param {Cesium.Entity} arrowEntity - 箭头实体
   * @param {Object} relation - 关系数据
   */
  updateArrowEntity(arrowEntity, relation) {
    if (!relation.sourcePosition || !relation.targetPosition) return

    // 重新计算箭头位置和旋转
    const direction = Cesium.Cartesian3.subtract(
      relation.targetPosition,
      relation.sourcePosition,
      new Cesium.Cartesian3(),
    )

    const normalizedDirection = Cesium.Cartesian3.normalize(direction, new Cesium.Cartesian3())
    const arrowOffset = Cesium.Cartesian3.multiplyByScalar(
      normalizedDirection,
      -this.options.arrowSize,
      new Cesium.Cartesian3(),
    )

    const arrowPosition = Cesium.Cartesian3.add(
      relation.targetPosition,
      arrowOffset,
      new Cesium.Cartesian3(),
    )

    const heading = Math.atan2(direction.y, direction.x)

    arrowEntity.position = arrowPosition
    if (arrowEntity.billboard) {
      arrowEntity.billboard.rotation = heading
    }
  }

  /**
   * 更新流动动画实体
   * @param {Cesium.Entity} animationEntity - 动画实体
   * @param {Object} relation - 关系数据
   */
  updateFlowAnimationEntity(animationEntity, relation) {
    // 重置动画位置到起点
    animationEntity.position = relation.sourcePosition.clone()

    // 更新动画参数
    this.animationManager.flowAnimations.set(relation.id, {
      entity: animationEntity,
      source: relation.sourcePosition,
      target: relation.targetPosition,
      progress: 0,
      speed: relation.flowSpeed || this.options.flowSpeed,
    })
  }

  /**
   * 移除关系
   * @param {string} relationId - 关系ID
   */
  removeRelation(relationId) {
    // 移除主实体
    const cesiumEntity = this.cesiumEntities.get(relationId)
    if (cesiumEntity) {
      this.dataSource.entities.remove(cesiumEntity)
      this.cesiumEntities.delete(relationId)
    }

    // 移除箭头实体
    const arrowEntity = this.arrowEntities.get(relationId)
    if (arrowEntity) {
      this.dataSource.entities.remove(arrowEntity)
      this.arrowEntities.delete(relationId)
    }

    // 移除动画实体
    const animationEntity = this.animationEntities.get(relationId)
    if (animationEntity) {
      this.dataSource.entities.remove(animationEntity)
      this.animationEntities.delete(relationId)
    }

    // 清理数据
    this.relations.delete(relationId)
    this.lodManager.relationLOD.delete(relationId)
    this.animationManager.activeAnimations.delete(relationId)
    this.animationManager.flowAnimations.delete(relationId)
  }

  /**
   * 批量移除关系
   * @param {Array} relationIds - 关系ID数组
   */
  removeRelations(relationIds) {
    relationIds.forEach((relationId) => this.removeRelation(relationId))
  }

  /**
   * 清空所有关系
   */
  clear() {
    this.dataSource.entities.removeAll()
    this.relations.clear()
    this.cesiumEntities.clear()
    this.arrowEntities.clear()
    this.animationEntities.clear()
    this.lodManager.relationLOD.clear()
    this.animationManager.activeAnimations.clear()
    this.animationManager.flowAnimations.clear()
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

    this.stats.animationTime = performance.now() - startTime
  }

  /**
   * 更新流动动画
   * @param {number} timestamp - 时间戳
   */
  updateFlowAnimations(timestamp) {
    this.animationManager.flowAnimations.forEach((animation, relationId) => {
      // 更新进度
      animation.progress += animation.speed * 0.01

      if (animation.progress >= 1.0) {
        animation.progress = 0 // 重置到起点
      }

      // 计算当前位置
      const currentPosition = Cesium.Cartesian3.lerp(
        animation.source,
        animation.target,
        animation.progress,
        new Cesium.Cartesian3(),
      )

      // 更新实体位置
      animation.entity.position = currentPosition
    })
  }

  /**
   * 启动动画
   */
  startAnimations() {
    this.relations.forEach((relation, relationId) => {
      if (relation.animated && this.animationEntities.has(relationId)) {
        this.startRelationAnimation(relationId)
      }
    })
  }

  /**
   * 启动关系动画
   * @param {string} relationId - 关系ID
   */
  startRelationAnimation(relationId) {
    const relation = this.relations.get(relationId)
    const animationEntity = this.animationEntities.get(relationId)

    if (!relation || !animationEntity) return

    // 添加到流动动画管理器
    this.animationManager.flowAnimations.set(relationId, {
      entity: animationEntity,
      source: relation.sourcePosition,
      target: relation.targetPosition,
      progress: 0,
      speed: relation.flowSpeed || this.options.flowSpeed,
    })
  }

  /**
   * 停止动画
   */
  stopAnimations() {
    this.animationManager.activeAnimations.clear()
    this.animationManager.flowAnimations.clear()
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

    this.relations.forEach((relation, relationId) => {
      const newLOD = this.calculateLOD(relation, cameraPosition)
      const currentLOD = this.lodManager.relationLOD.get(relationId)

      if (newLOD !== currentLOD) {
        this.setRelationLOD(relationId, newLOD)
      }
    })

    this.lodManager.lastUpdateTime = now
  }

  /**
   * 计算关系LOD级别
   * @param {Object} relation - 关系数据
   * @param {Cesium.Cartesian3} cameraPosition - 相机位置
   * @returns {number} LOD级别
   */
  calculateLOD(relation, cameraPosition = null) {
    if (!cameraPosition) {
      cameraPosition = this.viewer.camera.position
    }

    if (!relation.midPosition) {
      return this.lodManager.distances.length // 最低LOD
    }

    const distance = Cesium.Cartesian3.distance(cameraPosition, relation.midPosition)

    // 根据距离确定LOD级别
    for (let i = 0; i < this.lodManager.distances.length; i++) {
      if (distance <= this.lodManager.distances[i]) {
        return i
      }
    }

    return this.lodManager.distances.length
  }

  /**
   * 设置关系LOD级别
   * @param {string} relationId - 关系ID
   * @param {number} lodLevel - LOD级别
   */
  setRelationLOD(relationId, lodLevel) {
    const cesiumEntity = this.cesiumEntities.get(relationId)
    if (!cesiumEntity) return

    this.lodManager.relationLOD.set(relationId, lodLevel)

    // 根据LOD级别调整显示
    switch (lodLevel) {
      case 0: // 最近距离 - 显示所有细节
        if (cesiumEntity.polyline) cesiumEntity.polyline.show = true
        if (cesiumEntity.label) cesiumEntity.label.show = true
        this.setArrowVisible(relationId, true)
        this.setFlowAnimationVisible(relationId, true)
        break

      case 1: // 中等距离 - 显示主要元素
        if (cesiumEntity.polyline) cesiumEntity.polyline.show = true
        if (cesiumEntity.label) cesiumEntity.label.show = false
        this.setArrowVisible(relationId, true)
        this.setFlowAnimationVisible(relationId, false)
        break

      case 2: // 远距离 - 只显示连线
        if (cesiumEntity.polyline) cesiumEntity.polyline.show = true
        if (cesiumEntity.label) cesiumEntity.label.show = false
        this.setArrowVisible(relationId, false)
        this.setFlowAnimationVisible(relationId, false)
        break

      default: // 极远距离 - 隐藏
        if (cesiumEntity.polyline) cesiumEntity.polyline.show = false
        if (cesiumEntity.label) cesiumEntity.label.show = false
        this.setArrowVisible(relationId, false)
        this.setFlowAnimationVisible(relationId, false)
        break
    }
  }

  /**
   * 设置箭头可见性
   * @param {string} relationId - 关系ID
   * @param {boolean} visible - 是否可见
   */
  setArrowVisible(relationId, visible) {
    const arrowEntity = this.arrowEntities.get(relationId)
    if (arrowEntity && arrowEntity.billboard) {
      arrowEntity.billboard.show = visible
    }
  }

  /**
   * 设置流动动画可见性
   * @param {string} relationId - 关系ID
   * @param {boolean} visible - 是否可见
   */
  setFlowAnimationVisible(relationId, visible) {
    const animationEntity = this.animationEntities.get(relationId)
    if (animationEntity && animationEntity.billboard) {
      animationEntity.billboard.show = visible
    }
  }

  /**
   * 关系点击事件
   * @param {Object} event - 点击事件
   */
  onRelationClick(event) {
    const pickedObject = this.viewer.scene.pick(event.position)
    if (!pickedObject || !pickedObject.id) return

    const entityId = pickedObject.id.id || pickedObject.id
    const relationId = this.extractRelationId(entityId)
    const relation = this.relations.get(relationId)

    if (relation) {
      // 取消之前的选择
      if (this.interactionManager.selectedRelation) {
        this.setRelationSelected(this.interactionManager.selectedRelation, false)
      }

      // 设置新的选择
      this.interactionManager.selectedRelation = relationId
      this.setRelationSelected(relationId, true)

      // 触发选择事件
      this.onRelationSelected(relation, event)
    }
  }

  /**
   * 关系悬停事件
   * @param {Object} event - 鼠标移动事件
   */
  onRelationHover(event) {
    const pickedObject = this.viewer.scene.pick(event.endPosition)
    const entityId = pickedObject && pickedObject.id ? pickedObject.id.id || pickedObject.id : null
    const relationId = entityId ? this.extractRelationId(entityId) : null

    // 取消之前的悬停
    if (
      this.interactionManager.hoveredRelation &&
      this.interactionManager.hoveredRelation !== relationId
    ) {
      this.setRelationHovered(this.interactionManager.hoveredRelation, false)
    }

    // 设置新的悬停
    if (relationId && relationId !== this.interactionManager.hoveredRelation) {
      this.interactionManager.hoveredRelation = relationId
      this.setRelationHovered(relationId, true)

      const relation = this.relations.get(relationId)
      if (relation) {
        this.onRelationHovered(relation, event)
      }
    } else if (!relationId) {
      this.interactionManager.hoveredRelation = null
    }
  }

  /**
   * 提取关系ID
   * @param {string} entityId - 实体ID
   * @returns {string} 关系ID
   */
  extractRelationId(entityId) {
    // 移除后缀（_arrow, _flow）
    return entityId.replace(/_(arrow|flow)$/, '')
  }

  /**
   * 设置关系选中状态
   * @param {string} relationId - 关系ID
   * @param {boolean} selected - 是否选中
   */
  setRelationSelected(relationId, selected) {
    const cesiumEntity = this.cesiumEntities.get(relationId)
    if (!cesiumEntity || !cesiumEntity.polyline) return

    if (selected) {
      cesiumEntity.polyline.material = this.relationStyles.selected.material
      cesiumEntity.polyline.width = this.relationStyles.selected.width
    } else {
      const relation = this.relations.get(relationId)
      if (relation) {
        const style = this.getRelationStyle(relation)
        cesiumEntity.polyline.material = this.createRelationMaterial(relation, style)
        cesiumEntity.polyline.width = relation.width || style.width
      }
    }
  }

  /**
   * 设置关系悬停状态
   * @param {string} relationId - 关系ID
   * @param {boolean} hovered - 是否悬停
   */
  setRelationHovered(relationId, hovered) {
    const cesiumEntity = this.cesiumEntities.get(relationId)
    if (!cesiumEntity || !cesiumEntity.polyline) return

    if (hovered) {
      cesiumEntity.polyline.width = (cesiumEntity.polyline.width || 2) * 1.5
    } else {
      const relation = this.relations.get(relationId)
      if (relation) {
        const style = this.getRelationStyle(relation)
        cesiumEntity.polyline.width = relation.width || style.width
      }
    }
  }

  /**
   * 关系选择事件（可重写）
   * @param {Object} relation - 关系数据
   * @param {Object} event - 事件对象
   */
  onRelationSelected(relation, event) {
    console.log('Relation selected:', relation)
  }

  /**
   * 关系悬停事件（可重写）
   * @param {Object} relation - 关系数据
   * @param {Object} event - 事件对象
   */
  onRelationHovered(relation, event) {
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
    this.stats.totalRelations = this.relations.size
    this.stats.visibleRelations = Array.from(this.cesiumEntities.values()).filter((entity) => {
      return entity.polyline && entity.polyline.show
    }).length
    this.stats.animatingRelations = this.animationManager.flowAnimations.size
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * 获取关系
   * @param {string} relationId - 关系ID
   * @returns {Object|null} 关系数据
   */
  getRelation(relationId) {
    return this.relations.get(relationId) || null
  }

  /**
   * 获取所有关系
   * @returns {Array} 关系数组
   */
  getAllRelations() {
    return Array.from(this.relations.values())
  }

  /**
   * 检查是否可以销毁
   * @returns {boolean} 是否可以销毁
   */
  canDestroy() {
    return this.relations.size === 0
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

    // 移除相机监听
    this.viewer.camera.changed.removeEventListener(this.onCameraChanged)

    // 清理数据源
    this.viewer.dataSources.remove(this.dataSource)

    // 清理数据
    this.clear()
  }
}

export default RelationRenderer
