/**
 * Mars3D 面图形实体类
 * @module graphic/PolygonEntity
 */

import * as Cesium from 'cesium';
import { BaseEntity } from './BaseEntity.js';
import { DEFAULT_STYLES, EventType, area, getCenterOfMass } from '../core/index.js';

/**
 * 面图形实体类
 */
export class PolygonEntity extends BaseEntity {
  constructor(options = {}) {
    options.type = 'polygon';
    super(options);
    
    // 面特有属性
    this.extrudedHeight = options.extrudedHeight || 0;
    this.height = options.height || 0;
    this.outline = options.outline !== false;
    this.fill = options.fill !== false;
    this.maxPointNum = options.maxPointNum || 999;
    this.minPointNum = options.minPointNum || 3;
    
    // 合并默认样式
    this._style = {
      ...DEFAULT_STYLES.polygon,
      ...options.style
    };
    
    // 设置初始位置
    if (options.positions) {
      this.positions = options.positions;
    }
  }

  /**
   * 获取面积
   */
  get area() {
    if (!this._positionsShow || this._positionsShow.length < 3) {
      return 0;
    }
    
    return area(this._positionsShow);
  }

  /**
   * 获取面的中心点
   */
  get center() {
    if (!this._positionsShow || this._positionsShow.length === 0) {
      return null;
    }
    
    return getCenterOfMass(this._positionsShow);
  }

  /**
   * 获取周长
   */
  get perimeter() {
    if (!this._positionsShow || this._positionsShow.length < 3) {
      return 0;
    }
    
    let totalLength = 0;
    const positions = this._positionsShow;
    
    for (let i = 0; i < positions.length; i++) {
      const nextIndex = (i + 1) % positions.length;
      totalLength += Cesium.Cartesian3.distance(positions[i], positions[nextIndex]);
    }
    
    return totalLength;
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
      polygon: this._createPolygonGraphics()
    };

    // 添加标签
    if (this.options.label) {
      entityOptions.label = this._createLabelGraphics();
    }

    this.entity = new Cesium.Entity(entityOptions);
    this._bindPickId();
  }

  /**
   * 创建面图形
   * @private
   */
  _createPolygonGraphics() {
    const style = this._style;
    
    const polygonOptions = {
      show: true,
      hierarchy: new Cesium.CallbackProperty(() => {
        return new Cesium.PolygonHierarchy(this._positionsShow);
      }, false),
      fill: this.fill,
      outline: this.outline,
      height: this.height,
      extrudedHeight: this.extrudedHeight
    };

    // 设置材质
    if (style.materialType) {
      polygonOptions.material = this._createMaterial(style);
    } else {
      polygonOptions.material = Cesium.Color.fromCssColorString(style.color || '#3388ff').withAlpha(style.opacity || 0.6);
    }

    // 设置轮廓
    if (this.outline) {
      polygonOptions.outlineColor = Cesium.Color.fromCssColorString(style.outlineColor || '#ffffff');
      polygonOptions.outlineWidth = style.outlineWidth || 1;
    }

    // 设置高度参考
    if (style.heightReference !== undefined) {
      polygonOptions.heightReference = style.heightReference;
    }

    // 设置拉伸高度参考
    if (style.extrudedHeightReference !== undefined) {
      polygonOptions.extrudedHeightReference = style.extrudedHeightReference;
    }

    // 设置阴影
    if (style.shadows !== undefined) {
      polygonOptions.shadows = style.shadows;
    }

    // 设置深度测试
    if (style.depthFailMaterial) {
      polygonOptions.depthFailMaterial = style.depthFailMaterial;
    }

    // 设置分类类型
    if (style.classificationType !== undefined) {
      polygonOptions.classificationType = style.classificationType;
    }

    // 设置z-index
    if (style.zIndex !== undefined) {
      polygonOptions.zIndex = style.zIndex;
    }

    return polygonOptions;
  }

  /**
   * 创建材质
   * @private
   */
  _createMaterial(style) {
    switch (style.materialType) {
      case 'Color':
        return Cesium.Color.fromCssColorString(style.color || '#3388ff').withAlpha(style.opacity || 0.6);
        
      case 'Image':
        return new Cesium.ImageMaterialProperty({
          image: style.image,
          repeat: style.repeat ? new Cesium.Cartesian2(style.repeat[0], style.repeat[1]) : undefined,
          color: style.color ? Cesium.Color.fromCssColorString(style.color) : undefined,
          transparent: style.transparent
        });
        
      case 'Grid':
        return new Cesium.GridMaterialProperty({
          color: Cesium.Color.fromCssColorString(style.color || '#3388ff'),
          cellAlpha: style.cellAlpha || 0.1,
          lineCount: style.lineCount ? new Cesium.Cartesian2(style.lineCount[0], style.lineCount[1]) : new Cesium.Cartesian2(8, 8),
          lineThickness: style.lineThickness ? new Cesium.Cartesian2(style.lineThickness[0], style.lineThickness[1]) : new Cesium.Cartesian2(1, 1),
          lineOffset: style.lineOffset ? new Cesium.Cartesian2(style.lineOffset[0], style.lineOffset[1]) : new Cesium.Cartesian2(0, 0)
        });
        
      case 'Stripe':
        return new Cesium.StripeMaterialProperty({
          evenColor: Cesium.Color.fromCssColorString(style.evenColor || '#ffffff'),
          oddColor: Cesium.Color.fromCssColorString(style.oddColor || '#000000'),
          repeat: style.repeat || 5.0,
          offset: style.offset || 0.0,
          orientation: style.orientation || Cesium.StripeOrientation.HORIZONTAL
        });
        
      case 'Checkerboard':
        return new Cesium.CheckerboardMaterialProperty({
          evenColor: Cesium.Color.fromCssColorString(style.evenColor || '#ffffff'),
          oddColor: Cesium.Color.fromCssColorString(style.oddColor || '#000000'),
          repeat: style.repeat ? new Cesium.Cartesian2(style.repeat[0], style.repeat[1]) : new Cesium.Cartesian2(2, 2)
        });
        
      case 'Dot':
        return new Cesium.DotMaterialProperty({
          color: Cesium.Color.fromCssColorString(style.color || '#3388ff'),
          repeat: style.repeat ? new Cesium.Cartesian2(style.repeat[0], style.repeat[1]) : new Cesium.Cartesian2(16, 16)
        });
        
      default:
        return Cesium.Color.fromCssColorString(style.color || '#3388ff').withAlpha(style.opacity || 0.6);
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
    
    // 触发面积变化事件
    this.fire(EventType.change, {
      area: this.area,
      perimeter: this.perimeter,
      center: this.center
    });
  }

  /**
   * 更新样式钩子
   * @protected
   */
  _updateStyleHook() {
    if (!this.entity || !this.entity.polygon) return;

    const style = this._style;
    const polygon = this.entity.polygon;

    // 更新基本属性
    if (style.fill !== undefined) polygon.fill = style.fill;
    if (style.outline !== undefined) polygon.outline = style.outline;
    if (style.height !== undefined) polygon.height = style.height;
    if (style.extrudedHeight !== undefined) polygon.extrudedHeight = style.extrudedHeight;

    // 更新材质
    if (style.materialType) {
      polygon.material = this._createMaterial(style);
    } else if (style.color) {
      polygon.material = Cesium.Color.fromCssColorString(style.color).withAlpha(style.opacity || 0.6);
    }

    // 更新轮廓
    if (style.outlineColor) polygon.outlineColor = Cesium.Color.fromCssColorString(style.outlineColor);
    if (style.outlineWidth !== undefined) polygon.outlineWidth = style.outlineWidth;
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
   * 设置填充状态
   * @param {boolean} fill - 是否填充
   */
  setFill(fill) {
    this.fill = fill;
    this._style.fill = fill;
    this._updateStyleHook();
  }

  /**
   * 设置轮廓状态
   * @param {boolean} outline - 是否显示轮廓
   */
  setOutline(outline) {
    this.outline = outline;
    this._style.outline = outline;
    this._updateStyleHook();
  }

  /**
   * 设置填充颜色
   * @param {string} color - 颜色
   * @param {number} opacity - 透明度
   */
  setFillColor(color, opacity) {
    this._style.color = color;
    if (opacity !== undefined) {
      this._style.opacity = opacity;
    }
    this._updateStyleHook();
  }

  /**
   * 设置轮廓颜色
   * @param {string} color - 颜色
   */
  setOutlineColor(color) {
    this._style.outlineColor = color;
    this._updateStyleHook();
  }

  /**
   * 设置高度
   * @param {number} height - 高度
   */
  setHeight(height) {
    this.height = height;
    this._style.height = height;
    this._updateStyleHook();
  }

  /**
   * 设置拉伸高度
   * @param {number} extrudedHeight - 拉伸高度
   */
  setExtrudedHeight(extrudedHeight) {
    this.extrudedHeight = extrudedHeight;
    this._style.extrudedHeight = extrudedHeight;
    this._updateStyleHook();
  }

  /**
   * 转换为JSON
   * @returns {object} JSON对象
   */
  toJSON() {
    const json = super.toJSON();
    
    // 添加面特有属性
    json.area = this.area;
    json.perimeter = this.perimeter;
    json.extrudedHeight = this.extrudedHeight;
    json.height = this.height;
    json.outline = this.outline;
    json.fill = this.fill;
    
    return json;
  }

  /**
   * 从JSON创建面实体
   * @param {object} json - JSON对象
   * @returns {PolygonEntity} 面实体对象
   */
  static fromJSON(json) {
    return new PolygonEntity(json);
  }
}

export default PolygonEntity;