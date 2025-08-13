// 管理类统一入口文件
import { TargetBaseManager } from './TargetBaseManager.js'
import { TargetLocationManager } from './TargetLocationManager.js'
import { RelationshipManager } from './RelationshipManager.js'

// 导出所有管理类
export {
  TargetBaseManager,
  TargetLocationManager,
  RelationshipManager
}

// 创建管理类工厂函数
export function createTargetBaseManager(data = []) {
  return new TargetBaseManager(data)
}

export function createTargetLocationManager(data = []) {
  return new TargetLocationManager(data)
}

export function createRelationshipManager(data = []) {
  return new RelationshipManager(data)
}

// 创建完整的数据管理器
export class DataManager {
  constructor(targetBaseData = [], targetLocationData = [], relationshipData = []) {
    this.targetBase = new TargetBaseManager(targetBaseData)
    this.targetLocation = new TargetLocationManager(targetLocationData)
    this.relationship = new RelationshipManager(relationshipData)
  }

  // 获取完整的目标信息（合并基本信息和位置信息）
  getCompleteTarget(id) {
    const baseData = this.targetBase.getById(id)
    const locationData = this.targetLocation.getById(id)
    
    if (!baseData || !locationData) return null
    
    return {
      ...baseData,
      ...locationData
    }
  }

  // 获取所有完整的目标信息
  getAllCompleteTargets() {
    return this.targetBase.data.map(baseTarget => {
      const locationData = this.targetLocation.getById(baseTarget.id)
      return locationData ? { ...baseTarget, ...locationData } : baseTarget
    })
  }

  // 添加完整的目标（同时添加基本信息和位置信息）
  addCompleteTarget(targetData) {
    const { longitude, latitude, height, region, province, city, name, ...baseData } = targetData
    
    const locationData = {
      id: targetData.id,
      name,
      longitude,
      latitude,
      height,
      region,
      province,
      city
    }
    
    const baseResult = this.targetBase.add(baseData)
    const locationResult = this.targetLocation.add(locationData)
    
    return {
      base: baseResult,
      location: locationResult,
      complete: { ...baseResult, ...locationResult }
    }
  }

  // 删除完整的目标（同时删除基本信息、位置信息和相关关系）
  deleteCompleteTarget(id) {
    const baseResult = this.targetBase.delete(id)
    const locationResult = this.targetLocation.delete(id)
    const relationshipResults = this.relationship.deleteTargetRelationships(id)
    
    return {
      base: baseResult,
      location: locationResult,
      relationships: relationshipResults
    }
  }

  // 获取目标的相关关系
  getTargetRelationships(targetId) {
    return this.relationship.getTargetRelationships(targetId)
  }

  // 获取两个目标之间的关系
  getRelationshipBetween(targetId1, targetId2) {
    return this.relationship.getRelationshipBetween(targetId1, targetId2)
  }

  // 计算两个目标之间的距离
  calculateDistance(targetId1, targetId2) {
    return this.targetLocation.calculateDistance(targetId1, targetId2)
  }

  // 获取综合统计信息
  getComprehensiveStatistics() {
    return {
      targetBase: this.targetBase.getStatistics(),
      targetLocation: this.targetLocation.getStatistics(),
      relationship: this.relationship.getStatistics(),
      network: {
        density: this.relationship.getNetworkDensity(),
        cycles: this.relationship.detectCycles().length
      }
    }
  }

  // 搜索所有数据
  searchAll(keyword) {
    return {
      targets: this.targetBase.search(keyword),
      locations: this.targetLocation.search(keyword),
      relationships: this.relationship.search(keyword)
    }
  }

  // 验证数据完整性
  validateDataIntegrity() {
    const errors = []
    const warnings = []
    
    // 检查目标基本信息和位置信息是否匹配
    this.targetBase.data.forEach(target => {
      const location = this.targetLocation.getById(target.id)
      if (!location) {
        errors.push(`Target ${target.id} has base data but no location data`)
      }
    })
    
    this.targetLocation.data.forEach(location => {
      const base = this.targetBase.getById(location.id)
      if (!base) {
        errors.push(`Location ${location.id} has location data but no base data`)
      }
    })
    
    // 检查关系中引用的目标是否存在
    this.relationship.data.forEach(rel => {
      const sourceExists = this.targetBase.getById(rel.source_id)
      const targetExists = this.targetBase.getById(rel.target_id)
      
      if (!sourceExists) {
        errors.push(`Relationship ${rel.id} references non-existent source target ${rel.source_id}`)
      }
      
      if (!targetExists) {
        errors.push(`Relationship ${rel.id} references non-existent target ${rel.target_id}`)
      }
    })
    
    // 检查是否有孤立的目标（没有任何关系）
    this.targetBase.data.forEach(target => {
      const relationships = this.getTargetRelationships(target.id)
      if (relationships.length === 0) {
        warnings.push(`Target ${target.id} has no relationships`)
      }
    })
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  // 导出所有数据
  exportData() {
    return {
      targetBase: this.targetBase.data,
      targetLocation: this.targetLocation.data,
      relationship: this.relationship.data,
      exportTime: new Date().toISOString()
    }
  }

  // 导入数据
  importData(data) {
    if (data.targetBase) {
      this.targetBase.data = data.targetBase
    }
    
    if (data.targetLocation) {
      this.targetLocation.data = data.targetLocation
    }
    
    if (data.relationship) {
      this.relationship.data = data.relationship
    }
    
    return this.validateDataIntegrity()
  }

  // 清空所有数据
  clearAll() {
    this.targetBase.data = []
    this.targetLocation.data = []
    this.relationship.data = []
  }
}

// 创建数据管理器工厂函数
export function createDataManager(targetBaseData, targetLocationData, relationshipData) {
  return new DataManager(targetBaseData, targetLocationData, relationshipData)
}