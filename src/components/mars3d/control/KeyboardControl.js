/**
 * Mars3D 键盘控制类
 * @class KeyboardControl
 * @extends BaseControl
 * @description 处理键盘交互事件和操作
 */

import * as Cesium from 'cesium';
import { BaseControl } from './BaseControl.js';
import { EventType } from '../core/index.js';

export class KeyboardControl extends BaseControl {
  /**
   * 构造函数
   * @param {object} options - 配置选项
   */
  constructor(options = {}) {
    super({
      type: 'KeyboardControl',
      ...options
    });

    // 按键状态
    this.pressedKeys = new Set();
    this.modifierKeys = {
      ctrl: false,
      alt: false,
      shift: false,
      meta: false
    };
    
    // 事件监听器
    this._keyDownListener = null;
    this._keyUpListener = null;
    this._keyPressListener = null;
    
    // 配置选项
    this.options = {
      enableCameraControl: true,
      enableShortcuts: true,
      moveSpeed: 10, // 移动速度
      rotateSpeed: 0.1, // 旋转速度
      zoomSpeed: 1000, // 缩放速度
      ...options
    };
    
    // 快捷键映射
    this.shortcuts = {
      // 相机控制
      'W': 'moveForward',
      'S': 'moveBackward',
      'A': 'moveLeft',
      'D': 'moveRight',
      'Q': 'moveUp',
      'E': 'moveDown',
      'ArrowUp': 'rotateUp',
      'ArrowDown': 'rotateDown',
      'ArrowLeft': 'rotateLeft',
      'ArrowRight': 'rotateRight',
      '+': 'zoomIn',
      '-': 'zoomOut',
      
      // 功能快捷键
      'F': 'flyHome',
      'R': 'reset',
      'H': 'showHelp',
      'Escape': 'cancel',
      'Delete': 'delete',
      'Enter': 'confirm',
      'Space': 'pause',
      
      // 组合键
      'Ctrl+Z': 'undo',
      'Ctrl+Y': 'redo',
      'Ctrl+C': 'copy',
      'Ctrl+V': 'paste',
      'Ctrl+A': 'selectAll',
      'Ctrl+S': 'save',
      'Ctrl+O': 'open'
    };
    
    // 合并用户自定义快捷键
    if (options.shortcuts) {
      Object.assign(this.shortcuts, options.shortcuts);
    }
  }

  /**
   * 添加到地图的内部实现
   * @protected
   */
  _addToMap() {
    if (!this.viewer) return;
    
    // 绑定键盘事件
    this._keyDownListener = this._onKeyDown.bind(this);
    this._keyUpListener = this._onKeyUp.bind(this);
    this._keyPressListener = this._onKeyPress.bind(this);
    
    document.addEventListener('keydown', this._keyDownListener);
    document.addEventListener('keyup', this._keyUpListener);
    document.addEventListener('keypress', this._keyPressListener);
    
    // 禁用Cesium默认键盘控制（如果需要）
    if (this.options.enableCameraControl) {
      this.scene.screenSpaceCameraController.enableInputs = false;
    }
  }

  /**
   * 从地图移除的内部实现
   * @protected
   */
  _removeFromMap() {
    // 移除键盘事件监听
    if (this._keyDownListener) {
      document.removeEventListener('keydown', this._keyDownListener);
      this._keyDownListener = null;
    }
    
    if (this._keyUpListener) {
      document.removeEventListener('keyup', this._keyUpListener);
      this._keyUpListener = null;
    }
    
    if (this._keyPressListener) {
      document.removeEventListener('keypress', this._keyPressListener);
      this._keyPressListener = null;
    }
    
    // 恢复Cesium默认键盘控制
    if (this.scene && this.scene.screenSpaceCameraController) {
      this.scene.screenSpaceCameraController.enableInputs = true;
    }
    
    // 清空按键状态
    this.pressedKeys.clear();
    this._resetModifierKeys();
  }

  /**
   * 键盘按下事件处理
   * @private
   */
  _onKeyDown(event) {
    if (!this.enabled) return;
    
    const key = event.key;
    const code = event.code;
    
    // 更新按键状态
    this.pressedKeys.add(key);
    this._updateModifierKeys(event);
    
    // 处理快捷键
    if (this.options.enableShortcuts) {
      const shortcutKey = this._getShortcutKey(event);
      if (this.shortcuts[shortcutKey]) {
        const action = this.shortcuts[shortcutKey];
        this._executeAction(action, event);
        
        // 阻止默认行为
        event.preventDefault();
        event.stopPropagation();
      }
    }
    
    // 相机控制
    if (this.options.enableCameraControl) {
      this._handleCameraControl();
    }
    
    this.fire(EventType.KEY_DOWN, {
      key,
      code,
      event,
      modifierKeys: { ...this.modifierKeys },
      pressedKeys: Array.from(this.pressedKeys)
    });
  }

  /**
   * 键盘抬起事件处理
   * @private
   */
  _onKeyUp(event) {
    if (!this.enabled) return;
    
    const key = event.key;
    const code = event.code;
    
    // 更新按键状态
    this.pressedKeys.delete(key);
    this._updateModifierKeys(event);
    
    this.fire(EventType.KEY_UP, {
      key,
      code,
      event,
      modifierKeys: { ...this.modifierKeys },
      pressedKeys: Array.from(this.pressedKeys)
    });
  }

  /**
   * 键盘按键事件处理
   * @private
   */
  _onKeyPress(event) {
    if (!this.enabled) return;
    
    const key = event.key;
    const code = event.code;
    
    this.fire(EventType.KEY_PRESS, {
      key,
      code,
      event,
      modifierKeys: { ...this.modifierKeys },
      pressedKeys: Array.from(this.pressedKeys)
    });
  }

  /**
   * 更新修饰键状态
   * @private
   */
  _updateModifierKeys(event) {
    this.modifierKeys.ctrl = event.ctrlKey;
    this.modifierKeys.alt = event.altKey;
    this.modifierKeys.shift = event.shiftKey;
    this.modifierKeys.meta = event.metaKey;
  }

  /**
   * 重置修饰键状态
   * @private
   */
  _resetModifierKeys() {
    this.modifierKeys.ctrl = false;
    this.modifierKeys.alt = false;
    this.modifierKeys.shift = false;
    this.modifierKeys.meta = false;
  }

  /**
   * 获取快捷键字符串
   * @private
   */
  _getShortcutKey(event) {
    const parts = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    parts.push(event.key);
    
    return parts.join('+');
  }

  /**
   * 执行快捷键动作
   * @private
   */
  _executeAction(action, event) {
    switch (action) {
      case 'moveForward':
        this._moveCamera('forward');
        break;
      case 'moveBackward':
        this._moveCamera('backward');
        break;
      case 'moveLeft':
        this._moveCamera('left');
        break;
      case 'moveRight':
        this._moveCamera('right');
        break;
      case 'moveUp':
        this._moveCamera('up');
        break;
      case 'moveDown':
        this._moveCamera('down');
        break;
      case 'rotateUp':
        this._rotateCamera('up');
        break;
      case 'rotateDown':
        this._rotateCamera('down');
        break;
      case 'rotateLeft':
        this._rotateCamera('left');
        break;
      case 'rotateRight':
        this._rotateCamera('right');
        break;
      case 'zoomIn':
        this._zoomCamera('in');
        break;
      case 'zoomOut':
        this._zoomCamera('out');
        break;
      case 'flyHome':
        this._flyHome();
        break;
      case 'reset':
        this._resetCamera();
        break;
      default:
        // 触发自定义动作事件
        this.fire(EventType.SHORTCUT_ACTION, {
          action,
          event,
          modifierKeys: { ...this.modifierKeys }
        });
        break;
    }
  }

  /**
   * 处理相机控制
   * @private
   */
  _handleCameraControl() {
    if (!this.camera) return;
    
    // 连续按键处理
    requestAnimationFrame(() => {
      if (this.pressedKeys.has('W')) this._moveCamera('forward');
      if (this.pressedKeys.has('S')) this._moveCamera('backward');
      if (this.pressedKeys.has('A')) this._moveCamera('left');
      if (this.pressedKeys.has('D')) this._moveCamera('right');
      if (this.pressedKeys.has('Q')) this._moveCamera('up');
      if (this.pressedKeys.has('E')) this._moveCamera('down');
    });
  }

  /**
   * 移动相机
   * @private
   */
  _moveCamera(direction) {
    if (!this.camera) return;
    
    const moveSpeed = this.options.moveSpeed;
    
    switch (direction) {
      case 'forward':
        this.camera.moveForward(moveSpeed);
        break;
      case 'backward':
        this.camera.moveBackward(moveSpeed);
        break;
      case 'left':
        this.camera.moveLeft(moveSpeed);
        break;
      case 'right':
        this.camera.moveRight(moveSpeed);
        break;
      case 'up':
        this.camera.moveUp(moveSpeed);
        break;
      case 'down':
        this.camera.moveDown(moveSpeed);
        break;
    }
  }

  /**
   * 旋转相机
   * @private
   */
  _rotateCamera(direction) {
    if (!this.camera) return;
    
    const rotateSpeed = this.options.rotateSpeed;
    
    switch (direction) {
      case 'up':
        this.camera.look(this.camera.up, -rotateSpeed);
        break;
      case 'down':
        this.camera.look(this.camera.up, rotateSpeed);
        break;
      case 'left':
        this.camera.look(this.camera.right, -rotateSpeed);
        break;
      case 'right':
        this.camera.look(this.camera.right, rotateSpeed);
        break;
    }
  }

  /**
   * 缩放相机
   * @private
   */
  _zoomCamera(direction) {
    if (!this.camera) return;
    
    const zoomSpeed = this.options.zoomSpeed;
    
    if (direction === 'in') {
      this.camera.zoomIn(zoomSpeed);
    } else if (direction === 'out') {
      this.camera.zoomOut(zoomSpeed);
    }
  }

  /**
   * 飞行到主视角
   * @private
   */
  _flyHome() {
    if (this.viewer) {
      this.viewer.camera.flyHome();
    }
  }

  /**
   * 重置相机
   * @private
   */
  _resetCamera() {
    if (this.viewer) {
      this.viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(116.3, 39.9, 15000000)
      });
    }
  }

  /**
   * 检查按键是否被按下
   * @param {string} key - 按键
   * @returns {boolean}
   */
  isKeyPressed(key) {
    return this.pressedKeys.has(key);
  }

  /**
   * 获取当前按下的所有按键
   * @returns {Array<string>}
   */
  getPressedKeys() {
    return Array.from(this.pressedKeys);
  }

  /**
   * 获取修饰键状态
   * @returns {object}
   */
  getModifierKeys() {
    return { ...this.modifierKeys };
  }

  /**
   * 添加快捷键
   * @param {string} key - 快捷键
   * @param {string} action - 动作
   */
  addShortcut(key, action) {
    this.shortcuts[key] = action;
    return this;
  }

  /**
   * 移除快捷键
   * @param {string} key - 快捷键
   */
  removeShortcut(key) {
    delete this.shortcuts[key];
    return this;
  }

  /**
   * 获取所有快捷键
   * @returns {object}
   */
  getShortcuts() {
    return { ...this.shortcuts };
  }
}

export default KeyboardControl;