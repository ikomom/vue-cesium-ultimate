/**
 * 目标基础数据管理器
 * 管理目标的基础信息，包括名称、类型、描述、状态等
 */
class TargetBaseManager {
  constructor() {
    this.data = new Map() // 使用Map进行快速查找
    this.typeIndex = new Map() // 按类型索引
    this.statusIndex = new Map() // 按状态索引
    this.operatorIndex = new Map() // 按运营方索引
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
    if (!item || !item.id) {
      console.error('添加目标基础数据项失败：缺少必要字段', item)
      return false
    }

    this.data.set(item.id, { ...item })

    // 更新索引
    this._updateIndex(this.typeIndex, item.type, item.id)
    this._updateIndex(this.statusIndex, item.status, item.id)
    this._updateIndex(this.operatorIndex, item.operator, item.id)

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
        if (!item || !item.id) {
          result.errors.push({ index, error: '数据项必须包含有效的id字段', item })
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
   * @param {string} id - 目标ID
   * @returns {Object|null} 找到的数据项
   */
  findById(id) {
    return this.data.get(id) || null
  }

  /**
   * 根据类型查找数据
   * @param {string} type - 目标类型
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
   * 根据运营方查找数据
   * @param {string} operator - 运营方
   * @returns {Array} 匹配的数据项数组
   */
  findByOperator(operator) {
    const ids = this.operatorIndex.get(operator) || new Set()
    return Array.from(ids)
      .map((id) => this.data.get(id))
      .filter(Boolean)
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
        item.type?.toLowerCase().includes(lowerKeyword) ||
        item.description?.toLowerCase().includes(lowerKeyword) ||
        item.operator?.toLowerCase().includes(lowerKeyword)
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
    this._removeFromIndex(this.operatorIndex, item.operator, id)

    return true
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
   * 获取所有类型
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
   * 获取所有运营方
   * @returns {Array} 运营方数组
   */
  getAllOperators() {
    return Array.from(this.operatorIndex.keys())
  }

  /**
   * 清空所有数据
   */
  clear() {
    this.data.clear()
    this.typeIndex.clear()
    this.statusIndex.clear()
    this.operatorIndex.clear()
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

export default TargetBaseManager
