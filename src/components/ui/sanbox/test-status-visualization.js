/**
 * 目标状态数据可视化测试文件
 * 测试DataVisualization.vue中的状态处理和图标生成功能
 */

import { getTargetStatusStyleConfig, getStatusConfigByPriority, getHealthLevelColor, getAffiliationColor } from './config/visualConfig'

// 模拟目标状态数据
const mockTargetStatusData = [
  {
    target_id: 'target_001',
    target_name: '北京首都国际机场',
    status_type: 'active',
    status_name: '活跃状态',
    startTime: '2024-01-15T08:30:00Z',
    colorCode: '#00FF00',
    iconState: 'rotating-arrow',
    animationEffect: 'pulse',
    priority: 'normal',
    description: '机场正常运营中，航班起降频繁',
    metadata: {
      affiliation: 'friendly',
      healthLevel: 100,
      communicationStatus: 'normal',
      operationalCapacity: 'full'
    }
  },
  {
    target_id: 'target_002',
    target_name: '上海浦东国际机场',
    status_type: 'warning',
    status_name: '警告状态',
    startTime: '2024-01-15T01:31:00Z',
    colorCode: '#FFFF00',
    iconState: 'warning-triangle',
    animationEffect: 'slow-blink',
    priority: 'medium',
    description: '天气条件影响，部分航班延误',
    metadata: {
      affiliation: 'friendly',
      healthLevel: 75,
      communicationStatus: 'normal',
      operationalCapacity: 'reduced'
    }
  },
  {
    target_id: 'target_003',
    target_name: '军事基地Alpha',
    status_type: 'error',
    status_name: '错误状态',
    startTime: '2024-01-15T02:32:00Z',
    colorCode: '#FF0000',
    iconState: 'error-cross',
    animationEffect: 'urgent-blink',
    priority: 'critical',
    description: '通信中断，需要紧急处理',
    metadata: {
      affiliation: 'friendly',
      healthLevel: 25,
      communicationStatus: 'lost',
      operationalCapacity: 'offline'
    }
  },
  {
    target_id: 'target_004',
    target_name: '港口设施Beta',
    status_type: 'maintenance',
    status_name: '维护状态',
    startTime: '2024-01-15T03:33:00Z',
    colorCode: '#87CEEB',
    iconState: 'wrench-gear',
    animationEffect: 'slow-rotate',
    priority: 'low',
    description: '正在进行定期维护',
    metadata: {
      affiliation: 'friendly',
      healthLevel: 60,
      communicationStatus: 'normal',
      operationalCapacity: 'maintenance'
    }
  },
  {
    target_id: 'target_005',
    target_name: '巡逻舰Gamma',
    status_type: 'patrol',
    status_name: '巡航状态',
    startTime: '2024-01-15T04:34:00Z',
    colorCode: '#0000FF',
    iconState: 'warship-patrol',
    animationEffect: 'radar-sweep',
    priority: 'high',
    description: '正在执行海域巡逻任务',
    metadata: {
      affiliation: 'friendly',
      healthLevel: 95,
      communicationStatus: 'normal',
      operationalCapacity: 'full'
    }
  }
]

// 测试状态配置获取
function testStatusConfigs() {
  console.log('=== 测试状态配置获取 ===')
  
  mockTargetStatusData.forEach(status => {
    console.log(`\n目标: ${status.target_name}`)
    console.log(`状态类型: ${status.status_type}`)
    
    // 获取状态配置
    const statusConfig = getTargetStatusStyleConfig(status.status_type)
    console.log('状态配置:', statusConfig)
    
    // 获取优先级配置
    const priorityConfig = getStatusConfigByPriority(status.priority)
    console.log('优先级配置:', priorityConfig)
    
    // 获取健康等级颜色
    const healthColor = getHealthLevelColor(status.metadata.healthLevel)
    console.log('健康等级颜色:', healthColor)
    
    // 获取归属颜色
    const affiliationColor = getAffiliationColor(status.metadata.affiliation)
    console.log('归属颜色:', affiliationColor)
  })
}

// 测试状态数据处理
function testStatusDataProcessing() {
  console.log('\n=== 测试状态数据处理 ===')
  
  mockTargetStatusData.forEach(targetStatus => {
    console.log(`\n处理目标: ${targetStatus.target_name}`)
    
    // 模拟processPoint函数中的状态处理逻辑
    const statusConfig = getTargetStatusStyleConfig(targetStatus.status_type)
    const priorityConfig = getStatusConfigByPriority(targetStatus.priority)
    
    const healthColor = targetStatus.metadata?.healthLevel ? 
      getHealthLevelColor(targetStatus.metadata.healthLevel) : null
    const affiliationColor = targetStatus.metadata?.affiliation ? 
      getAffiliationColor(targetStatus.metadata.affiliation) : null
    
    // 模拟图标配置合并
    const mockIconConfig = {
      billboard: {
        image: '/icons/default.svg',
        scale: 1.0,
        color: '#FFFFFF'
      },
      label: {
        fillColor: '#FFFFFF',
        font: '10pt sans-serif'
      }
    }
    
    // 合并状态配置
    if (statusConfig.billboard) {
      Object.assign(mockIconConfig.billboard, {
        ...statusConfig.billboard,
        scale: (statusConfig.billboard.scale || 1.0) * (priorityConfig.scale || 1.0),
        color: targetStatus.colorCode || statusConfig.billboard.color
      })
    }
    
    if (statusConfig.label) {
      Object.assign(mockIconConfig.label, {
        ...statusConfig.label,
        fillColor: targetStatus.colorCode || statusConfig.label.fillColor
      })
    }
    
    console.log('合并后的图标配置:', mockIconConfig)
    
    // 创建状态可视化配置
    const statusVisualConfig = {
      statusType: targetStatus.status_type,
      statusName: targetStatus.status_name,
      color: targetStatus.colorCode,
      priority: targetStatus.priority,
      description: targetStatus.description,
      animationEffect: targetStatus.animationEffect,
      iconState: targetStatus.iconState,
      healthColor: healthColor,
      affiliationColor: affiliationColor,
      visualProperties: statusConfig.visualProperties,
      priorityConfig: priorityConfig,
      startTime: targetStatus.startTime,
      metadata: targetStatus.metadata
    }
    
    console.log('状态可视化配置:', statusVisualConfig)
  })
}

// 测试动画效果配置
function testAnimationEffects() {
  console.log('\n=== 测试动画效果配置 ===')
  
  const animationEffects = [
    'pulse', 'slow-blink', 'urgent-blink', 'slow-rotate', 'radar-sweep',
    'fade-out', 'progress-fill', 'gentle-sway'
  ]
  
  animationEffects.forEach(effect => {
    console.log(`\n动画效果: ${effect}`)
    
    // 根据动画效果类型提供建议的实现方式
    const animationConfig = {
      pulse: { type: 'scale', duration: 1000, range: [0.8, 1.2] },
      'slow-blink': { type: 'opacity', duration: 2000, range: [0.3, 1.0] },
      'urgent-blink': { type: 'opacity', duration: 200, range: [0.0, 1.0] },
      'slow-rotate': { type: 'rotation', duration: 5000, range: [0, 360] },
      'radar-sweep': { type: 'sweep', duration: 3000, angle: 360 },
      'fade-out': { type: 'opacity', duration: 3000, range: [1.0, 0.3] },
      'progress-fill': { type: 'progress', duration: 2000, range: [0, 100] },
      'gentle-sway': { type: 'position', duration: 4000, amplitude: 5 }
    }
    
    console.log('动画配置建议:', animationConfig[effect] || '未定义')
  })
}

// 运行所有测试
function runAllTests() {
  console.log('开始运行目标状态数据可视化测试...')
  
  try {
    testStatusConfigs()
    testStatusDataProcessing()
    testAnimationEffects()
    
    console.log('\n=== 测试完成 ===')
    console.log('所有测试均已成功执行')
    
  } catch (error) {
    console.error('测试过程中发生错误:', error)
  }
}

// 导出测试函数
export {
  mockTargetStatusData,
  testStatusConfigs,
  testStatusDataProcessing,
  testAnimationEffects,
  runAllTests
}

// 如果直接运行此文件，执行所有测试
if (typeof window !== 'undefined') {
  // 浏览器环境
  window.runStatusVisualizationTests = runAllTests
  console.log('状态可视化测试已加载，可通过 runStatusVisualizationTests() 执行')
} else {
  // Node.js环境
  runAllTests()
}