/**
 * 地图相关工具函数
 */

/**
 * 获取当前地图的缩放层级
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 * @returns {number} 当前缩放层级
 */
export function getCurrentZoomLevel(viewer) {
  if (!viewer || !viewer.camera) {
    console.warn('Viewer or camera is not available');
    return 0;
  }

  // 获取相机高度
  const height = viewer.camera.positionCartographic.height;
  
  // 根据高度计算缩放层级（类似于传统地图的层级概念）
  // 这里使用对数计算，可以根据实际需求调整
  const zoomLevel = Math.max(0, Math.round(Math.log2(40075017 / height)));
  
  return zoomLevel;
}

/**
 * 获取当前相机高度
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 * @returns {number} 相机高度（米）
 */
export function getCameraHeight(viewer) {
  if (!viewer || !viewer.camera) {
    console.warn('Viewer or camera is not available');
    return 0;
  }

  return viewer.camera.positionCartographic.height;
}

/**
 * 获取当前相机位置信息
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 * @returns {Object} 包含经度、纬度、高度的对象
 */
export function getCameraPosition(viewer) {
  if (!viewer || !viewer.camera) {
    console.warn('Viewer or camera is not available');
    return { longitude: 0, latitude: 0, height: 0 };
  }

  const cartographic = viewer.camera.positionCartographic;
  
  return {
    longitude: Cesium.Math.toDegrees(cartographic.longitude),
    latitude: Cesium.Math.toDegrees(cartographic.latitude),
    height: cartographic.height
  };
}

/**
 * 判断当前是否为高层级视图（远距离观察）
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 * @param {number} threshold - 高度阈值，默认为 1000000 米（1000公里）
 * @returns {boolean} 是否为高层级视图
 */
export function isHighLevelView(viewer, threshold = 1000000) {
  const height = getCameraHeight(viewer);
  return height > threshold;
}

/**
 * 获取适合当前层级的显示精度
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 * @returns {number} 小数点位数
 */
export function getDisplayPrecision(viewer) {
  const height = getCameraHeight(viewer);
  
  if (height > 10000000) return 0; // 超过1万公里，显示整数
  if (height > 1000000) return 1;  // 超过1000公里，显示1位小数
  if (height > 100000) return 2;   // 超过100公里，显示2位小数
  if (height > 10000) return 3;    // 超过10公里，显示3位小数
  return 4; // 其他情况显示4位小数
}

/**
 * 监听地图层级变化
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 * @param {Function} callback - 回调函数，参数为当前层级信息
 * @returns {Function} 取消监听的函数
 */
export function onZoomLevelChange(viewer, callback) {
  if (!viewer || !viewer.camera || typeof callback !== 'function') {
    console.warn('Invalid parameters for zoom level monitoring');
    return () => {};
  }

  let lastZoomLevel = getCurrentZoomLevel(viewer);
  
  const removeListener = viewer.camera.changed.addEventListener(() => {
    const currentZoomLevel = getCurrentZoomLevel(viewer);
    if (currentZoomLevel !== lastZoomLevel) {
      lastZoomLevel = currentZoomLevel;
      callback({
        zoomLevel: currentZoomLevel,
        height: getCameraHeight(viewer),
        position: getCameraPosition(viewer)
      });
    }
  });

  return removeListener;
}