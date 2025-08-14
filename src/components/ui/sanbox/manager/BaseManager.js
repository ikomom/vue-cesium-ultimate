/**
 * 通用数据管理器基类
 * 提供数据管理的通用功能，包括增删改查、索引管理、数据导入导出等
 */
class BaseManager {
  constructor() {
    this.data = new Map() // 使用Map进行快速查找
    this.indexes = new Map() // 存储所有索引
    this.requiredFields = ['id'] // 子类可以重写此字段
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
   * 验证数据项是否有效
   * @param {Object} item - 数据项
   * @returns {boolean} 是否有效
   */
  validateItem(item) {
    if (!item) return false

    // 检查必需字段
    for (const field of this.requiredFields) {
      if (!item[field]) {
        console.error(`数据项缺少必要字段 ${field}:`, item)
        return false
      }
    }

    // 子类可以重写此方法添加额外验证
    return this.customValidation(item)
  }

  /**
   * 自定义验证逻辑（子类重写）
   * @param {Object} item - 数据项
   * @returns {boolean} 是否有效
   */
  customValidation(item) {
    return true
  }

  /**
   * 添加单个数据项
   * @param {Object} item - 数据项
   * @returns {boolean} 是否成功
   */
  addItem(item) {
    if (!this.validateItem(item)) {
      return false
    }

    const clonedItem = { ...item }
    this.data.set(item.id, clonedItem)

    // 更新所有索引
    this.updateIndexes(clonedItem)

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
        if (!this.validateItem(item)) {
          result.errors.push({
            index,
            error: '数据项验证失败',
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
      this.addItems(newData)
    } else if (newData && newData.id) {
      this.addItem(newData)
    }
  }

  /**
   * 根据ID查找数据项
   * @param {string} id - 数据项ID
   * @returns {Object|null} 数据项
   */
  findById(id) {
    return this.data.get(id) || null
  }

  /**
   * 根据索引字段查找数据项
   * @param {string} indexName - 索引名称
   * @param {*} value - 索引值
   * @returns {Array} 匹配的数据项数组
   */
  findByIndex(indexName, value) {
    const index = this.indexes.get(indexName)
    if (!index || !index.has(value)) {
      return []
    }

    const ids = index.get(value)
    return Array.from(ids)
      .map((id) => this.data.get(id))
      .filter(Boolean)
  }

  /**
   * 搜索数据项
   * @param {string} keyword - 搜索关键词
   * @returns {Array} 匹配的数据项数组
   */
  search(keyword) {
    if (!keyword) return []

    const results = []
    const lowerKeyword = keyword.toLowerCase()

    for (const item of this.data.values()) {
      if (this.matchesKeyword(item, lowerKeyword)) {
        results.push(item)
      }
    }

    return results
  }

  /**
   * 检查数据项是否匹配关键词（子类可重写）
   * @param {Object} item - 数据项
   * @param {string} keyword - 关键词（已转小写）
   * @returns {boolean} 是否匹配
   */
  matchesKeyword(item, keyword) {
    // 默认搜索所有字符串字段
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === 'string' && value.toLowerCase().includes(keyword)) {
        return true
      }
    }
    return false
  }

  /**
   * 根据ID删除数据项
   * @param {string} id - 数据项ID
   * @returns {boolean} 是否成功删除
   */
  deleteById(id) {
    const item = this.data.get(id)
    if (!item) {
      return false
    }

    this.data.delete(id)
    this.removeFromIndexes(item)
    return true
  }

  /**
   * 批量删除数据项
   * @param {Array} ids - ID数组
   * @returns {Object} 删除结果统计
   */
  deleteBatch(ids) {
    const result = { deleted: 0, notFound: 0 }

    ids.forEach((id) => {
      if (this.deleteById(id)) {
        result.deleted++
      } else {
        result.notFound++
      }
    })

    return result
  }

  /**
   * 获取所有数据项
   * @returns {Array} 所有数据项
   */
  getAll() {
    return Array.from(this.data.values())
  }

  /**
   * 获取数据项数量
   * @returns {number} 数据项数量
   */
  getCount() {
    return this.data.size
  }

  /**
   * 获取索引的所有值
   * @param {string} indexName - 索引名称
   * @returns {Array} 索引值数组
   */
  getIndexValues(indexName) {
    const index = this.indexes.get(indexName)
    return index ? Array.from(index.keys()) : []
  }

  /**
   * 清空所有数据
   */
  clear() {
    this.data.clear()
    this.indexes.clear()
    this.initializeIndexes()
  }

  /**
   * 初始化索引（子类重写）
   */
  initializeIndexes() {
    // 子类重写此方法来定义需要的索引
  }

  /**
   * 更新索引
   * @param {Object} item - 数据项
   */
  updateIndexes(item) {
    // 子类重写此方法来更新特定索引
  }

  /**
   * 从索引中移除数据项
   * @param {Object} item - 数据项
   */
  removeFromIndexes(item) {
    // 子类重写此方法来从特定索引中移除
  }

  /**
   * 更新单个索引
   * @param {string} indexName - 索引名称
   * @param {*} key - 索引键
   * @param {string} id - 数据项ID
   */
  _updateIndex(indexName, key, id) {
    if (!key) return

    let index = this.indexes.get(indexName)
    if (!index) {
      index = new Map()
      this.indexes.set(indexName, index)
    }

    if (!index.has(key)) {
      index.set(key, new Set())
    }
    index.get(key).add(id)
  }

  /**
   * 从单个索引中移除
   * @param {string} indexName - 索引名称
   * @param {*} key - 索引键
   * @param {string} id - 数据项ID
   */
  _removeFromIndex(indexName, key, id) {
    if (!key) return

    const index = this.indexes.get(indexName)
    if (!index || !index.has(key)) return

    const idSet = index.get(key)
    idSet.delete(id)

    if (idSet.size === 0) {
      index.delete(key)
    }
  }

  /**
   * 导出为JSON字符串
   * @returns {string} JSON字符串
   */
  exportToJSON() {
    const dataArray = Array.from(this.data.values())
    return JSON.stringify(dataArray, null, 2)
  }

  /**
   * 从JSON字符串导入数据
   * @param {string} jsonString - JSON字符串
   * @returns {Object} 导入结果
   */
  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      return this.addItems(data)
    } catch (error) {
      throw new Error(`JSON解析失败: ${error.message}`)
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const stats = {
      total: this.getCount(),
      indexes: {},
    }

    // 添加索引统计
    for (const [indexName, index] of this.indexes) {
      stats.indexes[indexName] = index.size
    }

    return stats
  }
}

export default BaseManager
