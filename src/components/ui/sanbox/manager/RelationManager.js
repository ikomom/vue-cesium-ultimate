/**
 * 关系数据管理器
 * 管理目标之间的关系信息，包括航线、雷达覆盖、通信链路等
 */
class RelationManager {
  constructor() {
    this.data = new Map() // 使用Map进行快速查找
    this.typeIndex = new Map() // 按类型索引
    this.statusIndex = new Map() // 按状态索引
    this.priorityIndex = new Map() // 按优先级索引
    this.sourceIndex = new Map() // 按源目标索引
    this.targetIndex = new Map() // 按目标索引
    this.capacityIndex = new Map() // 按容量索引
  }

  /**
   * 设置初始数据
   * @param {Array} initialData - 初始数据数组
   */
  setInitialData(initialData) {
    this.clear()
    if (Array.isArray(initialData)) {
      initialData.forEach((item) => this.addItem(item))
    }
  }

  /**
   * 添加单个数据项
   * @param {Object} item - 数据项
   */
  addItem(item) {
    if (!item || !item.id || !item.source_id || !item.target_id) {
      console.error('添加关系数据项失败：缺少必要字段', item)
      return false
    }

    this.data.set(item.id, { ...item })

    // 更新索引
    this._updateIndex(this.typeIndex, item.type, item.id)
    this._updateIndex(this.statusIndex, item.status, item.id)
    this._updateIndex(this.priorityIndex, item.priority, item.id)
    this._updateIndex(this.sourceIndex, item.source_id, item.id)
    this._updateIndex(this.targetIndex, item.target_id, item.id)
    this._updateIndex(this.capacityIndex, item.capacity, item.id)

    return true
  }

  /**
   * 批量添加数据项
   * @param {Array} items - 数据项数组
   * @returns {Object} 操作结果统计
   */
  addItems(items) {
    if (!Array.isArray(items)) {
      throw new Error('参数必须是数组')
    }

    const result = {
      total: items.length,
      added: 0,
      updated: 0,
      errors: [],
    }

    items.forEach((item, index) => {
      try {
        if (!item || !item.id || !item.source_id || !item.target_id) {
          result.errors.push({
            index,
            error: '数据项必须包含有效的id、source_id和target_id字段',
            item,
          })
          return
        }

        const isUpdate = this.data.has(item.id)
        const success = this.addItem(item)

        if (success) {
          if (isUpdate) {
            result.updated++
          } else {
            result.added++
          }
        } else {
          result.errors.push({ index, error: '添加数据项失败', item })
        }
      } catch (error) {
        result.errors.push({ index, error: error.message, item })
      }
    })

    return result
  }

  /**
   * 更新数据（自动去重）
   * @param {Array|Object} newData - 新数据
   */
  updateData(newData) {
    if (Array.isArray(newData)) {
      newData.forEach((item) => this.addItem(item))
    } else if (newData && newData.id) {
      this.addItem(newData)
    }
  }

  /**
   * 根据ID快速查找数据
   * @param {string} id - 关系ID
   * @returns {Object|null} 找到的数据项
   */
  findById(id) {
    return this.data.get(id) || null
  }

  /**
   * 根据类型查找数据
   * @param {string} type - 关系类型
   * @returns {Array} 匹配的数据项数组
   */
  findByType(type) {
    const ids = this.typeIndex.get(type) || new Set()
    return Array.from(ids)
      .map((id) => this.data.get(id))
      .filter(Boolean)
  }

  /**
   * 根据状态查找数据
   * @param {string} status - 状态
   * @returns {Array} 匹配的数据项数组
   */
  findByStatus(status) {
    const ids = this.statusIndex.get(status) || new Set()
    return Array.from(ids)
      .map((id) => this.data.get(id))
      .filter(Boolean)
  }

  /**
   * 根据优先级查找数据
   * @param {string} priority - 优先级
   * @returns {Array} 匹配的数据项数组
   */
  findByPriority(priority) {
    const ids = this.priorityIndex.get(priority) || new Set()
    return Array.from(ids)
      .map((id) => this.data.get(id))
      .filter(Boolean)
  }

  /**
   * 根据源目标查找数据
   * @param {string} sourceId - 源目标ID
   * @returns {Array} 匹配的数据项数组
   */
  findBySource(sourceId) {
    const ids = this.sourceIndex.get(sourceId) || new Set()
    return Array.from(ids)
      .map((id) => this.data.get(id))
      .filter(Boolean)
  }

  /**
   * 根据目标查找数据
   * @param {string} targetId - 目标ID
   * @returns {Array} 匹配的数据项数组
   */
  findByTarget(targetId) {
    const ids = this.targetIndex.get(targetId) || new Set()
    return Array.from(ids)
      .map((id) => this.data.get(id))
      .filter(Boolean)
  }

  /**
   * 根据容量查找数据
   * @param {string} capacity - 容量
   * @returns {Array} 匹配的数据项数组
   */
  findByCapacity(capacity) {
    const ids = this.capacityIndex.get(capacity) || new Set()
    return Array.from(ids)
      .map((id) => this.data.get(id))
      .filter(Boolean)
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
   * 删除数据
   * @param {string} id - 要删除的数据ID
   * @returns {boolean} 删除是否成功
   */
  deleteById(id) {
    const item = this.data.get(id)
    if (!item) return false

    // 从主数据中删除
    this.data.delete(id)

    // 从索引中删除
    this._removeFromIndex(this.typeIndex, item.type, id)
    this._removeFromIndex(this.statusIndex, item.status, id)
    this._removeFromIndex(this.priorityIndex, item.priority, id)
    this._removeFromIndex(this.sourceIndex, item.source_id, id)
    this._removeFromIndex(this.targetIndex, item.target_id, id)
    this._removeFromIndex(this.capacityIndex, item.capacity, id)

    return true
  }

  /**
   * 删除与指定目标相关的所有关系
   * @param {string} targetId - 目标ID
   * @returns {number} 删除的关系数量
   */
  deleteByTarget(targetId) {
    const relationsToDelete = this.findRelationsByTarget(targetId)
    let deletedCount = 0

    relationsToDelete.forEach((relation) => {
      if (this.deleteById(relation.id)) {
        deletedCount++
      }
    })

    return deletedCount
  }

  /**
   * 批量删除数据
   * @param {Array} ids - 要删除的ID数组
   * @returns {number} 成功删除的数量
   */
  deleteBatch(ids) {
    let deletedCount = 0
    ids.forEach((id) => {
      if (this.deleteById(id)) {
        deletedCount++
      }
    })
    return deletedCount
  }

  /**
   * 获取所有数据
   * @returns {Array} 所有数据项数组
   */
  getAll() {
    return Array.from(this.data.values())
  }

  /**
   * 获取数据总数
   * @returns {number} 数据总数
   */
  getCount() {
    return this.data.size
  }

  /**
   * 获取所有关系类型
   * @returns {Array} 类型数组
   */
  getAllTypes() {
    return Array.from(this.typeIndex.keys())
  }

  /**
   * 获取所有状态
   * @returns {Array} 状态数组
   */
  getAllStatuses() {
    return Array.from(this.statusIndex.keys())
  }

  /**
   * 获取所有优先级
   * @returns {Array} 优先级数组
   */
  getAllPriorities() {
    return Array.from(this.priorityIndex.keys())
  }

  /**
   * 获取所有容量等级
   * @returns {Array} 容量数组
   */
  getAllCapacities() {
    return Array.from(this.capacityIndex.keys())
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
   * 清空所有数据
   */
  clear() {
    this.data.clear()
    this.typeIndex.clear()
    this.statusIndex.clear()
    this.priorityIndex.clear()
    this.sourceIndex.clear()
    this.targetIndex.clear()
    this.capacityIndex.clear()
  }

  /**
   * 更新索引
   * @private
   */
  _updateIndex(index, key, id) {
    if (!key) return
    if (!index.has(key)) {
      index.set(key, new Set())
    }
    index.get(key).add(id)
  }

  /**
   * 从索引中移除
   * @private
   */
  _removeFromIndex(index, key, id) {
    if (!key || !index.has(key)) return
    const idSet = index.get(key)
    idSet.delete(id)
    if (idSet.size === 0) {
      index.delete(key)
    }
  }

  /**
   * 导出数据为JSON
   * @returns {string} JSON字符串
   */
  exportToJSON() {
    return JSON.stringify(this.getAll(), null, 2)
  }

  /**
   * 从JSON导入数据
   * @param {string} jsonString - JSON字符串
   */
  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      this.setInitialData(data)
      return true
    } catch (error) {
      console.error('导入JSON数据失败:', error)
      return false
    }
  }
}

export default RelationManager
