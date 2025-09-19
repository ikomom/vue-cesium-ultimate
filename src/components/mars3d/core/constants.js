/**
 * Mars3D 核心常量定义
 * @module core/constants
 */

// 版本信息
export const version = '3.8.4';
export const name = 'mars3d';
export const author = 'Mars3D团队';
export const website = 'http://mars3d.cn';
export const update = '2024-12-20';

// 默认样式配置
export const DEFAULT_STYLES = {
  // 点样式
  point: {
    pixelSize: 8,
    color: '#3388ff',
    outlineColor: '#ffffff',
    outlineWidth: 2,
    heightReference: 0
  },
  
  // 线样式
  polyline: {
    width: 3,
    color: '#3388ff',
    clampToGround: false,
    outline: false
  },
  
  // 面样式
  polygon: {
    color: '#3388ff',
    opacity: 0.6,
    outline: true,
    outlineColor: '#ffffff',
    outlineWidth: 2,
    clampToGround: false
  },
  
  // 标签样式
  label: {
    font: '16px sans-serif',
    color: '#ffffff',
    outlineColor: '#000000',
    outlineWidth: 2,
    style: 0, // FILL
    pixelOffset: [0, -40],
    horizontalOrigin: 1, // CENTER
    verticalOrigin: 2 // BOTTOM
  },
  
  // 广告牌样式
  billboard: {
    image: '',
    scale: 1,
    pixelOffset: [0, 0],
    horizontalOrigin: 1, // CENTER
    verticalOrigin: 2, // BOTTOM
    heightReference: 0
  }
};

// 测量样式配置
export const MEASURE_STYLES = {
  // 距离测量
  distance: {
    materialType: 'PolylineGlow',
    glowPower: 0.1,
    color: '#ebe12c',
    width: 9
  },
  
  // 面积测量
  area: {
    color: '#00fff2',
    opacity: 0.4,
    outline: true,
    outlineColor: '#fafa5a',
    outlineWidth: 2,
    clampToGround: false
  },
  
  // 高度测量
  height: {
    materialType: 'PolylineGlow',
    glowPower: 0.1,
    color: '#ebe12c',
    width: 9
  }
};

// 坐标系配置
export const CRS_CONFIG = {
  // WGS84地理坐标系
  EPSG4326: {
    code: 'EPSG:4326',
    name: 'WGS 84',
    proj4: '+proj=longlat +datum=WGS84 +no_defs'
  },
  
  // Web墨卡托投影
  EPSG3857: {
    code: 'EPSG:3857',
    name: 'WGS 84 / Pseudo-Mercator',
    proj4: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs'
  },
  
  // 中国2000坐标系
  CGCS2000: {
    code: 'EPSG:4490',
    name: 'China Geodetic Coordinate System 2000',
    proj4: '+proj=longlat +ellps=GRS80 +no_defs'
  }
};

// 椭球体参数
export const ELLIPSOID_CONFIG = {
  WGS84: {
    a: 6378137.0,
    b: 6356752.314245179,
    f: 1 / 298.257223563
  },
  
  GRS80: {
    a: 6378137.0,
    b: 6356752.314140356,
    f: 1 / 298.257222101
  },
  
  Krasovsky: {
    a: 6378245.0,
    b: 6356863.018773047,
    f: 1 / 298.3
  }
};

// 默认配置
export const DEFAULT_CONFIG = {
  // 地图配置
  map: {
    scene3DOnly: true,
    shadows: false,
    terrainShadows: 0, // DISABLED
    mapProjection: 'EPSG:3857',
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    vrButton: false
  },
  
  // 控制配置
  control: {
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    vrButton: false
  },
  
  // 图层配置
  layer: {
    autoDestroy: true,
    enablePickFeatures: true
  }
};

// 单位转换配置
export const UNIT_CONFIG = {
  // 长度单位
  length: {
    m: { name: '米', ratio: 1 },
    km: { name: '千米', ratio: 1000 },
    ft: { name: '英尺', ratio: 0.3048 },
    mile: { name: '英里', ratio: 1609.344 }
  },
  
  // 面积单位
  area: {
    m2: { name: '平方米', ratio: 1 },
    km2: { name: '平方千米', ratio: 1000000 },
    ha: { name: '公顷', ratio: 10000 },
    acre: { name: '英亩', ratio: 4046.8564224 }
  },
  
  // 角度单位
  angle: {
    degree: { name: '度', ratio: 1 },
    radian: { name: '弧度', ratio: 180 / Math.PI }
  }
};