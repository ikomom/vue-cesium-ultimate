/**
 * Mars3D 粒子效果类
 * @class ParticleEffect
 * @extends BaseEffect
 * @description 粒子系统效果，支持各种粒子动画
 */

import * as Cesium from 'cesium';
import { BaseEffect } from './BaseEffect.js';
import { PointUtil } from '../core/index.js';

export class ParticleEffect extends BaseEffect {
  /**
   * 构造函数
   * @param {object} options - 配置选项
   */
  constructor(options = {}) {
    super({
      type: 'ParticleEffect',
      duration: 10000, // 默认10秒
      ...options
    });

    // 粒子系统
    this.particleSystem = null;
    
    // 位置信息
    this.position = options.position || [116.3, 39.9, 0]; // 经纬度高度
    this.cartesianPosition = null;
    
    // 粒子配置
    this.particleOptions = {
      // 基本属性
      image: options.image || this._createDefaultTexture(),
      startColor: options.startColor || Cesium.Color.WHITE,
      endColor: options.endColor || Cesium.Color.TRANSPARENT,
      startScale: options.startScale || 1.0,
      endScale: options.endScale || 0.0,
      
      // 生命周期
      particleLife: options.particleLife || 5.0,
      minimumParticleLife: options.minimumParticleLife || 1.0,
      maximumParticleLife: options.maximumParticleLife || 5.0,
      
      // 发射属性
      rate: options.rate || 50.0, // 每秒发射粒子数
      burst: options.burst || [], // 爆发发射
      
      // 速度
      speed: options.speed || 5.0,
      minimumSpeed: options.minimumSpeed || 1.0,
      maximumSpeed: options.maximumSpeed || 10.0,
      
      // 大小
      imageSize: options.imageSize || new Cesium.Cartesian2(10, 10),
      minimumImageSize: options.minimumImageSize || new Cesium.Cartesian2(5, 5),
      maximumImageSize: options.maximumImageSize || new Cesium.Cartesian2(15, 15),
      
      // 发射器
      emitter: options.emitter || new Cesium.CircleEmitter(2.0),
      
      // 更新函数
      updateCallback: options.updateCallback || null,
      
      ...options.particleOptions
    };
    
    // 效果类型
    this.effectType = options.effectType || 'default'; // default, fire, smoke, rain, snow, explosion
    
    // 预设效果配置
    this._applyPresetEffect();
  }

  /**
   * 添加到地图的内部实现
   * @protected
   */
  _addToMap() {
    if (!this.scene) return;
    
    // 转换位置坐标
    this.cartesianPosition = PointUtil.fromDegrees(
      this.position[0], 
      this.position[1], 
      this.position[2] || 0
    );
    
    // 创建粒子系统
    this._createParticleSystem();
  }

  /**
   * 从地图移除的内部实现
   * @protected
   */
  _removeFromMap() {
    if (this.particleSystem) {
      this.scene.primitives.remove(this.particleSystem);
      this.particleSystem = null;
    }
  }

  /**
   * 开始时的内部实现
   * @protected
   */
  _onStart() {
    if (this.particleSystem) {
      this.particleSystem.show = true;
    }
  }

  /**
   * 停止时的内部实现
   * @protected
   */
  _onStop() {
    if (this.particleSystem) {
      this.particleSystem.show = false;
    }
  }

  /**
   * 暂停时的内部实现
   * @protected
   */
  _onPause() {
    if (this.particleSystem) {
      this.particleSystem.show = false;
    }
  }

  /**
   * 恢复时的内部实现
   * @protected
   */
  _onResume() {
    if (this.particleSystem) {
      this.particleSystem.show = true;
    }
  }

  /**
   * 更新时的内部实现
   * @protected
   * @param {number} elapsedTime - 已过时间
   * @param {number} progress - 进度（0-1）
   */
  _onUpdate(elapsedTime, progress) {
    if (!this.particleSystem) return;
    
    // 根据进度调整粒子属性
    if (this.particleOptions.updateCallback) {
      this.particleOptions.updateCallback(this.particleSystem, elapsedTime, progress);
    }
    
    // 默认更新逻辑
    this._updateParticleProperties(progress);
  }

  /**
   * 强度变化时的内部实现
   * @protected
   * @param {number} intensity - 强度值
   */
  _onIntensityChange(intensity) {
    if (!this.particleSystem) return;
    
    // 调整发射率
    this.particleSystem.rate = this.particleOptions.rate * intensity;
    
    // 调整透明度
    const alpha = Math.min(1.0, intensity);
    this.particleSystem.startColor = Cesium.Color.fromAlpha(
      this.particleOptions.startColor,
      this.particleOptions.startColor.alpha * alpha
    );
  }

  /**
   * 创建粒子系统
   * @private
   */
  _createParticleSystem() {
    const options = {
      image: this.particleOptions.image,
      startColor: this.particleOptions.startColor,
      endColor: this.particleOptions.endColor,
      startScale: this.particleOptions.startScale,
      endScale: this.particleOptions.endScale,
      particleLife: this.particleOptions.particleLife,
      minimumParticleLife: this.particleOptions.minimumParticleLife,
      maximumParticleLife: this.particleOptions.maximumParticleLife,
      rate: this.particleOptions.rate,
      burst: this.particleOptions.burst,
      speed: this.particleOptions.speed,
      minimumSpeed: this.particleOptions.minimumSpeed,
      maximumSpeed: this.particleOptions.maximumSpeed,
      imageSize: this.particleOptions.imageSize,
      minimumImageSize: this.particleOptions.minimumImageSize,
      maximumImageSize: this.particleOptions.maximumImageSize,
      emitter: this.particleOptions.emitter,
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(this.cartesianPosition),
      show: false
    };
    
    this.particleSystem = new Cesium.ParticleSystem(options);
    this.scene.primitives.add(this.particleSystem);
  }

  /**
   * 更新粒子属性
   * @private
   * @param {number} progress - 进度（0-1）
   */
  _updateParticleProperties(progress) {
    // 可以根据进度调整各种属性
    // 例如：颜色渐变、大小变化、速度变化等
  }

  /**
   * 应用预设效果
   * @private
   */
  _applyPresetEffect() {
    switch (this.effectType) {
      case 'fire':
        this._applyFireEffect();
        break;
      case 'smoke':
        this._applySmokeEffect();
        break;
      case 'rain':
        this._applyRainEffect();
        break;
      case 'snow':
        this._applySnowEffect();
        break;
      case 'explosion':
        this._applyExplosionEffect();
        break;
      default:
        // 使用默认配置
        break;
    }
  }

  /**
   * 应用火焰效果
   * @private
   */
  _applyFireEffect() {
    Object.assign(this.particleOptions, {
      startColor: Cesium.Color.YELLOW,
      endColor: Cesium.Color.RED.withAlpha(0.0),
      startScale: 0.5,
      endScale: 2.0,
      particleLife: 2.0,
      rate: 100.0,
      speed: 8.0,
      emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(15.0)),
      imageSize: new Cesium.Cartesian2(20, 20)
    });
  }

  /**
   * 应用烟雾效果
   * @private
   */
  _applySmokeEffect() {
    Object.assign(this.particleOptions, {
      startColor: Cesium.Color.LIGHTGRAY,
      endColor: Cesium.Color.WHITE.withAlpha(0.0),
      startScale: 1.0,
      endScale: 3.0,
      particleLife: 4.0,
      rate: 30.0,
      speed: 3.0,
      emitter: new Cesium.CircleEmitter(1.0),
      imageSize: new Cesium.Cartesian2(30, 30)
    });
  }

  /**
   * 应用雨效果
   * @private
   */
  _applyRainEffect() {
    Object.assign(this.particleOptions, {
      startColor: Cesium.Color.LIGHTBLUE,
      endColor: Cesium.Color.BLUE.withAlpha(0.0),
      startScale: 0.1,
      endScale: 0.1,
      particleLife: 3.0,
      rate: 200.0,
      speed: 20.0,
      emitter: new Cesium.BoxEmitter(new Cesium.Cartesian3(50, 50, 1)),
      imageSize: new Cesium.Cartesian2(2, 10)
    });
  }

  /**
   * 应用雪效果
   * @private
   */
  _applySnowEffect() {
    Object.assign(this.particleOptions, {
      startColor: Cesium.Color.WHITE,
      endColor: Cesium.Color.WHITE.withAlpha(0.0),
      startScale: 0.5,
      endScale: 0.5,
      particleLife: 5.0,
      rate: 50.0,
      speed: 5.0,
      emitter: new Cesium.BoxEmitter(new Cesium.Cartesian3(30, 30, 1)),
      imageSize: new Cesium.Cartesian2(8, 8)
    });
  }

  /**
   * 应用爆炸效果
   * @private
   */
  _applyExplosionEffect() {
    Object.assign(this.particleOptions, {
      startColor: Cesium.Color.ORANGE,
      endColor: Cesium.Color.RED.withAlpha(0.0),
      startScale: 0.2,
      endScale: 1.5,
      particleLife: 1.0,
      rate: 0.0, // 使用爆发模式
      burst: [
        new Cesium.ParticleBurst({
          time: 0.0,
          minimum: 100,
          maximum: 200
        })
      ],
      speed: 15.0,
      emitter: new Cesium.SphereEmitter(0.5),
      imageSize: new Cesium.Cartesian2(15, 15)
    });
    
    // 爆炸效果不循环
    this.loop = false;
    this.duration = 2000;
  }

  /**
   * 创建默认纹理
   * @private
   * @returns {string} 纹理数据URL
   */
  _createDefaultTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    return canvas.toDataURL();
  }

  /**
   * 设置位置
   * @param {Array<number>} position - 位置[经度, 纬度, 高度]
   */
  setPosition(position) {
    this.position = [...position];
    
    if (this.cartesianPosition && this.particleSystem) {
      this.cartesianPosition = PointUtil.fromDegrees(
        position[0], 
        position[1], 
        position[2] || 0
      );
      
      this.particleSystem.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
        this.cartesianPosition
      );
    }
    
    return this;
  }

  /**
   * 获取位置
   * @returns {Array<number>} 位置[经度, 纬度, 高度]
   */
  getPosition() {
    return [...this.position];
  }

  /**
   * 设置发射率
   * @param {number} rate - 发射率
   */
  setRate(rate) {
    this.particleOptions.rate = rate;
    if (this.particleSystem) {
      this.particleSystem.rate = rate * this.intensity;
    }
    return this;
  }

  /**
   * 设置粒子生命周期
   * @param {number} life - 生命周期（秒）
   */
  setParticleLife(life) {
    this.particleOptions.particleLife = life;
    if (this.particleSystem) {
      this.particleSystem.particleLife = life;
    }
    return this;
  }

  /**
   * 设置粒子速度
   * @param {number} speed - 速度
   */
  setSpeed(speed) {
    this.particleOptions.speed = speed;
    if (this.particleSystem) {
      this.particleSystem.speed = speed;
    }
    return this;
  }

  /**
   * 设置粒子颜色
   * @param {Cesium.Color} startColor - 起始颜色
   * @param {Cesium.Color} endColor - 结束颜色
   */
  setColors(startColor, endColor) {
    this.particleOptions.startColor = startColor;
    this.particleOptions.endColor = endColor;
    
    if (this.particleSystem) {
      this.particleSystem.startColor = startColor;
      this.particleSystem.endColor = endColor;
    }
    return this;
  }

  /**
   * 设置发射器
   * @param {Cesium.ParticleEmitter} emitter - 发射器
   */
  setEmitter(emitter) {
    this.particleOptions.emitter = emitter;
    if (this.particleSystem) {
      this.particleSystem.emitter = emitter;
    }
    return this;
  }

  /**
   * 触发爆发
   * @param {number} count - 粒子数量
   */
  burst(count = 50) {
    if (this.particleSystem) {
      const burst = new Cesium.ParticleBurst({
        time: 0.0,
        minimum: count,
        maximum: count
      });
      
      this.particleSystem.burst = [burst];
    }
    return this;
  }
}

export default ParticleEffect;