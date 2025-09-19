/**
 * Mars3D 图形模块
 * @module graphic
 */

// 图形类型定义
export { GraphicType, GraphicTypeUtil } from './GraphicType.js';

// 基础图形实体
export { BaseEntity } from './BaseEntity.js';
export { PointEntity } from './PointEntity.js';
export { PolylineEntity } from './PolylineEntity.js';
export { PolygonEntity } from './PolygonEntity.js';

// 导入用于默认导出
import { BaseEntity } from './BaseEntity.js';
import { PointEntity } from './PointEntity.js';
import { PolylineEntity } from './PolylineEntity.js';
import { PolygonEntity } from './PolygonEntity.js';

// 图形工厂类
export class GraphicFactory {
  /**
   * 创建图形实体
   * @param {string} type - 图形类型
   * @param {object} options - 配置选项
   * @returns {BaseEntity} 图形实体
   */
  static create(type, options = {}) {
    switch (type) {
      case 'point':
        return new PointEntity(options);
      case 'polyline':
        return new PolylineEntity(options);
      case 'polygon':
        return new PolygonEntity(options);
      default:
        throw new Error(`不支持的图形类型: ${type}`);
    }
  }

  /**
   * 从JSON创建图形实体
   * @param {object} json - JSON对象
   * @returns {BaseEntity} 图形实体
   */
  static fromJSON(json) {
    if (!json || !json.type) {
      throw new Error('无效的JSON数据');
    }

    switch (json.type) {
      case 'point':
        return PointEntity.fromJSON(json);
      case 'polyline':
        return PolylineEntity.fromJSON(json);
      case 'polygon':
        return PolygonEntity.fromJSON(json);
      default:
        throw new Error(`不支持的图形类型: ${json.type}`);
    }
  }

  /**
   * 获取支持的图形类型列表
   * @returns {string[]} 图形类型数组
   */
  static getSupportedTypes() {
    return ['point', 'polyline', 'polygon'];
  }
}

// 图形管理器
export class GraphicManager {
  constructor() {
    this._graphics = new Map();
    this._viewer = null;
  }

  /**
   * 设置Cesium Viewer
   * @param {Cesium.Viewer} viewer - Cesium Viewer实例
   */
  setViewer(viewer) {
    this._viewer = viewer;
  }

  /**
   * 添加图形
   * @param {BaseEntity} graphic - 图形实体
   */
  add(graphic) {
    if (!graphic || !graphic.id) {
      throw new Error('无效的图形对象');
    }

    if (this._graphics.has(graphic.id)) {
      console.warn(`图形ID已存在: ${graphic.id}`);
      return;
    }

    this._graphics.set(graphic.id, graphic);

    // 添加到Cesium场景
    if (this._viewer && graphic.entity) {
      this._viewer.entities.add(graphic.entity);
    }
  }

  /**
   * 移除图形
   * @param {string|BaseEntity} graphic - 图形ID或图形实体
   */
  remove(graphic) {
    const id = typeof graphic === 'string' ? graphic : graphic.id;
    const entity = this._graphics.get(id);

    if (!entity) {
      console.warn(`图形不存在: ${id}`);
      return;
    }

    // 从Cesium场景移除
    if (this._viewer && entity.entity) {
      this._viewer.entities.remove(entity.entity);
    }

    // 销毁图形
    entity.destroy();
    this._graphics.delete(id);
  }

  /**
   * 获取图形
   * @param {string} id - 图形ID
   * @returns {BaseEntity} 图形实体
   */
  get(id) {
    return this._graphics.get(id);
  }

  /**
   * 获取所有图形
   * @returns {BaseEntity[]} 图形实体数组
   */
  getAll() {
    return Array.from(this._graphics.values());
  }

  /**
   * 根据类型获取图形
   * @param {string} type - 图形类型
   * @returns {BaseEntity[]} 图形实体数组
   */
  getByType(type) {
    return this.getAll().filter(graphic => graphic.type === type);
  }

  /**
   * 清空所有图形
   */
  clear() {
    this.getAll().forEach(graphic => {
      this.remove(graphic);
    });
  }

  /**
   * 显示所有图形
   */
  show() {
    this.getAll().forEach(graphic => {
      graphic.show = true;
    });
  }

  /**
   * 隐藏所有图形
   */
  hide() {
    this.getAll().forEach(graphic => {
      graphic.show = false;
    });
  }

  /**
   * 获取图形数量
   * @returns {number} 图形数量
   */
  getCount() {
    return this._graphics.size;
  }

  /**
   * 检查图形是否存在
   * @param {string} id - 图形ID
   * @returns {boolean} 是否存在
   */
  has(id) {
    return this._graphics.has(id);
  }

  /**
   * 导出所有图形为JSON
   * @returns {object[]} JSON数组
   */
  toJSON() {
    return this.getAll().map(graphic => graphic.toJSON());
  }

  /**
   * 从JSON数组导入图形
   * @param {object[]} jsonArray - JSON数组
   */
  fromJSON(jsonArray) {
    if (!Array.isArray(jsonArray)) {
      throw new Error('参数必须是数组');
    }

    jsonArray.forEach(json => {
      try {
        const graphic = GraphicFactory.fromJSON(json);
        this.add(graphic);
      } catch (error) {
        console.error('导入图形失败:', error, json);
      }
    });
  }
}

// 默认导出
export default {
  BaseEntity,
  PointEntity,
  PolylineEntity,
  PolygonEntity,
  GraphicFactory,
  GraphicManager
};