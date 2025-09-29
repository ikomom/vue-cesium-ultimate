/**
 * Mars3D 数据可视化管理器
 * @description 基于Mars3D实现DataVisualization.vue的所有功能
 * @author Mars3D Team
 */

import * as mars3d from 'mars3d'
const Cesium = mars3d.Cesium
export class DataVisualizationManager {
  constructor(map) {
    this.map = map
    this.layers = new Map()
    this.dataStore = {
      points: new Map(),
      relations: new Map(),
      trajectories: new Map(),
      events: new Map(),
      fusionLines: new Map(),
      virtualNodes: new Map(),
      activeRings: new Map(),
    }

    // 初始化图层
    this.initLayers()

    // 绑定事件
    this.bindEvents()
  }

  /**
   * 初始化图层
   */
  initLayers() {
    // 创建各种功能图层
    this.layers.set(
      'points',
      new mars3d.layer.GraphicLayer({
        name: '目标点位',
        show: true,
        hasOpacity: true,
        opacity: 1.0,
      }),
    )

    this.layers.set(
      'relations',
      new mars3d.layer.GraphicLayer({
        name: '关系连线',
        show: true,
        hasOpacity: true,
        opacity: 0.8,
      }),
    )

    this.layers.set(
      'trajectories',
      new mars3d.layer.GraphicLayer({
        name: '轨迹路径',
        show: true,
        hasOpacity: true,
        opacity: 0.9,
      }),
    )

    this.layers.set(
      'events',
      new mars3d.layer.GraphicLayer({
        name: '事件连线',
        show: true,
        hasOpacity: true,
        opacity: 0.7,
      }),
    )

    this.layers.set(
      'fusionLines',
      new mars3d.layer.GraphicLayer({
        name: '融合线',
        show: true,
        hasOpacity: true,
        opacity: 0.6,
      }),
    )

    this.layers.set(
      'virtualNodes',
      new mars3d.layer.GraphicLayer({
        name: '虚拟节点',
        show: true,
        hasOpacity: true,
        opacity: 0.8,
      }),
    )

    // 添加图层到地图
    this.layers.forEach((layer) => {
      this.map.addLayer(layer)
    })
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 绑定图层点击事件
    this.layers.forEach((layer, layerName) => {
      layer.on(mars3d.EventType.click, (event) => {
        this.handleEntityClick(event, layerName)
      })

      layer.on(mars3d.EventType.dblClick, (event) => {
        this.handleEntityDoubleClick(event, layerName)
      })

      layer.on(mars3d.EventType.mouseOver, (event) => {
        this.handleEntityHover(event, layerName)
      })

      layer.on(mars3d.EventType.mouseOut, (event) => {
        this.handleEntityLeave(event, layerName)
      })
    })
  }

  /**
   * 添加目标点位
   * @param {Object} pointData - 点位数据
   */
  addPoint(pointData) {
    const {
      id,
      name,
      longitude,
      latitude,
      height = 0,
      type = 'default',
      status = 'active',
      iconUrl,
      scale = 1.0,
      color = '#ffffff',
      labelText,
      labelColor = '#ffffff',
      labelBackgroundColor = 'rgba(0,0,0,0.7)',
      showLabel = true,
      metadata = {},
    } = pointData

    // 创建动态样式配置
    const style = {
      image: iconUrl || this.getDefaultIcon(type),
      scale: scale,
      color: color,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,

      // 距离显示控制
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000),

      // 标签配置
      label: showLabel
        ? {
            text: labelText || name,
            font: '12pt sans-serif',
            fillColor: labelColor,
            outlineColor: '#000000',
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -40),
            showBackground: true,
            backgroundColor: labelBackgroundColor,
            backgroundPadding: new Cesium.Cartesian2(8, 4),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2000000),
          }
        : undefined,

      // 高亮样式
      highlight: {
        scale: scale * 1.5,
        color: '#ffff00',
      },
    }

    // 创建点位图形
    const graphic = new mars3d.graphic.BillboardEntity({
      id: id,
      position: [longitude, latitude, height],
      style: style,
      attr: {
        entityType: 'point',
        originalData: pointData,
        ...metadata,
      },
    })

    // 添加到图层和数据存储
    this.layers.get('points').addGraphic(graphic)
    this.dataStore.points.set(id, {
      graphic: graphic,
      data: pointData,
    })

    return graphic
  }

  /**
   * 添加关系连线
   * @param {Object} relationData - 关系数据
   */
  addRelation(relationData) {
    const {
      id,
      name,
      sourceId,
      targetId,
      type = 'default',
      width = 2,
      color = '#00ff00',
      materialType = 'LineFlow',
      materialOptions = {},
      showLabel = true,
      labelText,
      curve = false,
      curveHeight = 100000,
    } = relationData

    // 获取源点和目标点
    const sourcePoint = this.dataStore.points.get(sourceId)
    const targetPoint = this.dataStore.points.get(targetId)

    if (!sourcePoint || !targetPoint) {
      console.warn(`关系连线 ${id} 缺少源点或目标点`)
      return null
    }

    // 获取位置
    const sourcePos = sourcePoint.graphic.position
    const targetPos = targetPoint.graphic.position

    let positions
    if (curve) {
      // 创建曲线路径
      positions = this.generateCurvePositions(sourcePos, targetPos, curveHeight)
    } else {
      positions = [sourcePos, targetPos]
    }

    // 创建材质
    let material
    switch (materialType) {
      case 'LineFlow':
        material = mars3d.MaterialUtil.createMaterialProperty(mars3d.MaterialType.LineFlow, {
          color: color,
          speed: materialOptions.speed || 10,
          percent: materialOptions.percent || 0.3,
          gradient: materialOptions.gradient || 0.1,
          ...materialOptions,
        })
        break
      case 'LineBlink':
        material = mars3d.MaterialUtil.createMaterialProperty(mars3d.MaterialType.LineFlicker, {
          color: color,
          speed: materialOptions.speed || 2,
          ...materialOptions,
        })
        break
      default:
        material = mars3d.Color.fromCssColorString(color)
    }

    // 创建连线图形
    const graphic = new mars3d.graphic.PolylineEntity({
      id: id,
      positions: positions,
      style: {
        width: width,
        material: material,
        clampToGround: false,
        // 添加距离显示条件，与点位保持一致
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000),

        // 标签配置
        label: showLabel
          ? {
              text: labelText || name,
              font: '10pt sans-serif',
              fillColor: '#ffffff',
              outlineColor: '#000000',
              outlineWidth: 1,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              showBackground: true,
              backgroundColor: 'rgba(0,0,0,0.7)',
              backgroundPadding: new Cesium.Cartesian2(6, 3),
              pixelOffset: new Cesium.Cartesian2(0, -20),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1000000),
            }
          : undefined,
      },
      attr: {
        entityType: 'relation',
        originalData: relationData,
        sourceId: sourceId,
        targetId: targetId,
      },
    })

    // 添加到图层和数据存储
    this.layers.get('relations').addGraphic(graphic)
    this.dataStore.relations.set(id, {
      graphic: graphic,
      data: relationData,
    })

    return graphic
  }

  /**
   * 添加轨迹
   * @param {Object} trajectoryData - 轨迹数据
   */
  addTrajectory(trajectoryData) {
    const {
      id,
      name,
      targetId,
      trajectory,
      showPath = true,
      pathWidth = 2,
      pathColor = '#ffff00',
      pathMaterial = 'PolylineTrail',
      showModel = true,
      modelUrl,
      modelScale = 1.0,
      showLabel = true,
    } = trajectoryData

    if (!trajectory || trajectory.length === 0) {
      console.warn(`轨迹 ${id} 没有轨迹点数据`)
      return null
    }

    // 创建时间-位置属性
    const positionProperty = new Cesium.SampledPositionProperty()
    const positions = []

    trajectory.forEach((point) => {
      const time = Cesium.JulianDate.fromIso8601(point.timestamp)
      const position = Cesium.Cartesian3.fromDegrees(
        point.longitude,
        point.latitude,
        point.altitude || point.height || 0,
      )

      positionProperty.addSample(time, position)
      positions.push([point.longitude, point.latitude, point.altitude || point.height || 0])
    })

    // 设置插值算法
    positionProperty.setInterpolationOptions({
      interpolationDegree: 1,
      interpolationAlgorithm: mars3d.LagrangePolynomialApproximation,
    })

    // 创建轨迹路径
    if (showPath) {
      let pathMaterialProperty
      switch (pathMaterial) {
        case 'PolylineTrail':
          pathMaterialProperty = mars3d.MaterialUtil.createMaterialProperty(
            mars3d.MaterialType.LineTrail,
            {
              color: pathColor,
              trailLength: 0.3,
              speed: 5,
            },
          )
          break
        case 'LineFlow':
          pathMaterialProperty = mars3d.MaterialUtil.createMaterialProperty(
            mars3d.MaterialType.LineFlow,
            {
              color: pathColor,
              speed: 10,
              percent: 0.3,
            },
          )
          // 确保场景持续渲染以支持动画材质
          if (this.map && this.map.scene) {
            this.map.scene.requestRenderMode = false
          }
          break
        default:
          pathMaterialProperty = mars3d.Color.fromCssColorString(pathColor)
      }

      const pathGraphic = new mars3d.graphic.PolylineEntity({
        id: `${id}_path`,
        positions: positions,
        style: {
          width: pathWidth,
          material: pathMaterialProperty,
          clampToGround: false,
        },
        attr: {
          entityType: 'trajectory_path',
          parentId: id,
        },
      })

      this.layers.get('trajectories').addGraphic(pathGraphic)
    }

    // 创建移动目标
    const targetGraphic = new mars3d.graphic.ModelEntity({
      id: id,
      position: positionProperty,
      style: {
        url: modelUrl || this.getDefaultModel(targetId),
        scale: modelScale,
        minimumPixelSize: 32,

        // 自动朝向运动方向
        orientation: new Cesium.VelocityOrientationProperty(positionProperty),

        // 标签配置
        label: showLabel
          ? {
              text: name,
              font: '12pt sans-serif',
              fillColor: '#ffffff',
              outlineColor: '#000000',
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -50),
              showBackground: true,
              backgroundColor: 'rgba(0,0,0,0.7)',
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1000000),
            }
          : undefined,
      },
      attr: {
        entityType: 'trajectory',
        originalData: trajectoryData,
        targetId: targetId,
      },
    })

    // 添加到图层和数据存储
    this.layers.get('trajectories').addGraphic(targetGraphic)
    this.dataStore.trajectories.set(id, {
      graphic: targetGraphic,
      data: trajectoryData,
    })

    return targetGraphic
  }

  /**
   * 添加事件
   * @param {Object} eventData - 事件数据
   */
  addEvent(eventData) {
    const {
      id,
      name,
      sourceId,
      targetId,
      type = 'default',
      startTime,
      endTime,
      duration,
      severity = 'medium',
      width = 3,
      color = '#ff0000',
      materialType = 'LineBlink',
      showLabel = true,
    } = eventData

    // 获取源点和目标点
    const sourcePoint = this.dataStore.points.get(sourceId)
    const targetPoint = this.dataStore.points.get(targetId)

    if (!sourcePoint || !targetPoint) {
      console.warn(`事件 ${id} 缺少源点或目标点`)
      return null
    }

    // 创建时间可用性
    let availability
    if (startTime) {
      const start = Cesium.JulianDate.fromIso8601(startTime)
      let stop = start

      if (endTime) {
        stop = Cesium.JulianDate.fromIso8601(endTime)
      } else if (duration) {
        stop = Cesium.JulianDate.addSeconds(start, duration * 60, new Cesium.JulianDate())
      } else {
        stop = Cesium.JulianDate.addSeconds(start, 3600, new Cesium.JulianDate())
      }

      availability = new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({ start: start, stop: stop }),
      ])
    }

    // 创建材质
    let material
    switch (materialType) {
      case 'LineBlink':
        material = mars3d.MaterialUtil.createMaterialProperty(mars3d.MaterialType.LineFlicker, {
          color: color,
          speed: this.getBlinkSpeedBySeverity(severity),
        })
        break
      case 'LineFlow':
        material = mars3d.MaterialUtil.createMaterialProperty(mars3d.MaterialType.LineFlow, {
          color: color,
          speed: 15,
          percent: 0.5,
        })
        break
      default:
        material = mars3d.Color.fromCssColorString(color)
    }

    // 创建事件连线
    const graphic = new mars3d.graphic.PolylineEntity({
      id: id,
      positions: [sourcePoint.graphic.position, targetPoint.graphic.position],
      availability: availability,
      style: {
        width: width,
        material: material,

        // 标签配置
        label: showLabel
          ? {
              text: name,
              font: '10pt sans-serif',
              fillColor: '#ffffff',
              outlineColor: color,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              showBackground: true,
              backgroundColor: `${color}80`,
              backgroundPadding: new Cesium.Cartesian2(6, 3),
              pixelOffset: new Cesium.Cartesian2(0, -20),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1000000),
            }
          : undefined,
      },
      attr: {
        entityType: 'event',
        originalData: eventData,
        sourceId: sourceId,
        targetId: targetId,
        severity: severity,
      },
    })

    // 添加到图层和数据存储
    this.layers.get('events').addGraphic(graphic)
    this.dataStore.events.set(id, {
      graphic: graphic,
      data: eventData,
    })

    return graphic
  }

  /**
   * 添加融合线
   * @param {Object} fusionLineData - 融合线数据
   */
  addFusionLine(fusionLineData) {
    const {
      id,
      name,
      sourceId,
      targetId,
      type = 'data_fusion',
      confidence = 1.0,
      width = 2,
      startColor = '#00ffff',
      endColor = '#0080ff',
      alpha = 0.8,
      showLabel = true,
    } = fusionLineData

    // 获取源点和目标点
    const sourcePoint = this.dataStore.points.get(sourceId)
    const targetPoint = this.dataStore.points.get(targetId)

    if (!sourcePoint || !targetPoint) {
      console.warn(`融合线 ${id} 缺少源点或目标点`)
      return null
    }

    // 创建渐变材质
    const material = mars3d.MaterialUtil.createMaterialProperty(mars3d.MaterialType.PolyGradient, {
      startColor: startColor,
      endColor: endColor,
      alpha: alpha * confidence,
    })

    // 创建融合线
    const graphic = new mars3d.graphic.PolylineEntity({
      id: id,
      positions: [sourcePoint.graphic.position, targetPoint.graphic.position],
      style: {
        width: width,
        material: material,

        // 标签配置
        label: showLabel
          ? {
              text: `${name} (${(confidence * 100).toFixed(1)}%)`,
              font: '10pt sans-serif',
              fillColor: '#ffffff',
              outlineColor: startColor,
              outlineWidth: 1,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              showBackground: true,
              backgroundColor: `${startColor}80`,
              backgroundPadding: new Cesium.Cartesian2(6, 3),
              pixelOffset: new Cesium.Cartesian2(0, -20),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1000000),
            }
          : undefined,
      },
      attr: {
        entityType: 'fusionLine',
        originalData: fusionLineData,
        sourceId: sourceId,
        targetId: targetId,
        confidence: confidence,
      },
    })

    // 添加到图层和数据存储
    this.layers.get('fusionLines').addGraphic(graphic)
    this.dataStore.fusionLines.set(id, {
      graphic: graphic,
      data: fusionLineData,
    })

    return graphic
  }

  /**
   * 创建虚拟节点和圆环
   * @param {string} pointId - 点位ID
   */
  createVirtualNodesAndRing(pointId) {
    const pointData = this.dataStore.points.get(pointId)
    if (!pointData) {
      console.warn(`找不到点位 ${pointId}`)
      return
    }

    const ringId = `ring-${pointId}`
    const nodesId = `nodes-${pointId}`

    // 检查是否已存在
    if (this.dataStore.activeRings.has(ringId)) {
      return
    }

    const position = pointData.graphic.position
    const radius = pointData.data.ringRadius || 50000
    const nodeCount = pointData.data.virtualNodes?.length || 6

    // 创建圆环
    const ringGraphic = new mars3d.graphic.CircleEntity({
      id: ringId,
      position: position,
      style: {
        radius: radius,
        material: mars3d.MaterialUtil.createMaterialProperty(mars3d.MaterialType.CircleWave, {
          color: pointData.data.ringColor || '#ff6b35',
          count: 2,
          speed: 20,
        }),
        outline: true,
        outlineColor: pointData.data.ringOutlineColor || '#ff6b35',
        outlineWidth: 2,
        height: 0,
        extrudedHeight: 0,
      },
      attr: {
        entityType: 'ring',
        parentId: pointId,
      },
    })

    this.layers.get('virtualNodes').addGraphic(ringGraphic)
    this.dataStore.activeRings.set(ringId, ringGraphic)

    // 创建虚拟节点
    const nodes = []
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i * 360) / nodeCount
      const nodePosition = this.calculateNodePosition(position, radius, angle)

      const nodeGraphic = new mars3d.graphic.BillboardEntity({
        id: `${pointId}-node-${i}`,
        position: nodePosition,
        style: {
          image: '/icons/communication.svg',
          scale: 0.8,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,

          label: {
            text: `节点${i + 1}`,
            font: '10pt sans-serif',
            fillColor: '#ffffff',
            outlineColor: '#000000',
            outlineWidth: 1,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -30),
            showBackground: true,
            backgroundColor: 'rgba(0,0,0,0.7)',
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000),
          },
        },
        attr: {
          entityType: 'virtualNode',
          parentId: pointId,
          nodeIndex: i,
        },
      })

      this.layers.get('virtualNodes').addGraphic(nodeGraphic)
      nodes.push(nodeGraphic)
    }

    this.dataStore.virtualNodes.set(nodesId, nodes)
  }

  /**
   * 移除虚拟节点和圆环
   * @param {string} pointId - 点位ID
   */
  removeVirtualNodesAndRing(pointId) {
    const ringId = `ring-${pointId}`
    const nodesId = `nodes-${pointId}`

    // 移除圆环
    const ringGraphic = this.dataStore.activeRings.get(ringId)
    if (ringGraphic) {
      this.layers.get('virtualNodes').removeGraphic(ringGraphic)
      this.dataStore.activeRings.delete(ringId)
    }

    // 移除虚拟节点
    const nodes = this.dataStore.virtualNodes.get(nodesId)
    if (nodes) {
      nodes.forEach((node) => {
        this.layers.get('virtualNodes').removeGraphic(node)
      })
      this.dataStore.virtualNodes.delete(nodesId)
    }
  }

  /**
   * 处理实体点击事件
   */
  handleEntityClick(event, layerName) {
    const graphic = event.graphic
    if (!graphic) return

    console.log(`${layerName} 图层实体被点击:`, graphic.attr)

    // 触发自定义事件
    this.map.fire('entityClick', {
      graphic: graphic,
      layerName: layerName,
      entityType: graphic.attr?.entityType,
      originalData: graphic.attr?.originalData,
    })
  }

  /**
   * 处理实体双击事件
   */
  handleEntityDoubleClick(event, layerName) {
    const graphic = event.graphic
    if (!graphic) return

    console.log(`${layerName} 图层实体被双击:`, graphic.attr)

    // 如果是点位，切换虚拟节点显示
    if (graphic.attr?.entityType === 'point') {
      const pointId = graphic.id
      const ringId = `ring-${pointId}`

      if (this.dataStore.activeRings.has(ringId)) {
        this.removeVirtualNodesAndRing(pointId)
      } else {
        this.createVirtualNodesAndRing(pointId)
      }
    }

    // 触发自定义事件
    this.map.fire('entityDoubleClick', {
      graphic: graphic,
      layerName: layerName,
      entityType: graphic.attr?.entityType,
      originalData: graphic.attr?.originalData,
    })
  }

  /**
   * 处理实体悬停事件
   */
  handleEntityHover(event, layerName) {
    const graphic = event.graphic
    if (!graphic) return

    // 设置高亮效果
    if (graphic.highlight) {
      graphic.highlight.show = true
    }

    // 改变鼠标样式
    this.map.container.style.cursor = 'pointer'
  }

  /**
   * 处理实体离开事件
   */
  handleEntityLeave(event, layerName) {
    const graphic = event.graphic
    if (!graphic) return

    // 取消高亮效果
    if (graphic.highlight) {
      graphic.highlight.show = false
    }

    // 恢复鼠标样式
    this.map.container.style.cursor = 'auto'
  }

  /**
   * 设置图层显示状态
   * @param {string} layerName - 图层名称
   * @param {boolean} show - 是否显示
   */
  setLayerShow(layerName, show) {
    const layer = this.layers.get(layerName)
    if (layer) {
      layer.show = show
    }
  }

  /**
   * 清空所有数据
   */
  clearAll() {
    this.layers.forEach((layer) => {
      layer.clear()
    })

    Object.values(this.dataStore).forEach((store) => {
      if (store instanceof Map) {
        store.clear()
      }
    })
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      points: this.dataStore.points.size,
      relations: this.dataStore.relations.size,
      trajectories: this.dataStore.trajectories.size,
      events: this.dataStore.events.size,
      fusionLines: this.dataStore.fusionLines.size,
      virtualNodes: this.dataStore.virtualNodes.size,
      activeRings: this.dataStore.activeRings.size,
    }
  }

  // 辅助方法

  /**
   * 获取默认图标
   */
  getDefaultIcon(type) {
    const iconMap = {
      military: '/icons/military.svg',
      communication: '/icons/communication.svg',
      radar: '/icons/radar.svg',
      ship: '/icons/ship.svg',
      aircraft: '/icons/aircraft.svg',
      default: '/icons/default.svg',
    }
    return iconMap[type] || iconMap.default
  }

  /**
   * 获取默认模型
   */
  getDefaultModel(targetId) {
    return 'https://data.mars3d.cn/gltf/mars/man/walk.gltf'
  }

  /**
   * 根据严重程度获取闪烁速度
   */
  getBlinkSpeedBySeverity(severity) {
    const speedMap = {
      low: 1,
      medium: 2,
      high: 4,
      critical: 6,
    }
    return speedMap[severity] || 2
  }

  /**
   * 生成曲线位置
   */
  generateCurvePositions(startPos, endPos, height) {
    const startCartographic = Cesium.Cartographic.fromCartesian(startPos)
    const endCartographic = Cesium.Cartographic.fromCartesian(endPos)

    const startLng = Cesium.Math.toDegrees(startCartographic.longitude)
    const startLat = Cesium.Math.toDegrees(startCartographic.latitude)
    const endLng = Cesium.Math.toDegrees(endCartographic.longitude)
    const endLat = Cesium.Math.toDegrees(endCartographic.latitude)

    const positions = []
    const steps = 50

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const lng = startLng + (endLng - startLng) * t
      const lat = startLat + (endLat - startLat) * t
      const alt = Math.sin(t * Math.PI) * height

      positions.push([lng, lat, alt])
    }

    return positions
  }

  /**
   * 计算节点位置
   */
  calculateNodePosition(centerPosition, radius, angle) {
    const cartographic = Cesium.Cartographic.fromCartesian(centerPosition)
    const centerLng = Cesium.Math.toDegrees(cartographic.longitude)
    const centerLat = Cesium.Math.toDegrees(cartographic.latitude)
    const centerHeight = cartographic.height

    const radian = (angle * Math.PI) / 180
    const earthRadius = 6371000
    const latRad = (centerLat * Math.PI) / 180
    const lonRad = (centerLng * Math.PI) / 180

    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(radius / earthRadius) +
        Math.cos(latRad) * Math.sin(radius / earthRadius) * Math.cos(radian),
    )

    const newLonRad =
      lonRad +
      Math.atan2(
        Math.sin(radian) * Math.sin(radius / earthRadius) * Math.cos(latRad),
        Math.cos(radius / earthRadius) - Math.sin(latRad) * Math.sin(newLatRad),
      )

    const nodeLng = (newLonRad * 180) / Math.PI
    const nodeLat = (newLatRad * 180) / Math.PI

    return [nodeLng, nodeLat, centerHeight]
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.layers.forEach((layer) => {
      this.map.removeLayer(layer)
    })

    this.layers.clear()

    Object.values(this.dataStore).forEach((store) => {
      if (store instanceof Map) {
        store.clear()
      }
    })
  }
}

export default DataVisualizationManager
