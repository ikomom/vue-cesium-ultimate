/**
 * 可视化配置文件
 * 包含目标图标和关系样式的配置
 */

import { MATERIAL_TYPES } from '../constanst'

// 获取距离相关配置
export function getDistanceConfigs() {
  if (!window.Cesium) {
    return {
      scaleByDistance: null,
      pixelOffsetScaleByDistance: null,
      distanceDisplayCondition: null,
    }
  }
  return {
    scaleByDistance: new window.Cesium.NearFarScalar(1.5e2, 1.5, 1.5e7, 0.2),
    pixelOffsetScaleByDistance: new window.Cesium.NearFarScalar(1.5e2, 1.0, 1.5e7, 0.3),
    distanceDisplayCondition: new window.Cesium.DistanceDisplayCondition(0.0, 2.0e7),
  }
}

// 默认标牌配置
export const defaultLabelConfig = {
  font: '10pt sans-serif',
  fillColor: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 2,
  // style: 3,
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
   圆环连接: {
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
}

// 融合线样式配置
export const fusionLineStyles = {
  数据融合: {
    width: 2,
    curve: {
      enabled: true,
      height: 40000,
    },
    material: MATERIAL_TYPES.POLYLINE_CONDITIONAL_OPACITY,
    materialProps: {
      color: '#00BFFF',
      width: 5,
      opacityInRange: 0.8,
      opacityOutRange: 0.3,
      opacityOnClick: 0.9,
      timeRange: null, // 将在运行时设置
    },
  },
  信息融合: {
    width: 3,
    curve: {
      enabled: true,
      height: 60000,
    },
    material: MATERIAL_TYPES.POLYLINE_CONDITIONAL_OPACITY,
    materialProps: {
      color: '#FF69B4',
      width: 3,
      opacityInRange: 0.8,
      opacityOutRange: 0.3,
      opacityOnClick: 0.9,
      timeRange: null, // 将在运行时设置
    },
  },
  传感器融合: {
    width: 2,
    curve: {
      enabled: true,
      height: 35000,
    },
    material: MATERIAL_TYPES.POLYLINE_CONDITIONAL_OPACITY,
    materialProps: {
      color: '#32CD32',
      width: 2,
      opacityInRange: 0.8,
      opacityOutRange: 0.3,
      opacityOnClick: 0.9,
      timeRange: null, // 将在运行时设置
    },
  },
  态势融合: {
    width: 2,
    curve: {
      enabled: true,
      height: 45000,
    },
    material: MATERIAL_TYPES.POLYLINE_CONDITIONAL_OPACITY,
    materialProps: {
      color: '#FFD700',
      width: 2,
      opacityInRange: 0.8,
      opacityOutRange: 0.3,
      opacityOnClick: 0.9,
      timeRange: null, // 将在运行时设置
    },
  },
  智能融合: {
    width: 3,
    curve: {
      enabled: true,
      height: 70000,
    },
    material: MATERIAL_TYPES.POLYLINE_CONDITIONAL_OPACITY,
    materialProps: {
      color: '#9370DB',
      width: 3,
      opacityInRange: 0.8,
      opacityOutRange: 0.3,
      opacityOnClick: 0.9,
      timeRange: null, // 将在运行时设置
    },
  },
  default: {
    width: 5,
    curve: {
      enabled: true,
      height: 50000,
    },
    material: MATERIAL_TYPES.POLYLINE_CONDITIONAL_OPACITY,
    materialProps: {
      color: '#87CEEB',
      width: 5,
      opacityInRange: 0.7,
      opacityOutRange: 0.3,
      opacityOnClick: 0.9,
      timeRange: null, // 将在运行时设置
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
      image: '/icons/radar.svg', // 使用存在的雷达图标作为默认图标
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
 * 获取关系样式配置
 * @param {string} type - 关系类型
 * @returns {object} 样式配置
 */
export function getRelationStyleConfig(type) {
  return relationStyles[type] || defaultConfig.relationStyle
}

/**
 * 获取融合线样式配置
 * @param {string} type - 融合线类型
 * @returns {object} 样式配置
 */
export function getFusionLineStyleConfig(type) {
  return fusionLineStyles[type] || fusionLineStyles.default
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
 * 获取所有融合线类型
 * @returns {string[]} 融合线类型数组
 */
export function getAllFusionLineTypes() {
  return Object.keys(fusionLineStyles)
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

// 目标状态图标配置
/**
 * 目标状态样式配置
 * 定义不同目标状态在地图上的视觉表现，包括图标、标签和动画效果
 *
 * 配置结构说明：
 * - billboard: 广告牌图标配置
 *   - image: 图标文件路径
 *   - scale: 图标缩放比例
 *   - color: 图标颜色
 * - label: 标签文本配置
 * - model: 3D模型配置（可选）
 * - visualProperties: 视觉效果属性
 *   - brightness: 亮度 (0.0-2.0)
 *   - opacity: 透明度 (0.0-1.0)
 *   - glowEffect: 是否启用发光效果
 *   - particleEffect: 是否启用粒子效果
 *   - animationEffect: 动画效果类型
 */
export const targetStatusStyles = {
  // 活跃状态 - 目标正常运行
  active: {
    billboard: {
      image: '/icons/active.svg', // 活跃状态图标
      scale: 0.2, // 较小的图标尺寸
      color: '#00FF00', // 绿色表示正常状态
    },
    label: {
      ...defaultLabelConfig,
      fillColor: '#00FF00', // 绿色文字
      font: '10pt sans-serif', // 标准字体大小
    },
    model: {
      url: null, // 不使用3D模型
      scale: 1.0, // 标准模型缩放
      minimumPixelSize: 48, // 最小像素尺寸
    },
    visualProperties: {
      brightness: 1.0, // 标准亮度
      opacity: 1.0, // 完全不透明
      glowEffect: true, // 启用发光效果
      particleEffect: false, // 不使用粒子效果
      animationEffect: 'pulse', // 脉冲动画
      swayAmplitude: 0, // 不摆动
      pulseRate: 2.0, // 脉冲频率
      pulseIntensity: 0.3, // 脉冲强度
    },
  },
  // 警告状态 - 需要注意的异常情况
  warning: {
    billboard: {
      image: '/icons/warning.svg', // 警告图标
      scale: 0.2, // 较小的图标尺寸
      color: '#FFA500', // 橙色表示警告
    },
    label: {
      ...defaultLabelConfig,
      fillColor: '#FFA500', // 橙色文字
      font: '10pt sans-serif', // 标准字体
      outlineColor: '#000000', // 黑色轮廓
      outlineWidth: 2, // 轮廓宽度
    },
    model: {
      url: null, // 不使用3D模型
      scale: 1.0, // 标准缩放
      minimumPixelSize: 48, // 最小像素尺寸
    },
    visualProperties: {
      brightness: 1.2, // 稍高亮度突出警告
      opacity: 1.0, // 完全不透明
      glowEffect: true, // 启用发光效果
      particleEffect: false, // 不使用粒子效果
      animationEffect: 'slow-blink', // 慢速闪烁动画
      blinkRate: '2Hz', // 闪烁频率
      swayAmplitude: 0, // 不摆动
      blinkIntensity: 0.4, // 闪烁强度
    },
  },
  // 错误状态 - 严重故障或异常
  error: {
    billboard: {
      image: '/icons/error.svg', // 错误图标
      scale: 0.6, // 适中的图标尺寸，避免过大
      color: '#FF0000', // 红色表示错误
    },
    label: {
      ...defaultLabelConfig,
      fillColor: '#FF0000', // 红色文字
      font: '11pt sans-serif', // 稍大字体突出重要性
      outlineColor: '#FFFFFF', // 白色轮廓增强对比
      outlineWidth: 2, // 轮廓宽度
    },
    model: {
      url: null, // 不使用3D模型
      scale: 1.0, // 标准缩放
      minimumPixelSize: 48, // 最小像素尺寸
    },
    visualProperties: {
      brightness: 1.5, // 高亮度突出错误
      opacity: 1.0, // 完全不透明
      glowEffect: true, // 启用发光效果
      particleEffect: true, // 启用粒子效果增强视觉冲击
      animationEffect: 'urgent-blink', // 紧急闪烁动画
      blinkRate: '5Hz', // 快速闪烁频率
      shakeIntensity: 'high', // 高强度震动
      swayAmplitude: 2, // 摆动幅度
      pulseRate: 3.0, // 快速脉冲
      pulseIntensity: 0.5, // 脉冲强度
    },
  },
  // 维护状态 - 正在进行维护或升级
  maintenance: {
    billboard: {
      image: '/icons/maintenance.svg', // 维护图标
      scale: 2.0, // 较大图标尺寸
      color: '#87CEEB', // 天蓝色表示维护
    },
    label: {
      ...defaultLabelConfig,
      fillColor: 'red', // 红色文字提醒维护状态
      font: '9pt sans-serif', // 较小字体
    },
    model: {
      url: null, // 不使用3D模型
      scale: 1.0, // 标准缩放
      minimumPixelSize: 48, // 最小像素尺寸
    },
    visualProperties: {
      brightness: 0.8, // 较低亮度表示非活跃
      opacity: 0.9, // 稍微透明
      glowEffect: false, // 不使用发光效果
      particleEffect: false, // 不使用粒子效果
      animationEffect: 'slow-rotate', // 慢速旋转动画
      rotationSpeed: 'slow', // 慢速旋转
      swayAmplitude: 0, // 不摆动
      fadeRate: 1.0, // 淡化速率
      fadeIntensity: 0.3, // 淡化强度
    },
  },
  // 待机状态 - 目标处于待机模式
  standby: {
    billboard: {
      image: '/icons/standby.svg', // 待机图标
      scale: 0.9, // 稍小的图标尺寸
      color: '#C0C0C0', // 银灰色表示待机
    },
    label: {
      ...defaultLabelConfig,
      fillColor: '#C0C0C0', // 银灰色文字
      font: '9pt sans-serif', // 较小字体
    },
    model: {
      url: null, // 不使用3D模型
      scale: 1.0, // 标准缩放
      minimumPixelSize: 48, // 最小像素尺寸
    },
    visualProperties: {
      brightness: 0.7, // 较低亮度表示非活跃
      opacity: 0.8, // 半透明效果
      glowEffect: false, // 不使用发光效果
      particleEffect: false, // 不使用粒子效果
      animationEffect: 'gentle-sway', // 轻柔摆动动画
      swayAmplitude: 1, // 摆动幅度
      swayRate: 0.5, // 摆动频率
      swayIntensity: 0.2, // 摆动强度
    },
  },
  // 离线状态 - 目标失去连接或不可用
  offline: {
    billboard: {
      image: '/icons/offline.svg', // 离线图标
      scale: 0.8, // 较小图标尺寸
      color: '#696969', // 暗灰色表示离线
    },
    label: {
      ...defaultLabelConfig,
      fillColor: '#696969', // 暗灰色文字
      font: '8pt sans-serif', // 最小字体
    },
    model: {
      url: null, // 不使用3D模型
      scale: 1.0, // 标准缩放
      minimumPixelSize: 48, // 最小像素尺寸
    },
    visualProperties: {
      brightness: 0.3, // 很低的亮度
      opacity: 0.5, // 半透明效果突出离线状态
      glowEffect: false, // 不使用发光效果
      particleEffect: false, // 不使用粒子效果
      animationEffect: 'fade-out', // 淡出动画
      fadeSpeed: 'slow', // 慢速淡化
      swayAmplitude: 0, // 不摆动
      fadeRate: 0.8, // 淡化速率
      fadeIntensity: 0.5, // 淡化强度
    },
  },
  // 升级状态 - 正在进行系统升级
  upgrade: {
    billboard: {
      image: '/icons/upgrade.svg', // 升级图标
      scale: 1.1, // 稍大的图标尺寸
      color: '#4169E1', // 皇家蓝表示升级
    },
    label: {
      ...defaultLabelConfig,
      fillColor: '#4169E1', // 皇家蓝文字
      font: '10pt sans-serif', // 标准字体
    },
    model: {
      url: null, // 不使用3D模型
      scale: 1.0, // 标准缩放
      minimumPixelSize: 48, // 最小像素尺寸
    },
    visualProperties: {
      brightness: 1.1, // 稍高亮度
      opacity: 1.0, // 完全不透明
      glowEffect: true, // 启用发光效果
      particleEffect: true, // 启用粒子效果表示进度
      animationEffect: 'progress-fill', // 进度填充动画
      progressSpeed: 'medium', // 中等进度速度
      sparkleEffect: true, // 闪烁效果
      swayAmplitude: 0, // 不摆动
      progressRate: 1.2, // 进度速率
      progressIntensity: 0.4, // 进度强度
      particleCount: 10, // 粒子数量
    },
  },
  // 巡逻状态 - 目标正在执行巡逻任务
  patrol: {
    billboard: {
      image: '/icons/patrol.svg', // 巡逻图标
      scale: 1.0, // 标准图标尺寸
      color: '#0000FF', // 蓝色表示巡逻
    },
    label: {
      ...defaultLabelConfig,
      fillColor: '#0000FF', // 蓝色文字
      font: '10pt sans-serif', // 标准字体
    },
    model: {
      url: null, // 不使用3D模型
      scale: 1.0, // 标准缩放
      minimumPixelSize: 48, // 最小像素尺寸
    },
    visualProperties: {
      brightness: 1.0, // 标准亮度
      opacity: 1.0, // 完全不透明
      glowEffect: true, // 启用发光效果
      particleEffect: false, // 不使用粒子效果
      animationEffect: 'radar-sweep', // 雷达扫描动画
      sweepSpeed: 'medium', // 中等扫描速度
      swayAmplitude: 0, // 不摆动
      sweepRate: 2.0, // 扫描频率
      sweepIntensity: 0.6, // 扫描强度
      rotationSpeed: 1.5, // 旋转速度
    },
  },
  // 警报状态 - 紧急警报或高优先级事件
  alert: {
    billboard: {
      image: '/icons/alert.svg', // 警报图标
      scale: 0.2, // 较小的图标尺寸
      color: '#FF4500', // 橙红色表示警报
    },
    label: {
      ...defaultLabelConfig,
      fillColor: '#FF4500', // 橙红色文字
      font: '11pt sans-serif', // 较大字体突出重要性
      outlineColor: '#FFFFFF', // 白色轮廓增强对比
      outlineWidth: 2, // 轮廓宽度
    },
    model: {
      url: null, // 不使用3D模型
      scale: 1.0, // 标准缩放
      minimumPixelSize: 48, // 最小像素尺寸
    },
    visualProperties: {
      brightness: 1.3, // 高亮度突出警报
      opacity: 1.0, // 完全不透明
      glowEffect: true, // 启用发光效果
      particleEffect: true, // 启用粒子效果增强视觉冲击
      animationEffect: 'urgent-pulse', // 紧急脉冲动画
      pulseRate: 4.0, // 快速脉冲频率
      pulseIntensity: 0.7, // 高脉冲强度
      shakeIntensity: 2.0, // 震动强度
      swayAmplitude: 0, // 不摆动
    },
  },
}

// 获取目标状态图标配置
export function getTargetStatusStyleConfig(statusType) {
  return (
    targetStatusStyles[statusType] || {
      billboard: {
        image: '/icons/radar.svg', // 使用存在的雷达图标作为默认图标
        scale: 1.0,
        color: '#FFFFFF',
      },
      label: { ...defaultLabelConfig },
      model: {
        url: null,
        scale: 1.0,
        minimumPixelSize: 64,
      },
      visualProperties: {
        brightness: 1.0,
        opacity: 1.0,
        glowEffect: false,
        particleEffect: false,
        animationEffect: 'none',
      },
    }
  )
}

// 获取所有目标状态类型
export function getAllTargetStatusTypes() {
  return Object.keys(targetStatusStyles)
}

// 根据优先级获取状态配置
export function getStatusConfigByPriority(priority) {
  const priorityConfigs = {
    critical: {
      scale: 1.8,
      blinkRate: 'fast',
      forceDisplay: true,
      alertSound: true,
    },
    high: {
      scale: 1.5,
      blinkRate: 'medium',
      forceDisplay: true,
      alertSound: false,
    },
    medium: {
      scale: 1.2,
      blinkRate: 'slow',
      forceDisplay: false,
      alertSound: false,
    },
    normal: {
      scale: 1.0,
      blinkRate: 'none',
      forceDisplay: false,
      alertSound: false,
    },
    low: {
      scale: 0.8,
      blinkRate: 'none',
      forceDisplay: false,
      alertSound: false,
    },
  }
  return priorityConfigs[priority] || priorityConfigs.normal
}

// 根据健康等级获取颜色
export function getHealthLevelColor(healthLevel) {
  if (healthLevel >= 90) return '#00FF00' // excellent
  if (healthLevel >= 70) return '#90EE90' // good
  if (healthLevel >= 50) return '#FFFF00' // fair
  if (healthLevel >= 20) return '#FFA500' // poor
  if (healthLevel >= 1) return '#FF0000' // critical
  return '#696969' // destroyed
}

// 根据归属获取颜色
export function getAffiliationColor(affiliation) {
  const affiliationColors = {
    friendly: '#0000FF',
    enemy: '#FF0000',
    neutral: '#FFFF00',
    unknown: '#FFFFFF',
    allied: '#00FF00',
  }
  return affiliationColors[affiliation] || affiliationColors.unknown
}
