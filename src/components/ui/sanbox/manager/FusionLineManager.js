import BaseManager from './BaseManager.js'

/**
 * 融合线数据管理器
 * 管理融合线数据，支持多种类型的线条和复杂的几何查询
 */
class FusionLineManager extends BaseManager {
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
    this.indexes = new Map([
      ['type', new Map()],
      ['status', new Map()],
      ['priority', new Map()],
      ['layer', new Map()],
      ['source_target', new Map()],
      ['destination_target', new Map()]
    ])
  }

  /**
   * 自定义验证
   * @param {Object} item - 数据项
   * @returns {boolean} 验证是否通过
   * @protected
   */
  customValidation(item) {
    // 验证线条类型
    if (!item.type || typeof item.type !== 'string') {
      console.warn('融合线类型必须是字符串', item)
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
    this._updateIndex(this.indexes.get('layer'), item.layer_id, item.id)
    this._updateIndex(this.indexes.get('source_target'), item.source_id, item.id)
    this._updateIndex(this.indexes.get('destination_target'), item.target_id, item.id)
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
    this._removeFromIndex(this.indexes.get('layer'), item.layer_id, item.id)
    this._removeFromIndex(this.indexes.get('source_target'), item.source_id, item.id)
    this._removeFromIndex(this.indexes.get('destination_target'), item.target_id, item.id)
  }

  /**
   * 根据线条类型查找数据
   * @param {string} type - 线条类型
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
   * 根据图层查找数据
   * @param {string} layerId - 图层ID
   * @returns {Array} 匹配的数据项数组
   */
  findByLayer(layerId) {
    return this.findByIndex('layer', layerId)
  }

  /**
   * 根据源目标查找数据
   * @param {string} sourceTargetId - 源目标ID
   * @returns {Array} 匹配的数据项数组
   */
  findBySourceTarget(sourceTargetId) {
    return this.findByIndex('source_target', sourceTargetId)
  }

  /**
   * 根据目标查找数据
   * @param {string} destinationTargetId - 目标ID
   * @returns {Array} 匹配的数据项数组
   */
  findByDestinationTarget(destinationTargetId) {
    return this.findByIndex('destination_target', destinationTargetId)
  }

  /**
   * 查找与指定目标相关的所有融合线
   * @param {string} targetId - 目标ID
   * @returns {Array} 融合线数组
   */
  findLinesByTarget(targetId) {
    const sourceLines = this.findBySourceTarget(targetId)
    const destinationLines = this.findByDestinationTarget(targetId)

    // 合并并去重
    const allLines = [...sourceLines, ...destinationLines]
    const uniqueLines = allLines.filter(
      (line, index, self) => index === self.findIndex((l) => l.id === line.id),
    )

    return uniqueLines
  }

  /**
   * 查找两个目标之间的融合线
   * @param {string} sourceId - 源目标ID
   * @param {string} destinationId - 目标ID
   * @returns {Array} 融合线数组
   */
  findLinesBetweenTargets(sourceId, destinationId) {
    const results = []

    for (const line of this.data.values()) {
      if (
        (line.source_target_id === sourceId && line.destination_target_id === destinationId) ||
        (line.source_target_id === destinationId && line.destination_target_id === sourceId)
      ) {
        results.push(line)
      }
    }

    return results
  }

  /**
   * 获取所有线条类型
   * @returns {Array} 类型数组
   */
  getAllTypes() {
    return this.getIndexValues('type')
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
        item.name?.toLowerCase().includes(lowerKeyword) ||
        item.description?.toLowerCase().includes(lowerKeyword) ||
        item.type?.toLowerCase().includes(lowerKeyword) ||
        item.status?.toLowerCase().includes(lowerKeyword) ||
        item.priority?.toLowerCase().includes(lowerKeyword) ||
        item.layer_name?.toLowerCase().includes(lowerKeyword)
      ) {
        results.push(item)
      }
    }

    return results
  }

  /**
   * 删除与指定目标相关的所有融合线
   * @param {string} targetId - 目标ID
   * @returns {number} 删除的融合线数量
   */
  deleteByTarget(targetId) {
    const linesToDelete = this.findLinesByTarget(targetId)
    linesToDelete.forEach((line) => {
      this.deleteById(line.id)
    })
    return linesToDelete.length
  }

  /**
   * 获取所有线条类型
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
   * 获取所有图层
   * @returns {Array} 图层数组
   */
  getAllLayers() {
    return this.getIndexValues('layer')
  }

  /**
   * 获取融合线统计信息
   * @returns {Object} 统计信息
   */
  getFusionLineStats() {
    const stats = {
      total: this.data.size,
      byType: {},
      byStatus: {},
      byPriority: {},
      byLayer: {}
    }

    for (const item of this.data.values()) {
      // 按类型统计
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1

      // 按状态统计
      if (item.status) {
        stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1
      }

      // 按优先级统计
      if (item.priority) {
        stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1
      }

      // 按图层统计
      if (item.layer_id) {
        stats.byLayer[item.layer_id] = (stats.byLayer[item.layer_id] || 0) + 1
      }
    }

    return stats
  }
}

export default FusionLineManager