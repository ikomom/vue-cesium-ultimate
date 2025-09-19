/**
 * Mars3D 主入口文件
 * @module mars3d
 * @version 3.8.0
 * @author 火星科技 mars3d.cn
 * @description Mars3D三维地球平台 - ES6模块化版本
 */

import * as Cesium from 'cesium';

// 导入核心模块
export * from './core/index.js';

// 导入图形模块
export * from './graphic/index.js';

// 导入图层模块
export * from './layer/index.js';

// 导入具体类
import { 
  EventType, 
  GraphicType, 
  LayerType, 
  DEFAULT_STYLES, 
  DEFAULT_CONFIG,
  Util,
  PointUtil,
  FormatUtil,
  ColorUtil
} from './core/index.js';

import {
  BaseEntity,
  PointEntity,
  PolylineEntity,
  PolygonEntity,
  GraphicFactory,
  GraphicManager
} from './graphic/index.js';

import {
  BaseLayer,
  ImageryLayer,
  TerrainLayer,
  LayerFactory,
  LayerManager
} from './layer/index.js';

/**
 * Mars3D 主类
 */
export class Mars3D {
  constructor() {
    this.version = '3.8.0';
    this.author = '火星科技 mars3d.cn';
    this.website = 'http://mars3d.cn';
    this.updateTime = '2024-01-15';
    
    // 初始化Cesium扩展
    this._initCesiumExtensions();
  }

  /**
   * 初始化Cesium扩展
   * @private
   */
  _initCesiumExtensions() {
    // 扩展Cesium命名空间
    if (typeof window !== 'undefined' && window.Cesium) {
      // 添加Mars3D到Cesium命名空间
      window.Cesium.Mars3D = this;
    }

    // 设置Cesium默认配置
    if (Cesium.Ion) {
      // 可以在这里设置默认的Ion访问令牌
      // Cesium.Ion.defaultAccessToken = 'your-token-here';
    }

    // 扩展Cesium.Viewer原型
    if (Cesium.Viewer && Cesium.Viewer.prototype) {
      // 添加Mars3D相关方法到Viewer
      Cesium.Viewer.prototype.mars3d = {
        graphicManager: null,
        layerManager: null,
        
        // 初始化Mars3D管理器
        init: function() {
          this.graphicManager = new GraphicManager();
          this.graphicManager.setViewer(this);
          
          this.layerManager = new LayerManager();
          this.layerManager.setViewer(this);
          
          return this;
        }
      };
    }
  }

  /**
   * 创建地图实例
   * @param {string|HTMLElement} container - 容器ID或DOM元素
   * @param {object} options - 配置选项
   * @returns {Cesium.Viewer} Cesium Viewer实例
   */
  static createMap(container, options = {}) {
    // 合并默认配置
    const config = {
      ...DEFAULT_CONFIG.map,
      ...options
    };

    // 创建Cesium Viewer
    const viewer = new Cesium.Viewer(container, config);
    
    // 初始化Mars3D功能
    if (viewer.mars3d) {
      viewer.mars3d.init.call(viewer);
    }

    return viewer;
  }

  /**
   * 获取版本信息
   * @returns {object} 版本信息
   */
  static getVersion() {
    return {
      version: '3.8.0',
      author: '火星科技 mars3d.cn',
      website: 'http://mars3d.cn',
      updateTime: '2024-01-15'
    };
  }

  /**
   * 检查Cesium是否可用
   * @returns {boolean} 是否可用
   */
  static isCesiumAvailable() {
    return typeof Cesium !== 'undefined' && Cesium.Viewer;
  }

  /**
   * 设置全局配置
   * @param {object} config - 配置对象
   */
  static setGlobalConfig(config) {
    if (config.cesiumPath) {
      // 设置Cesium路径
      if (typeof window !== 'undefined') {
        window.CESIUM_BASE_URL = config.cesiumPath;
      }
    }

    if (config.ionToken) {
      // 设置Ion访问令牌
      if (Cesium.Ion) {
        Cesium.Ion.defaultAccessToken = config.ionToken;
      }
    }

    if (config.defaultStyles) {
      // 合并默认样式
      Object.assign(DEFAULT_STYLES, config.defaultStyles);
    }
  }
}

// 创建全局实例
const mars3d = new Mars3D();

// 静态方法和属性
mars3d.EventType = EventType;
mars3d.GraphicType = GraphicType;
mars3d.LayerType = LayerType;
mars3d.DEFAULT_STYLES = DEFAULT_STYLES;
mars3d.DEFAULT_CONFIG = DEFAULT_CONFIG;

// 工具类
mars3d.Util = Util;
mars3d.PointUtil = PointUtil;
mars3d.FormatUtil = FormatUtil;
mars3d.ColorUtil = ColorUtil;

// 图形类
mars3d.BaseEntity = BaseEntity;
mars3d.PointEntity = PointEntity;
mars3d.PolylineEntity = PolylineEntity;
mars3d.PolygonEntity = PolygonEntity;
mars3d.GraphicFactory = GraphicFactory;
mars3d.GraphicManager = GraphicManager;

// 图层类
mars3d.BaseLayer = BaseLayer;
mars3d.ImageryLayer = ImageryLayer;
mars3d.TerrainLayer = TerrainLayer;
mars3d.LayerFactory = LayerFactory;
mars3d.LayerManager = LayerManager;

// 便捷方法
mars3d.createMap = Mars3D.createMap;
mars3d.getVersion = Mars3D.getVersion;
mars3d.isCesiumAvailable = Mars3D.isCesiumAvailable;
mars3d.setGlobalConfig = Mars3D.setGlobalConfig;

// 导出默认实例
export default mars3d;

// 兼容性导出
export {
  mars3d,
  EventType,
  GraphicType,
  LayerType,
  DEFAULT_STYLES,
  DEFAULT_CONFIG,
  Util,
  PointUtil,
  FormatUtil,
  ColorUtil,
  BaseEntity,
  PointEntity,
  PolylineEntity,
  PolygonEntity,
  GraphicFactory,
  GraphicManager,
  BaseLayer,
  ImageryLayer,
  TerrainLayer,
  LayerFactory,
  LayerManager
};

// 如果在浏览器环境中，添加到全局对象
if (typeof window !== 'undefined') {
  window.mars3d = mars3d;
  window.Mars3D = Mars3D;
}

// 如果在Node.js环境中，添加到global对象
if (typeof global !== 'undefined') {
  global.mars3d = mars3d;
  global.Mars3D = Mars3D;
}