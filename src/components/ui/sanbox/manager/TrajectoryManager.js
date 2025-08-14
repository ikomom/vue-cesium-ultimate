/**
 * 轨迹数据管理器
 * 管理目标的轨迹信息，包括时间序列位置、速度、航向等
 */
import BaseManager from './BaseManager.js'

class TrajectoryManager extends BaseManager {
  constructor() {
    super()
    this.requiredFields = ['target_id'] // 轨迹数据以target_id为主键
    this.initializeIndexes()
  }

  /**
   * 初始化索引
   */
  initializeIndexes() {
    // 按目标ID索引（一个目标对应一个轨迹数组）
    this.indexes.set('target_id', new Map())
    // 按状态索引
    this.indexes.set('status', new Map())
    // 按位置索引（简单的网格索引）
    this.indexes.set('location', new Map())
    // 按时间索引
    this.indexes.set('timestamp', new Map())
  }

  /**
   * 自定义验证逻辑
   * @param {Object} item - 轨迹数据项 {target_id: string, trajectory: Array}
   * @returns {boolean} 是否有效
   */
  customValidation(item) {
    if (!item.target_id) {
      console.error('轨迹数据缺少target_id字段:', item)
      return false
    }

    if (!Array.isArray(item.trajectory)) {
      console.error('轨迹数据trajectory字段必须是数组:', item)
      return false
    }

    // 验证轨迹点数据
    for (const point of item.trajectory) {
      if (!this.validateTrajectoryPoint(point)) {
        return false
      }
    }

    return true
  }

  /**
   * 验证轨迹点数据
   * @param {Object} point - 轨迹点
   * @returns {boolean} 是否有效
   */
  validateTrajectoryPoint(point) {
    const requiredFields = ['timestamp', 'longitude', 'latitude']

    for (const field of requiredFields) {
      if (point[field] === undefined || point[field] === null) {
        console.error(`轨迹点缺少必要字段 ${field}:`, point)
        return false
      }
    }

    // 验证经纬度范围
    if (point.longitude < -180 || point.longitude > 180) {
      console.error('经度超出有效范围:', point.longitude)
      return false
    }

    if (point.latitude < -90 || point.latitude > 90) {
      console.error('纬度超出有效范围:', point.latitude)
      return false
    }

    return true
  }

  /**
   * 设置初始数据（处理shipTrajectoryData.json格式）
   * @param {Object} initialData - 初始数据对象，格式为 {target_id: [trajectory_points]}
   */
  setInitialData(initialData) {
    this.clear()

    if (typeof initialData === 'object' && initialData !== null) {
      // 转换数据格式
      const trajectoryItems = []

      for (const [targetId, trajectory] of Object.entries(initialData)) {
        trajectoryItems.push({
          target_id: targetId,
          id: targetId, // 使用target_id作为主键
          trajectory: trajectory || [],
        })
      }

      trajectoryItems.forEach((item) => this.addItem(item))
    }
  }

  /**
   * 重写updateData方法以处理轨迹数据格式
   * @param {Array|Object} newData - 新数据
   */
  updateData(newData) {
    if (Array.isArray(newData)) {
      // 处理数组格式数据
      this.addItems(newData)
    } else if (typeof newData === 'object' && newData !== null) {
      if (newData.target_id || newData.id) {
        // 处理单个轨迹数据项
        this.addItem(newData)
      } else {
        // 处理shipTrajectoryData.json格式的对象数据
        for (const [targetId, trajectory] of Object.entries(newData)) {
          const trajectoryItem = {
            target_id: targetId,
            id: targetId,
            trajectory: trajectory || [],
          }
          this.addItem(trajectoryItem)
        }
      }
    }
  }

  /**
   * 重写addItem方法以确保正确处理target_id
   * @param {Object} item - 轨迹数据项
   * @returns {boolean} 是否成功
   */
  addItem(item) {
    if (!this.validateItem(item)) {
      return false
    }

    // 确保id字段存在，如果没有则使用target_id
    if (!item.id && item.target_id) {
      item.id = item.target_id
    }

    const clonedItem = { ...item }
    this.data.set(item.id, clonedItem)

    // 更新所有索引
    this.updateIndexes(clonedItem)

    return true
  }

  /**
   * 更新索引
   * @param {Object} item - 轨迹数据项
   */
  updateIndexes(item) {
    // 更新target_id索引
    this._updateIndex('target_id', item.target_id, item.id)

    // 为每个轨迹点更新索引
    if (Array.isArray(item.trajectory)) {
      item.trajectory.forEach((point) => {
        // 更新状态索引
        if (point.status) {
          this._updateIndex('status', point.status, item.id)
        }

        // 更新位置索引（简单网格）
        if (point.longitude !== undefined && point.latitude !== undefined) {
          const gridKey = this._getGridKey(point.longitude, point.latitude)
          this._updateIndex('location', gridKey, item.id)
        }

        // 更新时间索引（按日期）
        if (point.timestamp) {
          const date = new Date(point.timestamp).toISOString().split('T')[0]
          this._updateIndex('timestamp', date, item.id)
        }
      })
    }
  }

  /**
   * 从索引中移除数据项
   * @param {Object} item - 轨迹数据项
   */
  removeFromIndexes(item) {
    // 从target_id索引中移除
    this._removeFromIndex('target_id', item.target_id, item.id)

    // 从其他索引中移除
    if (Array.isArray(item.trajectory)) {
      item.trajectory.forEach((point) => {
        if (point.status) {
          this._removeFromIndex('status', point.status, item.id)
        }

        if (point.longitude !== undefined && point.latitude !== undefined) {
          const gridKey = this._getGridKey(point.longitude, point.latitude)
          this._removeFromIndex('location', gridKey, item.id)
        }

        if (point.timestamp) {
          const date = new Date(point.timestamp).toISOString().split('T')[0]
          this._removeFromIndex('timestamp', date, item.id)
        }
      })
    }
  }

  /**
   * 根据目标ID查找轨迹
   * @param {string} targetId - 目标ID
   * @returns {Object|null} 轨迹数据
   */
  findByTargetId(targetId) {
    return this.findById(targetId)
  }

  /**
   * 根据状态查找轨迹
   * @param {string} status - 状态
   * @returns {Array} 匹配的轨迹数组
   */
  findByStatus(status) {
    return this.findByIndex('status', status)
  }

  /**
   * 根据时间范围查找轨迹
   * @param {string} startDate - 开始日期 (YYYY-MM-DD)
   * @param {string} endDate - 结束日期 (YYYY-MM-DD)
   * @returns {Array} 匹配的轨迹数组
   */
  findByTimeRange(startDate, endDate) {
    const results = new Set()
    const start = new Date(startDate)
    const end = new Date(endDate)

    for (const trajectory of this.data.values()) {
      if (Array.isArray(trajectory.trajectory)) {
        const hasPointInRange = trajectory.trajectory.some((point) => {
          const pointDate = new Date(point.timestamp)
          return pointDate >= start && pointDate <= end
        })

        if (hasPointInRange) {
          results.add(trajectory)
        }
      }
    }

    return Array.from(results)
  }

  /**
   * 根据地理边界查找轨迹
   * @param {Object} bounds - 边界 {west, east, south, north}
   * @returns {Array} 匹配的轨迹数组
   */
  findByBounds(bounds) {
    const { west, east, south, north } = bounds
    const results = new Set()

    for (const trajectory of this.data.values()) {
      if (Array.isArray(trajectory.trajectory)) {
        const hasPointInBounds = trajectory.trajectory.some((point) => {
          return (
            point.longitude >= west &&
            point.longitude <= east &&
            point.latitude >= south &&
            point.latitude <= north
          )
        })

        if (hasPointInBounds) {
          results.add(trajectory)
        }
      }
    }

    return Array.from(results)
  }

  /**
   * 根据速度范围查找轨迹
   * @param {number} minSpeed - 最小速度
   * @param {number} maxSpeed - 最大速度
   * @returns {Array} 匹配的轨迹数组
   */
  findBySpeedRange(minSpeed, maxSpeed) {
    const results = []

    for (const trajectory of this.data.values()) {
      if (Array.isArray(trajectory.trajectory)) {
        const hasPointInSpeedRange = trajectory.trajectory.some((point) => {
          return point.speed >= minSpeed && point.speed <= maxSpeed
        })

        if (hasPointInSpeedRange) {
          results.push(trajectory)
        }
      }
    }

    return results
  }

  /**
   * 获取轨迹的时间范围
   * @param {string} targetId - 目标ID
   * @returns {Object|null} 时间范围 {start, end}
   */
  getTrajectoryTimeRange(targetId) {
    const trajectory = this.findByTargetId(targetId)
    if (
      !trajectory ||
      !Array.isArray(trajectory.trajectory) ||
      trajectory.trajectory.length === 0
    ) {
      return null
    }

    const timestamps = trajectory.trajectory
      .map((point) => new Date(point.timestamp))
      .sort((a, b) => a - b)

    return {
      start: timestamps[0].toISOString(),
      end: timestamps[timestamps.length - 1].toISOString(),
    }
  }

  /**
   * 获取轨迹的地理边界
   * @param {string} targetId - 目标ID
   * @returns {Object|null} 边界 {west, east, south, north}
   */
  getTrajectoryBounds(targetId) {
    const trajectory = this.findByTargetId(targetId)
    if (
      !trajectory ||
      !Array.isArray(trajectory.trajectory) ||
      trajectory.trajectory.length === 0
    ) {
      return null
    }

    let west = Infinity,
      east = -Infinity,
      south = Infinity,
      north = -Infinity

    trajectory.trajectory.forEach((point) => {
      west = Math.min(west, point.longitude)
      east = Math.max(east, point.longitude)
      south = Math.min(south, point.latitude)
      north = Math.max(north, point.latitude)
    })

    return { west, east, south, north }
  }

  /**
   * 获取轨迹统计信息
   * @param {string} targetId - 目标ID
   * @returns {Object|null} 统计信息
   */
  getTrajectoryStats(targetId) {
    const trajectory = this.findByTargetId(targetId)
    if (!trajectory || !Array.isArray(trajectory.trajectory)) {
      return null
    }

    const points = trajectory.trajectory
    if (points.length === 0) {
      return { pointCount: 0 }
    }

    const speeds = points.filter((p) => p.speed !== undefined).map((p) => p.speed)
    const distances = this._calculateTrajectoryDistances(points)

    return {
      pointCount: points.length,
      totalDistance: distances.reduce((sum, d) => sum + d, 0),
      averageSpeed: speeds.length > 0 ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length : 0,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
      minSpeed: speeds.length > 0 ? Math.min(...speeds) : 0,
      timeRange: this.getTrajectoryTimeRange(targetId),
      bounds: this.getTrajectoryBounds(targetId),
    }
  }

  /**
   * 检查数据项是否匹配关键词
   * @param {Object} item - 轨迹数据项
   * @param {string} keyword - 关键词（已转小写）
   * @returns {boolean} 是否匹配
   */
  matchesKeyword(item, keyword) {
    // 搜索target_id
    if (item.target_id && item.target_id.toLowerCase().includes(keyword)) {
      return true
    }

    // 搜索轨迹点中的状态和位置信息
    if (Array.isArray(item.trajectory)) {
      return item.trajectory.some((point) => {
        return (
          (point.status && point.status.toLowerCase().includes(keyword)) ||
          (point.location && point.location.toLowerCase().includes(keyword))
        )
      })
    }

    return false
  }

  /**
   * 获取网格键（用于空间索引）
   * @param {number} lng - 经度
   * @param {number} lat - 纬度
   * @returns {string} 网格键
   */
  _getGridKey(lng, lat) {
    const gridSize = 1.0 // 1度网格
    const gridX = Math.floor(lng / gridSize)
    const gridY = Math.floor(lat / gridSize)
    return `${gridX},${gridY}`
  }

  /**
   * 计算轨迹各段距离
   * @param {Array} points - 轨迹点数组
   * @returns {Array} 距离数组（公里）
   */
  _calculateTrajectoryDistances(points) {
    const distances = []

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]

      if (
        prev.longitude !== undefined &&
        prev.latitude !== undefined &&
        curr.longitude !== undefined &&
        curr.latitude !== undefined
      ) {
        const distance = this._calculateDistance(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude,
        )
        distances.push(distance)
      }
    }

    return distances
  }

  /**
   * 计算两点间距离（公里）
   * @param {number} lat1 - 点1纬度
   * @param {number} lng1 - 点1经度
   * @param {number} lat2 - 点2纬度
   * @param {number} lng2 - 点2经度
   * @returns {number} 距离（公里）
   */
  _calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371 // 地球半径（公里）
    const dLat = this._toRadians(lat2 - lat1)
    const dLng = this._toRadians(lng2 - lng1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRadians(lat1)) *
        Math.cos(this._toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * 角度转弧度
   * @param {number} degrees - 角度
   * @returns {number} 弧度
   */
  _toRadians(degrees) {
    return degrees * (Math.PI / 180)
  }

  /**
   * 获取所有目标ID
   * @returns {Array} 目标ID数组
   */
  getAllTargetIds() {
    return this.getIndexValues('target_id')
  }

  /**
   * 获取所有目标ID
   * @returns {Array} 目标ID数组
   */
  getAllTargets() {
    return this.getIndexValues('target_id')
  }

  /**
   * 获取所有状态
   * @returns {Array} 状态数组
   */
  getAllStatuses() {
    return this.getIndexValues('status')
  }

  /**
   * 获取时间范围
   * @returns {Object|null} 时间范围 {start, end}
   */
  getTimeRange() {
    const allData = this.getAll()
    if (allData.length === 0) return null

    let minTime = null
    let maxTime = null

    allData.forEach((trajectoryItem) => {
      if (trajectoryItem.trajectory && trajectoryItem.trajectory.length > 0) {
        trajectoryItem.trajectory.forEach((point) => {
          if (point.timestamp) {
            const time = new Date(point.timestamp)
            if (!minTime || time < minTime) minTime = time
            if (!maxTime || time > maxTime) maxTime = time
          }
        })
      }
    })

    return minTime && maxTime
      ? {
          start: minTime.toISOString(),
          end: maxTime.toISOString(),
        }
      : null
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const baseStats = super.getStats()

    // 添加轨迹特定统计
    let totalPoints = 0
    let totalDistance = 0
    const targetIds = this.getAllTargetIds()

    targetIds.forEach((targetId) => {
      const stats = this.getTrajectoryStats(targetId)
      if (stats) {
        totalPoints += stats.pointCount
        totalDistance += stats.totalDistance || 0
      }
    })

    return {
      ...baseStats,
      totalTrajectories: this.getCount(),
      totalPoints,
      totalDistance: Math.round(totalDistance * 100) / 100, // 保留2位小数
      averagePointsPerTrajectory:
        this.getCount() > 0 ? Math.round(totalPoints / this.getCount()) : 0,
    }
  }
}

export default TrajectoryManager
