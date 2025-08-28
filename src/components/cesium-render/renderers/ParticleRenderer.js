/**
 * 粒子渲染器 - 负责渲染粒子效果
 * 支持火焰、烟雾、雨雪、爆炸等各种粒子效果
 */

import BaseRenderer from './BaseRenderer.js'
import GeometryUtils from '../utils/GeometryUtils.js'
import MaterialUtils from '../utils/MaterialUtils.js'

class ParticleRenderer extends BaseRenderer {
  constructor(viewer, options = {}) {
    super(viewer, options)

    this.type = 'particle'
    
    // 粒子渲染配置
    this.config = {
      maxParticles: 1000,
      enablePhysics: false,
      enableCollision: false,
      enableWind: false,
      enableGravity: true,
      particleLife: 5.0, // 秒
      emissionRate: 50, // 每秒发射粒子数
      startSpeed: 1.0,
      endSpeed: 0.1,
      startScale: 1.0,
      endScale: 0.1,
      startColor: Cesium.Color.WHITE,
      endColor: Cesium.Color.TRANSPARENT,
      ...options
    }

    // 粒子系统管理
    this.particleSystems = new Map() // entityId -> particleSystem
    this.emitters = new Map() // entityId -> emitter
    this.particles = new Map() // entityId -> particles[]

    // 物理系统
    this.physics = {
      enabled: this.config.enablePhysics,
      gravity: new Cesium.Cartesian3(0, 0, -9.81),
      wind: new Cesium.Cartesian3(0, 0, 0),
      airResistance: 0.1
    }

    // 纹理管理
    this.textures = new Map() // textureId -> texture
    this.materials = new Map() // materialId -> material

    // 性能统计
    this.stats = {
      systemsActive: 0,
      particlesActive: 0,
      emittersActive: 0,
      memoryUsage: 0,
      renderCalls: 0
    }

    this.init()
  }

  /**
   * 初始化粒子渲染器
   */
  init() {
    super.init()

    // 初始化粒子系统
    this.initParticleSystem()

    // 初始化物理引擎
    this.initPhysics()

    // 初始化纹理库
    this.initTextureLibrary()

    // 初始化预设效果
    this.initPresetEffects()
  }

  /**
   * 初始化粒子系统
   */
  initParticleSystem() {
    this.particleSystem = {
      maxParticles: this.config.maxParticles,
      particlePool: [],
      activeParticles: [],
      freeParticles: []
    }

    // 创建粒子池
    for (let i = 0; i < this.config.maxParticles; i++) {
      const particle = this.createParticle()
      this.particleSystem.particlePool.push(particle)
      this.particleSystem.freeParticles.push(particle)
    }
  }

  /**
   * 初始化物理引擎
   */
  initPhysics() {
    if (!this.config.enablePhysics) return

    this.physicsEngine = {
      gravity: this.physics.gravity,
      wind: this.physics.wind,
      forces: new Map(), // particleId -> forces[]
      constraints: new Map() // particleId -> constraints[]
    }
  }

  /**
   * 初始化纹理库
   */
  initTextureLibrary() {
    // 创建默认纹理
    this.createDefaultTextures()
  }

  /**
   * 创建默认纹理
   */
  createDefaultTextures() {
    // 圆形粒子纹理
    this.textures.set('circle', this.createCircleTexture())
    
    // 方形粒子纹理
    this.textures.set('square', this.createSquareTexture())
    
    // 星形粒子纹理
    this.textures.set('star', this.createStarTexture())
    
    // 烟雾纹理
    this.textures.set('smoke', this.createSmokeTexture())
    
    // 火焰纹理
    this.textures.set('fire', this.createFireTexture())
  }

  /**
   * 创建圆形纹理
   * @returns {Object} 纹理对象
   */
  createCircleTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    
    return canvas
  }

  /**
   * 创建方形纹理
   * @returns {Object} 纹理对象
   */
  createSquareTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    
    ctx.fillStyle = 'rgba(255, 255, 255, 1)'
    ctx.fillRect(16, 16, 32, 32)
    
    return canvas
  }

  /**
   * 创建星形纹理
   * @returns {Object} 纹理对象
   */
  createStarTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    
    ctx.fillStyle = 'rgba(255, 255, 255, 1)'
    ctx.translate(32, 32)
    
    // 绘制星形
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5
      const x = Math.cos(angle) * 20
      const y = Math.sin(angle) * 20
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()
    ctx.fill()
    
    return canvas
  }

  /**
   * 创建烟雾纹理
   * @returns {Object} 纹理对象
   */
  createSmokeTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    
    // 创建噪声纹理
    const imageData = ctx.createImageData(64, 64)
    const data = imageData.data
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random()
      data[i] = 255 * noise     // R
      data[i + 1] = 255 * noise // G
      data[i + 2] = 255 * noise // B
      data[i + 3] = 255 * noise // A
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    return canvas
  }

  /**
   * 创建火焰纹理
   * @returns {Object} 纹理对象
   */
  createFireTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 64)
    gradient.addColorStop(0, 'rgba(255, 255, 0, 1)')
    gradient.addColorStop(0.5, 'rgba(255, 128, 0, 1)')
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    
    return canvas
  }

  /**
   * 初始化预设效果
   */
  initPresetEffects() {
    this.presets = {
      fire: {
        texture: 'fire',
        emissionRate: 100,
        particleLife: 2.0,
        startSpeed: 2.0,
        endSpeed: 0.5,
        startScale: 0.5,
        endScale: 2.0,
        startColor: Cesium.Color.YELLOW,
        endColor: Cesium.Color.RED.withAlpha(0),
        gravity: new Cesium.Cartesian3(0, 0, 1)
      },
      smoke: {
        texture: 'smoke',
        emissionRate: 50,
        particleLife: 5.0,
        startSpeed: 1.0,
        endSpeed: 0.1,
        startScale: 1.0,
        endScale: 3.0,
        startColor: Cesium.Color.WHITE,
        endColor: Cesium.Color.GRAY.withAlpha(0),
        gravity: new Cesium.Cartesian3(0, 0, 0.5)
      },
      rain: {
        texture: 'circle',
        emissionRate: 200,
        particleLife: 3.0,
        startSpeed: 5.0,
        endSpeed: 5.0,
        startScale: 0.1,
        endScale: 0.1,
        startColor: Cesium.Color.LIGHTBLUE,
        endColor: Cesium.Color.BLUE,
        gravity: new Cesium.Cartesian3(0, 0, -10)
      },
      snow: {
        texture: 'circle',
        emissionRate: 100,
        particleLife: 10.0,
        startSpeed: 1.0,
        endSpeed: 0.5,
        startScale: 0.2,
        endScale: 0.2,
        startColor: Cesium.Color.WHITE,
        endColor: Cesium.Color.WHITE,
        gravity: new Cesium.Cartesian3(0, 0, -1)
      },
      explosion: {
        texture: 'star',
        emissionRate: 500,
        particleLife: 1.0,
        startSpeed: 10.0,
        endSpeed: 0.1,
        startScale: 0.1,
        endScale: 1.0,
        startColor: Cesium.Color.YELLOW,
        endColor: Cesium.Color.RED.withAlpha(0),
        gravity: new Cesium.Cartesian3(0, 0, -5)
      }
    }
  }

  /**
   * 创建粒子
   * @returns {Object} 粒子对象
   */
  createParticle() {
    return {
      id: Cesium.createGuid(),
      position: new Cesium.Cartesian3(),
      velocity: new Cesium.Cartesian3(),
      acceleration: new Cesium.Cartesian3(),
      life: 0,
      maxLife: 1,
      scale: 1,
      color: Cesium.Color.WHITE.clone(),
      rotation: 0,
      rotationSpeed: 0,
      active: false
    }
  }

  /**
   * 添加粒子实体
   * @param {Object} entity - 实体数据
   * @param {Object} options - 渲染选项
   */
  async addEntity(entity, options = {}) {
    try {
      const config = { ...this.config, ...options }
      
      // 验证实体数据
      if (!this.validateEntity(entity)) {
        throw new Error('Invalid particle entity data')
      }

      // 创建粒子系统
      const particleSystem = this.createParticleSystem(entity, config)
      
      // 创建发射器
      const emitter = this.createEmitter(entity, config)
      
      // 缓存系统
      this.particleSystems.set(entity.id, particleSystem)
      this.emitters.set(entity.id, emitter)
      
      // 添加到渲染队列
      this.renderQueue.push({
        id: entity.id,
        particleSystem: particleSystem,
        emitter: emitter,
        entity: entity,
        type: 'particle'
      })
      
      // 更新统计
      this.stats.systemsActive++
      
      return particleSystem
    } catch (error) {
      console.error('Failed to add particle entity:', error)
      throw error
    }
  }

  /**
   * 验证实体数据
   * @param {Object} entity - 实体数据
   * @returns {boolean} 验证结果
   */
  validateEntity(entity) {
    return entity && 
           entity.id && 
           entity.position && 
           (entity.effect || entity.preset)
  }

  /**
   * 创建粒子系统
   * @param {Object} entity - 实体数据
   * @param {Object} config - 配置选项
   * @returns {Object} 粒子系统
   */
  createParticleSystem(entity, config) {
    // 获取预设或自定义配置
    const effectConfig = entity.preset ? 
      this.presets[entity.preset] : 
      entity.effect
    
    const finalConfig = { ...config, ...effectConfig }
    
    // 创建粒子系统
    const particleSystem = this.viewer.scene.primitives.add(
      new Cesium.ParticleSystem({
        image: this.getTexture(finalConfig.texture || 'circle'),
        startColor: finalConfig.startColor || Cesium.Color.WHITE,
        endColor: finalConfig.endColor || Cesium.Color.TRANSPARENT,
        startScale: finalConfig.startScale || 1.0,
        endScale: finalConfig.endScale || 0.1,
        particleLife: finalConfig.particleLife || 5.0,
        speed: finalConfig.startSpeed || 1.0,
        imageSize: new Cesium.Cartesian2(finalConfig.imageSize || 32, finalConfig.imageSize || 32),
        emissionRate: finalConfig.emissionRate || 50,
        bursts: finalConfig.bursts || [],
        lifetime: finalConfig.lifetime || 16.0,
        loop: finalConfig.loop !== false,
        modelMatrix: this.createModelMatrix(entity.position, entity.orientation),
        emitterModelMatrix: this.createEmitterMatrix(finalConfig.emitterShape),
        show: entity.visible !== false
      })
    )
    
    return particleSystem
  }

  /**
   * 创建发射器
   * @param {Object} entity - 实体数据
   * @param {Object} config - 配置选项
   * @returns {Object} 发射器
   */
  createEmitter(entity, config) {
    return {
      id: entity.id,
      position: entity.position,
      active: true,
      emissionRate: config.emissionRate || 50,
      lastEmission: 0,
      particleCount: 0,
      maxParticles: config.maxParticles || 1000
    }
  }

  /**
   * 获取纹理
   * @param {string} textureId - 纹理ID
   * @returns {Object} 纹理对象
   */
  getTexture(textureId) {
    return this.textures.get(textureId) || this.textures.get('circle')
  }

  /**
   * 创建模型矩阵
   * @param {Object} position - 位置
   * @param {Object} orientation - 方向
   * @returns {Cesium.Matrix4} 模型矩阵
   */
  createModelMatrix(position, orientation = {}) {
    const cartesian = Cesium.Cartesian3.fromDegrees(
      position.longitude,
      position.latitude,
      position.altitude || 0
    )
    
    let matrix = Cesium.Transforms.eastNorthUpToFixedFrame(cartesian)
    
    // 应用旋转
    if (orientation.heading || orientation.pitch || orientation.roll) {
      const rotation = Cesium.Matrix3.fromHeadingPitchRoll(
        new Cesium.HeadingPitchRoll(
          Cesium.Math.toRadians(orientation.heading || 0),
          Cesium.Math.toRadians(orientation.pitch || 0),
          Cesium.Math.toRadians(orientation.roll || 0)
        )
      )
      Cesium.Matrix4.multiplyByMatrix3(matrix, rotation, matrix)
    }
    
    return matrix
  }

  /**
   * 创建发射器矩阵
   * @param {string} shape - 发射器形状
   * @returns {Cesium.Matrix4} 发射器矩阵
   */
  createEmitterMatrix(shape = 'point') {
    switch (shape) {
      case 'box':
        return Cesium.Matrix4.fromScale(new Cesium.Cartesian3(1, 1, 1))
      case 'sphere':
        return Cesium.Matrix4.fromScale(new Cesium.Cartesian3(1, 1, 1))
      case 'cone':
        return Cesium.Matrix4.fromScale(new Cesium.Cartesian3(1, 1, 2))
      default:
        return Cesium.Matrix4.IDENTITY
    }
  }

  /**
   * 更新实体
   * @param {string} entityId - 实体ID
   * @param {Object} updates - 更新数据
   */
  updateEntity(entityId, updates) {
    const particleSystem = this.particleSystems.get(entityId)
    const emitter = this.emitters.get(entityId)
    
    if (!particleSystem || !emitter) return
    
    // 更新位置
    if (updates.position) {
      const matrix = this.createModelMatrix(updates.position, updates.orientation)
      particleSystem.modelMatrix = matrix
      emitter.position = updates.position
    }
    
    // 更新发射率
    if (updates.emissionRate !== undefined) {
      particleSystem.emissionRate = updates.emissionRate
      emitter.emissionRate = updates.emissionRate
    }
    
    // 更新显示状态
    if (updates.visible !== undefined) {
      particleSystem.show = updates.visible
      emitter.active = updates.visible
    }
    
    // 更新颜色
    if (updates.startColor) {
      particleSystem.startColor = Cesium.Color.fromCssColorString(updates.startColor)
    }
    
    if (updates.endColor) {
      particleSystem.endColor = Cesium.Color.fromCssColorString(updates.endColor)
    }
  }

  /**
   * 移除实体
   * @param {string} entityId - 实体ID
   */
  removeEntity(entityId) {
    const particleSystem = this.particleSystems.get(entityId)
    
    if (particleSystem) {
      this.viewer.scene.primitives.remove(particleSystem)
      this.particleSystems.delete(entityId)
    }
    
    this.emitters.delete(entityId)
    
    // 从渲染队列移除
    this.renderQueue = this.renderQueue.filter(item => item.id !== entityId)
    
    // 更新统计
    this.stats.systemsActive--
  }

  /**
   * 渲染帧更新
   */
  update() {
    super.update()
    
    // 更新发射器
    this.updateEmitters()
    
    // 更新物理
    if (this.config.enablePhysics) {
      this.updatePhysics()
    }
    
    // 更新统计
    this.updateStats()
  }

  /**
   * 更新发射器
   */
  updateEmitters() {
    const now = Date.now()
    
    this.emitters.forEach((emitter, entityId) => {
      if (!emitter.active) return
      
      const particleSystem = this.particleSystems.get(entityId)
      if (!particleSystem) return
      
      // 检查是否需要发射新粒子
      const timeSinceLastEmission = now - emitter.lastEmission
      const emissionInterval = 1000 / emitter.emissionRate // ms
      
      if (timeSinceLastEmission >= emissionInterval) {
        this.emitParticle(emitter, particleSystem)
        emitter.lastEmission = now
      }
    })
  }

  /**
   * 发射粒子
   * @param {Object} emitter - 发射器
   * @param {Object} particleSystem - 粒子系统
   */
  emitParticle(emitter, particleSystem) {
    if (emitter.particleCount >= emitter.maxParticles) return
    
    // 从粒子池获取粒子
    const particle = this.getParticleFromPool()
    if (!particle) return
    
    // 初始化粒子
    this.initializeParticle(particle, emitter, particleSystem)
    
    // 添加到活跃粒子列表
    this.particleSystem.activeParticles.push(particle)
    
    emitter.particleCount++
    this.stats.particlesActive++
  }

  /**
   * 从粒子池获取粒子
   * @returns {Object|null} 粒子对象
   */
  getParticleFromPool() {
    if (this.particleSystem.freeParticles.length === 0) {
      return null
    }
    
    return this.particleSystem.freeParticles.pop()
  }

  /**
   * 初始化粒子
   * @param {Object} particle - 粒子对象
   * @param {Object} emitter - 发射器
   * @param {Object} particleSystem - 粒子系统
   */
  initializeParticle(particle, emitter, particleSystem) {
    // 设置初始位置
    particle.position = Cesium.Cartesian3.fromDegrees(
      emitter.position.longitude,
      emitter.position.latitude,
      emitter.position.altitude || 0
    )
    
    // 设置初始速度（随机方向）
    const speed = particleSystem.speed || 1.0
    particle.velocity = new Cesium.Cartesian3(
      (Math.random() - 0.5) * speed,
      (Math.random() - 0.5) * speed,
      Math.random() * speed
    )
    
    // 设置生命周期
    particle.life = 0
    particle.maxLife = particleSystem.particleLife || 5.0
    
    // 设置初始属性
    particle.scale = particleSystem.startScale || 1.0
    particle.color = particleSystem.startColor.clone()
    particle.rotation = Math.random() * Math.PI * 2
    particle.rotationSpeed = (Math.random() - 0.5) * 0.1
    particle.active = true
  }

  /**
   * 更新物理
   */
  updatePhysics() {
    const deltaTime = 1 / 60 // 假设60FPS
    
    this.particleSystem.activeParticles.forEach(particle => {
      if (!particle.active) return
      
      // 应用重力
      if (this.config.enableGravity) {
        Cesium.Cartesian3.add(
          particle.acceleration,
          this.physics.gravity,
          particle.acceleration
        )
      }
      
      // 应用风力
      if (this.config.enableWind) {
        Cesium.Cartesian3.add(
          particle.acceleration,
          this.physics.wind,
          particle.acceleration
        )
      }
      
      // 更新速度
      const deltaVelocity = Cesium.Cartesian3.multiplyByScalar(
        particle.acceleration,
        deltaTime,
        new Cesium.Cartesian3()
      )
      Cesium.Cartesian3.add(particle.velocity, deltaVelocity, particle.velocity)
      
      // 更新位置
      const deltaPosition = Cesium.Cartesian3.multiplyByScalar(
        particle.velocity,
        deltaTime,
        new Cesium.Cartesian3()
      )
      Cesium.Cartesian3.add(particle.position, deltaPosition, particle.position)
      
      // 更新生命周期
      particle.life += deltaTime
      
      // 更新旋转
      particle.rotation += particle.rotationSpeed * deltaTime
      
      // 检查粒子是否死亡
      if (particle.life >= particle.maxLife) {
        this.killParticle(particle)
      }
    })
  }

  /**
   * 杀死粒子
   * @param {Object} particle - 粒子对象
   */
  killParticle(particle) {
    particle.active = false
    
    // 从活跃列表移除
    const index = this.particleSystem.activeParticles.indexOf(particle)
    if (index !== -1) {
      this.particleSystem.activeParticles.splice(index, 1)
    }
    
    // 返回到粒子池
    this.particleSystem.freeParticles.push(particle)
    
    this.stats.particlesActive--
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    this.stats.emittersActive = Array.from(this.emitters.values())
      .filter(emitter => emitter.active).length
    
    this.stats.memoryUsage = this.calculateMemoryUsage()
  }

  /**
   * 计算内存使用量
   * @returns {number} 内存使用量（字节）
   */
  calculateMemoryUsage() {
    let usage = 0
    
    // 粒子系统内存
    usage += this.particleSystems.size * 1024 // 1KB per system
    
    // 活跃粒子内存
    usage += this.stats.particlesActive * 128 // 128 bytes per particle
    
    // 纹理内存
    this.textures.forEach(texture => {
      if (texture.width && texture.height) {
        usage += texture.width * texture.height * 4 // RGBA
      }
    })
    
    return usage
  }

  /**
   * 创建预设效果
   * @param {string} preset - 预设名称
   * @param {Object} position - 位置
   * @param {Object} options - 选项
   * @returns {string} 实体ID
   */
  createPresetEffect(preset, position, options = {}) {
    const entityId = Cesium.createGuid()
    
    const entity = {
      id: entityId,
      position: position,
      preset: preset,
      ...options
    }
    
    this.addEntity(entity)
    
    return entityId
  }

  /**
   * 清理资源
   */
  dispose() {
    // 移除所有粒子系统
    this.particleSystems.forEach(particleSystem => {
      this.viewer.scene.primitives.remove(particleSystem)
    })
    this.particleSystems.clear()
    
    // 清理发射器
    this.emitters.clear()
    
    // 清理粒子池
    this.particleSystem.activeParticles.length = 0
    this.particleSystem.freeParticles.length = 0
    this.particleSystem.particlePool.length = 0
    
    // 清理纹理
    this.textures.clear()
    this.materials.clear()
    
    super.dispose()
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      type: this.type,
      timestamp: Date.now()
    }
  }
}

export default ParticleRenderer