/**
 * 抛物线工具使用示例
 */

import { generateParabola, calculateOptimalHeight, ParabolaUtils } from '../utils/parabola.js'
import { MaterialManager } from '../utils/materials.js'

/**
 * 抛物线使用示例
 */
export class ParabolaExample {
  constructor() {
    this.materialManager = new MaterialManager()
    this.parabolaUtils = new ParabolaUtils()
  }

  /**
   * 示例1：基础抛物线生成
   */
  basicParabolaExample() {
    const startPoint = {
      longitude: 116.407526, // 北京
      latitude: 39.9042,
      height: 0
    }
    
    const endPoint = {
      longitude: 121.473701, // 上海
      latitude: 31.230416,
      height: 0
    }
    
    const maxHeight = 50000 // 50公里高度
    
    // 生成抛物线轨迹
    const positions = generateParabola(startPoint, endPoint, maxHeight, 50)
    
    console.log('基础抛物线轨迹点数量:', positions.length)
    return positions
  }

  /**
   * 示例2：自动计算高度的抛物线
   */
  autoHeightParabolaExample() {
    const startPoint = {
      longitude: 113.264435, // 广州
      latitude: 23.129163,
      height: 0
    }
    
    const endPoint = {
      longitude: 114.057868, // 深圳
      latitude: 22.543099,
      height: 0
    }
    
    // 自动计算合适的抛物线高度
    const optimalHeight = calculateOptimalHeight(startPoint, endPoint, 0.3)
    const positions = generateParabola(startPoint, endPoint, optimalHeight)
    
    console.log('自动计算的抛物线高度:', optimalHeight)
    console.log('轨迹点数量:', positions.length)
    return { positions, height: optimalHeight }
  }

  /**
   * 示例3：使用MaterialManager创建抛物线飞线
   */
  parabolaFlyLineExample() {
    const startPoint = {
      longitude: 104.065735, // 成都
      latitude: 30.659462,
      height: 500
    }
    
    const endPoint = {
      longitude: 108.948024, // 西安
      latitude: 34.263161,
      height: 400
    }
    
    // 创建青色飞线效果
    const flyLineData = this.materialManager.createParabolaFlyLine(startPoint, endPoint, {
      materialType: 'flyline',
      segments: 60,
      materialOptions: {
        color: new Cesium.Color(0.0, 1.0, 1.0, 0.9),
        speed: 3.0
      }
    })
    
    console.log('抛物线飞线数据:', flyLineData)
    return flyLineData
  }

  /**
   * 示例4：创建脉冲抛物线
   */
  parabolaPulseExample() {
    const startPoint = {
      longitude: 120.153576, // 杭州
      latitude: 30.287459,
      height: 0
    }
    
    const endPoint = {
      longitude: 118.767413, // 南京
      latitude: 32.041544,
      height: 0
    }
    
    // 创建橙色脉冲效果
    const pulseData = this.materialManager.createParabolaFlyLine(startPoint, endPoint, {
      materialType: 'pulse',
      maxHeight: 30000,
      segments: 40,
      materialOptions: {
        color: new Cesium.Color(1.0, 0.5, 0.0, 0.8),
        speed: 2.0
      }
    })
    
    console.log('抛物线脉冲数据:', pulseData)
    return pulseData
  }

  /**
   * 示例5：批量创建多条抛物线
   */
  multipleParabolasExample() {
    const cities = [
      { name: '北京', longitude: 116.407526, latitude: 39.9042, height: 0 },
      { name: '上海', longitude: 121.473701, latitude: 31.230416, height: 0 },
      { name: '广州', longitude: 113.264435, latitude: 23.129163, height: 0 },
      { name: '深圳', longitude: 114.057868, latitude: 22.543099, height: 0 },
      { name: '成都', longitude: 104.065735, latitude: 30.659462, height: 500 }
    ]
    
    const parabolas = []
    
    // 从北京到其他城市创建抛物线
    const beijing = cities[0]
    for (let i = 1; i < cities.length; i++) {
      const targetCity = cities[i]
      
      const parabolaData = this.materialManager.createParabolaFlyLine(beijing, targetCity, {
        materialType: i % 2 === 0 ? 'flyline' : 'pulse',
        materialOptions: {
          color: new Cesium.Color(
            Math.random(),
            Math.random(),
            Math.random(),
            0.8
          ),
          speed: 1.5 + Math.random() * 2
        }
      })
      
      parabolas.push({
        id: `parabola_${beijing.name}_to_${targetCity.name}`,
        from: beijing.name,
        to: targetCity.name,
        ...parabolaData
      })
    }
    
    console.log('批量抛物线数据:', parabolas)
    return parabolas
  }

  /**
   * 示例6：长距离抛物线（跨国）
   */
  longDistanceParabolaExample() {
    const startPoint = {
      longitude: 116.407526, // 北京
      latitude: 39.9042,
      height: 0
    }
    
    const endPoint = {
      longitude: -74.006, // 纽约
      latitude: 40.7128,
      height: 0
    }
    
    // 长距离需要更高的抛物线
    const longDistanceData = this.materialManager.createParabolaFlyLine(startPoint, endPoint, {
      maxHeight: 200000, // 200公里高度
      segments: 100, // 更多分段以保证平滑
      materialType: 'flyline',
      materialOptions: {
        color: new Cesium.Color(1.0, 0.0, 1.0, 0.9), // 紫色
        speed: 1.0 // 较慢的速度
      }
    })
    
    console.log('长距离抛物线数据:', longDistanceData)
    return longDistanceData
  }

  /**
   * 运行所有示例
   */
  runAllExamples() {
    console.log('=== 抛物线工具示例 ===')
    
    console.log('\n1. 基础抛物线示例:')
    this.basicParabolaExample()
    
    console.log('\n2. 自动高度抛物线示例:')
    this.autoHeightParabolaExample()
    
    console.log('\n3. 抛物线飞线示例:')
    this.parabolaFlyLineExample()
    
    console.log('\n4. 抛物线脉冲示例:')
    this.parabolaPulseExample()
    
    console.log('\n5. 批量抛物线示例:')
    this.multipleParabolasExample()
    
    console.log('\n6. 长距离抛物线示例:')
    this.longDistanceParabolaExample()
    
    console.log('\n=== 所有示例运行完成 ===')
  }
}

// 导出示例实例
export default new ParabolaExample()

/**
 * 快速使用函数
 */
export function createQuickParabola(startLon, startLat, endLon, endLat, height = null) {
  const startPoint = { longitude: startLon, latitude: startLat, height: 0 }
  const endPoint = { longitude: endLon, latitude: endLat, height: 0 }
  
  const maxHeight = height || calculateOptimalHeight(startPoint, endPoint)
  return generateParabola(startPoint, endPoint, maxHeight)
}

/**
 * 创建简单的飞线抛物线
 */
export function createSimpleFlyLine(startLon, startLat, endLon, endLat, options = {}) {
  const materialManager = new MaterialManager()
  const startPoint = { longitude: startLon, latitude: startLat, height: 0 }
  const endPoint = { longitude: endLon, latitude: endLat, height: 0 }
  
  return materialManager.createParabolaFlyLine(startPoint, endPoint, options)
}