/**
 * 生成两点之间的曲线路径
 * @param {Cesium.Cartesian3} startPoint - 起点坐标
 * @param {Cesium.Cartesian3} endPoint - 终点坐标
 * @param {Number} height - 曲线最高点的高度，默认为两点距离的1/5
 * @returns {Array<Cesium.Cartesian3>} 返回构成曲线的点数组
 */
export function generateCurve(startPoint, endPoint, height) {
  // 计算起点和终点的中点
  let addPointCartesian = new Cesium.Cartesian3()
  Cesium.Cartesian3.add(startPoint, endPoint, addPointCartesian)
  let midPointCartesian = new Cesium.Cartesian3()
  Cesium.Cartesian3.divideByScalar(addPointCartesian, 2, midPointCartesian)

  // 将中点转换为地理坐标并设置高度
  let midPointCartographic = Cesium.Cartographic.fromCartesian(midPointCartesian)
  midPointCartographic.height = height || Cesium.Cartesian3.distance(startPoint, endPoint) / 5

  // 将带高度的中点转回笛卡尔坐标
  let midPoint = new Cesium.Cartesian3()
  Cesium.Ellipsoid.WGS84.cartographicToCartesian(midPointCartographic, midPoint)

  // 创建CatmullRom样条曲线
  let spline = new Cesium.CatmullRomSpline({
    times: [0.0, 0.5, 1.0],
    points: [startPoint, midPoint, endPoint],
  })

  // 计算曲线上的200个采样点
  let curvePoints = []
  for (let i = 0, len = 200; i < len; i++) {
    curvePoints.push(spline.evaluate(i / len))
  }

  return curvePoints
}
