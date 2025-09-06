/**
 * Cesium 工具类
 * @module core/CesiumUtil
 */

import * as Cesium from 'cesium';

/**
 * Cesium 相关工具函数
 */
export class CesiumUtil {
  /**
   * 初始化Cesium
   * @param {Object} options - 配置选项
   * @returns {Cesium.Viewer} Viewer实例
   */
  static createViewer(options = {}) {
    const defaultOptions = {
      homeButton: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      geocoder: false,
      infoBox: false,
      selectionIndicator: false,
      shadows: false,
      terrainShadows: Cesium.ShadowMode.DISABLED
    };

    const viewerOptions = { ...defaultOptions, ...options };
    return new Cesium.Viewer(viewerOptions.container || 'cesiumContainer', viewerOptions);
  }

  /**
   * 设置Cesium资源路径
   * @param {string} baseUrl - 基础URL
   */
  static setBaseUrl(baseUrl) {
    if (typeof window !== 'undefined') {
      window.CESIUM_BASE_URL = baseUrl;
    }
  }

  /**
   * 设置访问令牌
   * @param {string} token - 访问令牌
   */
  static setAccessToken(token) {
    Cesium.Ion.defaultAccessToken = token;
  }

  /**
   * 创建地形提供者
   * @param {Object} options - 配置选项
   * @returns {Cesium.TerrainProvider} 地形提供者
   */
  static createTerrainProvider(options = {}) {
    if (options.url) {
      return new Cesium.CesiumTerrainProvider({
        url: options.url,
        requestWaterMask: options.requestWaterMask || false,
        requestVertexNormals: options.requestVertexNormals || false
      });
    }
    return new Cesium.EllipsoidTerrainProvider();
  }

  /**
   * 创建影像图层
   * @param {Object} options - 配置选项
   * @returns {Cesium.ImageryLayer} 影像图层
   */
  static createImageryLayer(options = {}) {
    let provider;

    switch (options.type) {
      case 'xyz':
        provider = new Cesium.UrlTemplateImageryProvider({
          url: options.url,
          maximumLevel: options.maximumLevel || 18
        });
        break;
      case 'wms':
        provider = new Cesium.WebMapServiceImageryProvider({
          url: options.url,
          layers: options.layers,
          parameters: options.parameters || {}
        });
        break;
      case 'wmts':
        provider = new Cesium.WebMapTileServiceImageryProvider({
          url: options.url,
          layer: options.layer,
          style: options.style || 'default',
          format: options.format || 'image/jpeg',
          tileMatrixSetID: options.tileMatrixSetID
        });
        break;
      case 'tms':
        provider = new Cesium.TileMapServiceImageryProvider({
          url: options.url
        });
        break;
      default:
        provider = new Cesium.OpenStreetMapImageryProvider({
          url: 'https://a.tile.openstreetmap.org/'
        });
    }

    return new Cesium.ImageryLayer(provider, {
      show: options.show !== false,
      alpha: options.alpha || 1.0,
      brightness: options.brightness || 1.0,
      contrast: options.contrast || 1.0,
      hue: options.hue || 0.0,
      saturation: options.saturation || 1.0,
      gamma: options.gamma || 1.0
    });
  }

  /**
   * 坐标转换：经纬度转笛卡尔坐标
   * @param {number} longitude - 经度
   * @param {number} latitude - 纬度
   * @param {number} height - 高度
   * @returns {Cesium.Cartesian3} 笛卡尔坐标
   */
  static lonLatToCartesian(longitude, latitude, height = 0) {
    return Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
  }

  /**
   * 坐标转换：笛卡尔坐标转经纬度
   * @param {Cesium.Cartesian3} cartesian - 笛卡尔坐标
   * @returns {Object} 经纬度坐标 {longitude, latitude, height}
   */
  static cartesianToLonLat(cartesian) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    return {
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
      height: cartographic.height
    };
  }

  /**
   * 屏幕坐标转世界坐标
   * @param {Cesium.Viewer} viewer - Viewer实例
   * @param {Cesium.Cartesian2} windowPosition - 屏幕坐标
   * @returns {Cesium.Cartesian3|null} 世界坐标
   */
  static screenToWorld(viewer, windowPosition) {
    const scene = viewer.scene;
    const camera = viewer.camera;
    
    // 尝试从地形获取坐标
    let position = scene.pickPosition(windowPosition);
    if (position) {
      return position;
    }
    
    // 尝试从椭球面获取坐标
    const ray = camera.getPickRay(windowPosition);
    position = scene.globe.pick(ray, scene);
    
    return position || null;
  }

  /**
   * 世界坐标转屏幕坐标
   * @param {Cesium.Viewer} viewer - Viewer实例
   * @param {Cesium.Cartesian3} worldPosition - 世界坐标
   * @returns {Cesium.Cartesian2|null} 屏幕坐标
   */
  static worldToScreen(viewer, worldPosition) {
    return Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, worldPosition);
  }

  /**
   * 计算两点间距离
   * @param {Cesium.Cartesian3} point1 - 点1
   * @param {Cesium.Cartesian3} point2 - 点2
   * @returns {number} 距离（米）
   */
  static distance(point1, point2) {
    return Cesium.Cartesian3.distance(point1, point2);
  }

  /**
   * 计算多边形面积
   * @param {Array<Cesium.Cartesian3>} positions - 顶点坐标数组
   * @returns {number} 面积（平方米）
   */
  static computeArea(positions) {
    if (!positions || positions.length < 3) return 0;
    
    const polygon = new Cesium.PolygonHierarchy(positions);
    return Cesium.PolygonGeometryLibrary.computeArea2D(polygon, Cesium.Ellipsoid.WGS84);
  }

  /**
   * 计算多边形周长
   * @param {Array<Cesium.Cartesian3>} positions - 顶点坐标数组
   * @returns {number} 周长（米）
   */
  static computePerimeter(positions) {
    if (!positions || positions.length < 2) return 0;
    
    let perimeter = 0;
    for (let i = 0; i < positions.length - 1; i++) {
      perimeter += Cesium.Cartesian3.distance(positions[i], positions[i + 1]);
    }
    
    // 如果是闭合多边形，加上最后一段距离
    if (positions.length > 2) {
      perimeter += Cesium.Cartesian3.distance(positions[positions.length - 1], positions[0]);
    }
    
    return perimeter;
  }

  /**
   * 创建材质
   * @param {Object} options - 材质选项
   * @returns {Cesium.Material} 材质
   */
  static createMaterial(options = {}) {
    if (options.fabric) {
      return new Cesium.Material({
        fabric: options.fabric
      });
    }
    
    // 默认颜色材质
    return Cesium.Material.fromType('Color', {
      color: options.color || Cesium.Color.WHITE
    });
  }

  /**
   * 飞行到指定位置
   * @param {Cesium.Viewer} viewer - Viewer实例
   * @param {Object} options - 飞行选项
   * @returns {Promise} 飞行Promise
   */
  static flyTo(viewer, options = {}) {
    const destination = options.destination || options.position;
    
    if (!destination) {
      return Promise.reject(new Error('未指定目标位置'));
    }
    
    const flyOptions = {
      destination: Array.isArray(destination) 
        ? Cesium.Cartesian3.fromDegrees(destination[0], destination[1], destination[2] || 1000)
        : destination,
      orientation: options.orientation,
      duration: options.duration || 3.0,
      complete: options.complete,
      cancel: options.cancel,
      endTransform: options.endTransform,
      maximumHeight: options.maximumHeight,
      pitchAdjustHeight: options.pitchAdjustHeight,
      flyOverLongitude: options.flyOverLongitude,
      flyOverLongitudeWeight: options.flyOverLongitudeWeight,
      convert: options.convert !== false,
      easingFunction: options.easingFunction
    };
    
    return viewer.camera.flyTo(flyOptions);
  }

  /**
   * 设置相机视角
   * @param {Cesium.Viewer} viewer - Viewer实例
   * @param {Object} options - 视角选项
   */
  static setView(viewer, options = {}) {
    const destination = options.destination || options.position;
    
    if (!destination) {
      throw new Error('未指定目标位置');
    }
    
    viewer.camera.setView({
      destination: Array.isArray(destination) 
        ? Cesium.Cartesian3.fromDegrees(destination[0], destination[1], destination[2] || 1000)
        : destination,
      orientation: options.orientation,
      endTransform: options.endTransform,
      convert: options.convert !== false
    });
  }

  /**
   * 获取当前相机状态
   * @param {Cesium.Viewer} viewer - Viewer实例
   * @returns {Object} 相机状态
   */
  static getCameraState(viewer) {
    const camera = viewer.camera;
    const position = camera.position;
    const heading = camera.heading;
    const pitch = camera.pitch;
    const roll = camera.roll;
    
    const cartographic = Cesium.Cartographic.fromCartesian(position);
    
    return {
      position: {
        longitude: Cesium.Math.toDegrees(cartographic.longitude),
        latitude: Cesium.Math.toDegrees(cartographic.latitude),
        height: cartographic.height
      },
      orientation: {
        heading: Cesium.Math.toDegrees(heading),
        pitch: Cesium.Math.toDegrees(pitch),
        roll: Cesium.Math.toDegrees(roll)
      }
    };
  }

  /**
   * 检查Cesium是否已加载
   * @returns {boolean} 是否已加载
   */
  static isLoaded() {
    return typeof Cesium !== 'undefined' && Cesium.Viewer;
  }

  /**
   * 获取Cesium版本
   * @returns {string} 版本号
   */
  static getVersion() {
    return Cesium.VERSION || 'unknown';
  }

  /**
   * 销毁Viewer
   * @param {Cesium.Viewer} viewer - Viewer实例
   */
  static destroyViewer(viewer) {
    if (viewer && !viewer.isDestroyed()) {
      viewer.destroy();
    }
  }
}

// 默认导出
export default CesiumUtil;