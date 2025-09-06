/**
 * Mars3D 图层类型定义
 * @module LayerType
 */

/**
 * 图层类型枚举
 */
export const LayerType = {
  // 基础图层
  IMAGERY: 'imagery',
  TERRAIN: 'terrain',
  VECTOR: 'vector',
  
  // 影像图层
  TILE_MAP_SERVICE: 'tms',
  WEB_MAP_TILE_SERVICE: 'wmts',
  WEB_MAP_SERVICE: 'wms',
  ARCGIS_MAP_SERVER: 'arcgis',
  BING_MAPS: 'bing',
  GOOGLE_EARTH_ENTERPRISE: 'gee',
  MAPBOX: 'mapbox',
  OSM: 'osm',
  
  // 地形图层
  CESIUM_TERRAIN: 'cesiumTerrain',
  ELLIPSOID_TERRAIN: 'ellipsoidTerrain',
  VR_TERRAIN: 'vrTerrain',
  
  // 矢量图层
  GEOJSON: 'geojson',
  KML: 'kml',
  CZML: 'czml',
  GLTF: 'gltf',
  TILESET_3D: '3dtiles',
  
  // 数据图层
  WFS: 'wfs',
  FEATURE_LAYER: 'featureLayer',
  GRAPHICS_LAYER: 'graphicsLayer',
  
  // 分析图层
  HEATMAP: 'heatmap',
  CLUSTER: 'cluster',
  WIND: 'wind',
  
  // 特效图层
  PARTICLE_SYSTEM: 'particleSystem',
  DYNAMIC_LAYER: 'dynamicLayer',
  
  // 自定义图层
  CUSTOM: 'custom'
};

/**
 * 图层类型工具类
 */
export class LayerTypeUtil {
  /**
   * 获取所有图层类型
   * @returns {string[]} 图层类型数组
   */
  static getAllTypes() {
    return Object.values(LayerType);
  }
  
  /**
   * 检查是否为有效的图层类型
   * @param {string} type - 图层类型
   * @returns {boolean} 是否有效
   */
  static isValidType(type) {
    return Object.values(LayerType).includes(type);
  }
  
  /**
   * 获取图层类型的显示名称
   * @param {string} type - 图层类型
   * @returns {string} 显示名称
   */
  static getDisplayName(type) {
    const names = {
      [LayerType.IMAGERY]: '影像图层',
      [LayerType.TERRAIN]: '地形图层',
      [LayerType.VECTOR]: '矢量图层',
      [LayerType.TILE_MAP_SERVICE]: 'TMS服务',
      [LayerType.WEB_MAP_TILE_SERVICE]: 'WMTS服务',
      [LayerType.WEB_MAP_SERVICE]: 'WMS服务',
      [LayerType.ARCGIS_MAP_SERVER]: 'ArcGIS服务',
      [LayerType.BING_MAPS]: '必应地图',
      [LayerType.GOOGLE_EARTH_ENTERPRISE]: '谷歌地球企业版',
      [LayerType.MAPBOX]: 'Mapbox',
      [LayerType.OSM]: 'OpenStreetMap',
      [LayerType.CESIUM_TERRAIN]: 'Cesium地形',
      [LayerType.ELLIPSOID_TERRAIN]: '椭球地形',
      [LayerType.VR_TERRAIN]: 'VR地形',
      [LayerType.GEOJSON]: 'GeoJSON',
      [LayerType.KML]: 'KML',
      [LayerType.CZML]: 'CZML',
      [LayerType.GLTF]: 'glTF模型',
      [LayerType.TILESET_3D]: '3D瓦片',
      [LayerType.WFS]: 'WFS服务',
      [LayerType.FEATURE_LAYER]: '要素图层',
      [LayerType.GRAPHICS_LAYER]: '图形图层',
      [LayerType.HEATMAP]: '热力图',
      [LayerType.CLUSTER]: '聚合图层',
      [LayerType.WIND]: '风场图层',
      [LayerType.PARTICLE_SYSTEM]: '粒子系统',
      [LayerType.DYNAMIC_LAYER]: '动态图层',
      [LayerType.CUSTOM]: '自定义图层'
    };
    
    return names[type] || type;
  }
  
  /**
   * 根据类型获取图层分类
   * @param {string} type - 图层类型
   * @returns {string} 图层分类
   */
  static getCategory(type) {
    const imagery = [LayerType.IMAGERY, LayerType.TILE_MAP_SERVICE, LayerType.WEB_MAP_TILE_SERVICE, LayerType.WEB_MAP_SERVICE, LayerType.ARCGIS_MAP_SERVER, LayerType.BING_MAPS, LayerType.GOOGLE_EARTH_ENTERPRISE, LayerType.MAPBOX, LayerType.OSM];
    const terrain = [LayerType.TERRAIN, LayerType.CESIUM_TERRAIN, LayerType.ELLIPSOID_TERRAIN, LayerType.VR_TERRAIN];
    const vector = [LayerType.VECTOR, LayerType.GEOJSON, LayerType.KML, LayerType.CZML, LayerType.GLTF, LayerType.TILESET_3D];
    const data = [LayerType.WFS, LayerType.FEATURE_LAYER, LayerType.GRAPHICS_LAYER];
    const analysis = [LayerType.HEATMAP, LayerType.CLUSTER, LayerType.WIND];
    const effect = [LayerType.PARTICLE_SYSTEM, LayerType.DYNAMIC_LAYER];
    
    if (imagery.includes(type)) return 'imagery';
    if (terrain.includes(type)) return 'terrain';
    if (vector.includes(type)) return 'vector';
    if (data.includes(type)) return 'data';
    if (analysis.includes(type)) return 'analysis';
    if (effect.includes(type)) return 'effect';
    
    return 'custom';
  }
  
  /**
   * 检查图层类型是否支持透明度
   * @param {string} type - 图层类型
   * @returns {boolean} 是否支持透明度
   */
  static supportsAlpha(type) {
    const supportAlpha = [
      LayerType.IMAGERY,
      LayerType.VECTOR,
      LayerType.GEOJSON,
      LayerType.GRAPHICS_LAYER,
      LayerType.HEATMAP,
      LayerType.PARTICLE_SYSTEM,
      LayerType.DYNAMIC_LAYER
    ];
    
    return supportAlpha.includes(type);
  }
  
  /**
   * 检查图层类型是否支持样式设置
   * @param {string} type - 图层类型
   * @returns {boolean} 是否支持样式
   */
  static supportsStyle(type) {
    const supportStyle = [
      LayerType.VECTOR,
      LayerType.GEOJSON,
      LayerType.GRAPHICS_LAYER,
      LayerType.FEATURE_LAYER,
      LayerType.HEATMAP
    ];
    
    return supportStyle.includes(type);
  }
}

// 默认导出
export default LayerType;