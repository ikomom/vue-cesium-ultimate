/**
 * Mars3D 线图形实体类
 * @module graphic/PolylineEntity
 */

import * as Cesium from 'cesium';
import { BaseEntity } from './BaseEntity.js';
import { DEFAULT_STYLES, EventType, distance, getCenterOfMass } from '../core/index.js';

/**
 * 线图形实体类
 */
export class PolylineEntity extends BaseEntity {
  constructor(options = {}) {
    options.type = 'polyline';
    super(options);
    
    // 线特有属性
    this.clampToGround = options.clampToGround !== false;
    this.width = options.width || DEFAULT_STYLES.polyline.width;
    this.maxPointNum = options.maxPointNum || 999;
    this.minPointNum = options.minPointNum || 2;
    
    // 合并默认样式
    this._style = {
      ...DEFAULT_STYLES.polyline,
      ...options.style
    };
    
    // 设置初始位置
    if (options.positions) {
      this.positions = options.positions;
    }
  }

  /**
   * 获取线的长度
   */
  get length() {
    if (!this._positionsShow || this._positionsShow.length < 2) {
      return 0;
    }
    
    let totalLength = 0;
    for (let i = 1; i < this._positionsShow.length; i++) {
      totalLength += distance(this._positionsShow[i - 1], this._positionsShow[i]);
    }
    
    return totalLength;
  }

  /**
   * 获取线的中心点
   */
  get center() {
    if (!this._positionsShow || this._positionsShow.length === 0) {
      return null;
    }
    
    return getCenterOfMass(this._positionsShow);
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
      polyline: this._createPolylineGraphics()
    };

    // 添加标签
    if (this.options.label) {
      entityOptions.label = this._createLabelGraphics();
    }

    this.entity = new Cesium.Entity(entityOptions);
    this._bindPickId();
  }

  /**
   * 创建线图形
   * @private
   */
  _createPolylineGraphics() {
    const style = this._style;
    
    const polylineOptions = {
      show: true,
      positions: new Cesium.CallbackProperty(() => {
        return this._positionsShow;
      }, false),
      width: style.width || 3,
      clampToGround: this.clampToGround,
      followSurface: style.followSurface !== false,
      granularity: style.granularity || Cesium.Math.RADIANS_PER_DEGREE
    };

    // 设置材质
    if (style.materialType) {
      polylineOptions.material = this._createMaterial(style);
    } else {
      polylineOptions.material = Cesium.Color.fromCssColorString(style.color || '#3388ff');
    }

    // 设置轮廓
    if (style.outline) {
      polylineOptions.outline = true;
      polylineOptions.outlineColor = Cesium.Color.fromCssColorString(style.outlineColor || '#ffffff');
      polylineOptions.outlineWidth = style.outlineWidth || 1;
    }

    // 设置阴影
    if (style.shadows !== undefined) {
      polylineOptions.shadows = style.shadows;
    }

    // 设置深度测试
    if (style.depthFailMaterial) {
      polylineOptions.depthFailMaterial = style.depthFailMaterial;
    }

    return polylineOptions;
  }

  /**
   * 创建材质
   * @private
   */
  _createMaterial(style) {
    switch (style.materialType) {
      case 'PolylineGlow':
        return new Cesium.PolylineGlowMaterialProperty({
          glowPower: style.glowPower || 0.1,
          color: Cesium.Color.fromCssColorString(style.color || '#3388ff')
        });
        
      case 'PolylineArrow':
        return new Cesium.PolylineArrowMaterialProperty(
          Cesium.Color.fromCssColorString(style.color || '#3388ff')
        );
        
      case 'PolylineDash':
        return new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString(style.color || '#3388ff'),
          gapColor: style.gapColor ? Cesium.Color.fromCssColorString(style.gapColor) : Cesium.Color.TRANSPARENT,
          dashLength: style.dashLength || 16,
          dashPattern: style.dashPattern || 255
        });
        
      case 'PolylineOutline':
        return new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.fromCssColorString(style.color || '#3388ff'),
          outlineColor: Cesium.Color.fromCssColorString(style.outlineColor || '#ffffff'),
          outlineWidth: style.outlineWidth || 1
        });
        
      default:
        return Cesium.Color.fromCssColorString(style.color || '#3388ff');
    }
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
      position: new Cesium.CallbackProperty(() => {
        return this.center;
      }, false),
      pixelOffset: new Cesium.Cartesian2(
        labelOptions.pixelOffset?.[0] || 0,
        labelOptions.pixelOffset?.[1] || -40
      ),
      horizontalOrigin: labelOptions.horizontalOrigin || Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: labelOptions.verticalOrigin || Cesium.VerticalOrigin.BOTTOM
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
   * 更新位置钩子
   * @protected
   */
  _updatePositionsHook() {
    super._updatePositionsHook();
    
    // 触发长度变化事件
    this.fire(EventType.change, {
      length: this.length,
      center: this.center
    });
  }

  /**
   * 更新样式钩子
   * @protected
   */
  _updateStyleHook() {
    if (!this.entity || !this.entity.polyline) return;

    const style = this._style;
    const polyline = this.entity.polyline;

    // 更新基本属性
    if (style.width !== undefined) polyline.width = style.width;
    if (style.clampToGround !== undefined) polyline.clampToGround = style.clampToGround;
    if (style.followSurface !== undefined) polyline.followSurface = style.followSurface;

    // 更新材质
    if (style.materialType) {
      polyline.material = this._createMaterial(style);
    } else if (style.color) {
      polyline.material = Cesium.Color.fromCssColorString(style.color);
    }

    // 更新轮廓
    if (style.outline !== undefined) {
      polyline.outline = style.outline;
      if (style.outline) {
        if (style.outlineColor) polyline.outlineColor = Cesium.Color.fromCssColorString(style.outlineColor);
        if (style.outlineWidth !== undefined) polyline.outlineWidth = style.outlineWidth;
      }
    }
  }

  /**
   * 添加点
   * @param {Cesium.Cartesian3} position - 位置
   * @param {number} index - 插入索引，不传则添加到末尾
   */
  addPoint(position, index) {
    if (!position) return;
    
    const positions = [...this._positions];
    
    if (index !== undefined && index >= 0 && index <= positions.length) {
      positions.splice(index, 0, position);
    } else {
      positions.push(position);
    }
    
    // 检查最大点数限制
    if (positions.length > this.maxPointNum) {
      console.warn(`超过最大点数限制: ${this.maxPointNum}`);
      return;
    }
    
    this.positions = positions;
    
    this.fire(EventType.drawAddPoint, {
      position,
      index: index !== undefined ? index : positions.length - 1,
      positions: this.positions
    });
  }

  /**
   * 移除点
   * @param {number} index - 点索引
   */
  removePoint(index) {
    if (index < 0 || index >= this._positions.length) return;
    
    const positions = [...this._positions];
    const removedPosition = positions.splice(index, 1)[0];
    
    // 检查最小点数限制
    if (positions.length < this.minPointNum) {
      console.warn(`不能少于最小点数限制: ${this.minPointNum}`);
      return;
    }
    
    this.positions = positions;
    
    this.fire(EventType.drawRemovePoint, {
      position: removedPosition,
      index,
      positions: this.positions
    });
  }

  /**
   * 更新点位置
   * @param {number} index - 点索引
   * @param {Cesium.Cartesian3} position - 新位置
   */
  updatePoint(index, position) {
    if (index < 0 || index >= this._positions.length || !position) return;
    
    const positions = [...this._positions];
    const oldPosition = positions[index];
    positions[index] = position;
    
    this.positions = positions;
    
    this.fire(EventType.editMovePoint, {
      position,
      oldPosition,
      index,
      positions: this.positions
    });
  }

  /**
   * 获取指定索引的点
   * @param {number} index - 点索引
   * @returns {Cesium.Cartesian3} 点位置
   */
  getPoint(index) {
    return this._positions[index];
  }

  /**
   * 获取点的数量
   * @returns {number} 点数量
   */
  getPointCount() {
    return this._positions.length;
  }

  /**
   * 清空所有点
   */
  clearPoints() {
    this.positions = [];
  }

  /**
   * 反转线的方向
   */
  reverse() {
    this.positions = [...this._positions].reverse();
  }

  /**
   * 设置线宽
   * @param {number} width - 线宽
   */
  setWidth(width) {
    this._style.width = width;
    this._updateStyleHook();
  }

  /**
   * 设置线颜色
   * @param {string} color - 颜色
   */
  setColor(color) {
    this._style.color = color;
    this._updateStyleHook();
  }

  /**
   * 转换为JSON
   * @returns {object} JSON对象
   */
  toJSON() {
    const json = super.toJSON();
    
    // 添加线特有属性
    json.length = this.length;
    json.clampToGround = this.clampToGround;
    json.width = this.width;
    
    return json;
  }

  /**
   * 从JSON创建线实体
   * @param {object} json - JSON对象
   * @returns {PolylineEntity} 线实体对象
   */
  static fromJSON(json) {
    return new PolylineEntity(json);
  }
}

export default PolylineEntity;