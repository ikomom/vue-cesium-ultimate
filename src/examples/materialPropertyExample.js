/**
 * MaterialProperty 使用示例
 * 展示如何使用自定义的材质属性类
 */

import { MaterialManager } from '../utils/materials.js'
import { 
  ParabolaFlyLineMaterialProperty, 
  PulseLineMaterialProperty
} from '../utils/materialProperties.js'
import {
  materialPropertyManager,
  createParabolaFlyLineMaterial,
  createPulseLineMaterial
} from '../utils/materialPropertyManager.js'

/**
 * MaterialProperty 示例类
 */
export class MaterialPropertyExample {
  constructor(viewer) {
    this.viewer = viewer
    this.materialManager = new MaterialManager()
    this.entities = []
  }

  /**
   * 示例1：基础 MaterialProperty 使用
   */
  basicMaterialPropertyExample() {
    // 创建抛物线飞线材质属性
    const flyLineMaterial = createParabolaFlyLineMaterial({
      color: new Cesium.Color(0.0, 1.0, 1.0, 0.8),
      speed: 2.0,
      percent: 0.15,
      gradient: 0.1
    })

    // 创建脉冲线材质属性
    const pulseMaterial = createPulseLineMaterial({
      color: new Cesium.Color(1.0, 0.5, 0.0, 0.9),
      speed: 1.5,
      pulseWidth: 0.3
    })

    // 创建线条实体
    const positions = Cesium.Cartesian3.fromDegreesArray([
      116.407526, 39.9042,   // 北京
      121.473701, 31.230416  // 上海
    ])

    const flyLineEntity = this.viewer.entities.add({
      id: 'flyline-material-property',
      polyline: {
        positions: positions,
        width: 5,
        material: flyLineMaterial,
        clampToGround: false
      }
    })

    const pulseLineEntity = this.viewer.entities.add({
      id: 'pulse-material-property',
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([
          113.264435, 23.129163,  // 广州
          114.057868, 22.543099   // 深圳
        ]),
        width: 8,
        material: pulseMaterial,
        clampToGround: false
      }
    })

    this.entities.push(flyLineEntity, pulseLineEntity)
    
    console.log('基础 MaterialProperty 示例创建完成')
    return { flyLineEntity, pulseLineEntity }
  }

  /**
   * 示例2：动态修改材质属性
   */
  dynamicMaterialPropertyExample() {
    // 创建可动态修改的材质属性
    const dynamicMaterial = new ParabolaFlyLineMaterialProperty({
      color: new Cesium.Color(1.0, 0.0, 1.0, 0.8), // 紫色
      speed: 1.0,
      percent: 0.2,
      gradient: 0.15
    })

    const entity = this.viewer.entities.add({
      id: 'dynamic-material-property',
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([
          104.065735, 30.659462,  // 成都
          108.948024, 34.263161   // 西安
        ]),
        width: 6,
        material: dynamicMaterial,
        clampToGround: false
      }
    })

    // 动态修改材质属性
    let colorIndex = 0
    const colors = [
      new Cesium.Color(1.0, 0.0, 1.0, 0.8), // 紫色
      new Cesium.Color(0.0, 1.0, 0.0, 0.8), // 绿色
      new Cesium.Color(1.0, 1.0, 0.0, 0.8), // 黄色
      new Cesium.Color(1.0, 0.0, 0.0, 0.8)  // 红色
    ]

    const interval = setInterval(() => {
      colorIndex = (colorIndex + 1) % colors.length
      dynamicMaterial.color = colors[colorIndex]
      dynamicMaterial.speed = 1.0 + colorIndex * 0.5
    }, 2000)

    this.entities.push(entity)
    
    console.log('动态 MaterialProperty 示例创建完成')
    return { entity, interval }
  }

  /**
   * 示例3：使用 MaterialManager 创建 MaterialProperty
   */
  materialManagerPropertyExample() {
    const entities = []

    // 通信关系 - 青色飞线
    const commMaterial = this.materialManager.getMaterialPropertyByRelationType('communication', {
      speed: 2.5,
      percent: 0.12
    })

    const commEntity = this.viewer.entities.add({
      id: 'communication-property',
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([
          120.153576, 30.287459,  // 杭州
          118.767413, 32.041544   // 南京
        ]),
        width: 4,
        material: commMaterial,
        clampToGround: false
      }
    })

    // 供应关系 - 橙色脉冲
    const supplyMaterial = this.materialManager.getMaterialPropertyByRelationType('supply', {
      speed: 1.8,
      pulseWidth: 0.25
    })

    const supplyEntity = this.viewer.entities.add({
      id: 'supply-property',
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([
          87.617733, 43.792818,   // 乌鲁木齐
          91.132212, 29.660361    // 拉萨
        ]),
        width: 6,
        material: supplyMaterial,
        clampToGround: false
      }
    })

    // 指挥关系 - 红色飞线
    const commandMaterial = this.materialManager.getMaterialPropertyByRelationType('command', {
      speed: 3.5,
      percent: 0.08
    })

    const commandEntity = this.viewer.entities.add({
      id: 'command-property',
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([
          126.642464, 45.756967,  // 哈尔滨
          117.000923, 36.675807   // 济南
        ]),
        width: 5,
        material: commandMaterial,
        clampToGround: false
      }
    })

    entities.push(commEntity, supplyEntity, commandEntity)
    this.entities.push(...entities)
    
    console.log('MaterialManager Property 示例创建完成')
    return entities
  }

  /**
   * 示例4：抛物线轨迹与 MaterialProperty 结合
   */
  parabolaWithMaterialPropertyExample() {
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

    // 使用 MaterialProperty 创建抛物线飞线
    const parabolaData = this.materialManager.createParabolaFlyLine(startPoint, endPoint, {
      maxHeight: 200000,
      segments: 100,
      materialType: 'flyline',
      useProperty: true, // 使用 MaterialProperty
      materialOptions: {
        color: new Cesium.Color(1.0, 0.0, 1.0, 0.9), // 紫色
        speed: 1.0,
        percent: 0.2,
        gradient: 0.1
      }
    })

    const entity = this.viewer.entities.add({
      id: 'parabola-material-property',
      polyline: {
        positions: parabolaData.positions,
        width: 8,
        material: parabolaData.material,
        clampToGround: false
      }
    })

    this.entities.push(entity)
    
    console.log('抛物线 MaterialProperty 示例创建完成')
    return { entity, parabolaData }
  }

  /**
   * 示例5：批量创建不同类型的 MaterialProperty
   */
  batchMaterialPropertyExample() {
    const routes = [
      {
        name: '北京-上海',
        start: [116.407526, 39.9042],
        end: [121.473701, 31.230416],
        type: 'communication'
      },
      {
        name: '广州-深圳',
        start: [113.264435, 23.129163],
        end: [114.057868, 22.543099],
        type: 'supply'
      },
      {
        name: '成都-重庆',
        start: [104.065735, 30.659462],
        end: [106.504962, 29.533155],
        type: 'command'
      },
      {
        name: '西安-兰州',
        start: [108.948024, 34.263161],
        end: [103.823557, 36.058039],
        type: 'communication'
      }
    ]

    const entities = routes.map((route, index) => {
      const material = this.materialManager.getMaterialPropertyByRelationType(route.type, {
        speed: 1.5 + Math.random() * 2,
        percent: 0.1 + Math.random() * 0.1,
        pulseWidth: 0.2 + Math.random() * 0.2
      })

      const entity = this.viewer.entities.add({
        id: `batch-property-${index}`,
        name: route.name,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            ...route.start,
            ...route.end
          ]),
          width: 4 + Math.random() * 4,
          material: material,
          clampToGround: false
        }
      })

      return entity
    })

    this.entities.push(...entities)
    
    console.log('批量 MaterialProperty 示例创建完成')
    return entities
  }

  /**
   * 清除所有示例实体
   */
  clearAllExamples() {
    this.entities.forEach(entity => {
      this.viewer.entities.remove(entity)
    })
    this.entities = []
    console.log('所有 MaterialProperty 示例已清除')
  }

  /**
   * 运行所有示例
   */
  runAllExamples() {
    console.log('=== MaterialProperty 示例开始 ===')
    
    console.log('\n1. 基础 MaterialProperty 示例:')
    this.basicMaterialPropertyExample()
    
    setTimeout(() => {
      console.log('\n2. 动态 MaterialProperty 示例:')
      this.dynamicMaterialPropertyExample()
    }, 1000)
    
    setTimeout(() => {
      console.log('\n3. MaterialManager Property 示例:')
      this.materialManagerPropertyExample()
    }, 2000)
    
    setTimeout(() => {
      console.log('\n4. 抛物线 MaterialProperty 示例:')
      this.parabolaWithMaterialPropertyExample()
    }, 3000)
    
    setTimeout(() => {
      console.log('\n5. 批量 MaterialProperty 示例:')
      this.batchMaterialPropertyExample()
    }, 4000)
    
    setTimeout(() => {
      console.log('\n=== 所有 MaterialProperty 示例运行完成 ===')
    }, 5000)
  }
}

// 导出便捷函数
export function createMaterialPropertyExample(viewer) {
  return new MaterialPropertyExample(viewer)
}

/**
 * 快速创建飞线 MaterialProperty
 */
export function quickCreateFlyLineMaterialProperty(options = {}) {
  return createParabolaFlyLineMaterial({
    color: new Cesium.Color(0.0, 1.0, 1.0, 0.8),
    speed: 2.0,
    percent: 0.1,
    gradient: 0.1,
    ...options
  })
}

/**
 * 快速创建脉冲 MaterialProperty
 */
export function quickCreatePulseMaterialProperty(options = {}) {
  return createPulseLineMaterial({
    color: new Cesium.Color(1.0, 0.5, 0.0, 0.9),
    speed: 1.5,
    pulseWidth: 0.2,
    ...options
  })
}

export default MaterialPropertyExample