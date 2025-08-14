import BaseManager from './BaseManager.js'

/**
 * 关系数据管理器
 * 管理目标之间的关系数据，支持多种索引和查询方式
 */
class RelationManager extends BaseManager {
  constructor() {
    super()
    this.requiredFields = ['id', 'source_id', 'target_id', 'type']
    this.initializeIndexes()
  }

  /**
   * 初始化索引
   * @protected
   */
  initializeIndexes() {
    this.indexes.set('type', new Map())
    this.indexes.set('status', new Map())
    this.indexes.set('priority', new Map())
    this.indexes.set('source', new Map())
    this.indexes.set('target', new Map())
    this.indexes.set('bidirectional', new Map())
  }

  /**
   * 自定义验证
   * @param {Object} item - 数据项
   * @returns {boolean} 验证是否通过
   * @protected
   */
  customValidation(item) {
    // 验证关系类型
    if (!item.type || typeof item.type !== 'string') {
      console.warn('关系类型必须是字符串', item)
      return false
    }

    // 验证源目标和目标不能相同
    if (item.source_id === item.target_id) {
      console.warn('源目标和目标不能相同', item)
      return false
    }

    return true
  }

  /**
   * 更新索引
   * @param {Object} item - 数据项
   * @protected
   */
  updateIndexes(item) {
    this._updateIndex(this.indexes.get('type'), item.type, item.id)
    this._updateIndex(this.indexes.get('status'), item.status, item.id)
    this._updateIndex(this.indexes.get('priority'), item.priority, item.id)
    this._updateIndex(this.indexes.get('source'), item.source_id, item.id)
    this._updateIndex(this.indexes.get('target'), item.target_id, item.id)

    // 双向关系索引
    if (item.is_bidirectional) {
      const bidirectionalKey = this._getBidirectionalKey(item.source_id, item.target_id)
      this._updateIndex(this.indexes.get('bidirectional'), bidirectionalKey, item.id)
    }
  }

  /**
   * 从索引中移除
   * @param {Object} item - 数据项
   * @protected
   */
  removeFromIndexes(item) {
    this._removeFromIndex(this.indexes.get('type'), item.type, item.id)
    this._removeFromIndex(this.indexes.get('status'), item.status, item.id)
    this._removeFromIndex(this.indexes.get('priority'), item.priority, item.id)
    this._removeFromIndex(this.indexes.get('source'), item.source_id, item.id)
    this._removeFromIndex(this.indexes.get('target'), item.target_id, item.id)

    // 双向关系索引
    if (item.is_bidirectional) {
      const bidirectionalKey = this._getBidirectionalKey(item.source_id, item.target_id)
      this._removeFromIndex(this.indexes.get('bidirectional'), bidirectionalKey, item.id)
    }
  }

  /**
   * 根据关系类型查找数据
   * @param {string} type - 关系类型
   * @returns {Array} 匹配的数据项数组
   */
  findByType(type) {
    return this.findByIndex('type', type)
  }

  /**
   * 根据状态查找数据
   * @param {string} status - 状态
   * @returns {Array} 匹配的数据项数组
   */
  findByStatus(status) {
    return this.findByIndex('status', status)
  }

  /**
   * 根据优先级查找数据
   * @param {string} priority - 优先级
   * @returns {Array} 匹配的数据项数组
   */
  findByPriority(priority) {
    return this.findByIndex('priority', priority)
  }

  /**
   * 根据源目标查找数据
   * @param {string} sourceId - 源目标ID
   * @returns {Array} 匹配的数据项数组
   */
  findBySource(sourceId) {
    return this.findByIndex('source', sourceId)
  }

  /**
   * 根据目标查找数据
   * @param {string} targetId - 目标ID
   * @returns {Array} 匹配的数据项数组
   */
  findByTarget(targetId) {
    return this.findByIndex('target', targetId)
  }

  /**
   * 查找目标的所有关系（作为源或目标）
   * @param {string} targetId - 目标ID
   * @returns {Array} 关系数组
   */
  findRelationsByTarget(targetId) {
    const sourceRelations = this.findBySource(targetId)
    const targetRelations = this.findByTarget(targetId)

    // 合并并去重
    const allRelations = [...sourceRelations, ...targetRelations]
    const uniqueRelations = allRelations.filter(
      (relation, index, self) => index === self.findIndex((r) => r.id === relation.id),
    )

    return uniqueRelations
  }

  /**
   * 查找两个目标之间的关系
   * @param {string} sourceId - 源目标ID
   * @param {string} targetId - 目标ID
   * @returns {Array} 关系数组
   */
  findRelationsBetween(sourceId, targetId) {
    const results = []

    for (const relation of this.data.values()) {
      if (
        (relation.source_id === sourceId && relation.target_id === targetId) ||
        (relation.source_id === targetId && relation.target_id === sourceId)
      ) {
        results.push(relation)
      }
    }

    return results
  }

  /**
   * 根据距离范围查找数据
   * @param {number} minDistance - 最小距离
   * @param {number} maxDistance - 最大距离
   * @returns {Array} 匹配的数据项数组
   */
  findByDistanceRange(minDistance, maxDistance) {
    const results = []

    for (const item of this.data.values()) {
      if (
        typeof item.distance === 'number' &&
        item.distance >= minDistance &&
        item.distance <= maxDistance
      ) {
        results.push(item)
      }
    }

    return results.sort((a, b) => a.distance - b.distance)
  }

  /**
   * 模糊搜索
   * @param {string} keyword - 搜索关键词
   * @returns {Array} 匹配的数据项数组
   */
  search(keyword) {
    if (!keyword) return this.getAll()

    const lowerKeyword = keyword.toLowerCase()
    const results = []

    for (const item of this.data.values()) {
      if (
        item.description?.toLowerCase().includes(lowerKeyword) ||
        item.type?.toLowerCase().includes(lowerKeyword) ||
        item.status?.toLowerCase().includes(lowerKeyword) ||
        item.priority?.toLowerCase().includes(lowerKeyword) ||
        item.capacity?.toLowerCase().includes(lowerKeyword) ||
        item.frequency?.toLowerCase().includes(lowerKeyword)
      ) {
        results.push(item)
      }
    }

    return results
  }

  /**
   * 删除与指定目标相关的所有关系
   * @param {string} targetId - 目标ID
   * @returns {number} 删除的关系数量
   */
  deleteByTarget(targetId) {
    const relationsToDelete = this.findRelationsByTarget(targetId)
    relationsToDelete.forEach((relation) => {
      this.deleteById(relation.id)
    })
    return relationsToDelete.length
  }

  /**
   * 获取所有关系类型
   * @returns {Array} 类型数组
   */
  getAllTypes() {
    return this.getIndexValues('type')
  }

  /**
   * 获取所有状态
   * @returns {Array} 状态数组
   */
  getAllStatuses() {
    return this.getIndexValues('status')
  }

  /**
   * 获取所有优先级
   * @returns {Array} 优先级数组
   */
  getAllPriorities() {
    return this.getIndexValues('priority')
  }

  /**
   * 获取网络统计信息
   * @returns {Object} 统计信息
   */
  getNetworkStats() {
    const stats = {
      totalRelations: this.data.size,
      uniqueTargets: new Set(),
      typeDistribution: {},
      statusDistribution: {},
      priorityDistribution: {},
      capacityDistribution: {},
      averageDistance: 0,
      totalDistance: 0,
    }

    let totalDistance = 0
    let distanceCount = 0

    for (const relation of this.data.values()) {
      // 统计唯一目标
      stats.uniqueTargets.add(relation.source_id)
      stats.uniqueTargets.add(relation.target_id)

      // 统计类型分布
      stats.typeDistribution[relation.type] = (stats.typeDistribution[relation.type] || 0) + 1

      // 统计状态分布
      stats.statusDistribution[relation.status] =
        (stats.statusDistribution[relation.status] || 0) + 1

      // 统计优先级分布
      stats.priorityDistribution[relation.priority] =
        (stats.priorityDistribution[relation.priority] || 0) + 1

      // 统计容量分布
      stats.capacityDistribution[relation.capacity] =
        (stats.capacityDistribution[relation.capacity] || 0) + 1

      // 统计距离
      if (typeof relation.distance === 'number') {
        totalDistance += relation.distance
        distanceCount++
      }
    }

    stats.uniqueTargets = stats.uniqueTargets.size
    stats.totalDistance = totalDistance
    stats.averageDistance = distanceCount > 0 ? totalDistance / distanceCount : 0

    return stats
  }

  /**
   * 生成双向关系键
   * @param {string} sourceId - 源目标ID
   * @param {string} targetId - 目标ID
   * @returns {string} 双向关系键
   * @private
   */
  _getBidirectionalKey(sourceId, targetId) {
    return [sourceId, targetId].sort().join('-')
  }
}

export default RelationManager
