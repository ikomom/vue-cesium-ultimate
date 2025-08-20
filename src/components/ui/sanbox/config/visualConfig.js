/**
 * 可视化配置文件
 * 包含目标图标和关系样式的配置
 */

import { MATERIAL_TYPES } from '../constanst'

// 获取距离相关配置
export function getDistanceConfigs() {
  return {
    scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.5, 1.5e7, 0.2),
    pixelOffsetScaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 1.5e7, 0.3),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 2.0e7),
  }
}

// 默认标牌配置
export const defaultLabelConfig = {
  font: '10pt sans-serif',
  fillColor: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 2,
  style: 3,
  pixelOffset: [0, 40],
  showBackground: true,
  backgroundColor: 'rgba(0,0,0,0.7)',
  backgroundPadding: [8, 4],
  distanceDisplayCondition: null,
  horizontalOrigin: 0,
  // verticalOrigin: 1,
}
// 目标图标配置
export const targetIcons = {
  机场: {
    billboard: {
      image: '/icons/airport.svg',
      scale: 1.2,
      color: '#FF6B35',
    },
    label: { ...defaultLabelConfig },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
  },
  雷达站: {
    billboard: {
      image: '/icons/radar.svg',
      scale: 1.0,
      color: '#4ECDC4',
    },
    label: { ...defaultLabelConfig },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
  },
  港口: {
    billboard: {
      image: '/icons/port.svg',
      scale: 1.2,
      color: '#45B7D1',
    },
    label: { ...defaultLabelConfig },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
  },
  火车站: {
    billboard: {
      image: '/icons/train.svg',
      scale: 1.0,
      color: '#96CEB4',
    },
    label: { ...defaultLabelConfig },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
  },
  通信站: {
    billboard: {
      image: '/icons/communication.svg',
      scale: 0.8,
      color: '#FFEAA7',
    },
    label: { ...defaultLabelConfig },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
  },
  军事基地: {
    billboard: {
      image: '/icons/military.svg',
      scale: 1.3,
      color: '#DDA0DD',
    },
    label: { ...defaultLabelConfig },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
  },
  船只: {
    billboard: {
      image: '/icons/ship.svg',
      scale: 1.0,
      color: '#2E86AB',
    },
    label: { ...defaultLabelConfig },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
  },
}
// 船只子类型图标配置
export const shipTypeIcons = {
  集装箱船: {
    billboard: {
      image: '/icons/container-ship.svg',
      scale: 1.2,
      color: '#2E86AB',
    },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
  },
  油轮: {
    billboard: {
      image: '/icons/oil-tanker.svg',
      scale: 1.3,
      color: '#2C3E50',
    },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
  },
  散货船: {
    billboard: {
      image: '/icons/bulk-carrier.svg',
      scale: 1.2,
      color: '#8E44AD',
    },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
  },
  驱逐舰: {
    billboard: {
      image: '/icons/destroyer.svg',
      scale: 1.1,
      color: '#5D6D7E',
    },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
  },
  科考船: {
    billboard: {
      image: '/icons/research-ship.svg',
      scale: 1.0,
      color: '#3498DB',
    },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
  },
  渔船: {
    billboard: {
      image: '/icons/fishing-boat.svg',
      scale: 0.9,
      color: '#16A085',
    },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
  },
}

// 关系类型样式配置
export const relationStyles = {
  航线连接: {
    width: 1,
    curve: {
      enabled: true,
      height: 50000,
    },
    material: MATERIAL_TYPES.PolylinePulseLine,
    materialProps: {
      color: '#96CEB4',
      speed: 2.5,
      pulseWidth: 0.2,
    },
  },
  雷达覆盖: {
    width: 2,
    curve: {
      enabled: false,
      height: 0,
    },
    material: MATERIAL_TYPES.PolylineDash,
    materialProps: {
      color: '#4ECDC4',
      speed: 2,
    },
  },
  海运航线: {
    width: 2,
    curve: {
      enabled: false,
      height: 0,
    },
    material: MATERIAL_TYPES.PolylineFlyLine,
    materialProps: {
      color: '#45B7D1',
      speed: 1,
      percent: 0.6,
      gradient: 0.5,
    },
  },
  高铁线路: {
    width: 3,
    curve: {
      enabled: false,
      height: 0,
    },
    material: MATERIAL_TYPES.Color,
    materialProps: {
      color: '#96CEB4',
    },
  },
  通信链路: {
    width: 10,
    curve: {
      enabled: true,
      height: 100000,
    },
    // material: MATERIAL_TYPES.PolylineArrow,
    // materialProps: {
    //   color: '#FFEAA7',
    //   gapColor: 'blue',
    // },
    material: MATERIAL_TYPES.PolylineTrailLink,
    materialProps: {
      color: 'yellow',
    },
  },
  军事协防: {
    width: 2,
    curve: {
      enabled: true,
      height: 80000,
    },
    material: MATERIAL_TYPES.PolylineDash,
    materialProps: {
      color: '#DDA0DD',
      gapColor: 'blue',
    },
  },
  数据传输: {
    width: 2,
    curve: {
      enabled: true,
      height: 60000,
    },
    material: MATERIAL_TYPES.PolylineDynamicTexture,
    materialProps: {
      color: '#FF8C42',
      speed: 1,
    },
  },
}
// 事件状态样式配置
export const eventStatusStyles = {
  预警中: {
    width: 3,
    curve: {
      enabled: true,
      height: 30000,
    },
    material: MATERIAL_TYPES.PolylinePulseLine,
    materialProps: {
      color: '#FF4444',
      speed: 3.0,
      pulseWidth: 0.3,
    },
    icon: {
      billboard: {
        image: '/icons/alert.svg',
        scale: 1.5,
        color: '#FF4444',
      },
      label: {
        ...defaultLabelConfig,
        fillColor: '#FF4444',
        font: '12pt sans-serif',
      },
    },
  },
  进行中: {
    width: 2,
    curve: {
      enabled: true,
      height: 20000,
    },
    material: MATERIAL_TYPES.PolylineFlyLine,
    materialProps: {
      color: '#FFA500',
      speed: 2.0,
      percent: 0.8,
      gradient: 0.6,
    },
    icon: {
      billboard: {
        image: '/icons/active.svg',
        scale: 1.2,
        color: '#FFA500',
      },
      label: {
        ...defaultLabelConfig,
        fillColor: '#FFA500',
      },
    },
  },
  已完成: {
    width: 1,
    curve: {
      enabled: false,
      height: 0,
    },
    material: MATERIAL_TYPES.Color,
    materialProps: {
      color: '#00AA00',
    },
    icon: {
      billboard: {
        image: '/icons/completed.svg',
        scale: 1.0,
        color: '#00AA00',
      },
      label: {
        ...defaultLabelConfig,
        fillColor: '#00AA00',
      },
    },
  },
  待处理: {
    width: 2,
    curve: {
      enabled: true,
      height: 15000,
    },
    material: MATERIAL_TYPES.PolylineDash,
    materialProps: {
      color: '#888888',
      speed: 1.5,
    },
    icon: {
      billboard: {
        image: '/icons/pending.svg',
        scale: 1.1,
        color: '#888888',
      },
      label: {
        ...defaultLabelConfig,
        fillColor: '#888888',
      },
    },
  },
}

// 默认配置
export const defaultConfig = {
  targetIcon: {
    billboard: {
      image: '/icons/default.svg',
      scale: 1.0,
      color: '#FFFFFF',
    },
    model: {
      url: null,
      scale: 1.0,
      minimumPixelSize: 64,
    },
    label: { ...defaultLabelConfig },
  },
  relationStyle: {
    color: '#FFFFFF',
    width: 2,
    material: MATERIAL_TYPES.Color,
    dashPattern: null,
  },
}

/**
 * 根据目标类型获取图标配置
 * @param {string} type 目标类型
 * @returns {object} 图标配置
 */
export function getTargetIconConfig(type) {
  return targetIcons[type] || defaultConfig.targetIcon
}

/**
 * 根据关系类型获取样式配置
 * @param {string} type 关系类型
 * @returns {object} 样式配置
 */
export function getRelationStyleConfig(type) {
  return relationStyles[type] || defaultConfig.relationStyle
}

/**
 * 获取所有目标类型
 * @returns {string[]} 目标类型数组
 */
export function getAllTargetTypes() {
  return Object.keys(targetIcons)
}

/**
 * 获取所有关系类型
 * @returns {string[]} 关系类型数组
 */
export function getAllRelationTypes() {
  return Object.keys(relationStyles)
}

/**
 * 根据事件状态获取样式配置
 * @param {string} status 事件状态
 * @returns {object} 样式配置
 */
export function getEventStatusStyleConfig(status) {
  return eventStatusStyles[status] || eventStatusStyles['待处理']
}

/**
 * 获取所有事件状态类型
 * @returns {string[]} 事件状态类型数组
 */
export function getAllEventStatusTypes() {
  return Object.keys(eventStatusStyles)
}
