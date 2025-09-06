/**
 * Mars3D 地形图层类
 * @module layer/TerrainLayer
 */

import * as Cesium from 'cesium';
import { BaseLayer } from './BaseLayer.js';
import { EventType } from '../core/index.js';

/**
 * 地形图层类
 */
export class TerrainLayer extends BaseLayer {
  constructor(options = {}) {
    options.type = 'terrain';
    super(options);

    // 地形图层特有属性
    this.url = options.url || '';
    this.requestVertexNormals = options.requestVertexNormals !== false;
    this.requestWaterMask = options.requestWaterMask !== false;
    this.requestMetadata = options.requestMetadata !== false;

    // 地形提供者类型
    this.providerType = options.providerType || 'CesiumTerrainProvider';

    // 代理和认证
    this.proxy = options.proxy;
    this.token = options.token;
    this.username = options.username;
    this.password = options.password;

    // 自定义参数
    this.customParameters = options.customParameters || {};

    // 地形夸张系数
    this.terrainExaggeration = options.terrainExaggeration || 1.0;
    this.terrainExaggerationRelativeHeight = options.terrainExaggerationRelativeHeight || 0.0;
  }

  /**
   * 添加到地图的具体实现
   * @protected
   */
  async _addToMap() {
    if (!this._viewer) return;

    try {
      // 创建地形提供者
      const terrainProvider = await this._createTerrainProvider();

      if (!terrainProvider) {
        throw new Error('创建地形提供者失败');
      }

      // 设置地形提供者
      this._viewer.terrainProvider = terrainProvider;
      this._terrainProvider = terrainProvider;

      // 设置地形夸张
      if (this.terrainExaggeration !== 1.0) {
        this._viewer.scene.globe.terrainExaggeration = this.terrainExaggeration;
        this._viewer.scene.globe.terrainExaggerationRelativeHeight = this.terrainExaggerationRelativeHeight;
      }

    } catch (error) {
      console.error('添加地形图层失败:', error);
      throw error;
    }
  }

  /**
   * 从地图移除的具体实现
   * @protected
   */
  _removeFromMap() {
    if (this._viewer) {
      // 恢复默认地形
      this._viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();

      // 恢复地形夸张
      this._viewer.scene.globe.terrainExaggeration = 1.0;
      this._viewer.scene.globe.terrainExaggerationRelativeHeight = 0.0;
    }
  }

  /**
   * 清理资源
   * @protected
   */
  _cleanup() {
    if (this._terrainProvider) {
      // Cesium地形提供者通常不需要手动销毁
      this._terrainProvider = null;
    }
  }

  /**
   * 创建地形提供者
   * @private
   */
  async _createTerrainProvider() {
    const options = this._getProviderOptions();

    switch (this.providerType) {
      case 'CesiumTerrainProvider':
        return await Cesium.CesiumTerrainProvider.fromUrl(this.url, options);

      case 'ArcGISTiledElevationTerrainProvider':
        return await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(this.url, options);

      case 'GoogleEarthEnterpriseTerrainProvider':
        return await Cesium.GoogleEarthEnterpriseTerrainProvider.fromUrl(this.url, options);

      case 'VRTheWorldTerrainProvider':
        return new Cesium.VRTheWorldTerrainProvider(options);

      case 'EllipsoidTerrainProvider':
        return new Cesium.EllipsoidTerrainProvider(options);

      default:
        throw new Error(`不支持的地形提供者类型: ${this.providerType}`);
    }
  }

  /**
   * 获取提供者选项
   * @private
   */
  _getProviderOptions() {
    const options = {
      ...this.customParameters
    };

    // 添加代理
    
    if (this.proxy) {
      options.proxy = new Cesium.DefaultProxy(this.proxy);
    }

    // 添加认证
    if (this.token) {
      options.token = this.token;
    }

    if (this.username && this.password) {
      options.username = this.username;
      options.password = this.password;
    }

    // 根据提供者类型添加特定选项
    switch (this.providerType) {
      case 'CesiumTerrainProvider':
        options.requestVertexNormals = this.requestVertexNormals;
        options.requestWaterMask = this.requestWaterMask;
        options.requestMetadata = this.requestMetadata;
        break;

      case 'ArcGISTiledElevationTerrainProvider':
        options.token = this.token;
        break;

      case 'VRTheWorldTerrainProvider':
        options.url = this.url;
        break;
    }

    return options;
  }

  /**
   * 更新显示状态
   * @protected
   */
  _updateShow() {
    if (this._viewer) {
      this._viewer.scene.globe.show = this.show;
    }
  }

  /**
   * 设置地形夸张系数
   * @param {number} exaggeration - 夸张系数
   * @param {number} relativeHeight - 相对高度
   */
  setTerrainExaggeration(exaggeration, relativeHeight = 0.0) {
    this.terrainExaggeration = exaggeration;
    this.terrainExaggerationRelativeHeight = relativeHeight;

    if (this._viewer && this._isAdded) {
      this._viewer.scene.globe.terrainExaggeration = exaggeration;
      this._viewer.scene.globe.terrainExaggerationRelativeHeight = relativeHeight;
    }

    this.fire(EventType.change, {
      property: 'terrainExaggeration',
      value: exaggeration,
      relativeHeight: relativeHeight,
      layer: this
    });
  }

  /**
   * 获取指定位置的高程
   * @param {Cesium.Cartographic} position - 位置（弧度）
   * @returns {Promise<number>} 高程值
   */
  async getHeight(position) {
    if (!this._terrainProvider) {
      return 0;
    }

    try {
      const heights = await Cesium.sampleTerrain(this._terrainProvider, 11, [position]);
      return heights[0].height || 0;
    } catch (error) {
      console.error('获取高程失败:', error);
      return 0;
    }
  }

  /**
   * 批量获取高程
   * @param {Cesium.Cartographic[]} positions - 位置数组
   * @param {number} level - 采样级别
   * @returns {Promise<Cesium.Cartographic[]>} 带高程的位置数组
   */
  async getHeights(positions, level = 11) {
    if (!this._terrainProvider || !positions || positions.length === 0) {
      return positions;
    }

    try {
      return await Cesium.sampleTerrain(this._terrainProvider, level, positions);
    } catch (error) {
      console.error('批量获取高程失败:', error);
      return positions;
    }
  }

  /**
   * 获取最高精度的高程
   * @param {Cesium.Cartographic[]} positions - 位置数组
   * @returns {Promise<Cesium.Cartographic[]>} 带高程的位置数组
   */
  async getHeightsAtMaxLevel(positions) {
    if (!this._terrainProvider || !positions || positions.length === 0) {
      return positions;
    }

    try {
      return await Cesium.sampleTerrainMostDetailed(this._terrainProvider, positions);
    } catch (error) {
      console.error('获取最高精度高程失败:', error);
      return positions;
    }
  }

  /**
   * 获取地形可用性
   * @returns {Cesium.TileAvailability} 地形可用性
   */
  getAvailability() {
    if (this._terrainProvider && this._terrainProvider.availability) {
      return this._terrainProvider.availability;
    }
    return null;
  }

  /**
   * 获取地形信息
   * @returns {object} 地形信息
   */
  getTerrainInfo() {
    if (!this._terrainProvider) {
      return null;
    }

    return {
      ready: this._terrainProvider.ready,
      hasWaterMask: this._terrainProvider.hasWaterMask,
      hasVertexNormals: this._terrainProvider.hasVertexNormals,
      hasMetadata: this._terrainProvider.hasMetadata,
      tilingScheme: this._terrainProvider.tilingScheme,
      credit: this._terrainProvider.credit
    };
  }

  /**
   * 设置URL
   * @param {string} url - 新的URL
   */
  async setUrl(url) {
    this.url = url;

    // 重新创建图层
    if (this._isAdded) {
      this.remove();
      await this.addTo(this._viewer);
    }
  }

  /**
   * 转换为JSON
   * @returns {object} JSON对象
   */
  toJSON() {
    const json = super.toJSON();

    // 添加地形图层特有属性
    json.url = this.url;
    json.requestVertexNormals = this.requestVertexNormals;
    json.requestWaterMask = this.requestWaterMask;
    json.requestMetadata = this.requestMetadata;
    json.providerType = this.providerType;
    json.terrainExaggeration = this.terrainExaggeration;
    json.terrainExaggerationRelativeHeight = this.terrainExaggerationRelativeHeight;
    json.customParameters = this.customParameters;

    return json;
  }

  /**
   * 从JSON创建地形图层
   * @param {object} json - JSON对象
   * @returns {TerrainLayer} 地形图层对象
   */
  static fromJSON(json) {
    return new TerrainLayer(json);
  }
}

export default TerrainLayer;
