/**
 * 动画效果管理器
 * 处理visualProperties中定义的各种动画效果
 */

/**
 * 动画效果类型枚举
 */
const ANIMATION_TYPES = {
  PULSE: 'pulse',
  SLOW_BLINK: 'slow-blink',
  URGENT_BLINK: 'urgent-blink',
  URGENT_PULSE: 'urgent-pulse',
  SLOW_ROTATE: 'slow-rotate',
  GENTLE_SWAY: 'gentle-sway',
  FADE_OUT: 'fade-out',
  PROGRESS_FILL: 'progress-fill',
  RADAR_SWEEP: 'radar-sweep',
}

/**
 * 动画效果管理器
 */
class AnimationEffectManager {
  constructor() {
    this.activeAnimations = new Map()
    this.animationCallbacks = new Map()
    // 添加动画函数缓存
    this.animationCache = new Map()
  }

  /**
   * 创建脉冲动画
   * @param {number} rate - 脉冲频率 (Hz)
   * @param {number} minScale - 最小缩放
   * @param {number} maxScale - 最大缩放
   */
  createPulseAnimation(rate = 1, minScale = 0.8, maxScale = 1.2) {
    const startTime = Date.now() / 1000
    return (time, baseScale = 1.0) => {
      const currentTime = Date.now() / 1000
      const elapsedTime = currentTime - startTime
      const cycle = Math.sin(elapsedTime * rate * 2 * Math.PI)
      const scale = minScale + ((maxScale - minScale) * (cycle + 1)) / 2
      return baseScale * scale
    }
  }

  /**
   * 创建闪烁动画
   * @param {number} rate - 闪烁频率 (Hz)
   * @param {number} minOpacity - 最小透明度
   * @param {number} maxOpacity - 最大透明度
   */
  createBlinkAnimation(rate = 2, minOpacity = 0.3, maxOpacity = 1.0) {
    const startTime = Date.now() / 1000
    return (time, baseOpacity = 1.0) => {
      const currentTime = Date.now() / 1000
      const elapsedTime = currentTime - startTime
      const cycle = Math.sin(elapsedTime * rate * 2 * Math.PI)
      const opacity = minOpacity + ((maxOpacity - minOpacity) * (cycle + 1)) / 2
      return baseOpacity * opacity
    }
  }

  /**
   * 创建旋转动画
   * @param {string} speed - 旋转速度 ('slow', 'medium', 'fast')
   */
  createRotateAnimation(speed = 'slow') {
    const speedMap = {
      slow: 0.1,
      medium: 0.3,
      fast: 0.6,
    }
    const rotateSpeed = speedMap[speed] || speedMap.slow
    const startTime = Date.now() / 1000 // 记录动画开始时间

    return (time) => {
      // 使用当前实际时间而不是Cesium时间，确保动画连续性
      const currentTime = Date.now() / 1000
      const elapsedTime = currentTime - startTime
      return elapsedTime * rotateSpeed * 2 * Math.PI
    }
  }

  /**
   * 创建摆动动画
   * @param {string} amplitude - 摆动幅度 ('small', 'medium', 'large')
   */
  createSwayAnimation(amplitude = 'small') {
    const amplitudeMap = {
      small: 0.05,
      medium: 0.1,
      large: 0.2,
    }
    const swayAmplitude = amplitudeMap[amplitude] || amplitudeMap.small
    const startTime = Date.now() / 1000

    return (time, baseScale = 1.0) => {
      const currentTime = Date.now() / 1000
      const elapsedTime = currentTime - startTime
      const sway = Math.sin(elapsedTime * 0.5 * 2 * Math.PI) * swayAmplitude
      return baseScale * (1.0 + sway)
    }
  }

  /**
   * 创建淡出动画
   * @param {string} speed - 淡出速度 ('slow', 'medium', 'fast')
   */
  createFadeAnimation(speed = 'slow') {
    const speedMap = {
      slow: 0.5,
      medium: 1.0,
      fast: 2.0,
    }
    const fadeSpeed = speedMap[speed] || speedMap.slow
    const startTime = Date.now() / 1000

    return (time, baseOpacity = 1.0) => {
      const currentTime = Date.now() / 1000
      const elapsedTime = currentTime - startTime
      const fade = Math.abs(Math.sin(elapsedTime * fadeSpeed * Math.PI))
      return baseOpacity * (0.3 + 0.7 * fade)
    }
  }

  /**
   * 创建进度填充动画
   * @param {string} speed - 进度速度 ('slow', 'medium', 'fast')
   */
  createProgressAnimation(speed = 'medium') {
    const speedMap = {
      slow: 0.2,
      medium: 0.5,
      fast: 1.0,
    }
    const progressSpeed = speedMap[speed] || speedMap.medium
    const startTime = Date.now() / 1000

    return (time, baseScale = 1.0) => {
      const currentTime = Date.now() / 1000
      const elapsedTime = currentTime - startTime
      const progress = (Math.sin(elapsedTime * progressSpeed * Math.PI) + 1) / 2
      return baseScale * (0.8 + 0.4 * progress)
    }
  }

  /**
   * 创建雷达扫描动画
   * @param {string} speed - 扫描速度 ('slow', 'medium', 'fast')
   */
  createRadarSweepAnimation(speed = 'medium') {
    const speedMap = {
      slow: 0.3,
      medium: 0.6,
      fast: 1.2,
    }
    const sweepSpeed = speedMap[speed] || speedMap.medium
    const startTime = Date.now() / 1000

    return (time, baseScale = 1.0) => {
      const currentTime = Date.now() / 1000
      const elapsedTime = currentTime - startTime
      const sweep = Math.abs(Math.sin(elapsedTime * sweepSpeed * Math.PI))
      return baseScale * (0.9 + 0.3 * sweep)
    }
  }

  /**
   * 生成缓存键
   * @param {Object} visualProperties - 视觉属性配置
   * @returns {string} 缓存键
   */
  generateCacheKey(visualProperties) {
    const {
      animationEffect,
      blinkRate,
      pulseRate,
      rotationSpeed,
      swayAmplitude,
      fadeSpeed,
      progressSpeed,
      sweepSpeed,
    } = visualProperties
    return `${animationEffect}_${blinkRate || ''}_${pulseRate || ''}_${rotationSpeed || ''}_${swayAmplitude || ''}_${fadeSpeed || ''}_${progressSpeed || ''}_${sweepSpeed || ''}`
  }

  /**
   * 获取动画效果函数
   * @param {Object} visualProperties - 视觉属性配置
   * @returns {Object} 动画效果函数集合
   */
  getAnimationEffects(visualProperties) {
    if (!visualProperties || !visualProperties.animationEffect) {
      return {}
    }

    // 生成缓存键
    const cacheKey = this.generateCacheKey(visualProperties)

    // 检查缓存
    if (this.animationCache.has(cacheKey)) {
      // console.log(`动画缓存命中: ${cacheKey}`)
      return this.animationCache.get(cacheKey)
    }

    // console.log(`创建新动画函数: ${cacheKey}`)

    const effects = {}
    const { animationEffect } = visualProperties

    switch (animationEffect) {
      case ANIMATION_TYPES.PULSE:
        effects.scaleAnimation = this.createPulseAnimation(1, 0.9, 1.1)
        break

      case ANIMATION_TYPES.SLOW_BLINK:
        const blinkRate = this.parseRate(visualProperties.blinkRate, 2)
        effects.opacityAnimation = this.createBlinkAnimation(blinkRate, 0.4, 1.0)
        break

      case ANIMATION_TYPES.URGENT_BLINK:
        const urgentRate = this.parseRate(visualProperties.blinkRate, 5)
        effects.opacityAnimation = this.createBlinkAnimation(urgentRate, 0.5, 1.0) // 提高最小透明度从0.2到0.5
        // 如果有脉冲配置，同时添加脉冲动画
        if (visualProperties.pulseRate || visualProperties.pulseIntensity) {
          const pulseRate = this.parseRate(visualProperties.pulseRate, 3)
          const pulseIntensity = visualProperties.pulseIntensity || 0.5
          effects.scaleAnimation = this.createPulseAnimation(
            pulseRate,
            1.0 - pulseIntensity * 0.3,
            1.0 + pulseIntensity * 0.3,
          )
        }
        break

      case ANIMATION_TYPES.URGENT_PULSE:
        const pulseRate = this.parseRate(visualProperties.pulseRate, 4)
        effects.scaleAnimation = this.createPulseAnimation(pulseRate, 0.8, 1.3)
        break

      case ANIMATION_TYPES.SLOW_ROTATE:
        effects.rotationAnimation = this.createRotateAnimation(
          visualProperties.rotationSpeed || 'slow',
        )
        break

      case ANIMATION_TYPES.GENTLE_SWAY:
        effects.scaleAnimation = this.createSwayAnimation(visualProperties.swayAmplitude || 'small')
        break

      case ANIMATION_TYPES.FADE_OUT:
        effects.opacityAnimation = this.createFadeAnimation(visualProperties.fadeSpeed || 'slow')
        break

      case ANIMATION_TYPES.PROGRESS_FILL:
        effects.scaleAnimation = this.createProgressAnimation(
          visualProperties.progressSpeed || 'medium',
        )
        break

      case ANIMATION_TYPES.RADAR_SWEEP:
        effects.scaleAnimation = this.createRadarSweepAnimation(
          visualProperties.sweepSpeed || 'medium',
        )
        break

      default:
        console.warn(`未知的动画效果类型: ${animationEffect}`)
        break
    }

    // 缓存动画效果
    this.animationCache.set(cacheKey, effects)
    return effects
  }

  /**
   * 解析频率字符串
   * @param {string} rateStr - 频率字符串 (如 '2Hz', '5Hz')
   * @param {number} defaultRate - 默认频率
   * @returns {number} 频率数值
   */
  parseRate(rateStr, defaultRate = 1) {
    if (!rateStr || typeof rateStr !== 'string') {
      return defaultRate
    }

    const match = rateStr.match(/(\d+(?:\.\d+)?)\s*Hz?/i)
    return match ? parseFloat(match[1]) : defaultRate
  }

  /**
   * 创建发光效果
   * @param {boolean} enabled - 是否启用发光
   * @param {number} intensity - 发光强度
   */
  createGlowEffect(enabled = false, intensity = 1.0) {
    if (!enabled) return null

    return (time, baseColor) => {
      const seconds = Cesium.JulianDate.toDate(time).getTime() / 1000
      const glow = Math.sin(seconds * 2 * Math.PI) * 0.3 + 0.7
      const glowIntensity = intensity * glow

      return new Cesium.Color(
        Math.min(1.0, baseColor.red * (1 + glowIntensity * 0.3)),
        Math.min(1.0, baseColor.green * (1 + glowIntensity * 0.3)),
        Math.min(1.0, baseColor.blue * (1 + glowIntensity * 0.3)),
        baseColor.alpha,
      )
    }
  }

  /**
   * 创建震动效果
   * @param {string} intensity - 震动强度 ('low', 'medium', 'high')
   */
  createShakeEffect(intensity = 'medium') {
    const intensityMap = {
      low: 0.5,
      medium: 1.0,
      high: 2.0,
    }
    const shakeIntensity = intensityMap[intensity] || intensityMap.medium

    return (time) => {
      const seconds = Cesium.JulianDate.toDate(time).getTime() / 1000
      const shakeX = (Math.random() - 0.5) * shakeIntensity
      const shakeY = (Math.random() - 0.5) * shakeIntensity
      return new Cesium.Cartesian2(shakeX, shakeY)
    }
  }
}

// 创建单例实例
const animationManager = new AnimationEffectManager()

// 导出动画效果管理器
export { ANIMATION_TYPES, AnimationEffectManager, animationManager }
