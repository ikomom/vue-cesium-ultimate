/**
 * 抛物线工具类
 * 用于生成3D空间中的抛物线轨迹
 */

/**
 * 生成抛物线轨迹点
 * @param {Object} startPoint - 起始点 {longitude: number, latitude: number, height?: number}
 * @param {Object} endPoint - 终点 {longitude: number, latitude: number, height?: number}
 * @param {number} maxHeight - 抛物线最高高度（米）
 * @param {number} segments - 分段数量，默认50
 * @returns {Array} 返回Cesium.Cartesian3坐标数组
 */
export function generateParabola(startPoint, endPoint, maxHeight, segments = 50) {
  if (!startPoint || !endPoint) {
    throw new Error('起始点和终点不能为空')
  }
  
  if (!startPoint.longitude || !startPoint.latitude || !endPoint.longitude || !endPoint.latitude) {
    throw new Error('经纬度参数不能为空')
  }
  
  if (maxHeight <= 0) {
    throw new Error('抛物线最高高度必须大于0')
  }
  
  if (segments < 2) {
    throw new Error('分段数量必须大于等于2')
  }

  const positions = []
  
  // 起始点和终点的高度，默认为0
  const startHeight = startPoint.height || 0
  const endHeight = endPoint.height || 0
  
  // 计算两点间的距离和中点
  const startLon = startPoint.longitude
  const startLat = startPoint.latitude
  const endLon = endPoint.longitude
  const endLat = endPoint.latitude
  
  // 生成抛物线轨迹点
  for (let i = 0; i <= segments; i++) {
    const t = i / segments // 参数t从0到1
    
    // 线性插值计算经纬度
    const longitude = startLon + (endLon - startLon) * t
    const latitude = startLat + (endLat - startLat) * t
    
    // 抛物线高度计算：使用二次函数 h = -4 * maxHeight * t * (t - 1) + 起始高度插值
    const baseHeight = startHeight + (endHeight - startHeight) * t
    const parabolaHeight = 4 * maxHeight * t * (1 - t)
    const height = baseHeight + parabolaHeight
    
    // 转换为Cesium坐标
    if (window.Cesium) {
      const position = window.Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
      positions.push(position)
    } else {
      // 如果Cesium未加载，返回经纬度坐标
      positions.push({ longitude, latitude, height })
    }
  }
  
  return positions
}

/**
 * 生成简化的抛物线轨迹点（仅关键点）
 * @param {Object} startPoint - 起始点
 * @param {Object} endPoint - 终点
 * @param {number} maxHeight - 抛物线最高高度
 * @returns {Array} 返回包含起点、中点、终点的坐标数组
 */
export function generateSimpleParabola(startPoint, endPoint, maxHeight) {
  const midPoint = {
    longitude: (startPoint.longitude + endPoint.longitude) / 2,
    latitude: (startPoint.latitude + endPoint.latitude) / 2,
    height: Math.max(startPoint.height || 0, endPoint.height || 0) + maxHeight
  }
  
  const positions = [
    startPoint,
    midPoint,
    endPoint
  ]
  
  if (window.Cesium) {
    return positions.map(pos => 
      window.Cesium.Cartesian3.fromDegrees(pos.longitude, pos.latitude, pos.height || 0)
    )
  }
  
  return positions
}

/**
 * 计算抛物线轨迹的总长度（近似值）
 * @param {Object} startPoint - 起始点
 * @param {Object} endPoint - 终点
 * @param {number} maxHeight - 抛物线最高高度
 * @param {number} segments - 分段数量
 * @returns {number} 轨迹长度（米）
 */
export function calculateParabolaLength(startPoint, endPoint, maxHeight, segments = 50) {
  const positions = generateParabola(startPoint, endPoint, maxHeight, segments)
  
  if (!window.Cesium || positions.length < 2) {
    return 0
  }
  
  let totalLength = 0
  
  for (let i = 1; i < positions.length; i++) {
    const distance = window.Cesium.Cartesian3.distance(positions[i - 1], positions[i])
    totalLength += distance
  }
  
  return totalLength
}

/**
 * 根据距离自动计算合适的抛物线高度
 * @param {Object} startPoint - 起始点
 * @param {Object} endPoint - 终点
 * @param {number} heightRatio - 高度比例，默认0.2（即距离的20%）
 * @returns {number} 建议的抛物线高度
 */
export function calculateOptimalHeight(startPoint, endPoint, heightRatio = 0.2) {
  if (!window.Cesium) {
    // 简单的球面距离计算
    const R = 6371000 // 地球半径（米）
    const lat1 = startPoint.latitude * Math.PI / 180
    const lat2 = endPoint.latitude * Math.PI / 180
    const deltaLat = (endPoint.latitude - startPoint.latitude) * Math.PI / 180
    const deltaLon = (endPoint.longitude - startPoint.longitude) * Math.PI / 180
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c
    
    return distance * heightRatio
  }
  
  // 使用Cesium精确计算
  const start = window.Cesium.Cartesian3.fromDegrees(
    startPoint.longitude, 
    startPoint.latitude, 
    startPoint.height || 0
  )
  const end = window.Cesium.Cartesian3.fromDegrees(
    endPoint.longitude, 
    endPoint.latitude, 
    endPoint.height || 0
  )
  
  const distance = window.Cesium.Cartesian3.distance(start, end)
  return distance * heightRatio
}

/**
 * 抛物线工具类
 */
export class ParabolaUtils {
  /**
   * 创建抛物线实例
   * @param {Object} options - 配置选项
   * @param {number} options.defaultSegments - 默认分段数
   * @param {number} options.defaultHeightRatio - 默认高度比例
   */
  constructor(options = {}) {
    this.defaultSegments = options.defaultSegments || 50
    this.defaultHeightRatio = options.defaultHeightRatio || 0.2
  }
  
  /**
   * 生成抛物线
   */
  generate(startPoint, endPoint, maxHeight, segments) {
    return generateParabola(
      startPoint, 
      endPoint, 
      maxHeight, 
      segments || this.defaultSegments
    )
  }
  
  /**
   * 生成简化抛物线
   */
  generateSimple(startPoint, endPoint, maxHeight) {
    return generateSimpleParabola(startPoint, endPoint, maxHeight)
  }
  
  /**
   * 计算长度
   */
  calculateLength(startPoint, endPoint, maxHeight, segments) {
    return calculateParabolaLength(
      startPoint, 
      endPoint, 
      maxHeight, 
      segments || this.defaultSegments
    )
  }
  
  /**
   * 计算最优高度
   */
  calculateOptimalHeight(startPoint, endPoint, heightRatio) {
    return calculateOptimalHeight(
      startPoint, 
      endPoint, 
      heightRatio || this.defaultHeightRatio
    )
  }
}

// 默认导出工具类实例
export default new ParabolaUtils()