/**
 * Mars3D 鼠标控制类
 * @class MouseControl
 * @extends BaseControl
 * @description 处理鼠标交互事件和操作
 */

import * as Cesium from 'cesium';
import { BaseControl } from './BaseControl.js';
import { EventType, PointUtil } from '../core/index.js';

export class MouseControl extends BaseControl {
  /**
   * 构造函数
   * @param {object} options - 配置选项
   */
  constructor(options = {}) {
    super({
      type: 'MouseControl',
      ...options
    });

    // 鼠标状态
    this.isLeftDown = false;
    this.isRightDown = false;
    this.isMiddleDown = false;
    this.isDragging = false;
    
    // 鼠标位置
    this.mousePosition = new Cesium.Cartesian2();
    this.lastMousePosition = new Cesium.Cartesian2();
    this.downPosition = new Cesium.Cartesian2();
    
    // 拾取信息
    this.pickedObject = null;
    this.pickedPosition = null;
    
    // 事件处理器
    this._handlers = {
      leftDown: null,
      leftUp: null,
      leftClick: null,
      leftDoubleClick: null,
      rightDown: null,
      rightUp: null,
      rightClick: null,
      middleDown: null,
      middleUp: null,
      middleClick: null,
      mouseMove: null,
      wheel: null
    };
    
    // 配置选项
    this.options = {
      enablePicking: true,
      enableDragging: true,
      dragThreshold: 5, // 拖拽阈值（像素）
      doubleClickDelay: 300, // 双击延迟（毫秒）
      ...options
    };
    
    // 双击检测
    this._lastClickTime = 0;
    this._clickTimer = null;
  }

  /**
   * 添加到地图的内部实现
   * @protected
   */
  _addToMap() {
    if (!this.viewer || !this.scene) return;
    
    const handler = new Cesium.ScreenSpaceEventHandler(this.canvas);
    this.handler = handler;
    
    // 左键按下
    this._handlers.leftDown = handler.setInputAction((event) => {
      this._onLeftDown(event);
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    
    // 左键抬起
    this._handlers.leftUp = handler.setInputAction((event) => {
      this._onLeftUp(event);
    }, Cesium.ScreenSpaceEventType.LEFT_UP);
    
    // 左键单击
    this._handlers.leftClick = handler.setInputAction((event) => {
      this._onLeftClick(event);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    
    // 右键按下
    this._handlers.rightDown = handler.setInputAction((event) => {
      this._onRightDown(event);
    }, Cesium.ScreenSpaceEventType.RIGHT_DOWN);
    
    // 右键抬起
    this._handlers.rightUp = handler.setInputAction((event) => {
      this._onRightUp(event);
    }, Cesium.ScreenSpaceEventType.RIGHT_UP);
    
    // 右键单击
    this._handlers.rightClick = handler.setInputAction((event) => {
      this._onRightClick(event);
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    
    // 中键按下
    this._handlers.middleDown = handler.setInputAction((event) => {
      this._onMiddleDown(event);
    }, Cesium.ScreenSpaceEventType.MIDDLE_DOWN);
    
    // 中键抬起
    this._handlers.middleUp = handler.setInputAction((event) => {
      this._onMiddleUp(event);
    }, Cesium.ScreenSpaceEventType.MIDDLE_UP);
    
    // 中键单击
    this._handlers.middleClick = handler.setInputAction((event) => {
      this._onMiddleClick(event);
    }, Cesium.ScreenSpaceEventType.MIDDLE_CLICK);
    
    // 鼠标移动
    this._handlers.mouseMove = handler.setInputAction((event) => {
      this._onMouseMove(event);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    
    // 鼠标滚轮
    this._handlers.wheel = handler.setInputAction((event) => {
      this._onWheel(event);
    }, Cesium.ScreenSpaceEventType.WHEEL);
  }

  /**
   * 从地图移除的内部实现
   * @protected
   */
  _removeFromMap() {
    if (this.handler) {
      this.handler.destroy();
      this.handler = null;
    }
    
    if (this._clickTimer) {
      clearTimeout(this._clickTimer);
      this._clickTimer = null;
    }
  }

  /**
   * 左键按下事件处理
   * @private
   */
  _onLeftDown(event) {
    if (!this.enabled) return;
    
    this.isLeftDown = true;
    this.isDragging = false;
    
    const position = event.position;
    Cesium.Cartesian2.clone(position, this.mousePosition);
    Cesium.Cartesian2.clone(position, this.lastMousePosition);
    Cesium.Cartesian2.clone(position, this.downPosition);
    
    // 拾取对象
    if (this.options.enablePicking) {
      this._pickObject(position);
    }
    
    this.fire(EventType.LEFT_DOWN, {
      position: Cesium.Cartesian2.clone(position),
      pickedObject: this.pickedObject,
      pickedPosition: this.pickedPosition
    });
  }

  /**
   * 左键抬起事件处理
   * @private
   */
  _onLeftUp(event) {
    if (!this.enabled) return;
    
    this.isLeftDown = false;
    
    const position = event.position;
    Cesium.Cartesian2.clone(position, this.mousePosition);
    
    // 检查是否为拖拽结束
    if (this.isDragging) {
      this.fire(EventType.DRAG_END, {
        position: Cesium.Cartesian2.clone(position),
        startPosition: Cesium.Cartesian2.clone(this.downPosition)
      });
    }
    
    this.isDragging = false;
    
    this.fire(EventType.LEFT_UP, {
      position: Cesium.Cartesian2.clone(position),
      pickedObject: this.pickedObject,
      pickedPosition: this.pickedPosition
    });
  }

  /**
   * 左键单击事件处理
   * @private
   */
  _onLeftClick(event) {
    if (!this.enabled) return;
    
    const position = event.position;
    const currentTime = Date.now();
    
    // 双击检测
    if (currentTime - this._lastClickTime < this.options.doubleClickDelay) {
      // 双击
      if (this._clickTimer) {
        clearTimeout(this._clickTimer);
        this._clickTimer = null;
      }
      
      this.fire(EventType.LEFT_DOUBLE_CLICK, {
        position: Cesium.Cartesian2.clone(position),
        pickedObject: this.pickedObject,
        pickedPosition: this.pickedPosition
      });
    } else {
      // 延迟触发单击事件，等待可能的双击
      this._clickTimer = setTimeout(() => {
        this.fire(EventType.LEFT_CLICK, {
          position: Cesium.Cartesian2.clone(position),
          pickedObject: this.pickedObject,
          pickedPosition: this.pickedPosition
        });
        this._clickTimer = null;
      }, this.options.doubleClickDelay);
    }
    
    this._lastClickTime = currentTime;
  }

  /**
   * 右键按下事件处理
   * @private
   */
  _onRightDown(event) {
    if (!this.enabled) return;
    
    this.isRightDown = true;
    
    const position = event.position;
    Cesium.Cartesian2.clone(position, this.mousePosition);
    
    if (this.options.enablePicking) {
      this._pickObject(position);
    }
    
    this.fire(EventType.RIGHT_DOWN, {
      position: Cesium.Cartesian2.clone(position),
      pickedObject: this.pickedObject,
      pickedPosition: this.pickedPosition
    });
  }

  /**
   * 右键抬起事件处理
   * @private
   */
  _onRightUp(event) {
    if (!this.enabled) return;
    
    this.isRightDown = false;
    
    const position = event.position;
    Cesium.Cartesian2.clone(position, this.mousePosition);
    
    this.fire(EventType.RIGHT_UP, {
      position: Cesium.Cartesian2.clone(position),
      pickedObject: this.pickedObject,
      pickedPosition: this.pickedPosition
    });
  }

  /**
   * 右键单击事件处理
   * @private
   */
  _onRightClick(event) {
    if (!this.enabled) return;
    
    const position = event.position;
    
    this.fire(EventType.RIGHT_CLICK, {
      position: Cesium.Cartesian2.clone(position),
      pickedObject: this.pickedObject,
      pickedPosition: this.pickedPosition
    });
  }

  /**
   * 中键按下事件处理
   * @private
   */
  _onMiddleDown(event) {
    if (!this.enabled) return;
    
    this.isMiddleDown = true;
    
    const position = event.position;
    Cesium.Cartesian2.clone(position, this.mousePosition);
    
    this.fire(EventType.MIDDLE_DOWN, {
      position: Cesium.Cartesian2.clone(position)
    });
  }

  /**
   * 中键抬起事件处理
   * @private
   */
  _onMiddleUp(event) {
    if (!this.enabled) return;
    
    this.isMiddleDown = false;
    
    const position = event.position;
    Cesium.Cartesian2.clone(position, this.mousePosition);
    
    this.fire(EventType.MIDDLE_UP, {
      position: Cesium.Cartesian2.clone(position)
    });
  }

  /**
   * 中键单击事件处理
   * @private
   */
  _onMiddleClick(event) {
    if (!this.enabled) return;
    
    const position = event.position;
    
    this.fire(EventType.MIDDLE_CLICK, {
      position: Cesium.Cartesian2.clone(position)
    });
  }

  /**
   * 鼠标移动事件处理
   * @private
   */
  _onMouseMove(event) {
    if (!this.enabled) return;
    
    const position = event.endPosition;
    Cesium.Cartesian2.clone(this.mousePosition, this.lastMousePosition);
    Cesium.Cartesian2.clone(position, this.mousePosition);
    
    // 检查是否开始拖拽
    if (this.isLeftDown && !this.isDragging && this.options.enableDragging) {
      const distance = Cesium.Cartesian2.distance(position, this.downPosition);
      if (distance > this.options.dragThreshold) {
        this.isDragging = true;
        this.fire(EventType.DRAG_START, {
          position: Cesium.Cartesian2.clone(position),
          startPosition: Cesium.Cartesian2.clone(this.downPosition)
        });
      }
    }
    
    // 拖拽中
    if (this.isDragging) {
      this.fire(EventType.DRAGGING, {
        position: Cesium.Cartesian2.clone(position),
        lastPosition: Cesium.Cartesian2.clone(this.lastMousePosition),
        startPosition: Cesium.Cartesian2.clone(this.downPosition)
      });
    }
    
    this.fire(EventType.MOUSE_MOVE, {
      position: Cesium.Cartesian2.clone(position),
      lastPosition: Cesium.Cartesian2.clone(this.lastMousePosition)
    });
  }

  /**
   * 鼠标滚轮事件处理
   * @private
   */
  _onWheel(event) {
    if (!this.enabled) return;
    
    this.fire(EventType.WHEEL, {
      delta: event,
      position: Cesium.Cartesian2.clone(this.mousePosition)
    });
  }

  /**
   * 拾取对象
   * @private
   */
  _pickObject(position) {
    if (!this.scene) return;
    
    // 拾取对象
    this.pickedObject = this.scene.pick(position);
    
    // 拾取地球表面位置
    const ray = this.camera.getPickRay(position);
    const cartesian = this.scene.globe.pick(ray, this.scene);
    
    if (cartesian) {
      this.pickedPosition = PointUtil.cartesianToDegrees(cartesian);
    } else {
      this.pickedPosition = null;
    }
  }

  /**
   * 获取当前鼠标位置
   * @returns {Cesium.Cartesian2} 鼠标位置
   */
  getMousePosition() {
    return Cesium.Cartesian2.clone(this.mousePosition);
  }

  /**
   * 获取拾取的对象
   * @returns {object} 拾取的对象
   */
  getPickedObject() {
    return this.pickedObject;
  }

  /**
   * 获取拾取的位置
   * @returns {object} 拾取的位置（经纬度）
   */
  getPickedPosition() {
    return this.pickedPosition;
  }

  /**
   * 是否正在拖拽
   * @returns {boolean}
   */
  isDraggingNow() {
    return this.isDragging;
  }
}

export default MouseControl;