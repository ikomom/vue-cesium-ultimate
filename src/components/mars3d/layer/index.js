/**
 * Mars3D 图层模块
 * @module layer
 */

// 图层类型定义
export { LayerType, LayerTypeUtil } from './LayerType.js';

// 基础图层类
export { BaseLayer } from './BaseLayer.js';
export { ImageryLayer } from './ImageryLayer.js';
export { TerrainLayer } from './TerrainLayer.js';

// 导入用于默认导出
import { BaseLayer } from './BaseLayer.js';
import { ImageryLayer } from './ImageryLayer.js';
import { TerrainLayer } from './TerrainLayer.js';

// 图层工厂类
export class LayerFactory {
  /**
   * 创建图层
   * @param {string} type - 图层类型
   * @param {object} options - 配置选项
   * @returns {BaseLayer} 图层实例
   */
  static create(type, options = {}) {
    switch (type) {
      case 'imagery':
        return new ImageryLayer(options);
      case 'terrain':
        return new TerrainLayer(options);
      default:
        throw new Error(`不支持的图层类型: ${type}`);
    }
  }

  /**
   * 从JSON创建图层
   * @param {object} json - JSON对象
   * @returns {BaseLayer} 图层实例
   */
  static fromJSON(json) {
    if (!json || !json.type) {
      throw new Error('无效的JSON数据');
    }

    switch (json.type) {
      case 'imagery':
        return ImageryLayer.fromJSON(json);
      case 'terrain':
        return TerrainLayer.fromJSON(json);
      default:
        throw new Error(`不支持的图层类型: ${json.type}`);
    }
  }

  /**
   * 获取支持的图层类型列表
   * @returns {string[]} 图层类型数组
   */
  static getSupportedTypes() {
    return ['imagery', 'terrain'];
  }
}

// 图层管理器
export class LayerManager {
  constructor() {
    this._layers = new Map();
    this._viewer = null;
    this._layerOrder = [];
  }

  /**
   * 设置Cesium Viewer
   * @param {Cesium.Viewer} viewer - Cesium Viewer实例
   */
  setViewer(viewer) {
    this._viewer = viewer;
  }

  /**
   * 添加图层
   * @param {BaseLayer} layer - 图层实例
   * @param {number} index - 插入位置，不传则添加到末尾
   */
  add(layer, index) {
    if (!layer || !layer.id) {
      throw new Error('无效的图层对象');
    }

    if (this._layers.has(layer.id)) {
      console.warn(`图层ID已存在: ${layer.id}`);
      return;
    }

    // 添加到集合
    this._layers.set(layer.id, layer);
    
    // 管理图层顺序
    if (index !== undefined && index >= 0 && index <= this._layerOrder.length) {
      this._layerOrder.splice(index, 0, layer.id);
    } else {
      this._layerOrder.push(layer.id);
    }

    // 添加到Cesium场景
    if (this._viewer) {
      layer.addTo(this._viewer);
    }

    // 更新图层顺序
    this._updateLayerOrder();
  }

  /**
   * 移除图层
   * @param {string|BaseLayer} layer - 图层ID或图层实例
   */
  remove(layer) {
    const id = typeof layer === 'string' ? layer : layer.id;
    const layerInstance = this._layers.get(id);

    if (!layerInstance) {
      console.warn(`图层不存在: ${id}`);
      return;
    }

    // 从Cesium场景移除
    layerInstance.remove();
    
    // 销毁图层
    layerInstance.destroy();
    
    // 从集合移除
    this._layers.delete(id);
    
    // 从顺序数组移除
    const orderIndex = this._layerOrder.indexOf(id);
    if (orderIndex !== -1) {
      this._layerOrder.splice(orderIndex, 1);
    }
  }

  /**
   * 获取图层
   * @param {string} id - 图层ID
   * @returns {BaseLayer} 图层实例
   */
  get(id) {
    return this._layers.get(id);
  }

  /**
   * 获取所有图层
   * @returns {BaseLayer[]} 图层实例数组
   */
  getAll() {
    return this._layerOrder.map(id => this._layers.get(id)).filter(Boolean);
  }

  /**
   * 根据类型获取图层
   * @param {string} type - 图层类型
   * @returns {BaseLayer[]} 图层实例数组
   */
  getByType(type) {
    return this.getAll().filter(layer => layer.type === type);
  }

  /**
   * 根据名称获取图层
   * @param {string} name - 图层名称
   * @returns {BaseLayer[]} 图层实例数组
   */
  getByName(name) {
    return this.getAll().filter(layer => layer.name === name);
  }

  /**
   * 清空所有图层
   */
  clear() {
    this.getAll().forEach(layer => {
      this.remove(layer);
    });
  }

  /**
   * 显示所有图层
   */
  show() {
    this.getAll().forEach(layer => {
      layer.showLayer();
    });
  }

  /**
   * 隐藏所有图层
   */
  hide() {
    this.getAll().forEach(layer => {
      layer.hideLayer();
    });
  }

  /**
   * 移动图层到指定位置
   * @param {string|BaseLayer} layer - 图层ID或图层实例
   * @param {number} index - 目标位置
   */
  moveToIndex(layer, index) {
    const id = typeof layer === 'string' ? layer : layer.id;
    const currentIndex = this._layerOrder.indexOf(id);
    
    if (currentIndex === -1) {
      console.warn(`图层不存在: ${id}`);
      return;
    }

    // 移动图层顺序
    this._layerOrder.splice(currentIndex, 1);
    this._layerOrder.splice(index, 0, id);
    
    // 更新Cesium图层顺序
    this._updateLayerOrder();
  }

  /**
   * 上移图层
   * @param {string|BaseLayer} layer - 图层ID或图层实例
   */
  moveUp(layer) {
    const id = typeof layer === 'string' ? layer : layer.id;
    const currentIndex = this._layerOrder.indexOf(id);
    
    if (currentIndex > 0) {
      this.moveToIndex(id, currentIndex - 1);
    }
  }

  /**
   * 下移图层
   * @param {string|BaseLayer} layer - 图层ID或图层实例
   */
  moveDown(layer) {
    const id = typeof layer === 'string' ? layer : layer.id;
    const currentIndex = this._layerOrder.indexOf(id);
    
    if (currentIndex !== -1 && currentIndex < this._layerOrder.length - 1) {
      this.moveToIndex(id, currentIndex + 1);
    }
  }

  /**
   * 置顶图层
   * @param {string|BaseLayer} layer - 图层ID或图层实例
   */
  moveToTop(layer) {
    this.moveToIndex(layer, 0);
  }

  /**
   * 置底图层
   * @param {string|BaseLayer} layer - 图层ID或图层实例
   */
  moveToBottom(layer) {
    this.moveToIndex(layer, this._layerOrder.length - 1);
  }

  /**
   * 获取图层数量
   * @returns {number} 图层数量
   */
  getCount() {
    return this._layers.size;
  }

  /**
   * 检查图层是否存在
   * @param {string} id - 图层ID
   * @returns {boolean} 是否存在
   */
  has(id) {
    return this._layers.has(id);
  }

  /**
   * 获取图层索引
   * @param {string|BaseLayer} layer - 图层ID或图层实例
   * @returns {number} 图层索引，不存在返回-1
   */
  getIndex(layer) {
    const id = typeof layer === 'string' ? layer : layer.id;
    return this._layerOrder.indexOf(id);
  }

  /**
   * 更新图层顺序
   * @private
   */
  _updateLayerOrder() {
    if (!this._viewer) return;

    // 对于影像图层，需要重新排序
    const imageryLayers = this.getByType('imagery');
    imageryLayers.forEach((layer, index) => {
      if (layer._imageryLayer) {
        const cesiumLayers = this._viewer.imageryLayers;
        const currentIndex = cesiumLayers.indexOf(layer._imageryLayer);
        const targetIndex = this._layerOrder.indexOf(layer.id);
        
        if (currentIndex !== -1 && currentIndex !== targetIndex) {
          cesiumLayers.remove(layer._imageryLayer, false);
          cesiumLayers.add(layer._imageryLayer, targetIndex);
        }
      }
    });
  }

  /**
   * 导出所有图层为JSON
   * @returns {object[]} JSON数组
   */
  toJSON() {
    return this.getAll().map(layer => layer.toJSON());
  }

  /**
   * 从JSON数组导入图层
   * @param {object[]} jsonArray - JSON数组
   */
  fromJSON(jsonArray) {
    if (!Array.isArray(jsonArray)) {
      throw new Error('参数必须是数组');
    }

    jsonArray.forEach(json => {
      try {
        const layer = LayerFactory.fromJSON(json);
        this.add(layer);
      } catch (error) {
        console.error('导入图层失败:', error, json);
      }
    });
  }

  /**
   * 根据可见性过滤图层
   * @param {boolean} visible - 是否可见
   * @returns {BaseLayer[]} 过滤后的图层数组
   */
  getByVisibility(visible) {
    return this.getAll().filter(layer => layer.show === visible);
  }

  /**
   * 设置所有图层的透明度
   * @param {number} alpha - 透明度 (0-1)
   */
  setAlphaForAll(alpha) {
    this.getAll().forEach(layer => {
      layer.setAlpha(alpha);
    });
  }
}

// 默认导出
export default {
  BaseLayer,
  ImageryLayer,
  TerrainLayer,
  LayerFactory,
  LayerManager
};