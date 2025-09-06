/**
 * Mars3D 影像图层类
 * @module layer/ImageryLayer
 */

import * as Cesium from 'cesium';
import { BaseLayer } from './BaseLayer.js';
import { EventType } from '../core/index.js';

/**
 * 影像图层类
 */
export class ImageryLayer extends BaseLayer {
  constructor(options = {}) {
    options.type = 'imagery';
    super(options);
    
    // 影像图层特有属性
    this.url = options.url || '';
    this.layers = options.layers || '';
    this.format = options.format || 'image/png';
    this.tileMatrixSetID = options.tileMatrixSetID || '';
    this.style = options.style || '';
    this.version = options.version || '1.0.0';
    this.crs = options.crs || 'EPSG:4326';
    
    // 瓦片参数
    this.tileSize = options.tileSize || 256;
    this.maximumLevel = options.maximumLevel || 18;
    this.minimumLevel = options.minimumLevel || 0;
    
    // 代理和认证
    this.proxy = options.proxy;
    this.token = options.token;
    this.username = options.username;
    this.password = options.password;
    
    // 自定义参数
    this.customParameters = options.customParameters || {};
    
    // 影像提供者类型
    this.providerType = options.providerType || 'UrlTemplateImageryProvider';
  }

  /**
   * 添加到地图的具体实现
   * @protected
   */
  _addToMap() {
    if (!this._viewer) return;

    // 创建影像提供者
    const imageryProvider = this._createImageryProvider();
    
    if (!imageryProvider) {
      throw new Error('创建影像提供者失败');
    }

    // 创建影像图层
    this._imageryLayer = new Cesium.ImageryLayer(imageryProvider, {
      show: this.show,
      alpha: this.alpha,
      brightness: this.brightness,
      contrast: this.contrast,
      hue: this.hue,
      saturation: this.saturation,
      gamma: this.gamma,
      minimumTerrainLevel: this.minimumLevel,
      maximumTerrainLevel: this.maximumLevel
    });

    // 添加到场景
    this._viewer.imageryLayers.add(this._imageryLayer);
    
    // 设置层级
    if (this.zIndex !== undefined) {
      this._updateZIndex();
    }
  }

  /**
   * 从地图移除的具体实现
   * @protected
   */
  _removeFromMap() {
    if (this._imageryLayer && this._viewer) {
      this._viewer.imageryLayers.remove(this._imageryLayer);
    }
  }

  /**
   * 清理资源
   * @protected
   */
  _cleanup() {
    if (this._imageryLayer) {
      if (this._imageryLayer.imageryProvider && this._imageryLayer.imageryProvider.destroy) {
        this._imageryLayer.imageryProvider.destroy();
      }
      this._imageryLayer = null;
    }
  }

  /**
   * 创建影像提供者
   * @private
   */
  _createImageryProvider() {
    const options = this._getProviderOptions();
    
    switch (this.providerType) {
      case 'UrlTemplateImageryProvider':
        return new Cesium.UrlTemplateImageryProvider(options);
        
      case 'WebMapServiceImageryProvider':
        return new Cesium.WebMapServiceImageryProvider(options);
        
      case 'WebMapTileServiceImageryProvider':
        return new Cesium.WebMapTileServiceImageryProvider(options);
        
      case 'TileMapServiceImageryProvider':
        return new Cesium.TileMapServiceImageryProvider(options);
        
      case 'OpenStreetMapImageryProvider':
        return new Cesium.OpenStreetMapImageryProvider(options);
        
      case 'BingMapsImageryProvider':
        return new Cesium.BingMapsImageryProvider(options);
        
      case 'GoogleEarthEnterpriseMapsProvider':
        return new Cesium.GoogleEarthEnterpriseMapsProvider(options);
        
      case 'ArcGisMapServerImageryProvider':
        return new Cesium.ArcGisMapServerImageryProvider(options);
        
      case 'SingleTileImageryProvider':
        return new Cesium.SingleTileImageryProvider(options);
        
      default:
        throw new Error(`不支持的影像提供者类型: ${this.providerType}`);
    }
  }

  /**
   * 获取提供者选项
   * @private
   */
  _getProviderOptions() {
    const options = {
      url: this.url,
      maximumLevel: this.maximumLevel,
      minimumLevel: this.minimumLevel,
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
      case 'WebMapServiceImageryProvider':
        options.layers = this.layers;
        options.parameters = {
          service: 'WMS',
          format: this.format,
          transparent: true,
          version: this.version,
          ...this.customParameters
        };
        break;
        
      case 'WebMapTileServiceImageryProvider':
        options.layer = this.layers;
        options.style = this.style;
        options.format = this.format;
        options.tileMatrixSetID = this.tileMatrixSetID;
        break;
        
      case 'UrlTemplateImageryProvider':
        options.tileWidth = this.tileSize;
        options.tileHeight = this.tileSize;
        break;
        
      case 'BingMapsImageryProvider':
        options.key = this.token;
        options.mapStyle = this.style || Cesium.BingMapsStyle.AERIAL;
        break;
    }

    return options;
  }

  /**
   * 更新显示状态
   * @protected
   */
  _updateShow() {
    if (this._imageryLayer) {
      this._imageryLayer.show = this.show;
    }
  }

  /**
   * 更新透明度
   * @protected
   */
  _updateAlpha() {
    if (this._imageryLayer) {
      this._imageryLayer.alpha = this.alpha;
    }
  }

  /**
   * 更新亮度
   * @protected
   */
  _updateBrightness() {
    if (this._imageryLayer) {
      this._imageryLayer.brightness = this.brightness;
    }
  }

  /**
   * 更新对比度
   * @protected
   */
  _updateContrast() {
    if (this._imageryLayer) {
      this._imageryLayer.contrast = this.contrast;
    }
  }

  /**
   * 更新色调
   * @protected
   */
  _updateHue() {
    if (this._imageryLayer) {
      this._imageryLayer.hue = this.hue;
    }
  }

  /**
   * 更新饱和度
   * @protected
   */
  _updateSaturation() {
    if (this._imageryLayer) {
      this._imageryLayer.saturation = this.saturation;
    }
  }

  /**
   * 更新伽马值
   * @protected
   */
  _updateGamma() {
    if (this._imageryLayer) {
      this._imageryLayer.gamma = this.gamma;
    }
  }

  /**
   * 更新层级
   * @protected
   */
  _updateZIndex() {
    if (this._imageryLayer && this._viewer) {
      const layers = this._viewer.imageryLayers;
      const currentIndex = layers.indexOf(this._imageryLayer);
      
      if (currentIndex !== -1) {
        // 移动到指定层级
        const targetIndex = Math.min(this.zIndex, layers.length - 1);
        if (currentIndex !== targetIndex) {
          layers.remove(this._imageryLayer, false);
          layers.add(this._imageryLayer, targetIndex);
        }
      }
    }
  }

  /**
   * 获取图层范围
   * @returns {Cesium.Rectangle} 图层范围
   */
  getRectangle() {
    if (this._imageryLayer && this._imageryLayer.imageryProvider) {
      return this._imageryLayer.imageryProvider.rectangle;
    }
    return null;
  }

  /**
   * 设置URL
   * @param {string} url - 新的URL
   */
  setUrl(url) {
    this.url = url;
    
    // 重新创建图层
    if (this._isAdded) {
      this.remove();
      this.addTo(this._viewer);
    }
  }

  /**
   * 设置图层名称
   * @param {string} layers - 图层名称
   */
  setLayers(layers) {
    this.layers = layers;
    
    // 重新创建图层
    if (this._isAdded) {
      this.remove();
      this.addTo(this._viewer);
    }
  }

  /**
   * 设置自定义参数
   * @param {object} parameters - 自定义参数
   */
  setCustomParameters(parameters) {
    this.customParameters = { ...this.customParameters, ...parameters };
    
    // 重新创建图层
    if (this._isAdded) {
      this.remove();
      this.addTo(this._viewer);
    }
  }

  /**
   * 获取瓦片信息
   * @param {number} level - 层级
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {Promise} 瓦片信息
   */
  async getTileInfo(level, x, y) {
    if (!this._imageryLayer || !this._imageryLayer.imageryProvider) {
      return null;
    }

    const provider = this._imageryLayer.imageryProvider;
    
    try {
      const promise = provider.requestImage(x, y, level);
      return await promise;
    } catch (error) {
      console.error('获取瓦片信息失败:', error);
      return null;
    }
  }

  /**
   * 转换为JSON
   * @returns {object} JSON对象
   */
  toJSON() {
    const json = super.toJSON();
    
    // 添加影像图层特有属性
    json.url = this.url;
    json.layers = this.layers;
    json.format = this.format;
    json.tileMatrixSetID = this.tileMatrixSetID;
    json.style = this.style;
    json.version = this.version;
    json.crs = this.crs;
    json.tileSize = this.tileSize;
    json.providerType = this.providerType;
    json.customParameters = this.customParameters;
    
    return json;
  }

  /**
   * 从JSON创建影像图层
   * @param {object} json - JSON对象
   * @returns {ImageryLayer} 影像图层对象
   */
  static fromJSON(json) {
    return new ImageryLayer(json);
  }
}

export default ImageryLayer;