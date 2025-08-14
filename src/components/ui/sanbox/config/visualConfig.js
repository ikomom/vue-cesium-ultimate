/**
 * 可视化配置文件
 * 包含目标图标和关系样式的配置
 */

import { MATERIAL_TYPES } from '../constanst'

// 目标图标配置
export const targetIcons = {
  机场: {
    image: '/icons/airport.svg',
    scale: 1.2,
    color: '#FF6B35',
  },
  雷达站: {
    image: '/icons/radar.svg',
    scale: 1.0,
    color: '#4ECDC4',
  },
  港口: {
    image: '/icons/port.svg',
    scale: 1.2,
    color: '#45B7D1',
  },
  火车站: {
    image: '/icons/train.svg',
    scale: 1.0,
    color: '#96CEB4',
  },
  通信站: {
    image: '/icons/communication.svg',
    scale: 0.8,
    color: '#FFEAA7',
  },
  军事基地: {
    image: '/icons/military.svg',
    scale: 1.3,
    color: '#DDA0DD',
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
    width: 2,
    curve: {
      enabled: true,
      height: 100000,
    },
    material: MATERIAL_TYPES.PolylineArrow,
    materialProps: {
      color: '#FFEAA7',
      gapColor: 'blue',
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
// 默认配置
export const defaultConfig = {
  targetIcon: {
    image: '/icons/default.svg',
    scale: 1.0,
    color: '#FFFFFF',
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
