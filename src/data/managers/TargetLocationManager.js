// 目标位置信息管理类
export class TargetLocationManager {
  constructor(data = []) {
    this.data = data
  }

  // 根据ID获取目标位置信息
  getById(id) {
    return this.data.find(target => target.id === id)
  }

  // 根据区域获取目标位置信息
  getByRegion(region) {
    return this.data.filter(target => target.region === region)
  }

  // 根据省份获取目标位置信息
  getByProvince(province) {
    return this.data.filter(target => target.province === province)
  }

  // 根据城市获取目标位置信息
  getByCity(city) {
    return this.data.filter(target => target.city === city)
  }

  // 根据高度范围获取目标位置信息
  getByHeightRange(minHeight, maxHeight) {
    return this.data.filter(target => 
      target.height >= minHeight && target.height <= maxHeight
    )
  }

  // 根据经纬度范围获取目标位置信息
  getByCoordinateRange(minLng, maxLng, minLat, maxLat) {
    return this.data.filter(target => 
      target.longitude >= minLng && target.longitude <= maxLng &&
      target.latitude >= minLat && target.latitude <= maxLat
    )
  }

  // 根据创建时间范围获取目标
  getByCreatedTimeRange(startTime, endTime) {
    return this.data.filter(target => {
      const createdAt = new Date(target.createdAt)
      return createdAt >= new Date(startTime) && createdAt <= new Date(endTime)
    })
  }

  // 获取所有区域列表
  getAllRegions() {
    return [...new Set(this.data.map(target => target.region))]
  }

  // 获取所有省份列表
  getAllProvinces() {
    return [...new Set(this.data.map(target => target.province))]
  }

  // 获取所有城市列表
  getAllCities() {
    return [...new Set(this.data.map(target => target.city))]
  }

  // 添加新目标位置
  add(locationData) {
    const newLocation = {
      ...locationData,
      createdAt: locationData.createdAt || new Date().toISOString()
    }
    this.data.push(newLocation)
    return newLocation
  }

  // 更新目标位置信息
  update(id, updateData) {
    const index = this.data.findIndex(target => target.id === id)
    if (index !== -1) {
      this.data[index] = { ...this.data[index], ...updateData }
      return this.data[index]
    }
    return null
  }

  // 删除目标位置
  delete(id) {
    const index = this.data.findIndex(target => target.id === id)
    if (index !== -1) {
      return this.data.splice(index, 1)[0]
    }
    return null
  }

  // 计算两个目标之间的距离（简化计算，单位：公里）
  calculateDistance(target1Id, target2Id) {
    const target1 = this.getById(target1Id)
    const target2 = this.getById(target2Id)
    
    if (!target1 || !target2) return null
    
    const R = 6371 // 地球半径（公里）
    const dLat = (target2.latitude - target1.latitude) * Math.PI / 180
    const dLng = (target2.longitude - target1.longitude) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(target1.latitude * Math.PI / 180) * Math.cos(target2.latitude * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // 获取地理位置统计信息
  getStatistics() {
    const regionStats = {}
    const provinceStats = {}
    const cityStats = {}
    
    this.data.forEach(target => {
      regionStats[target.region] = (regionStats[target.region] || 0) + 1
      provinceStats[target.province] = (provinceStats[target.province] || 0) + 1
      cityStats[target.city] = (cityStats[target.city] || 0) + 1
    })
    
    const heights = this.data.map(target => target.height)
    const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length
    const minHeight = Math.min(...heights)
    const maxHeight = Math.max(...heights)
    
    return {
      total: this.data.length,
      regionStats,
      provinceStats,
      cityStats,
      heightStats: {
        average: avgHeight,
        min: minHeight,
        max: maxHeight
      }
    }
  }

  // 搜索目标位置（支持多字段模糊搜索）
  search(keyword) {
    const lowerKeyword = keyword.toLowerCase()
    return this.data.filter(target => 
      target.id.toLowerCase().includes(lowerKeyword) ||
      target.name.toLowerCase().includes(lowerKeyword) ||
      target.region.toLowerCase().includes(lowerKeyword) ||
      target.province.toLowerCase().includes(lowerKeyword) ||
      target.city.toLowerCase().includes(lowerKeyword)
    )
  }

  // 获取指定半径内的目标
  getTargetsWithinRadius(centerLng, centerLat, radiusKm) {
    return this.data.filter(target => {
      const distance = this.calculateDistanceFromCoords(
        centerLng, centerLat, target.longitude, target.latitude
      )
      return distance <= radiusKm
    })
  }

  // 计算两个坐标点之间的距离
  calculateDistanceFromCoords(lng1, lat1, lng2, lat2) {
    const R = 6371 // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // 验证位置数据的有效性
  validateLocation(locationData) {
    const required = ['id', 'name', 'longitude', 'latitude']
    const missing = required.filter(field => !locationData[field])
    
    if (missing.length > 0) {
      return { valid: false, errors: [`Missing required fields: ${missing.join(', ')}`] }
    }
    
    // 验证经纬度范围
    if (locationData.longitude < -180 || locationData.longitude > 180) {
      return { valid: false, errors: ['Longitude must be between -180 and 180'] }
    }
    
    if (locationData.latitude < -90 || locationData.latitude > 90) {
      return { valid: false, errors: ['Latitude must be between -90 and 90'] }
    }
    
    // 检查是否已存在相同ID的位置
    if (this.getById(locationData.id)) {
      return { valid: false, errors: ['Location with this ID already exists'] }
    }
    
    return { valid: true, errors: [] }
  }

  // 批量操作
  batchAdd(locationsData) {
    const results = []
    const errors = []
    
    locationsData.forEach((locationData, index) => {
      const validation = this.validateLocation(locationData)
      if (validation.valid) {
        results.push(this.add(locationData))
      } else {
        errors.push({ index, errors: validation.errors })
      }
    })
    
    return { results, errors }
  }

  // 获取边界框
  getBoundingBox() {
    if (this.data.length === 0) return null
    
    const lngs = this.data.map(target => target.longitude)
    const lats = this.data.map(target => target.latitude)
    
    return {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats)
    }
  }

  // 获取中心点
  getCenterPoint() {
    if (this.data.length === 0) return null
    
    const totalLng = this.data.reduce((sum, target) => sum + target.longitude, 0)
    const totalLat = this.data.reduce((sum, target) => sum + target.latitude, 0)
    
    return {
      longitude: totalLng / this.data.length,
      latitude: totalLat / this.data.length
    }
  }

  // 按距离排序
  sortByDistanceFrom(centerLng, centerLat) {
    return [...this.data].sort((a, b) => {
      const distanceA = this.calculateDistanceFromCoords(centerLng, centerLat, a.longitude, a.latitude)
      const distanceB = this.calculateDistanceFromCoords(centerLng, centerLat, b.longitude, b.latitude)
      return distanceA - distanceB
    })
  }
}