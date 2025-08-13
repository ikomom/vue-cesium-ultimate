// 导入各个数据模块和管理类
import { targetBaseData } from './targetBaseData.js'
import { targetLocationData } from './targetLocationData.js'
import { relationshipData } from './relationshipData.js'

// 导入统一的管理类模块
import {
  DataManager,
  TargetBaseManager,
  TargetLocationManager,
  RelationshipManager,
} from './managers/index.js'

// 合并目标基本信息和位置信息的工具函数
export function getCompleteTargetData() {
  return targetBaseData.map((baseTarget) => {
    const locationData = targetLocationData.find((loc) => loc.id === baseTarget.id)
    return {
      ...baseTarget,
      ...locationData,
    }
  })
}

// 获取完整的地图目标数据（兼容性保持）
export const mapTargets = getCompleteTargetData()

// 导出关系数据（兼容性保持）
export const relationships = relationshipData

// 根据目标ID获取完整目标信息（包含基本信息和位置信息）
export function getCompleteTargetById(id) {
  const baseData = targetBaseData.find((target) => target.id === id)
  const locationData = targetLocationData.find((target) => target.id === id)
  return baseData && locationData ? { ...baseData, ...locationData } : null
}

// 根据目标ID获取相关关系
export function getRelatedRelationships(targetId) {
  return relationshipData.filter((rel) => rel.source_id === targetId || rel.target_id === targetId)
}

export {
  targetBaseData,
  targetLocationData,
  relationshipData,

  // 管理类
  DataManager,
}

// 创建并导出统一数据管理器实例
export const dataManager = new DataManager(targetBaseData, targetLocationData, relationshipData)
