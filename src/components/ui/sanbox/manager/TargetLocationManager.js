/**
 * 目标位置数据管理器
 * 管理目标的地理位置信息，包括经纬度、高度、区域等
 */
class TargetLocationManager {
  constructor() {
    this.data = new Map() // 使用Map进行快速查找
    this.regionIndex = new Map() // 按区域索引
    this.provinceIndex = new Map() // 按省份索引
    this.cityIndex = new Map() // 按城市索引
    this.spatialIndex = new Map() // 空间索引（简单的网格索引）
    this.gridSize = 1.0 // 网格大小（度）
  }

  /**
   * 设置初始数据
   * @param {Array} initialData - 初始数据数组
   */
  setInitialData(initialData) {
    this.clear()
    if (Array.isArray(initialData)) {
      initialData.forEach((item) => this.addItem(item))
    }
  }

  /**
   * 添加单个数据项
   * @param {Object} item - 数据项
   */
  addItem(item) {
    if (!item || !item.id || !item.longitude || !item.latitude) {
      console.error('添加目标位置数据项失败：缺少必要字段', item)
      return false
    }

    this.data.set(item.id, { ...item })

    // 更新索引
    this._updateIndex(this.regionIndex, item.region, item.id)
    this._updateIndex(this.provinceIndex, item.province, item.id)
    this._updateIndex(this.cityIndex, item.city, item.id)
    this._updateSpatialIndex(item)

    return true
  }

  /**
   * 批量添加数据项
   * @param {Array} items - 数据项数组
   * @returns {Object} 操作结果统计
   */
  addItems(items) {
    if (!Array.isArray(items)) {
      throw new Error('参数必须是数组')
    }

    const result = {
      total: items.length,
      added: 0,
      updated: 0,
      errors: [],
    }

    items.forEach((item, index) => {
      try {
        if (!item || !item.id) {
          result.errors.push({ index, error: '数据项必须包含有效的id字段', item })
          return
        }

        // 验证必要的地理坐标字段
        if (!item.longitude || !item.latitude) {
          result.errors.push({ index, error: '数据项必须包含有效的经纬度坐标', item })
          return
        }

        const isUpdate = this.data.has(item.id)
        const success = this.addItem(item)

        if (success) {
          if (isUpdate) {
            result.updated++
          } else {
            result.added++
          }
        } else {
          result.errors.push({ index, error: '添加数据项失败', item })
        }
      } catch (error) {
        result.errors.push({ index, error: error.message, item })
      }
    })

    return result
  }

  /**
   * 更新数据（自动去重）
   * @param {Array|Object} newData - 新数据
   */
  updateData(newData) {
    if (Array.isArray(newData)) {
      newData.forEach((item) => this.addItem(item))
    } else if (newData && newData.id) {
      this.addItem(newData)
    }
  }

  /**
   * 根据ID快速查找数据
   * @param {string} id - 目标ID
   * @returns {Object|null} 找到的数据项
   */
  findById(id) {
    return this.data.get(id) || null
  }

  /**
   * 根据区域查找数据
   * @param {string} region - 区域
   * @returns {Array} 匹配的数据项数组
   */
  findByRegion(region) {
    const ids = this.regionIndex.get(region) || new Set()
    return Array.from(ids)
      .map((id) => this.data.get(id))
      .filter(Boolean)
  }

  /**
   * 根据省份查找数据
   * @param {string} province - 省份
   * @returns {Array} 匹配的数据项数组
   */
  findByProvince(province) {
    const ids = this.provinceIndex.get(province) || new Set()
    return Array.from(ids)
      .map((id) => this.data.get(id))
      .filter(Boolean)
  }

  /**
   * 根据城市查找数据
   * @param {string} city - 城市
   * @returns {Array} 匹配的数据项数组
   */
  findByCity(city) {
    const ids = this.cityIndex.get(city) || new Set()
    return Array.from(ids)
      .map((id) => this.data.get(id))
      .filter(Boolean)
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
   * 删除数据
   * @param {string} id - 要删除的数据ID
   * @returns {boolean} 删除是否成功
   */
  deleteById(id) {
    const item = this.data.get(id)
    if (!item) return false

    // 从主数据中删除
    this.data.delete(id)

    // 从索引中删除
    this._removeFromIndex(this.regionIndex, item.region, id)
    this._removeFromIndex(this.provinceIndex, item.province, id)
    this._removeFromIndex(this.cityIndex, item.city, id)
    this._removeFromSpatialIndex(item)

    return true
  }

  /**
   * 批量删除数据
   * @param {Array} ids - 要删除的ID数组
   * @returns {number} 成功删除的数量
   */
  deleteBatch(ids) {
    let deletedCount = 0
    ids.forEach((id) => {
      if (this.deleteById(id)) {
        deletedCount++
      }
    })
    return deletedCount
  }

  /**
   * 获取所有数据
   * @returns {Array} 所有数据项数组
   */
  getAll() {
    return Array.from(this.data.values())
  }

  /**
   * 获取数据总数
   * @returns {number} 数据总数
   */
  getCount() {
    return this.data.size
  }

  /**
   * 获取所有区域
   * @returns {Array} 区域数组
   */
  getAllRegions() {
    return Array.from(this.regionIndex.keys())
  }

  /**
   * 获取所有省份
   * @returns {Array} 省份数组
   */
  getAllProvinces() {
    return Array.from(this.provinceIndex.keys())
  }

  /**
   * 获取所有城市
   * @returns {Array} 城市数组
   */
  getAllCities() {
    return Array.from(this.cityIndex.keys())
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
    this.data.clear()
    this.regionIndex.clear()
    this.provinceIndex.clear()
    this.cityIndex.clear()
    this.spatialIndex.clear()
  }

  /**
   * 更新索引
   * @private
   */
  _updateIndex(index, key, id) {
    if (!key) return
    if (!index.has(key)) {
      index.set(key, new Set())
    }
    index.get(key).add(id)
  }

  /**
   * 从索引中移除
   * @private
   */
  _removeFromIndex(index, key, id) {
    if (!key || !index.has(key)) return
    const idSet = index.get(key)
    idSet.delete(id)
    if (idSet.size === 0) {
      index.delete(key)
    }
  }

  /**
   * 更新空间索引
   * @private
   */
  _updateSpatialIndex(item) {
    const gridKey = this._getGridKey(item.longitude, item.latitude)
    if (!this.spatialIndex.has(gridKey)) {
      this.spatialIndex.set(gridKey, new Set())
    }
    this.spatialIndex.get(gridKey).add(item.id)
  }

  /**
   * 从空间索引中移除
   * @private
   */
  _removeFromSpatialIndex(item) {
    const gridKey = this._getGridKey(item.longitude, item.latitude)
    if (this.spatialIndex.has(gridKey)) {
      const idSet = this.spatialIndex.get(gridKey)
      idSet.delete(item.id)
      if (idSet.size === 0) {
        this.spatialIndex.delete(gridKey)
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

  /**
   * 导出数据为JSON
   * @returns {string} JSON字符串
   */
  exportToJSON() {
    return JSON.stringify(this.getAll(), null, 2)
  }

  /**
   * 从JSON导入数据
   * @param {string} jsonString - JSON字符串
   */
  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      this.setInitialData(data)
      return true
    } catch (error) {
      console.error('导入JSON数据失败:', error)
      return false
    }
  }
}

export default TargetLocationManager
