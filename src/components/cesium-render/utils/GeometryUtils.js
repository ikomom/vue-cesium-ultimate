/**
 * 几何工具类 - 提供几何计算、坐标转换、距离计算等功能
 */

class GeometryUtils {
  /**
   * 将经纬度坐标转换为Cesium Cartesian3
   * @param {number|Object} longitude - 经度或坐标对象
   * @param {number} latitude - 纬度
   * @param {number} height - 高度（可选，默认0）
   * @returns {Cesium.Cartesian3} Cartesian3坐标
   */
  static degreesToCartesian3(longitude, latitude = null, height = 0) {
    if (typeof longitude === 'object') {
      // 如果第一个参数是对象
      const coord = longitude
      return Cesium.Cartesian3.fromDegrees(
        coord.longitude || coord.lng || coord.lon || coord.x,
        coord.latitude || coord.lat || coord.y,
        coord.height || coord.alt || coord.z || 0,
      )
    }

    return Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
  }

  /**
   * 将Cesium Cartesian3转换为经纬度坐标
   * @param {Cesium.Cartesian3} cartesian - Cartesian3坐标
   * @returns {Object} 经纬度坐标对象
   */
  static cartesian3ToDegrees(cartesian) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
    return {
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
      height: cartographic.height,
    }
  }

  /**
   * 批量转换坐标数组
   * @param {Array} coordinates - 坐标数组
   * @returns {Array} Cartesian3坐标数组
   */
  static coordinatesToCartesian3Array(coordinates) {
    return coordinates.map((coord) => this.degreesToCartesian3(coord))
  }

  /**
   * 计算两点之间的距离
   * @param {Cesium.Cartesian3|Object} point1 - 第一个点
   * @param {Cesium.Cartesian3|Object} point2 - 第二个点
   * @returns {number} 距离（米）
   */
  static calculateDistance(point1, point2) {
    const p1 = point1 instanceof Cesium.Cartesian3 ? point1 : this.degreesToCartesian3(point1)
    const p2 = point2 instanceof Cesium.Cartesian3 ? point2 : this.degreesToCartesian3(point2)

    return Cesium.Cartesian3.distance(p1, p2)
  }

  /**
   * 计算多点路径的总长度
   * @param {Array} points - 点数组
   * @returns {number} 总长度（米）
   */
  static calculatePathLength(points) {
    if (points.length < 2) return 0

    let totalLength = 0
    for (let i = 0; i < points.length - 1; i++) {
      totalLength += this.calculateDistance(points[i], points[i + 1])
    }

    return totalLength
  }

  /**
   * 计算点集合的中心点
   * @param {Array} points - 点数组
   * @returns {Cesium.Cartesian3} 中心点
   */
  static calculateCenter(points) {
    if (points.length === 0) return Cesium.Cartesian3.ZERO

    const cartesianPoints = points.map((point) =>
      point instanceof Cesium.Cartesian3 ? point : this.degreesToCartesian3(point),
    )

    let x = 0,
      y = 0,
      z = 0
    cartesianPoints.forEach((point) => {
      x += point.x
      y += point.y
      z += point.z
    })

    return new Cesium.Cartesian3(
      x / cartesianPoints.length,
      y / cartesianPoints.length,
      z / cartesianPoints.length,
    )
  }

  /**
   * 计算点集合的边界框
   * @param {Array} points - 点数组
   * @returns {Object} 边界框对象
   */
  static calculateBoundingBox(points) {
    if (points.length === 0) {
      return {
        west: 0,
        east: 0,
        south: 0,
        north: 0,
        minHeight: 0,
        maxHeight: 0,
      }
    }

    let west = Infinity,
      east = -Infinity
    let south = Infinity,
      north = -Infinity
    let minHeight = Infinity,
      maxHeight = -Infinity

    points.forEach((point) => {
      const coord = point instanceof Cesium.Cartesian3 ? this.cartesian3ToDegrees(point) : point

      const lng = coord.longitude || coord.lng || coord.lon || coord.x
      const lat = coord.latitude || coord.lat || coord.y
      const height = coord.height || coord.alt || coord.z || 0

      west = Math.min(west, lng)
      east = Math.max(east, lng)
      south = Math.min(south, lat)
      north = Math.max(north, lat)
      minHeight = Math.min(minHeight, height)
      maxHeight = Math.max(maxHeight, height)
    })

    return { west, east, south, north, minHeight, maxHeight }
  }

  /**
   * 计算两点之间的方位角
   * @param {Cesium.Cartesian3|Object} from - 起点
   * @param {Cesium.Cartesian3|Object} to - 终点
   * @returns {number} 方位角（弧度）
   */
  static calculateBearing(from, to) {
    const fromCoord = from instanceof Cesium.Cartesian3 ? this.cartesian3ToDegrees(from) : from
    const toCoord = to instanceof Cesium.Cartesian3 ? this.cartesian3ToDegrees(to) : to

    const fromLng = Cesium.Math.toRadians(
      fromCoord.longitude || fromCoord.lng || fromCoord.lon || fromCoord.x,
    )
    const fromLat = Cesium.Math.toRadians(fromCoord.latitude || fromCoord.lat || fromCoord.y)
    const toLng = Cesium.Math.toRadians(
      toCoord.longitude || toCoord.lng || toCoord.lon || toCoord.x,
    )
    const toLat = Cesium.Math.toRadians(toCoord.latitude || toCoord.lat || toCoord.y)

    const dLng = toLng - fromLng

    const y = Math.sin(dLng) * Math.cos(toLat)
    const x =
      Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLng)

    return Math.atan2(y, x)
  }

  /**
   * 在两点之间进行插值
   * @param {Cesium.Cartesian3|Object} start - 起点
   * @param {Cesium.Cartesian3|Object} end - 终点
   * @param {number} t - 插值参数（0-1）
   * @returns {Cesium.Cartesian3} 插值结果
   */
  static interpolate(start, end, t) {
    const startPos = start instanceof Cesium.Cartesian3 ? start : this.degreesToCartesian3(start)
    const endPos = end instanceof Cesium.Cartesian3 ? end : this.degreesToCartesian3(end)

    return Cesium.Cartesian3.lerp(startPos, endPos, t, new Cesium.Cartesian3())
  }

  /**
   * 沿路径进行插值
   * @param {Array} path - 路径点数组
   * @param {number} t - 插值参数（0-1）
   * @returns {Cesium.Cartesian3} 插值结果
   */
  static interpolateAlongPath(path, t) {
    if (path.length === 0) return Cesium.Cartesian3.ZERO
    if (path.length === 1)
      return path[0] instanceof Cesium.Cartesian3 ? path[0] : this.degreesToCartesian3(path[0])

    // 计算路径总长度和每段长度
    const segments = []
    let totalLength = 0

    for (let i = 0; i < path.length - 1; i++) {
      const segmentLength = this.calculateDistance(path[i], path[i + 1])
      segments.push(segmentLength)
      totalLength += segmentLength
    }

    // 找到目标距离
    const targetDistance = t * totalLength
    let currentDistance = 0

    // 找到目标段
    for (let i = 0; i < segments.length; i++) {
      if (currentDistance + segments[i] >= targetDistance) {
        // 在这一段内插值
        const segmentT = (targetDistance - currentDistance) / segments[i]
        return this.interpolate(path[i], path[i + 1], segmentT)
      }
      currentDistance += segments[i]
    }

    // 如果超出范围，返回最后一个点
    return path[path.length - 1] instanceof Cesium.Cartesian3
      ? path[path.length - 1]
      : this.degreesToCartesian3(path[path.length - 1])
  }

  /**
   * 生成圆形路径点
   * @param {Cesium.Cartesian3|Object} center - 圆心
   * @param {number} radius - 半径（米）
   * @param {number} segments - 分段数（默认32）
   * @returns {Array} 圆形路径点数组
   */
  static generateCirclePath(center, radius, segments = 32) {
    const centerPos =
      center instanceof Cesium.Cartesian3 ? center : this.degreesToCartesian3(center)
    const centerCoord = this.cartesian3ToDegrees(centerPos)

    const points = []
    const angleStep = (2 * Math.PI) / segments

    for (let i = 0; i <= segments; i++) {
      const angle = i * angleStep
      const offsetX = Math.cos(angle) * radius
      const offsetY = Math.sin(angle) * radius

      // 简化的偏移计算（适用于小范围）
      const lng = centerCoord.longitude + offsetX / 111320 // 大约每度111320米
      const lat = centerCoord.latitude + offsetY / 110540 // 大约每度110540米

      points.push(this.degreesToCartesian3(lng, lat, centerCoord.height))
    }

    return points
  }

  /**
   * 生成椭圆路径点
   * @param {Cesium.Cartesian3|Object} center - 椭圆中心
   * @param {number} semiMajorAxis - 长半轴（米）
   * @param {number} semiMinorAxis - 短半轴（米）
   * @param {number} rotation - 旋转角度（弧度，默认0）
   * @param {number} segments - 分段数（默认32）
   * @returns {Array} 椭圆路径点数组
   */
  static generateEllipsePath(center, semiMajorAxis, semiMinorAxis, rotation = 0, segments = 32) {
    const centerPos =
      center instanceof Cesium.Cartesian3 ? center : this.degreesToCartesian3(center)
    const centerCoord = this.cartesian3ToDegrees(centerPos)

    const points = []
    const angleStep = (2 * Math.PI) / segments

    for (let i = 0; i <= segments; i++) {
      const angle = i * angleStep

      // 椭圆参数方程
      let x = semiMajorAxis * Math.cos(angle)
      let y = semiMinorAxis * Math.sin(angle)

      // 应用旋转
      if (rotation !== 0) {
        const cos = Math.cos(rotation)
        const sin = Math.sin(rotation)
        const newX = x * cos - y * sin
        const newY = x * sin + y * cos
        x = newX
        y = newY
      }

      // 转换为地理坐标
      const lng = centerCoord.longitude + x / 111320
      const lat = centerCoord.latitude + y / 110540

      points.push(this.degreesToCartesian3(lng, lat, centerCoord.height))
    }

    return points
  }

  /**
   * 生成矩形路径点
   * @param {Object} bounds - 边界对象 {west, east, south, north, height?}
   * @returns {Array} 矩形路径点数组
   */
  static generateRectanglePath(bounds) {
    const height = bounds.height || 0

    return [
      this.degreesToCartesian3(bounds.west, bounds.south, height),
      this.degreesToCartesian3(bounds.east, bounds.south, height),
      this.degreesToCartesian3(bounds.east, bounds.north, height),
      this.degreesToCartesian3(bounds.west, bounds.north, height),
      this.degreesToCartesian3(bounds.west, bounds.south, height), // 闭合
    ]
  }

  /**
   * 简化路径点（Douglas-Peucker算法）
   * @param {Array} points - 原始路径点
   * @param {number} tolerance - 容差（米）
   * @returns {Array} 简化后的路径点
   */
  static simplifyPath(points, tolerance = 10) {
    if (points.length <= 2) return points

    return this.douglasPeucker(points, tolerance)
  }

  /**
   * Douglas-Peucker算法实现
   * @param {Array} points - 点数组
   * @param {number} tolerance - 容差
   * @returns {Array} 简化后的点数组
   */
  static douglasPeucker(points, tolerance) {
    if (points.length <= 2) return points

    // 找到距离直线最远的点
    let maxDistance = 0
    let maxIndex = 0
    const start = points[0]
    const end = points[points.length - 1]

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.pointToLineDistance(points[i], start, end)
      if (distance > maxDistance) {
        maxDistance = distance
        maxIndex = i
      }
    }

    // 如果最大距离大于容差，递归简化
    if (maxDistance > tolerance) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance)
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance)

      // 合并结果（去除重复点）
      return left.slice(0, -1).concat(right)
    } else {
      // 如果最大距离小于容差，只保留起点和终点
      return [start, end]
    }
  }

  /**
   * 计算点到直线的距离
   * @param {Cesium.Cartesian3|Object} point - 点
   * @param {Cesium.Cartesian3|Object} lineStart - 直线起点
   * @param {Cesium.Cartesian3|Object} lineEnd - 直线终点
   * @returns {number} 距离（米）
   */
  static pointToLineDistance(point, lineStart, lineEnd) {
    const p = point instanceof Cesium.Cartesian3 ? point : this.degreesToCartesian3(point)
    const a =
      lineStart instanceof Cesium.Cartesian3 ? lineStart : this.degreesToCartesian3(lineStart)
    const b = lineEnd instanceof Cesium.Cartesian3 ? lineEnd : this.degreesToCartesian3(lineEnd)

    // 向量计算
    const ab = Cesium.Cartesian3.subtract(b, a, new Cesium.Cartesian3())
    const ap = Cesium.Cartesian3.subtract(p, a, new Cesium.Cartesian3())

    const abLength = Cesium.Cartesian3.magnitude(ab)
    if (abLength === 0) {
      return Cesium.Cartesian3.distance(p, a)
    }

    // 计算投影长度
    const projectionLength = Cesium.Cartesian3.dot(ap, ab) / abLength

    // 计算投影点
    const projection = Cesium.Cartesian3.multiplyByScalar(
      Cesium.Cartesian3.normalize(ab, new Cesium.Cartesian3()),
      Math.max(0, Math.min(projectionLength, abLength)),
      new Cesium.Cartesian3(),
    )

    const projectionPoint = Cesium.Cartesian3.add(a, projection, new Cesium.Cartesian3())

    return Cesium.Cartesian3.distance(p, projectionPoint)
  }

  /**
   * 判断点是否在多边形内（射线法）
   * @param {Cesium.Cartesian3|Object} point - 测试点
   * @param {Array} polygon - 多边形顶点数组
   * @returns {boolean} 是否在多边形内
   */
  static isPointInPolygon(point, polygon) {
    if (polygon.length < 3) return false

    const testPoint = point instanceof Cesium.Cartesian3 ? this.cartesian3ToDegrees(point) : point

    const testX = testPoint.longitude || testPoint.lng || testPoint.lon || testPoint.x
    const testY = testPoint.latitude || testPoint.lat || testPoint.y

    let inside = false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const vertex1 =
        polygon[i] instanceof Cesium.Cartesian3 ? this.cartesian3ToDegrees(polygon[i]) : polygon[i]
      const vertex2 =
        polygon[j] instanceof Cesium.Cartesian3 ? this.cartesian3ToDegrees(polygon[j]) : polygon[j]

      const x1 = vertex1.longitude || vertex1.lng || vertex1.lon || vertex1.x
      const y1 = vertex1.latitude || vertex1.lat || vertex1.y
      const x2 = vertex2.longitude || vertex2.lng || vertex2.lon || vertex2.x
      const y2 = vertex2.latitude || vertex2.lat || vertex2.y

      if (y1 > testY !== y2 > testY && testX < ((x2 - x1) * (testY - y1)) / (y2 - y1) + x1) {
        inside = !inside
      }
    }

    return inside
  }

  /**
   * 计算多边形面积
   * @param {Array} polygon - 多边形顶点数组
   * @returns {number} 面积（平方米）
   */
  static calculatePolygonArea(polygon) {
    if (polygon.length < 3) return 0

    // 转换为地理坐标
    const coords = polygon.map((point) =>
      point instanceof Cesium.Cartesian3 ? this.cartesian3ToDegrees(point) : point,
    )

    let area = 0

    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length

      const coord1 = coords[i]
      const coord2 = coords[j]

      const x1 = coord1.longitude || coord1.lng || coord1.lon || coord1.x
      const y1 = coord1.latitude || coord1.lat || coord1.y
      const x2 = coord2.longitude || coord2.lng || coord2.lon || coord2.x
      const y2 = coord2.latitude || coord2.lat || coord2.y

      area += x1 * y2 - x2 * y1
    }

    area = Math.abs(area) / 2

    // 转换为平方米（粗略计算）
    const avgLat =
      coords.reduce((sum, coord) => {
        const lat = coord.latitude || coord.lat || coord.y
        return sum + lat
      }, 0) / coords.length

    const latFactor = 110540 // 纬度每度约110540米
    const lngFactor = 111320 * Math.cos(Cesium.Math.toRadians(avgLat)) // 经度每度米数

    return area * latFactor * lngFactor
  }

  /**
   * 生成网格点
   * @param {Object} bounds - 边界 {west, east, south, north}
   * @param {number} stepX - X方向步长（度）
   * @param {number} stepY - Y方向步长（度）
   * @param {number} height - 高度（可选）
   * @returns {Array} 网格点数组
   */
  static generateGridPoints(bounds, stepX, stepY, height = 0) {
    const points = []

    for (let lng = bounds.west; lng <= bounds.east; lng += stepX) {
      for (let lat = bounds.south; lat <= bounds.north; lat += stepY) {
        points.push(this.degreesToCartesian3(lng, lat, height))
      }
    }

    return points
  }

  /**
   * 计算视野范围内的点
   * @param {Array} points - 所有点
   * @param {Cesium.Camera} camera - 相机对象
   * @param {number} margin - 边距系数（默认0.1）
   * @returns {Array} 视野内的点
   */
  static getPointsInView(points, camera, margin = 0.1) {
    const frustum = camera.frustum
    const viewMatrix = camera.viewMatrix
    const projectionMatrix = camera.projectionMatrix

    return points.filter((point) => {
      const cartesian = point instanceof Cesium.Cartesian3 ? point : this.degreesToCartesian3(point)

      // 转换到相机坐标系
      const viewCoord = Cesium.Matrix4.multiplyByPoint(
        viewMatrix,
        cartesian,
        new Cesium.Cartesian3(),
      )

      // 转换到裁剪坐标系
      const clipCoord = Cesium.Matrix4.multiplyByPoint(
        projectionMatrix,
        viewCoord,
        new Cesium.Cartesian3(),
      )

      // 透视除法
      if (clipCoord.z !== 0) {
        clipCoord.x /= clipCoord.z
        clipCoord.y /= clipCoord.z
      }

      // 检查是否在视野内（考虑边距）
      return (
        clipCoord.x >= -(1 + margin) &&
        clipCoord.x <= 1 + margin &&
        clipCoord.y >= -(1 + margin) &&
        clipCoord.y <= 1 + margin &&
        clipCoord.z > 0
      )
    })
  }

  /**
   * 创建平滑曲线路径（Catmull-Rom样条）
   * @param {Array} controlPoints - 控制点数组
   * @param {number} segments - 每段的分段数（默认10）
   * @returns {Array} 平滑路径点数组
   */
  static createSmoothPath(controlPoints, segments = 10) {
    if (controlPoints.length < 2) return controlPoints
    if (controlPoints.length === 2) {
      // 两点之间直接插值
      const result = []
      for (let i = 0; i <= segments; i++) {
        const t = i / segments
        result.push(this.interpolate(controlPoints[0], controlPoints[1], t))
      }
      return result
    }

    const result = []

    // 为Catmull-Rom样条添加虚拟端点
    const points = [...controlPoints]
    if (points.length > 2) {
      // 在开头添加虚拟点
      const firstDir = Cesium.Cartesian3.subtract(
        points[1] instanceof Cesium.Cartesian3 ? points[1] : this.degreesToCartesian3(points[1]),
        points[0] instanceof Cesium.Cartesian3 ? points[0] : this.degreesToCartesian3(points[0]),
        new Cesium.Cartesian3(),
      )
      const virtualStart = Cesium.Cartesian3.subtract(
        points[0] instanceof Cesium.Cartesian3 ? points[0] : this.degreesToCartesian3(points[0]),
        firstDir,
        new Cesium.Cartesian3(),
      )
      points.unshift(virtualStart)

      // 在结尾添加虚拟点
      const lastDir = Cesium.Cartesian3.subtract(
        points[points.length - 1] instanceof Cesium.Cartesian3
          ? points[points.length - 1]
          : this.degreesToCartesian3(points[points.length - 1]),
        points[points.length - 2] instanceof Cesium.Cartesian3
          ? points[points.length - 2]
          : this.degreesToCartesian3(points[points.length - 2]),
        new Cesium.Cartesian3(),
      )
      const virtualEnd = Cesium.Cartesian3.add(
        points[points.length - 1] instanceof Cesium.Cartesian3
          ? points[points.length - 1]
          : this.degreesToCartesian3(points[points.length - 1]),
        lastDir,
        new Cesium.Cartesian3(),
      )
      points.push(virtualEnd)
    }

    // 生成Catmull-Rom样条
    for (let i = 1; i < points.length - 2; i++) {
      const p0 =
        points[i - 1] instanceof Cesium.Cartesian3
          ? points[i - 1]
          : this.degreesToCartesian3(points[i - 1])
      const p1 =
        points[i] instanceof Cesium.Cartesian3 ? points[i] : this.degreesToCartesian3(points[i])
      const p2 =
        points[i + 1] instanceof Cesium.Cartesian3
          ? points[i + 1]
          : this.degreesToCartesian3(points[i + 1])
      const p3 =
        points[i + 2] instanceof Cesium.Cartesian3
          ? points[i + 2]
          : this.degreesToCartesian3(points[i + 2])

      for (let j = 0; j < segments; j++) {
        const t = j / segments
        const point = this.catmullRomInterpolate(p0, p1, p2, p3, t)
        result.push(point)
      }
    }

    // 添加最后一个点
    const lastPoint = controlPoints[controlPoints.length - 1]
    result.push(
      lastPoint instanceof Cesium.Cartesian3 ? lastPoint : this.degreesToCartesian3(lastPoint),
    )

    return result
  }

  /**
   * Catmull-Rom样条插值
   * @param {Cesium.Cartesian3} p0 - 控制点0
   * @param {Cesium.Cartesian3} p1 - 控制点1
   * @param {Cesium.Cartesian3} p2 - 控制点2
   * @param {Cesium.Cartesian3} p3 - 控制点3
   * @param {number} t - 插值参数（0-1）
   * @returns {Cesium.Cartesian3} 插值结果
   */
  static catmullRomInterpolate(p0, p1, p2, p3, t) {
    const t2 = t * t
    const t3 = t2 * t

    const result = new Cesium.Cartesian3()

    // Catmull-Rom样条公式
    result.x =
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3)

    result.y =
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)

    result.z =
      0.5 *
      (2 * p1.z +
        (-p0.z + p2.z) * t +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3)

    return result
  }
}

export default GeometryUtils
