/**
 * Mars3D 点图形实体类
 * @module graphic/PointEntity
 */

import * as Cesium from 'cesium';
import { BaseEntity } from './BaseEntity.js';
import { DEFAULT_STYLES, fromDegrees } from '../core/index.js';

/**
 * 点图形实体类
 */
export class PointEntity extends BaseEntity {
  constructor(options = {}) {
    options.type = 'point';
    super(options);
    
    // 点特有属性
    this.position = options.position;
    this.pixelSize = options.pixelSize || DEFAULT_STYLES.point.pixelSize;
    this.heightReference = options.heightReference || DEFAULT_STYLES.point.heightReference;
    
    // 合并默认样式
    this._style = {
      ...DEFAULT_STYLES.point,
      ...options.style
    };
  }

  /**
   * 获取位置
   */
  get position() {
    return this._position;
  }

  /**
   * 设置位置
   */
  set position(val) {
    this._position = val;
    this._updatePosition();
  }

  /**
   * 获取经纬度位置
   */
  get lngLatPosition() {
    if (!this._position) return null;
    
    const cartographic = Cesium.Cartographic.fromCartesian(this._position);
    return {
      lng: Cesium.Math.toDegrees(cartographic.longitude),
      lat: Cesium.Math.toDegrees(cartographic.latitude),
      alt: cartographic.height
    };
  }

  /**
   * 设置经纬度位置
   */
  set lngLatPosition(val) {
    if (val && typeof val === 'object') {
      this.position = fromDegrees(val.lng, val.lat, val.alt || 0);
    }
  }

  /**
   * 创建Cesium实体
   * @protected
   */
  _createEntity() {
    const entityOptions = {
      id: this.id,
      name: this.name,
      show: this.show,
      position: this._position,
      point: this._createPointGraphics()
    };

    // 添加标签
    if (this.options.label) {
      entityOptions.label = this._createLabelGraphics();
    }

    // 添加广告牌
    if (this.options.billboard) {
      entityOptions.billboard = this._createBillboardGraphics();
    }

    this.entity = new Cesium.Entity(entityOptions);
    this._bindPickId();
  }

  /**
   * 创建点图形
   * @private
   */
  _createPointGraphics() {
    const style = this._style;
    
    return {
      show: true,
      pixelSize: style.pixelSize || 8,
      color: Cesium.Color.fromCssColorString(style.color || '#3388ff'),
      outlineColor: Cesium.Color.fromCssColorString(style.outlineColor || '#ffffff'),
      outlineWidth: style.outlineWidth || 2,
      heightReference: style.heightReference || Cesium.HeightReference.NONE,
      scaleByDistance: style.scaleByDistance ? new Cesium.NearFarScalar(
        style.scaleByDistance.near || 1000,
        style.scaleByDistance.nearValue || 1.0,
        style.scaleByDistance.far || 10000,
        style.scaleByDistance.farValue || 0.5
      ) : undefined,
      translucencyByDistance: style.translucencyByDistance ? new Cesium.NearFarScalar(
        style.translucencyByDistance.near || 1000,
        style.translucencyByDistance.nearValue || 1.0,
        style.translucencyByDistance.far || 10000,
        style.translucencyByDistance.farValue || 0.0
      ) : undefined
    };
  }

  /**
   * 创建标签图形
   * @private
   */
  _createLabelGraphics() {
    const labelOptions = {
      ...DEFAULT_STYLES.label,
      ...this.options.label
    };

    return {
      show: true,
      text: labelOptions.text || this.name || '',
      font: labelOptions.font || '16px sans-serif',
      fillColor: Cesium.Color.fromCssColorString(labelOptions.color || '#ffffff'),
      outlineColor: Cesium.Color.fromCssColorString(labelOptions.outlineColor || '#000000'),
      outlineWidth: labelOptions.outlineWidth || 2,
      style: labelOptions.style || Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(
        labelOptions.pixelOffset?.[0] || 0,
        labelOptions.pixelOffset?.[1] || -40
      ),
      horizontalOrigin: labelOptions.horizontalOrigin || Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: labelOptions.verticalOrigin || Cesium.VerticalOrigin.BOTTOM,
      heightReference: labelOptions.heightReference || Cesium.HeightReference.NONE,
      scaleByDistance: labelOptions.scaleByDistance ? new Cesium.NearFarScalar(
        labelOptions.scaleByDistance.near || 1000,
        labelOptions.scaleByDistance.nearValue || 1.0,
        labelOptions.scaleByDistance.far || 10000,
        labelOptions.scaleByDistance.farValue || 0.5
      ) : undefined
    };
  }

  /**
   * 创建广告牌图形
   * @private
   */
  _createBillboardGraphics() {
    const billboardOptions = {
      ...DEFAULT_STYLES.billboard,
      ...this.options.billboard
    };

    return {
      show: true,
      image: billboardOptions.image || '',
      scale: billboardOptions.scale || 1,
      pixelOffset: new Cesium.Cartesian2(
        billboardOptions.pixelOffset?.[0] || 0,
        billboardOptions.pixelOffset?.[1] || 0
      ),
      horizontalOrigin: billboardOptions.horizontalOrigin || Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: billboardOptions.verticalOrigin || Cesium.VerticalOrigin.BOTTOM,
      heightReference: billboardOptions.heightReference || Cesium.HeightReference.NONE,
      color: billboardOptions.color ? Cesium.Color.fromCssColorString(billboardOptions.color) : Cesium.Color.WHITE,
      rotation: billboardOptions.rotation || 0,
      alignedAxis: billboardOptions.alignedAxis || Cesium.Cartesian3.ZERO,
      width: billboardOptions.width,
      height: billboardOptions.height,
      scaleByDistance: billboardOptions.scaleByDistance ? new Cesium.NearFarScalar(
        billboardOptions.scaleByDistance.near || 1000,
        billboardOptions.scaleByDistance.nearValue || 1.0,
        billboardOptions.scaleByDistance.far || 10000,
        billboardOptions.scaleByDistance.farValue || 0.5
      ) : undefined
    };
  }

  /**
   * 绑定拾取ID
   * @private
   */
  _bindPickId() {
    if (this.entity) {
      this.entity.mars3d = {
        type: this.type,
        entity: this
      };
    }
  }

  /**
   * 更新位置
   * @private
   */
  _updatePosition() {
    if (this.entity && this._position) {
      this.entity.position = this._position;
    }
  }

  /**
   * 更新样式钩子
   * @protected
   */
  _updateStyleHook() {
    if (!this.entity) return;

    const style = this._style;
    const point = this.entity.point;

    if (point) {
      if (style.pixelSize !== undefined) point.pixelSize = style.pixelSize;
      if (style.color) point.color = Cesium.Color.fromCssColorString(style.color);
      if (style.outlineColor) point.outlineColor = Cesium.Color.fromCssColorString(style.outlineColor);
      if (style.outlineWidth !== undefined) point.outlineWidth = style.outlineWidth;
      if (style.heightReference !== undefined) point.heightReference = style.heightReference;
    }

    // 更新标签样式
    if (this.entity.label && this.options.label) {
      const label = this.entity.label;
      const labelStyle = { ...this.options.label, ...style.label };
      
      if (labelStyle.text) label.text = labelStyle.text;
      if (labelStyle.font) label.font = labelStyle.font;
      if (labelStyle.color) label.fillColor = Cesium.Color.fromCssColorString(labelStyle.color);
      if (labelStyle.outlineColor) label.outlineColor = Cesium.Color.fromCssColorString(labelStyle.outlineColor);
      if (labelStyle.outlineWidth !== undefined) label.outlineWidth = labelStyle.outlineWidth;
    }

    // 更新广告牌样式
    if (this.entity.billboard && this.options.billboard) {
      const billboard = this.entity.billboard;
      const billboardStyle = { ...this.options.billboard, ...style.billboard };
      
      if (billboardStyle.image) billboard.image = billboardStyle.image;
      if (billboardStyle.scale !== undefined) billboard.scale = billboardStyle.scale;
      if (billboardStyle.color) billboard.color = Cesium.Color.fromCssColorString(billboardStyle.color);
      if (billboardStyle.rotation !== undefined) billboard.rotation = billboardStyle.rotation;
    }
  }

  /**
   * 设置文本
   * @param {string} text - 文本内容
   */
  setText(text) {
    if (this.entity && this.entity.label) {
      this.entity.label.text = text;
    }
    if (this.options.label) {
      this.options.label.text = text;
    }
  }

  /**
   * 设置图标
   * @param {string} image - 图标URL
   */
  setImage(image) {
    if (this.entity && this.entity.billboard) {
      this.entity.billboard.image = image;
    }
    if (this.options.billboard) {
      this.options.billboard.image = image;
    }
  }

  /**
   * 移动到指定位置
   * @param {Cesium.Cartesian3|object} position - 目标位置
   * @param {number} duration - 动画时长（毫秒）
   */
  moveTo(position, duration = 1000) {
    if (!this._map || !position) return;

    const targetPosition = position.lng !== undefined ? 
      fromDegrees(position.lng, position.lat, position.alt || 0) : position;

    if (duration <= 0) {
      this.position = targetPosition;
      return;
    }

    // 创建动画
    const startPosition = this._position;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用线性插值
      const currentPosition = Cesium.Cartesian3.lerp(
        startPosition,
        targetPosition,
        progress,
        new Cesium.Cartesian3()
      );
      
      this.position = currentPosition;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * 转换为JSON
   * @returns {object} JSON对象
   */
  toJSON() {
    const json = super.toJSON();
    
    // 添加点特有属性
    if (this.lngLatPosition) {
      json.position = this.lngLatPosition;
    }
    
    return json;
  }

  /**
   * 从JSON创建点实体
   * @param {object} json - JSON对象
   * @returns {PointEntity} 点实体对象
   */
  static fromJSON(json) {
    const options = { ...json };
    
    // 转换位置格式
    if (json.position && json.position.lng !== undefined) {
      options.position = fromDegrees(json.position.lng, json.position.lat, json.position.alt || 0);
    }
    
    return new PointEntity(options);
  }
}

export default PointEntity;