// 目标基本信息管理类
export class TargetBaseManager {
  constructor(data = []) {
    this.data = data
  }

  // 根据ID获取目标基本信息
  getById(id) {
    return this.data.find(target => target.id === id)
  }

  // 根据类型获取目标基本信息
  getByType(type) {
    return this.data.filter(target => target.type === type)
  }

  // 根据状态获取目标基本信息
  getByStatus(status) {
    return this.data.filter(target => target.status === status)
  }

  // 根据运营商获取目标基本信息
  getByOperator(operator) {
    return this.data.filter(target => target.operator === operator)
  }

  // 根据容量等级获取目标基本信息
  getByCapacity(capacity) {
    return this.data.filter(target => target.capacity === capacity)
  }

  // 根据创建时间范围获取目标
  getByCreatedTimeRange(startTime, endTime) {
    return this.data.filter(target => {
      const createdAt = new Date(target.createdAt)
      return createdAt >= new Date(startTime) && createdAt <= new Date(endTime)
    })
  }

  // 获取所有运营商列表
  getAllOperators() {
    return [...new Set(this.data.map(target => target.operator))]
  }

  // 获取所有状态列表
  getAllStatuses() {
    return [...new Set(this.data.map(target => target.status))]
  }

  // 获取所有容量等级列表
  getAllCapacities() {
    return [...new Set(this.data.map(target => target.capacity))]
  }

  // 获取所有目标类型
  getAllTypes() {
    return [...new Set(this.data.map(target => target.type))]
  }

  // 添加新目标
  add(targetData) {
    const newTarget = {
      ...targetData,
      createdAt: targetData.createdAt || new Date().toISOString()
    }
    this.data.push(newTarget)
    return newTarget
  }

  // 更新目标信息
  update(id, updateData) {
    const index = this.data.findIndex(target => target.id === id)
    if (index !== -1) {
      this.data[index] = { ...this.data[index], ...updateData }
      return this.data[index]
    }
    return null
  }

  // 删除目标
  delete(id) {
    const index = this.data.findIndex(target => target.id === id)
    if (index !== -1) {
      return this.data.splice(index, 1)[0]
    }
    return null
  }

  // 获取目标基本信息统计
  getStatistics() {
    const typeStats = {}
    const statusStats = {}
    const operatorStats = {}
    const capacityStats = {}
    
    this.data.forEach(target => {
      typeStats[target.type] = (typeStats[target.type] || 0) + 1
      statusStats[target.status] = (statusStats[target.status] || 0) + 1
      operatorStats[target.operator] = (operatorStats[target.operator] || 0) + 1
      capacityStats[target.capacity] = (capacityStats[target.capacity] || 0) + 1
    })
    
    return {
      total: this.data.length,
      typeStats,
      statusStats,
      operatorStats,
      capacityStats
    }
  }

  // 搜索目标（支持多字段模糊搜索）
  search(keyword) {
    const lowerKeyword = keyword.toLowerCase()
    return this.data.filter(target => 
      target.id.toLowerCase().includes(lowerKeyword) ||
      target.type.toLowerCase().includes(lowerKeyword) ||
      target.status.toLowerCase().includes(lowerKeyword) ||
      target.operator.toLowerCase().includes(lowerKeyword)
    )
  }

  // 验证目标数据的有效性
  validateTarget(targetData) {
    const required = ['id', 'type', 'status', 'operator']
    const missing = required.filter(field => !targetData[field])
    
    if (missing.length > 0) {
      return { valid: false, errors: [`Missing required fields: ${missing.join(', ')}`] }
    }
    
    // 检查是否已存在相同ID的目标
    if (this.getById(targetData.id)) {
      return { valid: false, errors: ['Target with this ID already exists'] }
    }
    
    return { valid: true, errors: [] }
  }

  // 批量操作
  batchAdd(targetsData) {
    const results = []
    const errors = []
    
    targetsData.forEach((targetData, index) => {
      const validation = this.validateTarget(targetData)
      if (validation.valid) {
        results.push(this.add(targetData))
      } else {
        errors.push({ index, errors: validation.errors })
      }
    })
    
    return { results, errors }
  }

  // 批量更新
  batchUpdate(updates) {
    const results = []
    const errors = []
    
    updates.forEach(({ id, data }, index) => {
      const result = this.update(id, data)
      if (result) {
        results.push(result)
      } else {
        errors.push({ index, id, error: 'Target not found' })
      }
    })
    
    return { results, errors }
  }

  // 批量删除
  batchDelete(ids) {
    const results = []
    const errors = []
    
    ids.forEach((id, index) => {
      const result = this.delete(id)
      if (result) {
        results.push(result)
      } else {
        errors.push({ index, id, error: 'Target not found' })
      }
    })
    
    return { results, errors }
  }
}