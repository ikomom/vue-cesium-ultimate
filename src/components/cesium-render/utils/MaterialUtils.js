/**
 * 材质工具类 - 提供材质创建、纹理管理、动画效果等功能
 */

class MaterialUtils {
  // 材质缓存
  static materialCache = new Map()
  static textureCache = new Map()

  /**
   * 创建颜色材质
   * @param {Cesium.Color|string|Array} color - 颜色
   * @param {number} alpha - 透明度（可选）
   * @returns {Cesium.ColorMaterialProperty} 颜色材质
   */
  static createColorMaterial(color, alpha = 1.0) {
    const cesiumColor = this.parseColor(color, alpha)
    const cacheKey = `color_${cesiumColor.red}_${cesiumColor.green}_${cesiumColor.blue}_${cesiumColor.alpha}`

    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)
    }

    const material = new Cesium.ColorMaterialProperty(cesiumColor)
    this.materialCache.set(cacheKey, material)

    return material
  }

  /**
   * 创建图像材质
   * @param {string} imageUrl - 图像URL
   * @param {Object} options - 选项
   * @returns {Cesium.ImageMaterialProperty} 图像材质
   */
  static createImageMaterial(imageUrl, options = {}) {
    const cacheKey = `image_${imageUrl}_${JSON.stringify(options)}`

    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)
    }

    const material = new Cesium.ImageMaterialProperty({
      image: imageUrl,
      transparent: options.transparent !== false,
      color: options.color ? this.parseColor(options.color) : Cesium.Color.WHITE,
      repeat: options.repeat || new Cesium.Cartesian2(1, 1),
    })

    this.materialCache.set(cacheKey, material)

    return material
  }

  /**
   * 创建网格材质
   * @param {Object} options - 网格选项
   * @returns {Cesium.GridMaterialProperty} 网格材质
   */
  static createGridMaterial(options = {}) {
    const defaultOptions = {
      color: Cesium.Color.YELLOW,
      cellAlpha: 0.1,
      lineCount: new Cesium.Cartesian2(8, 8),
      lineThickness: new Cesium.Cartesian2(1.0, 1.0),
      lineOffset: new Cesium.Cartesian2(0.0, 0.0),
    }

    const finalOptions = { ...defaultOptions, ...options }
    const cacheKey = `grid_${JSON.stringify(finalOptions)}`

    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)
    }

    const material = new Cesium.GridMaterialProperty({
      color: this.parseColor(finalOptions.color),
      cellAlpha: finalOptions.cellAlpha,
      lineCount: finalOptions.lineCount,
      lineThickness: finalOptions.lineThickness,
      lineOffset: finalOptions.lineOffset,
    })

    this.materialCache.set(cacheKey, material)

    return material
  }

  /**
   * 创建条纹材质
   * @param {Object} options - 条纹选项
   * @returns {Cesium.StripeMaterialProperty} 条纹材质
   */
  static createStripeMaterial(options = {}) {
    const defaultOptions = {
      evenColor: Cesium.Color.WHITE,
      oddColor: Cesium.Color.BLACK,
      offset: 0.0,
      repeat: 5.0,
    }

    const finalOptions = { ...defaultOptions, ...options }
    const cacheKey = `stripe_${JSON.stringify(finalOptions)}`

    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)
    }

    const material = new Cesium.StripeMaterialProperty({
      evenColor: this.parseColor(finalOptions.evenColor),
      oddColor: this.parseColor(finalOptions.oddColor),
      offset: finalOptions.offset,
      repeat: finalOptions.repeat,
    })

    this.materialCache.set(cacheKey, material)

    return material
  }

  /**
   * 创建棋盘材质
   * @param {Object} options - 棋盘选项
   * @returns {Cesium.CheckerboardMaterialProperty} 棋盘材质
   */
  static createCheckerboardMaterial(options = {}) {
    const defaultOptions = {
      evenColor: Cesium.Color.WHITE,
      oddColor: Cesium.Color.BLACK,
      repeat: new Cesium.Cartesian2(2.0, 2.0),
    }

    const finalOptions = { ...defaultOptions, ...options }
    const cacheKey = `checkerboard_${JSON.stringify(finalOptions)}`

    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)
    }

    const material = new Cesium.CheckerboardMaterialProperty({
      evenColor: this.parseColor(finalOptions.evenColor),
      oddColor: this.parseColor(finalOptions.oddColor),
      repeat: finalOptions.repeat,
    })

    this.materialCache.set(cacheKey, material)

    return material
  }

  /**
   * 创建点材质
   * @param {Object} options - 点材质选项
   * @returns {Cesium.PointGraphics} 点材质
   */
  static createDotMaterial(options = {}) {
    const defaultOptions = {
      color: Cesium.Color.YELLOW,
      repeat: new Cesium.Cartesian2(2.0, 2.0),
    }

    const finalOptions = { ...defaultOptions, ...options }
    const cacheKey = `dot_${JSON.stringify(finalOptions)}`

    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)
    }

    const material = new Cesium.DotMaterialProperty({
      color: this.parseColor(finalOptions.color),
      repeat: finalOptions.repeat,
    })

    this.materialCache.set(cacheKey, material)

    return material
  }

  /**
   * 创建发光材质
   * @param {Object} options - 发光选项
   * @returns {Cesium.Material} 发光材质
   */
  static createGlowMaterial(options = {}) {
    const defaultOptions = {
      color: Cesium.Color.CYAN,
      power: 0.25,
      glowPower: 0.25,
    }

    const finalOptions = { ...defaultOptions, ...options }
    const cacheKey = `glow_${JSON.stringify(finalOptions)}`

    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)
    }

    // 创建自定义发光材质
    const material = new Cesium.Material({
      fabric: {
        type: 'RimLighting',
        uniforms: {
          color: this.parseColor(finalOptions.color),
          rimColor: this.parseColor(finalOptions.color),
          power: finalOptions.power,
          glowPower: finalOptions.glowPower,
        },
      },
    })

    this.materialCache.set(cacheKey, material)

    return material
  }

  /**
   * 创建流动材质
   * @param {Object} options - 流动选项
   * @returns {Cesium.PolylineFlowMaterialProperty} 流动材质
   */
  static createFlowMaterial(options = {}) {
    const defaultOptions = {
      color: Cesium.Color.CYAN,
      speed: 1.0,
      percent: 0.3,
      gradient: 0.1,
    }

    const finalOptions = { ...defaultOptions, ...options }

    // 流动材质通常不缓存，因为它们包含动画
    return new Cesium.PolylineFlowMaterialProperty({
      color: this.parseColor(finalOptions.color),
      speed: finalOptions.speed,
      percent: finalOptions.percent,
      gradient: finalOptions.gradient,
    })
  }

  /**
   * 创建脉冲材质
   * @param {Object} options - 脉冲选项
   * @returns {Cesium.Material} 脉冲材质
   */
  static createPulseMaterial(options = {}) {
    const defaultOptions = {
      color: Cesium.Color.YELLOW,
      speed: 1.0,
      minAlpha: 0.1,
      maxAlpha: 1.0,
    }

    const finalOptions = { ...defaultOptions, ...options }

    // 创建脉冲动画材质
    const color = this.parseColor(finalOptions.color)
    const colorProperty = new Cesium.CallbackProperty(() => {
      const time = Date.now() / 1000.0
      const alpha = (Math.sin(time * finalOptions.speed) + 1) / 2
      const finalAlpha =
        finalOptions.minAlpha + alpha * (finalOptions.maxAlpha - finalOptions.minAlpha)

      return Cesium.Color.fromAlpha(color, finalAlpha)
    }, false)

    return new Cesium.ColorMaterialProperty(colorProperty)
  }

  /**
   * 创建渐变材质
   * @param {Object} options - 渐变选项
   * @returns {Cesium.Material} 渐变材质
   */
  static createGradientMaterial(options = {}) {
    const defaultOptions = {
      startColor: Cesium.Color.RED,
      endColor: Cesium.Color.BLUE,
      direction: 'horizontal', // 'horizontal', 'vertical', 'radial'
    }

    const finalOptions = { ...defaultOptions, ...options }
    const cacheKey = `gradient_${JSON.stringify(finalOptions)}`

    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)
    }

    // 创建渐变纹理
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')

    let gradient
    if (finalOptions.direction === 'horizontal') {
      gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
    } else if (finalOptions.direction === 'vertical') {
      gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    } else if (finalOptions.direction === 'radial') {
      gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2,
      )
    }

    const startColor = this.parseColor(finalOptions.startColor)
    const endColor = this.parseColor(finalOptions.endColor)

    gradient.addColorStop(
      0,
      `rgba(${startColor.red * 255}, ${startColor.green * 255}, ${startColor.blue * 255}, ${startColor.alpha})`,
    )
    gradient.addColorStop(
      1,
      `rgba(${endColor.red * 255}, ${endColor.green * 255}, ${endColor.blue * 255}, ${endColor.alpha})`,
    )

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const material = new Cesium.ImageMaterialProperty({
      image: canvas,
      transparent: true,
    })

    this.materialCache.set(cacheKey, material)

    return material
  }

  /**
   * 创建水面材质
   * @param {Object} options - 水面选项
   * @returns {Cesium.Material} 水面材质
   */
  static createWaterMaterial(options = {}) {
    const defaultOptions = {
      baseWaterColor: Cesium.Color.fromCssColorString('#006ab4'),
      blendColor: Cesium.Color.fromCssColorString('#006ab4'),
      specularMap: undefined,
      normalMap: undefined,
      frequency: 10.0,
      animationSpeed: 0.01,
      amplitude: 1.0,
      specularIntensity: 0.5,
    }

    const finalOptions = { ...defaultOptions, ...options }

    return new Cesium.Material({
      fabric: {
        type: 'Water',
        uniforms: {
          baseWaterColor: this.parseColor(finalOptions.baseWaterColor),
          blendColor: this.parseColor(finalOptions.blendColor),
          specularMap: finalOptions.specularMap,
          normalMap: finalOptions.normalMap,
          frequency: finalOptions.frequency,
          animationSpeed: finalOptions.animationSpeed,
          amplitude: finalOptions.amplitude,
          specularIntensity: finalOptions.specularIntensity,
        },
      },
    })
  }

  /**
   * 创建自定义着色器材质
   * @param {Object} shaderOptions - 着色器选项
   * @returns {Cesium.Material} 自定义材质
   */
  static createCustomShaderMaterial(shaderOptions) {
    const { vertexShader, fragmentShader, uniforms = {} } = shaderOptions

    return new Cesium.Material({
      fabric: {
        type: 'CustomShader',
        source: fragmentShader,
        uniforms: uniforms,
      },
    })
  }

  /**
   * 创建动态纹理
   * @param {Function} drawFunction - 绘制函数
   * @param {Object} options - 选项
   * @returns {Cesium.ImageMaterialProperty} 动态纹理材质
   */
  static createDynamicTexture(drawFunction, options = {}) {
    const defaultOptions = {
      width: 256,
      height: 256,
      fps: 30,
    }

    const finalOptions = { ...defaultOptions, ...options }

    const canvas = document.createElement('canvas')
    canvas.width = finalOptions.width
    canvas.height = finalOptions.height
    const ctx = canvas.getContext('2d')

    let frameCount = 0
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawFunction(ctx, frameCount, canvas.width, canvas.height)
      frameCount++

      setTimeout(() => {
        requestAnimationFrame(animate)
      }, 1000 / finalOptions.fps)
    }

    animate()

    return new Cesium.ImageMaterialProperty({
      image: canvas,
      transparent: true,
    })
  }

  /**
   * 解析颜色
   * @param {Cesium.Color|string|Array} color - 颜色
   * @param {number} alpha - 透明度
   * @returns {Cesium.Color} Cesium颜色对象
   */
  static parseColor(color, alpha = 1.0) {
    if (color instanceof Cesium.Color) {
      return alpha !== 1.0 ? Cesium.Color.fromAlpha(color, alpha) : color
    }

    if (typeof color === 'string') {
      if (color.startsWith('#')) {
        const cesiumColor = Cesium.Color.fromCssColorString(color)
        return alpha !== 1.0 ? Cesium.Color.fromAlpha(cesiumColor, alpha) : cesiumColor
      } else if (color.startsWith('rgb')) {
        const cesiumColor = Cesium.Color.fromCssColorString(color)
        return alpha !== 1.0 ? Cesium.Color.fromAlpha(cesiumColor, alpha) : cesiumColor
      } else {
        // 预定义颜色名称
        const cesiumColor = Cesium.Color[color.toUpperCase()] || Cesium.Color.WHITE
        return alpha !== 1.0 ? Cesium.Color.fromAlpha(cesiumColor, alpha) : cesiumColor
      }
    }

    if (Array.isArray(color)) {
      if (color.length === 3) {
        return new Cesium.Color(color[0], color[1], color[2], alpha)
      } else if (color.length === 4) {
        return new Cesium.Color(color[0], color[1], color[2], color[3])
      }
    }

    if (typeof color === 'object' && color.r !== undefined) {
      return new Cesium.Color(
        color.r,
        color.g || 0,
        color.b || 0,
        color.a !== undefined ? color.a : alpha,
      )
    }

    return Cesium.Color.WHITE
  }

  /**
   * 创建纹理
   * @param {string|HTMLCanvasElement|HTMLImageElement} source - 纹理源
   * @param {Object} options - 纹理选项
   * @returns {Cesium.Texture} 纹理对象
   */
  static createTexture(source, options = {}) {
    const cacheKey = typeof source === 'string' ? source : `texture_${Date.now()}`

    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)
    }

    const defaultOptions = {
      wrapS: Cesium.TextureWrap.REPEAT,
      wrapT: Cesium.TextureWrap.REPEAT,
      minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
      magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
    }

    const finalOptions = { ...defaultOptions, ...options }

    let texture
    if (typeof source === 'string') {
      // URL纹理
      texture = new Cesium.Texture({
        context: Cesium.Context.current,
        source: source,
        ...finalOptions,
      })
    } else {
      // Canvas或Image纹理
      texture = new Cesium.Texture({
        context: Cesium.Context.current,
        source: source,
        ...finalOptions,
      })
    }

    this.textureCache.set(cacheKey, texture)

    return texture
  }

  /**
   * 创建程序化纹理
   * @param {Function} generator - 纹理生成函数
   * @param {Object} options - 选项
   * @returns {Cesium.ImageMaterialProperty} 程序化纹理材质
   */
  static createProceduralTexture(generator, options = {}) {
    const defaultOptions = {
      width: 256,
      height: 256,
    }

    const finalOptions = { ...defaultOptions, ...options }

    const canvas = document.createElement('canvas')
    canvas.width = finalOptions.width
    canvas.height = finalOptions.height
    const ctx = canvas.getContext('2d')

    // 生成纹理
    generator(ctx, canvas.width, canvas.height)

    return new Cesium.ImageMaterialProperty({
      image: canvas,
      transparent: true,
    })
  }

  /**
   * 创建噪声纹理
   * @param {Object} options - 噪声选项
   * @returns {Cesium.ImageMaterialProperty} 噪声纹理材质
   */
  static createNoiseTexture(options = {}) {
    const defaultOptions = {
      width: 256,
      height: 256,
      scale: 0.1,
      color1: [255, 255, 255, 255],
      color2: [0, 0, 0, 255],
    }

    const finalOptions = { ...defaultOptions, ...options }

    return this.createProceduralTexture((ctx, width, height) => {
      const imageData = ctx.createImageData(width, height)
      const data = imageData.data

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4

          // 简单的噪声生成
          const noise = Math.random()
          const color = noise > 0.5 ? finalOptions.color1 : finalOptions.color2

          data[index] = color[0] // R
          data[index + 1] = color[1] // G
          data[index + 2] = color[2] // B
          data[index + 3] = color[3] // A
        }
      }

      ctx.putImageData(imageData, 0, 0)
    }, finalOptions)
  }

  /**
   * 创建云纹理
   * @param {Object} options - 云纹理选项
   * @returns {Cesium.ImageMaterialProperty} 云纹理材质
   */
  static createCloudTexture(options = {}) {
    const defaultOptions = {
      width: 512,
      height: 512,
      cloudiness: 0.5,
      sharpness: 0.9,
    }

    const finalOptions = { ...defaultOptions, ...options }

    return this.createProceduralTexture((ctx, width, height) => {
      const imageData = ctx.createImageData(width, height)
      const data = imageData.data

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4

          // 多层噪声生成云效果
          let noise = 0
          let amplitude = 1
          let frequency = 0.01

          for (let i = 0; i < 4; i++) {
            noise += amplitude * (Math.random() - 0.5)
            amplitude *= 0.5
            frequency *= 2
          }

          // 应用云参数
          noise = (noise + 1) / 2 // 归一化到0-1
          noise = Math.pow(noise, finalOptions.sharpness)

          const alpha =
            noise > finalOptions.cloudiness
              ? Math.min(
                  255,
                  ((noise - finalOptions.cloudiness) * 255) / (1 - finalOptions.cloudiness),
                )
              : 0

          data[index] = 255 // R
          data[index + 1] = 255 // G
          data[index + 2] = 255 // B
          data[index + 3] = alpha // A
        }
      }

      ctx.putImageData(imageData, 0, 0)
    }, finalOptions)
  }

  /**
   * 清理材质缓存
   * @param {string} pattern - 清理模式（可选）
   */
  static clearMaterialCache(pattern = null) {
    if (pattern) {
      const regex = new RegExp(pattern)
      for (const [key, material] of this.materialCache.entries()) {
        if (regex.test(key)) {
          if (material && typeof material.destroy === 'function') {
            material.destroy()
          }
          this.materialCache.delete(key)
        }
      }
    } else {
      // 清理所有缓存
      for (const [key, material] of this.materialCache.entries()) {
        if (material && typeof material.destroy === 'function') {
          material.destroy()
        }
      }
      this.materialCache.clear()
    }
  }

  /**
   * 清理纹理缓存
   * @param {string} pattern - 清理模式（可选）
   */
  static clearTextureCache(pattern = null) {
    if (pattern) {
      const regex = new RegExp(pattern)
      for (const [key, texture] of this.textureCache.entries()) {
        if (regex.test(key)) {
          if (texture && typeof texture.destroy === 'function') {
            texture.destroy()
          }
          this.textureCache.delete(key)
        }
      }
    } else {
      // 清理所有缓存
      for (const [key, texture] of this.textureCache.entries()) {
        if (texture && typeof texture.destroy === 'function') {
          texture.destroy()
        }
      }
      this.textureCache.clear()
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计
   */
  static getCacheStats() {
    return {
      materialCacheSize: this.materialCache.size,
      textureCacheSize: this.textureCache.size,
      materialCacheKeys: Array.from(this.materialCache.keys()),
      textureCacheKeys: Array.from(this.textureCache.keys()),
    }
  }

  /**
   * 销毁所有资源
   */
  static destroy() {
    this.clearMaterialCache()
    this.clearTextureCache()
  }
}

export default MaterialUtils
