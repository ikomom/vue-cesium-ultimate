/**
 * 目标位置数据管理器
 * 管理目标的地理位置信息，包括经纬度、高度、区域等
 */
import BaseManager from './BaseManager.js'

class TargetLocationManager extends BaseManager {
  constructor() {
    super()
    this.requiredFields = ['id', 'longitude', 'latitude']
    this.gridSize = 1.0 // 网格大小（度）
    this.initializeIndexes()
  }

  /**
   * 初始化索引
   */
  initializeIndexes() {
    this.indexes.set('region', new Map())
    this.indexes.set('province', new Map())
    this.indexes.set('city', new Map())
    this.indexes.set('spatial', new Map()) // 空间索引（简单的网格索引）
  }

  /**
   * 自定义验证逻辑
   * @param {Object} item - 数据项
   * @returns {boolean} 是否有效
   */
  customValidation(item) {
    // 验证经纬度范围
    if (item.longitude < -180 || item.longitude > 180) {
      console.error('经度超出有效范围:', item.longitude)
      return false
    }

    if (item.latitude < -90 || item.latitude > 90) {
      console.error('纬度超出有效范围:', item.latitude)
      return false
    }

    return true
  }

  /**
   * 更新索引
   * @param {Object} item - 数据项
   */
  updateIndexes(item) {
    this._updateIndex('region', item.region, item.id)
    this._updateIndex('province', item.province, item.id)
    this._updateIndex('city', item.city, item.id)
    this._updateSpatialIndex(item)
  }

  /**
   * 从索引中移除数据项
   * @param {Object} item - 数据项
   */
  removeFromIndexes(item) {
    this._removeFromIndex('region', item.region, item.id)
    this._removeFromIndex('province', item.province, item.id)
    this._removeFromIndex('city', item.city, item.id)
    this._removeFromSpatialIndex(item)
  }

  /**
   * 根据区域查找数据
   * @param {string} region - 区域
   * @returns {Array} 匹配的数据项数组
   */
  findByRegion(region) {
    return this.findByIndex('region', region)
  }

  /**
   * 根据省份查找数据
   * @param {string} province - 省份
   * @returns {Array} 匹配的数据项数组
   */
  findByProvince(province) {
    return this.findByIndex('province', province)
  }

  /**
   * 根据城市查找数据
   * @param {string} city - 城市
   * @returns {Array} 匹配的数据项数组
   */
  findByCity(city) {
    return this.findByIndex('city', city)
  }

  /**
   * 根据坐标范围查找数据
   * @param {Object} bounds - 边界 {minLng, maxLng, minLat, maxLat}
   * @returns {Array} 匹配的数据项数组
   */
  findByBounds(bounds) {
    const { minLng, maxLng, minLat, maxLat } = bounds
    const results = []

    for (const item of this.data.values()) {
      if (
        item.longitude >= minLng &&
        item.longitude <= maxLng &&
        item.latitude >= minLat &&
        item.latitude <= maxLat
      ) {
        results.push(item)
      }
    }

    return results
  }

  /**
   * 根据中心点和半径查找数据
   * @param {number} centerLng - 中心经度
   * @param {number} centerLat - 中心纬度
   * @param {number} radiusKm - 半径（公里）
   * @returns {Array} 匹配的数据项数组
   */
  findByRadius(centerLng, centerLat, radiusKm) {
    const results = []

    for (const item of this.data.values()) {
      const distance = this._calculateDistance(centerLat, centerLng, item.latitude, item.longitude)

      if (distance <= radiusKm) {
        results.push({
          ...item,
          distance: distance,
        })
      }
    }

    // 按距离排序
    return results.sort((a, b) => a.distance - b.distance)
  }

  /**
   * 模糊搜索
   * @param {string} keyword - 搜索关键词
   * @returns {Array} 匹配的数据项数组
   */
  search(keyword) {
    if (!keyword) return this.getAll()

    const lowerKeyword = keyword.toLowerCase()
    const results = []

    for (const item of this.data.values()) {
      if (
        item.name?.toLowerCase().includes(lowerKeyword) ||
        item.region?.toLowerCase().includes(lowerKeyword) ||
        item.province?.toLowerCase().includes(lowerKeyword) ||
        item.city?.toLowerCase().includes(lowerKeyword) ||
        item.address?.toLowerCase().includes(lowerKeyword)
      ) {
        results.push(item)
      }
    }

    return results
  }

  /**
   * 获取所有区域
   * @returns {Array} 区域数组
   */
  getAllRegions() {
    return this.getIndexValues('region')
  }

  /**
   * 获取所有省份
   * @returns {Array} 省份数组
   */
  getAllProvinces() {
    return this.getIndexValues('province')
  }

  /**
   * 获取所有城市
   * @returns {Array} 城市数组
   */
  getAllCities() {
    return this.getIndexValues('city')
  }

  /**
   * 获取数据的边界范围
   * @returns {Object} 边界 {minLng, maxLng, minLat, maxLat}
   */
  getBounds() {
    if (this.data.size === 0) return null

    let minLng = Infinity,
      maxLng = -Infinity
    let minLat = Infinity,
      maxLat = -Infinity

    for (const item of this.data.values()) {
      minLng = Math.min(minLng, item.longitude)
      maxLng = Math.max(maxLng, item.longitude)
      minLat = Math.min(minLat, item.latitude)
      maxLat = Math.max(maxLat, item.latitude)
    }

    return { minLng, maxLng, minLat, maxLat }
  }

  /**
   * 清空所有数据
   */
  clear() {
    super.clear()
    this.indexes.get('spatial').clear()
  }

  /**
   * 更新空间索引
   * @private
   */
  _updateSpatialIndex(item) {
    const gridKey = this._getGridKey(item.longitude, item.latitude)
    const spatialIndex = this.indexes.get('spatial')
    if (!spatialIndex.has(gridKey)) {
      spatialIndex.set(gridKey, new Set())
    }
    spatialIndex.get(gridKey).add(item.id)
  }

  /**
   * 从空间索引中移除
   * @private
   */
  _removeFromSpatialIndex(item) {
    const gridKey = this._getGridKey(item.longitude, item.latitude)
    const spatialIndex = this.indexes.get('spatial')
    if (spatialIndex.has(gridKey)) {
      const idSet = spatialIndex.get(gridKey)
      idSet.delete(item.id)
      if (idSet.size === 0) {
        spatialIndex.delete(gridKey)
      }
    }
  }

  /**
   * 获取网格键
   * @private
   */
  _getGridKey(lng, lat) {
    const gridX = Math.floor(lng / this.gridSize)
    const gridY = Math.floor(lat / this.gridSize)
    return `${gridX},${gridY}`
  }

  /**
   * 计算两点间距离（公里）
   * @private
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
   * @private
   */
  _toRadians(degrees) {
    return degrees * (Math.PI / 180)
  }
}

export default TargetLocationManager
