/**
 * Mars3D 后处理效果类
 * @class PostProcessEffect
 * @extends BaseEffect
 * @description 屏幕后处理效果，支持各种视觉滤镜和特效
 */

import * as Cesium from 'cesium';
import { BaseEffect } from './BaseEffect.js';

export class PostProcessEffect extends BaseEffect {
  /**
   * 构造函数
   * @param {object} options - 配置选项
   */
  constructor(options = {}) {
    super({
      type: 'PostProcessEffect',
      ...options
    });

    // 后处理阶段
    this.postProcessStages = [];
    this.postProcessStageCollection = null;
    
    // 效果类型
    this.effectType = options.effectType || 'bloom'; // bloom, blur, sepia, grayscale, invert, custom
    
    // 效果参数
    this.effectParams = {
      // 泛光效果参数
      bloomIntensity: options.bloomIntensity || 1.0,
      bloomThreshold: options.bloomThreshold || 0.8,
      bloomRadius: options.bloomRadius || 1.0,
      
      // 模糊效果参数
      blurRadius: options.blurRadius || 5.0,
      blurSigma: options.blurSigma || 2.0,
      
      // 颜色调整参数
      brightness: options.brightness || 0.0,
      contrast: options.contrast || 1.0,
      saturation: options.saturation || 1.0,
      hue: options.hue || 0.0,
      gamma: options.gamma || 1.0,
      
      // 自定义着色器参数
      customUniforms: options.customUniforms || {},
      
      ...options.effectParams
    };
    
    // 着色器代码
    this.shaderCode = options.shaderCode || null;
    
    // 预设效果配置
    this._applyPresetEffect();
  }

  /**
   * 添加到地图的内部实现
   * @protected
   */
  _addToMap() {
    if (!this.scene) return;
    
    // 创建后处理阶段集合
    this.postProcessStageCollection = new Cesium.PostProcessStageCollection();
    
    // 创建后处理阶段
    this._createPostProcessStages();
    
    // 添加到场景
    this.scene.postProcessStages.add(this.postProcessStageCollection);
  }

  /**
   * 从地图移除的内部实现
   * @protected
   */
  _removeFromMap() {
    if (this.postProcessStageCollection && this.scene) {
      this.scene.postProcessStages.remove(this.postProcessStageCollection);
    }
    
    this._destroyPostProcessStages();
  }

  /**
   * 启用时的内部实现
   * @protected
   */
  _onEnable() {
    if (this.postProcessStageCollection) {
      this.postProcessStageCollection.enabled = true;
    }
  }

  /**
   * 禁用时的内部实现
   * @protected
   */
  _onDisable() {
    if (this.postProcessStageCollection) {
      this.postProcessStageCollection.enabled = false;
    }
  }

  /**
   * 更新时的内部实现
   * @protected
   * @param {number} elapsedTime - 已过时间
   * @param {number} progress - 进度（0-1）
   */
  _onUpdate(elapsedTime, progress) {
    // 根据时间更新效果参数
    this._updateEffectParams(elapsedTime, progress);
  }

  /**
   * 强度变化时的内部实现
   * @protected
   * @param {number} intensity - 强度值
   */
  _onIntensityChange(intensity) {
    this._updateIntensity(intensity);
  }

  /**
   * 创建后处理阶段
   * @private
   */
  _createPostProcessStages() {
    switch (this.effectType) {
      case 'bloom':
        this._createBloomEffect();
        break;
      case 'blur':
        this._createBlurEffect();
        break;
      case 'sepia':
        this._createSepiaEffect();
        break;
      case 'grayscale':
        this._createGrayscaleEffect();
        break;
      case 'invert':
        this._createInvertEffect();
        break;
      case 'nightVision':
        this._createNightVisionEffect();
        break;
      case 'thermalVision':
        this._createThermalVisionEffect();
        break;
      case 'custom':
        this._createCustomEffect();
        break;
      default:
        this._createBloomEffect();
        break;
    }
  }

  /**
   * 创建泛光效果
   * @private
   */
  _createBloomEffect() {
    const bloomStage = Cesium.PostProcessStageLibrary.createBloomStage();
    bloomStage.uniforms.glowOnly = false;
    bloomStage.uniforms.contrast = this.effectParams.bloomIntensity;
    bloomStage.uniforms.brightness = this.effectParams.bloomThreshold;
    bloomStage.uniforms.delta = this.effectParams.bloomRadius;
    
    this.postProcessStages.push(bloomStage);
    this.postProcessStageCollection.add(bloomStage);
  }

  /**
   * 创建模糊效果
   * @private
   */
  _createBlurEffect() {
    const blurStage = Cesium.PostProcessStageLibrary.createBlurStage();
    blurStage.uniforms.delta = this.effectParams.blurRadius;
    blurStage.uniforms.sigma = this.effectParams.blurSigma;
    
    this.postProcessStages.push(blurStage);
    this.postProcessStageCollection.add(blurStage);
  }

  /**
   * 创建棕褐色效果
   * @private
   */
  _createSepiaEffect() {
    const fragmentShader = `
      uniform sampler2D colorTexture;
      varying vec2 v_textureCoordinates;
      
      void main() {
        vec4 color = texture2D(colorTexture, v_textureCoordinates);
        
        float r = color.r;
        float g = color.g;
        float b = color.b;
        
        color.r = min(1.0, (r * 0.393) + (g * 0.769) + (b * 0.189));
        color.g = min(1.0, (r * 0.349) + (g * 0.686) + (b * 0.168));
        color.b = min(1.0, (r * 0.272) + (g * 0.534) + (b * 0.131));
        
        gl_FragColor = color;
      }
    `;
    
    const sepiaStage = new Cesium.PostProcessStage({
      fragmentShader: fragmentShader
    });
    
    this.postProcessStages.push(sepiaStage);
    this.postProcessStageCollection.add(sepiaStage);
  }

  /**
   * 创建灰度效果
   * @private
   */
  _createGrayscaleEffect() {
    const fragmentShader = `
      uniform sampler2D colorTexture;
      varying vec2 v_textureCoordinates;
      
      void main() {
        vec4 color = texture2D(colorTexture, v_textureCoordinates);
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        gl_FragColor = vec4(gray, gray, gray, color.a);
      }
    `;
    
    const grayscaleStage = new Cesium.PostProcessStage({
      fragmentShader: fragmentShader
    });
    
    this.postProcessStages.push(grayscaleStage);
    this.postProcessStageCollection.add(grayscaleStage);
  }

  /**
   * 创建反色效果
   * @private
   */
  _createInvertEffect() {
    const fragmentShader = `
      uniform sampler2D colorTexture;
      varying vec2 v_textureCoordinates;
      
      void main() {
        vec4 color = texture2D(colorTexture, v_textureCoordinates);
        gl_FragColor = vec4(1.0 - color.rgb, color.a);
      }
    `;
    
    const invertStage = new Cesium.PostProcessStage({
      fragmentShader: fragmentShader
    });
    
    this.postProcessStages.push(invertStage);
    this.postProcessStageCollection.add(invertStage);
  }

  /**
   * 创建夜视效果
   * @private
   */
  _createNightVisionEffect() {
    const fragmentShader = `
      uniform sampler2D colorTexture;
      uniform float time;
      varying vec2 v_textureCoordinates;
      
      void main() {
        vec4 color = texture2D(colorTexture, v_textureCoordinates);
        
        // 转换为亮度
        float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        
        // 增强亮度
        luminance = pow(luminance, 0.5) * 2.0;
        
        // 添加绿色调
        vec3 nightColor = vec3(0.1, luminance, 0.1);
        
        // 添加噪点效果
        float noise = fract(sin(dot(v_textureCoordinates + time, vec2(12.9898, 78.233))) * 43758.5453);
        nightColor += noise * 0.1;
        
        gl_FragColor = vec4(nightColor, color.a);
      }
    `;
    
    const nightVisionStage = new Cesium.PostProcessStage({
      fragmentShader: fragmentShader,
      uniforms: {
        time: 0.0
      }
    });
    
    this.postProcessStages.push(nightVisionStage);
    this.postProcessStageCollection.add(nightVisionStage);
  }

  /**
   * 创建热成像效果
   * @private
   */
  _createThermalVisionEffect() {
    const fragmentShader = `
      uniform sampler2D colorTexture;
      varying vec2 v_textureCoordinates;
      
      void main() {
        vec4 color = texture2D(colorTexture, v_textureCoordinates);
        
        // 转换为亮度
        float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        
        // 热成像颜色映射
        vec3 thermalColor;
        if (luminance < 0.2) {
          thermalColor = mix(vec3(0.0, 0.0, 0.5), vec3(0.0, 0.0, 1.0), luminance * 5.0);
        } else if (luminance < 0.4) {
          thermalColor = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), (luminance - 0.2) * 5.0);
        } else if (luminance < 0.6) {
          thermalColor = mix(vec3(0.0, 1.0, 1.0), vec3(0.0, 1.0, 0.0), (luminance - 0.4) * 5.0);
        } else if (luminance < 0.8) {
          thermalColor = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), (luminance - 0.6) * 5.0);
        } else {
          thermalColor = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (luminance - 0.8) * 5.0);
        }
        
        gl_FragColor = vec4(thermalColor, color.a);
      }
    `;
    
    const thermalStage = new Cesium.PostProcessStage({
      fragmentShader: fragmentShader
    });
    
    this.postProcessStages.push(thermalStage);
    this.postProcessStageCollection.add(thermalStage);
  }

  /**
   * 创建自定义效果
   * @private
   */
  _createCustomEffect() {
    if (!this.shaderCode) {
      console.warn('Custom effect requires shader code');
      return;
    }
    
    const customStage = new Cesium.PostProcessStage({
      fragmentShader: this.shaderCode,
      uniforms: this.effectParams.customUniforms
    });
    
    this.postProcessStages.push(customStage);
    this.postProcessStageCollection.add(customStage);
  }

  /**
   * 销毁后处理阶段
   * @private
   */
  _destroyPostProcessStages() {
    this.postProcessStages.forEach(stage => {
      if (stage && !stage.isDestroyed()) {
        stage.destroy();
      }
    });
    
    this.postProcessStages = [];
    
    if (this.postProcessStageCollection && !this.postProcessStageCollection.isDestroyed()) {
      this.postProcessStageCollection.destroy();
      this.postProcessStageCollection = null;
    }
  }

  /**
   * 更新效果参数
   * @private
   * @param {number} elapsedTime - 已过时间
   * @param {number} progress - 进度（0-1）
   */
  _updateEffectParams(elapsedTime, progress) {
    if (this.effectType === 'nightVision') {
      // 更新夜视效果的时间参数
      const nightVisionStage = this.postProcessStages[0];
      if (nightVisionStage && nightVisionStage.uniforms) {
        nightVisionStage.uniforms.time = elapsedTime * 0.001;
      }
    }
  }

  /**
   * 更新强度
   * @private
   * @param {number} intensity - 强度值
   */
  _updateIntensity(intensity) {
    this.postProcessStages.forEach(stage => {
      if (stage.uniforms) {
        // 根据不同效果类型调整不同的参数
        if (this.effectType === 'bloom') {
          stage.uniforms.contrast = this.effectParams.bloomIntensity * intensity;
        } else if (this.effectType === 'blur') {
          stage.uniforms.delta = this.effectParams.blurRadius * intensity;
        }
      }
    });
  }

  /**
   * 应用预设效果
   * @private
   */
  _applyPresetEffect() {
    // 根据效果类型设置默认参数
    switch (this.effectType) {
      case 'bloom':
        this.effectParams.bloomIntensity = this.effectParams.bloomIntensity || 1.5;
        this.effectParams.bloomThreshold = this.effectParams.bloomThreshold || 0.8;
        break;
      case 'blur':
        this.effectParams.blurRadius = this.effectParams.blurRadius || 5.0;
        break;
      // 其他效果类型的默认参数...
    }
  }

  /**
   * 设置效果参数
   * @param {string} name - 参数名
   * @param {*} value - 参数值
   */
  setEffectParam(name, value) {
    this.effectParams[name] = value;
    
    // 更新对应的uniform
    this.postProcessStages.forEach(stage => {
      if (stage.uniforms && stage.uniforms[name] !== undefined) {
        stage.uniforms[name] = value;
      }
    });
    
    return this;
  }

  /**
   * 获取效果参数
   * @param {string} name - 参数名
   * @returns {*} 参数值
   */
  getEffectParam(name) {
    return this.effectParams[name];
  }

  /**
   * 设置多个效果参数
   * @param {object} params - 参数对象
   */
  setEffectParams(params) {
    Object.keys(params).forEach(name => {
      this.setEffectParam(name, params[name]);
    });
    return this;
  }

  /**
   * 获取所有效果参数
   * @returns {object} 参数对象
   */
  getEffectParams() {
    return { ...this.effectParams };
  }

  /**
   * 设置自定义着色器
   * @param {string} fragmentShader - 片段着色器代码
   * @param {object} uniforms - uniform变量
   */
  setCustomShader(fragmentShader, uniforms = {}) {
    this.shaderCode = fragmentShader;
    this.effectParams.customUniforms = uniforms;
    this.effectType = 'custom';
    
    // 如果已经添加到地图，重新创建效果
    if (this._isActive) {
      this._removeFromMap();
      this._addToMap();
    }
    
    return this;
  }

  /**
   * 切换效果类型
   * @param {string} type - 效果类型
   */
  switchEffect(type) {
    if (this.effectType === type) return this;
    
    this.effectType = type;
    this._applyPresetEffect();
    
    // 如果已经添加到地图，重新创建效果
    if (this._isActive) {
      this._removeFromMap();
      this._addToMap();
    }
    
    return this;
  }
}

export default PostProcessEffect;