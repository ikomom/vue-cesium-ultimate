/**
 * 时间工具类 - 提供时间处理、插值、动画等功能
 */

class TimeUtils {
  /**
   * 将各种时间格式转换为Cesium JulianDate
   * @param {Date|string|number|Cesium.JulianDate} time - 时间
   * @returns {Cesium.JulianDate} JulianDate对象
   */
  static toJulianDate(time) {
    if (time instanceof Cesium.JulianDate) {
      return time
    }

    if (time instanceof Date) {
      return Cesium.JulianDate.fromDate(time)
    }

    if (typeof time === 'string') {
      // 尝试解析ISO字符串
      if (time.includes('T') || time.includes('Z')) {
        return Cesium.JulianDate.fromIso8601(time)
      }
      // 尝试解析为Date
      const date = new Date(time)
      if (!isNaN(date.getTime())) {
        return Cesium.JulianDate.fromDate(date)
      }
    }

    if (typeof time === 'number') {
      // 假设是时间戳（毫秒）
      return Cesium.JulianDate.fromDate(new Date(time))
    }

    // 默认返回当前时间
    return Cesium.JulianDate.now()
  }

  /**
   * 将JulianDate转换为Date对象
   * @param {Cesium.JulianDate} julianDate - JulianDate对象
   * @returns {Date} Date对象
   */
  static toDate(julianDate) {
    return Cesium.JulianDate.toDate(julianDate)
  }

  /**
   * 将JulianDate转换为ISO字符串
   * @param {Cesium.JulianDate} julianDate - JulianDate对象
   * @returns {string} ISO字符串
   */
  static toIso8601(julianDate) {
    return Cesium.JulianDate.toIso8601(julianDate)
  }

  /**
   * 将JulianDate转换为时间戳
   * @param {Cesium.JulianDate} julianDate - JulianDate对象
   * @returns {number} 时间戳（毫秒）
   */
  static toTimestamp(julianDate) {
    return this.toDate(julianDate).getTime()
  }

  /**
   * 创建时间范围
   * @param {*} start - 开始时间
   * @param {*} stop - 结束时间
   * @returns {Cesium.TimeInterval} 时间间隔
   */
  static createTimeInterval(start, stop) {
    return new Cesium.TimeInterval({
      start: this.toJulianDate(start),
      stop: this.toJulianDate(stop),
    })
  }

  /**
   * 创建时间间隔集合
   * @param {Array} intervals - 时间间隔数组 [{start, stop, data?}, ...]
   * @returns {Cesium.TimeIntervalCollection} 时间间隔集合
   */
  static createTimeIntervalCollection(intervals) {
    const collection = new Cesium.TimeIntervalCollection()

    intervals.forEach((interval) => {
      collection.addInterval(
        new Cesium.TimeInterval({
          start: this.toJulianDate(interval.start),
          stop: this.toJulianDate(interval.stop),
          data: interval.data,
        }),
      )
    })

    return collection
  }

  /**
   * 时间插值
   * @param {*} startTime - 开始时间
   * @param {*} endTime - 结束时间
   * @param {number} t - 插值参数（0-1）
   * @returns {Cesium.JulianDate} 插值结果
   */
  static interpolateTime(startTime, endTime, t) {
    const start = this.toJulianDate(startTime)
    const end = this.toJulianDate(endTime)

    const duration = Cesium.JulianDate.secondsDifference(end, start)
    const interpolatedSeconds = duration * t

    return Cesium.JulianDate.addSeconds(start, interpolatedSeconds, new Cesium.JulianDate())
  }

  /**
   * 计算两个时间之间的差值
   * @param {*} time1 - 时间1
   * @param {*} time2 - 时间2
   * @param {string} unit - 单位（'seconds', 'minutes', 'hours', 'days'）
   * @returns {number} 时间差
   */
  static timeDifference(time1, time2, unit = 'seconds') {
    const jd1 = this.toJulianDate(time1)
    const jd2 = this.toJulianDate(time2)

    const seconds = Cesium.JulianDate.secondsDifference(jd2, jd1)

    switch (unit) {
      case 'seconds':
        return seconds
      case 'minutes':
        return seconds / 60
      case 'hours':
        return seconds / 3600
      case 'days':
        return seconds / 86400
      default:
        return seconds
    }
  }

  /**
   * 添加时间偏移
   * @param {*} time - 基准时间
   * @param {number} offset - 偏移量
   * @param {string} unit - 单位
   * @returns {Cesium.JulianDate} 新时间
   */
  static addTime(time, offset, unit = 'seconds') {
    const julianDate = this.toJulianDate(time)

    let seconds = offset
    switch (unit) {
      case 'minutes':
        seconds = offset * 60
        break
      case 'hours':
        seconds = offset * 3600
        break
      case 'days':
        seconds = offset * 86400
        break
    }

    return Cesium.JulianDate.addSeconds(julianDate, seconds, new Cesium.JulianDate())
  }

  /**
   * 创建时间序列数据
   * @param {*} startTime - 开始时间
   * @param {*} endTime - 结束时间
   * @param {number} interval - 时间间隔（秒）
   * @param {Function} valueFunction - 值生成函数
   * @returns {Cesium.SampledProperty} 采样属性
   */
  static createTimeSeriesData(startTime, endTime, interval, valueFunction) {
    const property = new Cesium.SampledProperty(Cesium.Cartesian3)

    const start = this.toJulianDate(startTime)
    const end = this.toJulianDate(endTime)
    const duration = Cesium.JulianDate.secondsDifference(end, start)

    for (let i = 0; i <= duration; i += interval) {
      const currentTime = Cesium.JulianDate.addSeconds(start, i, new Cesium.JulianDate())
      const value = valueFunction(currentTime, i, duration)
      property.addSample(currentTime, value)
    }

    return property
  }

  /**
   * 创建循环时间属性
   * @param {*} startTime - 开始时间
   * @param {*} endTime - 结束时间
   * @param {Function} valueFunction - 值生成函数
   * @returns {Cesium.CallbackProperty} 回调属性
   */
  static createCyclicTimeProperty(startTime, endTime, valueFunction) {
    const start = this.toJulianDate(startTime)
    const end = this.toJulianDate(endTime)
    const duration = Cesium.JulianDate.secondsDifference(end, start)

    return new Cesium.CallbackProperty((time, result) => {
      const elapsed = Cesium.JulianDate.secondsDifference(time, start)
      const normalizedTime = (elapsed % duration) / duration
      return valueFunction(normalizedTime, time, result)
    }, false)
  }

  /**
   * 创建时间动画控制器
   * @param {Object} options - 动画选项
   * @returns {Object} 动画控制器
   */
  static createAnimationController(options = {}) {
    const defaultOptions = {
      startTime: new Date(),
      endTime: new Date(Date.now() + 60000), // 默认1分钟
      duration: 60, // 播放持续时间（秒）
      loop: false,
      autoPlay: false,
    }

    const finalOptions = { ...defaultOptions, ...options }

    const controller = {
      startTime: this.toJulianDate(finalOptions.startTime),
      endTime: this.toJulianDate(finalOptions.endTime),
      duration: finalOptions.duration,
      loop: finalOptions.loop,
      isPlaying: false,
      isPaused: false,
      currentTime: null,
      playbackRate: 1.0,
      callbacks: {
        onPlay: [],
        onPause: [],
        onStop: [],
        onUpdate: [],
        onComplete: [],
      },

      // 播放
      play() {
        if (this.isPlaying) return

        this.isPlaying = true
        this.isPaused = false
        this.currentTime = this.currentTime || this.startTime

        this.callbacks.onPlay.forEach((callback) => callback())
        this._startAnimation()
      },

      // 暂停
      pause() {
        if (!this.isPlaying) return

        this.isPlaying = false
        this.isPaused = true

        this.callbacks.onPause.forEach((callback) => callback())
      },

      // 停止
      stop() {
        this.isPlaying = false
        this.isPaused = false
        this.currentTime = this.startTime

        this.callbacks.onStop.forEach((callback) => callback())
      },

      // 跳转到指定时间
      seekTo(time) {
        this.currentTime = TimeUtils.toJulianDate(time)
        this.callbacks.onUpdate.forEach((callback) => callback(this.currentTime))
      },

      // 设置播放速率
      setPlaybackRate(rate) {
        this.playbackRate = rate
      },

      // 添加回调
      on(event, callback) {
        if (this.callbacks[event]) {
          this.callbacks[event].push(callback)
        }
      },

      // 移除回调
      off(event, callback) {
        if (this.callbacks[event]) {
          const index = this.callbacks[event].indexOf(callback)
          if (index > -1) {
            this.callbacks[event].splice(index, 1)
          }
        }
      },

      // 内部动画循环
      _startAnimation() {
        const animate = () => {
          if (!this.isPlaying) return

          const totalDuration = Cesium.JulianDate.secondsDifference(this.endTime, this.startTime)
          const elapsed = Cesium.JulianDate.secondsDifference(this.currentTime, this.startTime)

          // 计算下一帧时间
          const frameTime = (1 / 60) * this.playbackRate // 60fps
          this.currentTime = Cesium.JulianDate.addSeconds(
            this.currentTime,
            frameTime,
            new Cesium.JulianDate(),
          )

          // 检查是否到达结束时间
          if (Cesium.JulianDate.greaterThan(this.currentTime, this.endTime)) {
            if (this.loop) {
              this.currentTime = Cesium.JulianDate.clone(this.startTime)
            } else {
              this.stop()
              this.callbacks.onComplete.forEach((callback) => callback())
              return
            }
          }

          // 触发更新回调
          this.callbacks.onUpdate.forEach((callback) => callback(this.currentTime))

          // 继续动画
          requestAnimationFrame(animate)
        }

        animate()
      },
    }

    if (finalOptions.autoPlay) {
      controller.play()
    }

    return controller
  }

  /**
   * 创建时间轴
   * @param {Object} options - 时间轴选项
   * @returns {Object} 时间轴对象
   */
  static createTimeline(options = {}) {
    const defaultOptions = {
      startTime: new Date(Date.now() - 3600000), // 1小时前
      endTime: new Date(Date.now() + 3600000), // 1小时后
      currentTime: new Date(),
      timeStep: 60, // 秒
    }

    const finalOptions = { ...defaultOptions, ...options }

    return {
      startTime: this.toJulianDate(finalOptions.startTime),
      endTime: this.toJulianDate(finalOptions.endTime),
      currentTime: this.toJulianDate(finalOptions.currentTime),
      timeStep: finalOptions.timeStep,

      // 获取时间范围
      getTimeRange() {
        return {
          start: this.startTime,
          end: this.endTime,
          duration: Cesium.JulianDate.secondsDifference(this.endTime, this.startTime),
        }
      },

      // 设置时间范围
      setTimeRange(start, end) {
        this.startTime = TimeUtils.toJulianDate(start)
        this.endTime = TimeUtils.toJulianDate(end)
      },

      // 获取当前时间
      getCurrentTime() {
        return this.currentTime
      },

      // 设置当前时间
      setCurrentTime(time) {
        const newTime = TimeUtils.toJulianDate(time)
        if (
          Cesium.JulianDate.greaterThanOrEquals(newTime, this.startTime) &&
          Cesium.JulianDate.lessThanOrEquals(newTime, this.endTime)
        ) {
          this.currentTime = newTime
        }
      },

      // 前进一步
      stepForward() {
        const newTime = Cesium.JulianDate.addSeconds(
          this.currentTime,
          this.timeStep,
          new Cesium.JulianDate(),
        )
        if (Cesium.JulianDate.lessThanOrEquals(newTime, this.endTime)) {
          this.currentTime = newTime
        }
      },

      // 后退一步
      stepBackward() {
        const newTime = Cesium.JulianDate.addSeconds(
          this.currentTime,
          -this.timeStep,
          new Cesium.JulianDate(),
        )
        if (Cesium.JulianDate.greaterThanOrEquals(newTime, this.startTime)) {
          this.currentTime = newTime
        }
      },

      // 获取进度（0-1）
      getProgress() {
        const total = Cesium.JulianDate.secondsDifference(this.endTime, this.startTime)
        const elapsed = Cesium.JulianDate.secondsDifference(this.currentTime, this.startTime)
        return Math.max(0, Math.min(1, elapsed / total))
      },

      // 设置进度（0-1）
      setProgress(progress) {
        const total = Cesium.JulianDate.secondsDifference(this.endTime, this.startTime)
        const elapsed = total * Math.max(0, Math.min(1, progress))
        this.currentTime = Cesium.JulianDate.addSeconds(
          this.startTime,
          elapsed,
          new Cesium.JulianDate(),
        )
      },
    }
  }

  /**
   * 创建时间过滤器
   * @param {Array} timeRanges - 时间范围数组
   * @returns {Function} 过滤器函数
   */
  static createTimeFilter(timeRanges) {
    const intervals = timeRanges.map((range) => ({
      start: this.toJulianDate(range.start),
      end: this.toJulianDate(range.end),
    }))

    return (time) => {
      const testTime = this.toJulianDate(time)
      return intervals.some(
        (interval) =>
          Cesium.JulianDate.greaterThanOrEquals(testTime, interval.start) &&
          Cesium.JulianDate.lessThanOrEquals(testTime, interval.end),
      )
    }
  }

  /**
   * 格式化时间显示
   * @param {*} time - 时间
   * @param {string} format - 格式字符串
   * @returns {string} 格式化后的时间字符串
   */
  static formatTime(time, format = 'YYYY-MM-DD HH:mm:ss') {
    const date = time instanceof Date ? time : this.toDate(this.toJulianDate(time))

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0')

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds)
      .replace('SSS', milliseconds)
  }

  /**
   * 创建时间缓存
   * @param {number} maxSize - 最大缓存大小
   * @returns {Object} 时间缓存对象
   */
  static createTimeCache(maxSize = 1000) {
    const cache = new Map()

    return {
      // 获取缓存值
      get(time, generator) {
        const key = this.toTimestamp(this.toJulianDate(time))

        if (cache.has(key)) {
          return cache.get(key)
        }

        const value = generator(time)

        // 如果缓存已满，删除最旧的条目
        if (cache.size >= maxSize) {
          const firstKey = cache.keys().next().value
          cache.delete(firstKey)
        }

        cache.set(key, value)
        return value
      },

      // 清理缓存
      clear() {
        cache.clear()
      },

      // 获取缓存大小
      size() {
        return cache.size
      },
    }
  }

  /**
   * 创建时间窗口
   * @param {*} centerTime - 中心时间
   * @param {number} windowSize - 窗口大小（秒）
   * @returns {Object} 时间窗口对象
   */
  static createTimeWindow(centerTime, windowSize) {
    const center = this.toJulianDate(centerTime)
    const halfWindow = windowSize / 2

    return {
      start: Cesium.JulianDate.addSeconds(center, -halfWindow, new Cesium.JulianDate()),
      end: Cesium.JulianDate.addSeconds(center, halfWindow, new Cesium.JulianDate()),
      center: center,
      size: windowSize,

      // 检查时间是否在窗口内
      contains(time) {
        const testTime = TimeUtils.toJulianDate(time)
        return (
          Cesium.JulianDate.greaterThanOrEquals(testTime, this.start) &&
          Cesium.JulianDate.lessThanOrEquals(testTime, this.end)
        )
      },

      // 移动窗口
      moveTo(newCenter) {
        this.center = TimeUtils.toJulianDate(newCenter)
        this.start = Cesium.JulianDate.addSeconds(this.center, -halfWindow, new Cesium.JulianDate())
        this.end = Cesium.JulianDate.addSeconds(this.center, halfWindow, new Cesium.JulianDate())
      },

      // 调整窗口大小
      resize(newSize) {
        this.size = newSize
        const newHalfWindow = newSize / 2
        this.start = Cesium.JulianDate.addSeconds(
          this.center,
          -newHalfWindow,
          new Cesium.JulianDate(),
        )
        this.end = Cesium.JulianDate.addSeconds(this.center, newHalfWindow, new Cesium.JulianDate())
      },
    }
  }

  /**
   * 批量时间转换
   * @param {Array} times - 时间数组
   * @param {string} targetFormat - 目标格式（'julianDate', 'date', 'timestamp', 'iso8601'）
   * @returns {Array} 转换后的时间数组
   */
  static batchConvert(times, targetFormat = 'julianDate') {
    return times.map((time) => {
      switch (targetFormat) {
        case 'julianDate':
          return this.toJulianDate(time)
        case 'date':
          return this.toDate(this.toJulianDate(time))
        case 'timestamp':
          return this.toTimestamp(this.toJulianDate(time))
        case 'iso8601':
          return this.toIso8601(this.toJulianDate(time))
        default:
          return this.toJulianDate(time)
      }
    })
  }

  /**
   * 获取当前时间的各种格式
   * @returns {Object} 当前时间对象
   */
  static now() {
    const julianDate = Cesium.JulianDate.now()
    const date = this.toDate(julianDate)

    return {
      julianDate,
      date,
      timestamp: date.getTime(),
      iso8601: this.toIso8601(julianDate),
      formatted: this.formatTime(date),
    }
  }
}

export default TimeUtils
