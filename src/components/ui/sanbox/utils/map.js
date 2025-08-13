export function addMaterial(type, material) {
  // 检查材质类型名称和材质对象是否有效
  if (!type || !material) {
    console.error('材质类型名称和材质对象不能为空')
    return false
  }

  // 检查材质是否已存在
  if (!Cesium.Material._materialCache.getMaterial(type)) {
    // 将新材质添加到材质缓存中
    Cesium.Material._materialCache.addMaterial(type, material)
    return true
  }
  return false
}
