/**
 * 数据适配器 - 将不同格式的数据转换为标准渲染格式
 * 支持多种数据源格式的统一处理
 */

// 导入Cesium
import * as Cesium from 'cesium'

class DataAdapter {
  constructor(options = {}) {
    this.options = {
      // 默认配置
      coordinateSystem: 'WGS84', // 坐标系统
      timeFormat: 'ISO8601', // 时间格式
      defaultHeight: 0, // 默认高度
      ...options,
    }

    // 数据类型映射
    this.typeMapping = new Map([
      ['point', this.adaptPointData.bind(this)],
      ['target', this.adaptTargetData.bind(this)],
      ['trajectory', this.adaptTrajectoryData.bind(this)],
      ['relation', this.adaptRelationData.bind(this)],
      ['event', this.adaptEventData.bind(this)],
      ['area', this.adaptAreaData.bind(this)],
      ['route', this.adaptRouteData.bind(this)],
    ])

    // 坐标转换器
    this.coordinateConverters = new Map([
      ['WGS84', this.convertWGS84.bind(this)],
      ['GCJ02', this.convertGCJ02.bind(this)],
      ['BD09', this.convertBD09.bind(this)],
      ['UTM', this.convertUTM.bind(this)],
    ])

    // 时间转换器
    this.timeConverters = new Map([
      ['ISO8601', this.convertISO8601.bind(this)],
      ['timestamp', this.convertTimestamp.bind(this)],
      ['datetime', this.convertDateTime.bind(this)],
    ])
  }

  /**
   * 适配数据
   * @param {Array|Object} rawData - 原始数据
   * @param {string|Object} dataType - 数据类型或选项对象
   * @param {Object} options - 适配选项
   * @returns {Array} 适配后的数据
   */
  adaptData(rawData, dataType, options = {}) {
    try {
      // 确保数据是数组格式
      const dataArray = Array.isArray(rawData) ? rawData : [rawData]

      // 处理dataType参数 - 如果是对象，则从中提取类型信息
      let actualDataType = dataType
      let actualOptions = options

      if (typeof dataType === 'object' && dataType !== null) {
        // 如果dataType是对象，尝试从中提取类型信息
        actualDataType = dataType.type || this.inferDataType(dataArray[0])
        actualOptions = { ...options, ...dataType }
      } else if (typeof dataType !== 'string') {
        // 如果dataType不是字符串，尝试自动推断
        actualDataType = this.inferDataType(dataArray[0])
      }

      // 获取适配器函数
      const adapter = this.typeMapping.get(actualDataType)
      if (!adapter) {
        throw new Error(`Unsupported data type: ${actualDataType}`)
      }

      // 批量适配数据
      const adaptedData = dataArray
        .map((item) => {
          return this.adaptSingleItem(item, adapter, actualOptions)
        })
        .filter((item) => item !== null)

      return adaptedData
    } catch (error) {
      console.error('Data adaptation failed:', error)
      return []
    }
  }

  /**
   * 适配单个数据项
   * @param {Object} item - 数据项
   * @param {Function} adapter - 适配器函数
   * @param {Object} options - 选项
   * @returns {Object|null} 适配后的数据项
   */
  adaptSingleItem(item, adapter, options) {
    try {
      // 基础数据验证
      if (!item || typeof item !== 'object') {
        return null
      }

      // 执行适配
      const adaptedItem = adapter(item, options)

      // 添加通用属性
      if (adaptedItem) {
        adaptedItem.id = adaptedItem.id || item.id || this.generateId()
        adaptedItem.timestamp = adaptedItem.timestamp || Date.now()
        adaptedItem.source = options.source || 'unknown'
      }

      return adaptedItem
    } catch (error) {
      console.warn('Failed to adapt item:', item, error)
      return null
    }
  }

  /**
   * 适配点位数据
   * @param {Object} data - 原始点位数据
   * @param {Object} options - 选项
   * @returns {Object} 适配后的点位数据
   */
  adaptPointData(data, options = {}) {
    const position = this.extractPosition(data)
    if (!position) {
      throw new Error('Invalid position data')
    }

    return {
      id: data.id,
      type: 'point',
      name: data.name || data.label || `Point_${data.id}`,
      position: position,

      // 图标配置
      billboard: {
        image: data.icon || data.image || options.defaultIcon || '/icons/ship.svg',
        scale: data.scale || options.defaultScale || 1.0,
        color: data.color || options.defaultColor || '#FFFFFF',
        pixelOffset: data.pixelOffset
          ? Array.isArray(data.pixelOffset)
            ? new Cesium.Cartesian2(data.pixelOffset[0] || 0, data.pixelOffset[1] || 0)
            : data.pixelOffset
          : new Cesium.Cartesian2(0, 0),
      },

      // 标签配置
      label:
        data.showLabel !== false
          ? {
              text: data.name || data.label || `Point_${data.id}`,
              fillColor: data.labelColor || '#FFFFFF',
              outlineColor: data.labelOutlineColor || '#000000',
              font: data.labelFont || '12pt sans-serif',
            }
          : null,

      // 属性数据
      properties: {
        ...data.properties,
        category: data.category || 'default',
        priority: data.priority || 0,
        status: data.status || 'normal',
      },

      // 时间信息
      timeRange: this.extractTimeRange(data),

      // 可见性配置
      visible: data.visible !== false,

      // 交互配置
      interactive: data.interactive !== false,

      // 原始数据引用
      _rawData: data,
    }
  }

  /**
   * 适配目标数据
   * @param {Object} data - 原始目标数据
   * @param {Object} options - 选项
   * @returns {Object} 适配后的目标数据
   */
  adaptTargetData(data, options = {}) {
    const baseData = this.adaptPointData(data, options)

    return {
      ...baseData,
      type: 'target',

      // 目标特有属性
      targetType: data.targetType || data.type || 'unknown',
      classification: data.classification || 'unclassified',
      threat: data.threat || 'unknown',

      // 状态历史
      statusHistory: data.statusHistory || [],

      // 轨迹数据
      trajectory: data.trajectory ? this.adaptTrajectoryPoints(data.trajectory) : null,

      // 关联关系
      relations: data.relations || [],

      // 传感器数据
      sensors: data.sensors || [],

      // 动态属性
      dynamicProperties: this.extractDynamicProperties(data),
    }
  }

  /**
   * 适配轨迹数据
   * @param {Object} data - 原始轨迹数据
   * @param {Object} options - 选项
   * @returns {Object} 适配后的轨迹数据
   */
  adaptTrajectoryData(data, options = {}) {
    const points = this.adaptTrajectoryPoints(
      data.points || data.trajectory || data.positions || [],
    )
    // debugger
    if (points.length === 0) {
      throw new Error('Invalid trajectory data: no valid points')
    }

    return {
      id: data.id,
      type: 'trajectory',
      name: data.name || `Trajectory_${data.id}`,

      // 轨迹点数据 - 使用Cesium动态属性
      position: this.createTrajectoryProperty(points),

      // 路径配置
      path: {
        width: data.pathWidth || options.defaultPathWidth || 2,
        material: data.pathColor || options.defaultPathColor || '#00FFFF',
        resolution: data.resolution || 60,
        leadTime: data.leadTime || 0,
        trailTime: data.trailTime || 3600,
      },

      // 起始点配置
      startPoint: {
        show: data.showStartPoint !== false,
        image: data.startIcon || '/icons/start.svg',
        scale: data.startScale || 1.2,
      },

      // 结束点配置
      endPoint: {
        show: data.showEndPoint !== false,
        image: data.endIcon || '/icons/end.svg',
        scale: data.endScale || 1.2,
      },

      // 时间范围
      timeRange: {
        start: points[0].time,
        end: points[points.length - 1].time,
      },

      // 统计信息
      statistics: {
        totalPoints: points.length,
        duration: this.calculateDuration(points[0].time, points[points.length - 1].time),
        totalDistance: this.calculateTotalDistance(points),
      },

      // 属性数据
      properties: {
        ...data.properties,
        targetId: data.targetId,
        platform: data.platform || 'unknown',
      },

      // 可见性配置
      visible: data.visible !== false,

      // 原始数据引用
      _rawData: data,
    }
  }

  /**
   * 适配关系数据
   * @param {Object} data - 原始关系数据
   * @param {Object} options - 选项
   * @returns {Object} 适配后的关系数据
   */
  adaptRelationData(data, options = {}) {
    if (!data.source || !data.target) {
      throw new Error('Invalid relation data: missing source or target')
    }

    return {
      id: data.id,
      type: 'relation',
      name: data.name || `Relation_${data.id}`,

      // 关系端点
      source: data.source,
      target: data.target,

      // 关系类型
      relationType: data.relationType || data.type || 'unknown',

      // 线条配置
      polyline: {
        positions: this.calculateRelationPositions(data),
        width: data.lineWidth || options.defaultLineWidth || 2,
        material: data.lineColor || this.getRelationColor(data.relationType) || '#FFFFFF',
        clampToGround: data.clampToGround !== false,
        arcType: data.arcType || Cesium.ArcType.GEODESIC,
      },

      // 标签配置
      label:
        data.showLabel !== false
          ? {
              text: data.label || data.relationType || 'Relation',
              position: this.calculateMidpoint(data),
              fillColor: data.labelColor || '#FFFFFF',
              backgroundColor: data.labelBackgroundColor || 'rgba(0,0,0,0.5)',
            }
          : null,

      // 方向指示
      direction: {
        show: data.showDirection !== false,
        arrowSize: data.arrowSize || 10,
        arrowColor: data.arrowColor || data.lineColor || '#FFFFFF',
      },

      // 属性数据
      properties: {
        ...data.properties,
        strength: data.strength || 1.0,
        confidence: data.confidence || 1.0,
        bidirectional: data.bidirectional || false,
      },

      // 时间信息
      timeRange: this.extractTimeRange(data),

      // 可见性配置
      visible: data.visible !== false,

      // 原始数据引用
      _rawData: data,
    }
  }

  /**
   * 适配事件数据
   * @param {Object} data - 原始事件数据
   * @param {Object} options - 选项
   * @returns {Object} 适配后的事件数据
   */
  adaptEventData(data, options = {}) {
    const position = this.extractPosition(data)

    return {
      id: data.id,
      type: 'event',
      name: data.name || data.title || `Event_${data.id}`,

      // 事件位置
      position: position,

      // 事件类型
      eventType: data.eventType || data.type || 'unknown',

      // 事件级别
      level: data.level || data.severity || 'info',

      // 图标配置
      billboard: {
        image: data.icon || this.getEventIcon(data.eventType, data.level),
        scale: data.scale || this.getEventScale(data.level) || 1.0,
        color: data.color || this.getEventColor(data.level) || '#FFFFFF',
      },

      // 标签配置
      label: {
        text: data.name || data.title,
        fillColor: data.labelColor || this.getEventColor(data.level),
        font: data.labelFont || '14pt sans-serif',
      },

      // 影响范围
      impactArea: data.radius
        ? {
            radius: data.radius,
            material: data.areaMaterial || this.getEventAreaMaterial(data.level),
            outline: true,
            outlineColor: data.areaOutlineColor || this.getEventColor(data.level),
          }
        : null,

      // 时间信息
      startTime: this.convertTime(data.startTime || data.time),
      endTime: data.endTime ? this.convertTime(data.endTime) : null,
      duration: data.duration || null,

      // 属性数据
      properties: {
        ...data.properties,
        description: data.description || '',
        source: data.source || 'unknown',
        status: data.status || 'active',
      },

      // 可见性配置
      visible: data.visible !== false,

      // 原始数据引用
      _rawData: data,
    }
  }

  /**
   * 适配区域数据
   * @param {Object} data - 原始区域数据
   * @param {Object} options - 选项
   * @returns {Object} 适配后的区域数据
   */
  adaptAreaData(data, options = {}) {
    const positions = this.extractPositions(data.positions || data.coordinates || [])

    if (positions.length < 3) {
      throw new Error('Invalid area data: insufficient positions')
    }

    return {
      id: data.id,
      type: 'area',
      name: data.name || `Area_${data.id}`,

      // 多边形配置
      polygon: {
        hierarchy: positions,
        material: data.fillColor || data.material || 'rgba(255,255,0,0.3)',
        outline: data.outline !== false,
        outlineColor: data.outlineColor || '#FFFF00',
        height: data.height || 0,
        extrudedHeight: data.extrudedHeight || null,
      },

      // 标签配置
      label:
        data.showLabel !== false
          ? {
              text: data.name || `Area_${data.id}`,
              position: this.calculateCentroid(positions),
              fillColor: data.labelColor || '#FFFFFF',
            }
          : null,

      // 属性数据
      properties: {
        ...data.properties,
        areaType: data.areaType || 'polygon',
        area: this.calculateArea(positions),
      },

      // 时间信息
      timeRange: this.extractTimeRange(data),

      // 可见性配置
      visible: data.visible !== false,

      // 原始数据引用
      _rawData: data,
    }
  }

  /**
   * 适配路线数据
   * @param {Object} data - 原始路线数据
   * @param {Object} options - 选项
   * @returns {Object} 适配后的路线数据
   */
  adaptRouteData(data, options = {}) {
    const positions = this.extractPositions(data.positions || data.coordinates || [])

    if (positions.length < 2) {
      throw new Error('Invalid route data: insufficient positions')
    }

    return {
      id: data.id,
      type: 'route',
      name: data.name || `Route_${data.id}`,

      // 线条配置
      polyline: {
        positions: positions,
        width: data.width || options.defaultRouteWidth || 3,
        material: data.color || data.material || '#00FF00',
        clampToGround: data.clampToGround !== false,
      },

      // 路径点
      waypoints: data.waypoints
        ? data.waypoints.map((wp) => ({
            position: this.extractPosition(wp),
            name: wp.name || `Waypoint_${wp.id}`,
            properties: wp.properties || {},
          }))
        : [],

      // 属性数据
      properties: {
        ...data.properties,
        routeType: data.routeType || 'path',
        totalDistance: this.calculateTotalDistance(
          positions.map((pos, index) => ({
            position: pos,
            time: null,
            index,
          })),
        ),
      },

      // 时间信息
      timeRange: this.extractTimeRange(data),

      // 可见性配置
      visible: data.visible !== false,

      // 原始数据引用
      _rawData: data,
    }
  }

  /**
   * 提取位置信息
   * @param {Object} data - 数据对象
   * @returns {Object|null} 位置信息
   */
  extractPosition(data) {
    // 支持多种位置格式
    if (data.longitude !== undefined && data.latitude !== undefined) {
      return {
        longitude: parseFloat(data.longitude),
        latitude: parseFloat(data.latitude),
        height: parseFloat(data.height || data.altitude || this.options.defaultHeight),
      }
    }

    if (data.position) {
      if (Array.isArray(data.position)) {
        return {
          longitude: parseFloat(data.position[0]),
          latitude: parseFloat(data.position[1]),
          height: parseFloat(data.position[2] || this.options.defaultHeight),
        }
      } else if (typeof data.position === 'object') {
        return this.extractPosition(data.position)
      }
    }

    if (data.coordinates) {
      if (Array.isArray(data.coordinates)) {
        return {
          longitude: parseFloat(data.coordinates[0]),
          latitude: parseFloat(data.coordinates[1]),
          height: parseFloat(data.coordinates[2] || this.options.defaultHeight),
        }
      }
    }

    return null
  }

  /**
   * 提取位置数组
   * @param {Array} positions - 位置数组
   * @returns {Array} 标准化的位置数组
   */
  extractPositions(positions) {
    return positions.map((pos) => this.extractPosition(pos)).filter((pos) => pos !== null)
  }

  /**
   * 创建轨迹动态属性
   * @param {Array} points - 轨迹点数组
   * @returns {Object} Cesium SampledPositionProperty
   */
  createTrajectoryProperty(points) {
    if (!points || points.length === 0) {
      return null
    }

    // 创建Cesium的SampledPositionProperty
    const property = new Cesium.SampledPositionProperty()

    // 设置插值算法
    property.setInterpolationOptions({
      interpolationDegree: 2,
      interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
    })

    // 添加采样点
    points.forEach((point) => {
      if (point.time && point.position) {
        const julianDate = Cesium.JulianDate.fromIso8601(point.time)
        const cartesian = Cesium.Cartesian3.fromDegrees(
          point.position.longitude,
          point.position.latitude,
          point.position.height || 0,
        )
        property.addSample(julianDate, cartesian)
      }
    })

    return property
  }

  /**
   * 适配轨迹点数据
   * @param {Array} points - 轨迹点数组
   * @returns {Array} 适配后的轨迹点数组
   */
  adaptTrajectoryPoints(points) {
    if (!Array.isArray(points)) {
      console.warn('Trajectory points is not an array:', points)
      return []
    }

    const validPoints = points
      .map((point, index) => {
        // 支持多种点位格式
        let actualPoint = point

        // 如果点位是数组格式 [lon, lat, height, time]
        if (Array.isArray(point)) {
          actualPoint = {
            longitude: point[0],
            latitude: point[1],
            height: point[2] || 0,
            time: point[3] || null,
          }
        }

        const position = this.extractPosition(actualPoint)
        if (!position) {
          console.warn(`Invalid position at trajectory point ${index}:`, actualPoint)
          return null
        }

        // 尝试提取时间信息
        const time = this.convertTime(
          actualPoint.time || actualPoint.timestamp || actualPoint.datetime || index * 1000, // 如果没有时间，使用索引作为时间戳
        )

        return {
          time: time,
          position: position,
          properties: {
            speed: actualPoint.speed || 0,
            heading: actualPoint.heading || actualPoint.course || 0,
            altitude: position.height,
            index: index,
            ...actualPoint.properties,
          },
        }
      })
      .filter((point) => point !== null)

    console.log(`Adapted ${validPoints.length} valid points from ${points.length} input points`)
    return validPoints
  }

  /**
   * 提取时间范围
   * @param {Object} data - 数据对象
   * @returns {Object|null} 时间范围
   */
  extractTimeRange(data) {
    if (data.startTime && data.endTime) {
      return {
        start: this.convertTime(data.startTime),
        end: this.convertTime(data.endTime),
      }
    }

    if (data.timeRange) {
      return {
        start: this.convertTime(data.timeRange.start),
        end: this.convertTime(data.timeRange.end),
      }
    }

    if (data.time) {
      const time = this.convertTime(data.time)
      return {
        start: time,
        end: time,
      }
    }

    return null
  }

  /**
   * 提取动态属性
   * @param {Object} data - 数据对象
   * @returns {Object|null} 动态属性配置
   */
  extractDynamicProperties(data) {
    if (!data.dynamicProperties) return null

    const dynamicProps = {}

    Object.keys(data.dynamicProperties).forEach((key) => {
      const prop = data.dynamicProperties[key]

      if (prop.type === 'callback' && typeof prop.callback === 'function') {
        dynamicProps[key] = {
          type: 'callback',
          callback: prop.callback,
          isConstant: prop.isConstant || false,
        }
      } else if (prop.type === 'sampled' && Array.isArray(prop.samples)) {
        dynamicProps[key] = {
          type: 'sampled',
          valueType: prop.valueType,
          samples: prop.samples.map((sample) => ({
            time: this.convertTime(sample.time),
            value: sample.value,
          })),
        }
      }
    })

    return Object.keys(dynamicProps).length > 0 ? dynamicProps : null
  }

  /**
   * 转换时间格式
   * @param {*} time - 时间值
   * @returns {string} ISO8601格式时间字符串
   */
  convertTime(time) {
    if (!time) return null

    if (typeof time === 'string') {
      // 已经是ISO8601格式
      if (time.includes('T') && time.includes('Z')) {
        return time
      }
      // 尝试解析其他格式
      return new Date(time).toISOString()
    }

    if (typeof time === 'number') {
      // 时间戳
      return new Date(time).toISOString()
    }

    if (time instanceof Date) {
      return time.toISOString()
    }

    return null
  }

  /**
   * 计算总距离
   * @param {Array} points - 轨迹点数组
   * @returns {number} 总距离（米）
   */
  calculateTotalDistance(points) {
    if (points.length < 2) return 0

    let totalDistance = 0
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1].position
      const curr = points[i].position

      if (prev && curr) {
        totalDistance += this.calculateDistance(prev, curr)
      }
    }

    return totalDistance
  }

  /**
   * 计算两点间距离
   * @param {Object} pos1 - 位置1
   * @param {Object} pos2 - 位置2
   * @returns {number} 距离（米）
   */
  calculateDistance(pos1, pos2) {
    const R = 6371000 // 地球半径（米）
    const lat1 = (pos1.latitude * Math.PI) / 180
    const lat2 = (pos2.latitude * Math.PI) / 180
    const deltaLat = ((pos2.latitude - pos1.latitude) * Math.PI) / 180
    const deltaLon = ((pos2.longitude - pos1.longitude) * Math.PI) / 180

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  /**
   * 计算持续时间
   * @param {string} startTime - 开始时间
   * @param {string} endTime - 结束时间
   * @returns {number} 持续时间（秒）
   */
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime)
    const end = new Date(endTime)
    return (end.getTime() - start.getTime()) / 1000
  }

  /**
   * 获取关系颜色
   * @param {string} relationType - 关系类型
   * @returns {string} 颜色值
   */
  getRelationColor(relationType) {
    const colorMap = {
      friend: '#00FF00',
      enemy: '#FF0000',
      neutral: '#FFFF00',
      unknown: '#FFFFFF',
      communication: '#00FFFF',
      command: '#FF00FF',
    }
    return colorMap[relationType] || '#FFFFFF'
  }

  /**
   * 获取事件图标
   * @param {string} eventType - 事件类型
   * @param {string} level - 事件级别
   * @returns {string} 图标路径
   */
  getEventIcon(eventType, level) {
    const iconMap = {
      alert: '/icons/alert.svg',
      warning: '/icons/warning.svg',
      info: '/icons/info.svg',
      error: '/icons/error.svg',
      explosion: '/icons/explosion.svg',
      fire: '/icons/fire.svg',
    }
    return iconMap[eventType] || '/icons/event.svg'
  }

  /**
   * 获取事件颜色
   * @param {string} level - 事件级别
   * @returns {string} 颜色值
   */
  getEventColor(level) {
    const colorMap = {
      critical: '#FF0000',
      high: '#FF8000',
      medium: '#FFFF00',
      low: '#00FF00',
      info: '#00FFFF',
    }
    return colorMap[level] || '#FFFFFF'
  }

  /**
   * 获取事件缩放比例
   * @param {string} level - 事件级别
   * @returns {number} 缩放比例
   */
  getEventScale(level) {
    const scaleMap = {
      critical: 1.5,
      high: 1.3,
      medium: 1.1,
      low: 1.0,
      info: 0.9,
    }
    return scaleMap[level] || 1.0
  }

  /**
   * 获取事件区域材质
   * @param {string} level - 事件级别
   * @returns {string} 材质颜色
   */
  getEventAreaMaterial(level) {
    const materialMap = {
      critical: 'rgba(255,0,0,0.3)',
      high: 'rgba(255,128,0,0.3)',
      medium: 'rgba(255,255,0,0.3)',
      low: 'rgba(0,255,0,0.3)',
      info: 'rgba(0,255,255,0.3)',
    }
    return materialMap[level] || 'rgba(255,255,255,0.3)'
  }

  /**
   * 推断数据类型
   * @param {Object} data - 数据项
   * @returns {string} 推断的数据类型
   */
  inferDataType(data) {
    if (!data || typeof data !== 'object') {
      return 'point' // 默认类型
    }

    // 根据数据特征推断类型
    if (data.type) {
      return data.type
    }

    if (data.trajectory || data.positions || data.points) {
      return 'trajectory'
    }

    if (data.source && data.target) {
      return 'relation'
    }

    if (data.eventType || data.level || data.severity) {
      return 'event'
    }

    if (data.polygon || data.coordinates) {
      return 'area'
    }

    if (data.waypoints || data.route) {
      return 'route'
    }

    // 默认为点位类型
    return 'point'
  }

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  generateId() {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 坐标转换方法（简化实现）
  convertWGS84(position) {
    return position
  }
  convertGCJ02(position) {
    return position
  } // 需要实现具体转换算法
  convertBD09(position) {
    return position
  } // 需要实现具体转换算法
  convertUTM(position) {
    return position
  } // 需要实现具体转换算法

  // 时间转换方法
  convertISO8601(time) {
    return time
  }
  convertTimestamp(time) {
    return new Date(time).toISOString()
  }
  convertDateTime(time) {
    return new Date(time).toISOString()
  }

  /**
   * 销毁数据适配器
   * 清理所有映射和配置
   */
  destroy() {
    // 清空类型映射
    this.typeMapping.clear()

    // 清空坐标转换器
    this.coordinateConverters.clear()

    // 清空时间转换器
    this.timeConverters.clear()

    // 重置选项
    this.options = null
  }
}

export default DataAdapter
