// 关系数据管理类
export class RelationshipManager {
  constructor(data = []) {
    this.data = data
  }

  // 根据ID获取关系数据
  getById(id) {
    return this.data.find(rel => rel.id === id)
  }

  // 根据源目标ID获取关系数据
  getBySourceId(sourceId) {
    return this.data.filter(rel => rel.source_id === sourceId)
  }

  // 根据目标ID获取关系数据
  getByTargetId(targetId) {
    return this.data.filter(rel => rel.target_id === targetId)
  }

  // 根据关系类型获取关系数据
  getByType(type) {
    return this.data.filter(rel => rel.type === type)
  }

  // 根据状态获取关系数据
  getByStatus(status) {
    return this.data.filter(rel => rel.status === status)
  }

  // 根据优先级获取关系数据
  getByPriority(priority) {
    return this.data.filter(rel => rel.priority === priority)
  }

  // 根据距离范围获取关系数据
  getByDistanceRange(minDistance, maxDistance) {
    return this.data.filter(rel => 
      rel.distance >= minDistance && rel.distance <= maxDistance
    )
  }

  // 根据创建时间范围获取关系
  getByCreatedTimeRange(startTime, endTime) {
    return this.data.filter(rel => {
      const createdAt = new Date(rel.createdAt)
      return createdAt >= new Date(startTime) && createdAt <= new Date(endTime)
    })
  }

  // 获取目标的所有关系（包括作为源和目标）
  getTargetRelationships(targetId) {
    return this.data.filter(rel => 
      rel.source_id === targetId || rel.target_id === targetId
    )
  }

  // 获取两个目标之间的关系
  getRelationshipBetween(targetId1, targetId2) {
    return this.data.filter(rel => 
      (rel.source_id === targetId1 && rel.target_id === targetId2) ||
      (rel.source_id === targetId2 && rel.target_id === targetId1)
    )
  }

  // 获取所有关系类型
  getAllTypes() {
    return [...new Set(this.data.map(rel => rel.type))]
  }

  // 获取所有关系状态
  getAllStatuses() {
    return [...new Set(this.data.map(rel => rel.status))]
  }

  // 获取所有优先级
  getAllPriorities() {
    return [...new Set(this.data.map(rel => rel.priority))]
  }

  // 获取所有容量等级
  getAllCapacityLevels() {
    return [...new Set(this.data.map(rel => rel.capacity))]
  }

  // 添加新关系
  add(relationshipData) {
    const newRelationship = {
      ...relationshipData,
      createdAt: relationshipData.createdAt || new Date().toISOString()
    }
    this.data.push(newRelationship)
    return newRelationship
  }

  // 更新关系信息
  update(id, updateData) {
    const index = this.data.findIndex(rel => rel.id === id)
    if (index !== -1) {
      this.data[index] = { ...this.data[index], ...updateData }
      return this.data[index]
    }
    return null
  }

  // 删除关系
  delete(id) {
    const index = this.data.findIndex(rel => rel.id === id)
    if (index !== -1) {
      return this.data.splice(index, 1)[0]
    }
    return null
  }

  // 批量删除目标的所有关系
  deleteTargetRelationships(targetId) {
    const toDelete = this.getTargetRelationships(targetId)
    this.data = this.data.filter(rel => 
      rel.source_id !== targetId && rel.target_id !== targetId
    )
    return toDelete
  }

  // 获取关系统计信息
  getStatistics() {
    const typeStats = {}
    const statusStats = {}
    const priorityStats = {}
    const capacityStats = {}
    
    this.data.forEach(rel => {
      typeStats[rel.type] = (typeStats[rel.type] || 0) + 1
      statusStats[rel.status] = (statusStats[rel.status] || 0) + 1
      priorityStats[rel.priority] = (priorityStats[rel.priority] || 0) + 1
      capacityStats[rel.capacity] = (capacityStats[rel.capacity] || 0) + 1
    })
    
    const distances = this.data.map(rel => rel.distance)
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length
    const minDistance = Math.min(...distances)
    const maxDistance = Math.max(...distances)
    
    return {
      total: this.data.length,
      typeStats,
      statusStats,
      priorityStats,
      capacityStats,
      distanceStats: {
        average: avgDistance,
        min: minDistance,
        max: maxDistance
      }
    }
  }

  // 搜索关系（支持多字段模糊搜索）
  search(keyword) {
    const lowerKeyword = keyword.toLowerCase()
    return this.data.filter(rel => 
      rel.id.toLowerCase().includes(lowerKeyword) ||
      rel.type.toLowerCase().includes(lowerKeyword) ||
      rel.status.toLowerCase().includes(lowerKeyword) ||
      rel.source_id.toLowerCase().includes(lowerKeyword) ||
      rel.target_id.toLowerCase().includes(lowerKeyword) ||
      rel.description.toLowerCase().includes(lowerKeyword)
    )
  }

  // 验证关系的有效性
  validateRelationship(relationshipData) {
    const required = ['id', 'source_id', 'target_id', 'type']
    const missing = required.filter(field => !relationshipData[field])
    
    if (missing.length > 0) {
      return { valid: false, errors: [`Missing required fields: ${missing.join(', ')}`] }
    }
    
    // 检查是否已存在相同ID的关系
    if (this.getById(relationshipData.id)) {
      return { valid: false, errors: ['Relationship with this ID already exists'] }
    }
    
    // 检查源目标和目标不能相同
    if (relationshipData.source_id === relationshipData.target_id) {
      return { valid: false, errors: ['Source and target cannot be the same'] }
    }
    
    return { valid: true, errors: [] }
  }

  // 批量操作
  batchAdd(relationshipsData) {
    const results = []
    const errors = []
    
    relationshipsData.forEach((relationshipData, index) => {
      const validation = this.validateRelationship(relationshipData)
      if (validation.valid) {
        results.push(this.add(relationshipData))
      } else {
        errors.push({ index, errors: validation.errors })
      }
    })
    
    return { results, errors }
  }

  // 获取关系网络图数据
  getNetworkData() {
    const nodes = new Set()
    const edges = []
    
    this.data.forEach(rel => {
      nodes.add(rel.source_id)
      nodes.add(rel.target_id)
      edges.push({
        source: rel.source_id,
        target: rel.target_id,
        type: rel.type,
        weight: rel.distance || 1,
        ...rel
      })
    })
    
    return {
      nodes: Array.from(nodes).map(id => ({ id })),
      edges
    }
  }

  // 查找最短路径（简单的广度优先搜索）
  findShortestPath(sourceId, targetId) {
    if (sourceId === targetId) return [sourceId]
    
    const visited = new Set()
    const queue = [{ id: sourceId, path: [sourceId] }]
    
    while (queue.length > 0) {
      const { id, path } = queue.shift()
      
      if (visited.has(id)) continue
      visited.add(id)
      
      const connections = this.getBySourceId(id)
      
      for (const rel of connections) {
        if (rel.target_id === targetId) {
          return [...path, rel.target_id]
        }
        
        if (!visited.has(rel.target_id)) {
          queue.push({
            id: rel.target_id,
            path: [...path, rel.target_id]
          })
        }
      }
    }
    
    return null // 没有找到路径
  }

  // 获取目标的连接度
  getTargetConnectivity(targetId) {
    const inbound = this.getByTargetId(targetId).length
    const outbound = this.getBySourceId(targetId).length
    const total = this.getTargetRelationships(targetId).length
    
    return {
      inbound,
      outbound,
      total,
      ratio: total > 0 ? inbound / total : 0
    }
  }

  // 获取关系密度
  getNetworkDensity() {
    const nodes = new Set()
    this.data.forEach(rel => {
      nodes.add(rel.source_id)
      nodes.add(rel.target_id)
    })
    
    const nodeCount = nodes.size
    const maxPossibleEdges = nodeCount * (nodeCount - 1)
    
    return maxPossibleEdges > 0 ? this.data.length / maxPossibleEdges : 0
  }

  // 检测循环关系
  detectCycles() {
    const visited = new Set()
    const recursionStack = new Set()
    const cycles = []
    
    const dfs = (nodeId, path) => {
      if (recursionStack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId)
        cycles.push(path.slice(cycleStart))
        return
      }
      
      if (visited.has(nodeId)) return
      
      visited.add(nodeId)
      recursionStack.add(nodeId)
      
      const connections = this.getBySourceId(nodeId)
      connections.forEach(rel => {
        dfs(rel.target_id, [...path, rel.target_id])
      })
      
      recursionStack.delete(nodeId)
    }
    
    const allNodes = new Set()
    this.data.forEach(rel => {
      allNodes.add(rel.source_id)
      allNodes.add(rel.target_id)
    })
    
    allNodes.forEach(nodeId => {
      if (!visited.has(nodeId)) {
        dfs(nodeId, [nodeId])
      }
    })
    
    return cycles
  }
}