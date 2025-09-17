<template>
  <div class="map-container">
    <vc-viewer
      ref="vcViewer"
      timeline
      @ready="onViewerReady"
      class="cesium-viewer"
    >
      <!-- <vc-entity v-model:billboard="billboard" ref="entity" @click="onEntityClick" :position="{lng: 108, lat: 32}" :point="point" :label="label">
      <vc-graphics-billboard ref="billboard" image="https://zouyaoji.top/vue-cesium/favicon.png"></vc-graphics-billboard>
      <vc-graphics-rectangle :coordinates="[130, 20, 80, 25]" material="green"></vc-graphics-rectangle>
    </vc-entity> -->
      <!-- 天地图注记 -->
      <!-- <vc-layer-imagery :sort-order="20">
      <vc-imagery-provider-tianditu map-style="cva_c" token="436ce7e50d27eede2f2929307e6b33c0"></vc-imagery-provider-tianditu>
    </vc-layer-imagery> -->
      <!-- 天地图影像 -->
      <!-- <vc-layer-imagery :sort-order="10">
      <vc-imagery-provider-tianditu map-style="img_c" token="436ce7e50d27eede2f2929307e6b33c0"></vc-imagery-provider-tianditu>
    </vc-layer-imagery> -->
    </vc-viewer>

    <!-- 控制面板 -->
    <div class="control-panel">
      <h3>地图控制</h3>
      <button @click="flyToBeijing" class="control-btn">飞行到北京</button>
      <button @click="flyToShanghai" class="control-btn">飞行到上海</button>
      <button @click="resetView" class="control-btn">重置视图</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import * as mars3d from 'mars3d'
import { Cesium } from 'mars3d'
import { graphicLayer } from './loo'
// import type { Viewer } from 'cesium'

// 响应式数据
const viewer = shallowRef<Cesium.Viewer | null>(null)
const mars3dMap = ref<mars3d.Map | null>(null)

const viewerOpts = {
  mars3dConfig: {
    include: 'mars3d',
  },
}
const config = {
  clock: {
    startTime: '2017/08/25 08:00:00',
    stopTime: '2017/08/25 08:01:20',
    clockRange: Cesium.ClockRange.CLAMPED,
    shouldAnimate: false,
  },
}
// Cesium viewer 准备就绪回调
const onViewerReady = (cesiumInstance: any) => {
  console.log('Cesium viewer is ready', cesiumInstance)
  const { viewer, map } = cesiumInstance
  viewer.value = viewer
  map.addControl(new mars3d.control.ClockAnimate({ format: 'duration' }))
  // 演示数据
  const graphicLayer = new mars3d.layer.GeoJsonLayer({
    id: '20241101',
    url: '/offline-data/mars3d-draw.json',
    popup: 'all',
  })
  map.addLayer(graphicLayer)
  graphicLayer.readyPromise.then(() => {
    graphicLayer.show = false
  })
  // map.clock.shouldAnimate = true

  mars3dMap.value = map
  addTask()


  creatreDmzList()
  mars3d.Util.fetchJson({ url: "/offline-data/tle-china.json" })
    .then(function (data) {
      craeteSattllite(data.data)
    })
    .catch(function (err) {
      console.error(err)
    })
  // 初始化Mars3D
  // initMars3D()

  // 设置初始视图
  // viewer.value?.camera.setView({
  //   destination: Cesium.Cartesian3.fromDegrees(116.39, 39.91, 15000000)
  // })
}

function craeteSattllite(arr: any[] = []) {
const map = mars3dMap.value
  if(!map) return
  const graphicLayer = new mars3d.layer.GraphicLayer()
  map.addLayer(graphicLayer)

  graphicLayer.on(mars3d.EventType.click, function (event) {
    console.log("单击了卫星", event)
    // 单击事件
    highlightSatellite(event.graphic)
  })
  graphicLayer.on(mars3d.EventType.change, function (event) {
    // 位置变化事件
    processInArea(event.graphic)
  })

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]

    // 属性处理
    item.model = {
      url: "/offline-data/weixin.gltf",
      scale: 1,
      minimumPixelSize: 50,
      ...(item.model || {}),
      distanceDisplayCondition: true,
      distanceDisplayCondition_near: 0,
      distanceDisplayCondition_far: 20000000
    }
    // 当视角距离超过20000000米(distanceDisplayCondition_far定义的) 后显示为点对象的样式
    item.point = {
      color: "#ffff00",
      pixelSize: 5,
      distanceDisplayCondition: true,
      distanceDisplayCondition_near: 20000000,
      distanceDisplayCondition_far: Number.MAX_VALUE
    }

    item.label = item.label || {
      color: "#ffffff",
      opacity: 1,
      font_size: 30,
      font_family: "楷体",
      outline: true,
      outlineColor: "#000000",
      outlineWidth: 3,
      background: true,
      backgroundColor: "#000000",
      backgroundOpacity: 0.5,
      pixelOffsetY: -20,
      scaleByDistance: true,
      scaleByDistance_far: 10000000,
      scaleByDistance_farValue: 0.4,
      scaleByDistance_near: 100000,
      scaleByDistance_nearValue: 1
    }
    item.label.text = item.name

    // path显示后FPS下降的厉害
    item.path = item.path || {}
    item.path.color = item.path.color ?? "#e2e2e2"
    item.path.closure = false

    item.cone = {
      sensorType: i % 2 === 1 ? mars3d.graphic.SatelliteSensor.Type.Rect : mars3d.graphic.SatelliteSensor.Type.Conic,
      angle1: random(20, 40),
      angle2: random(10, 20),
      color: "rgba(0,255,0,0.5)",
      show: false
    }
    // 属性处理  END

    const satelliteObj = new mars3d.graphic.Satellite(item)
    graphicLayer.addGraphic(satelliteObj)
  }
  console.log("当前卫星数量: " + arr.length)
}
function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}
function addTask() {
  if (mars3dMap.value) {
    // 时序任务
    const task = new mars3d.thing.Task({
      list: [
        {
          type: 'mapRotate',
          name: '地球自旋转',
          start: 0,
          duration: 6,
          speed: 0.01,
        }, // 时长秒数，当没有配置stop时，内部自动算：stop= start + duration
        {
          type: 'sceneOptions',
          name: '设置场景参数',
          start: 7,
          duration: 3,
          scene: {
            sceneMode: Cesium.SceneMode.SCENE2D, // 2,
            sceneModeMorphDuration: 1,
          },
        },
        {
          type: 'camera',
          name: '单个视角定位',
          start: 11,
          duration: 3,
          center: {
            lat: 30.461755,
            lng: 116.280775,
            alt: 36600.2,
            heading: 0.8,
            pitch: -39.7,
          },
        },
        {
          type: 'graphicStyle',
          name: '高亮矢量对象',
          start: 15,
          duration: 6,
          layerId: '20241101',
          graphicIds: ['M-4492C7B1-F860-4F4B-A30D-3863A83F99C5'],
          interval: true,
          style: { color: '#ffff00' },
        },
        {
          type: 'camera',
          name: '单个视角定位',
          start: 21,
          duration: 3,
          center: {
            lat: 31.822251,
            lng: 117.170363,
            alt: 2225.3,
            heading: 0.7,
            pitch: -46,
          },
        },
        {
          type: 'createTarget',
          name: '创建标记',
          start: 25,
          duration: 8,
          graphics: [
            {
              type: 'billboardP',
              position: [117.171218, 31.841133, 253.6],
              style: {
                image: 'https://data.mars3d.cn/img/marker/mark-blue.png',
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              },
            },
          ],
        },
        { type: 'zoomIn', name: '放大地图', start: 25, duration: 2 },
        { type: 'zoomOut', name: '缩小地图', start: 27, duration: 2 },
        {
          type: 'pointRotate',
          name: '绕内旋转',
          start: 29,
          duration: 8,
          isRotateOut: false,
          point: {
            lng: 117.170949,
            lat: 31.840785,
            alt: 268.9,
          },
          time: 8,
        },
        {
          type: 'camera',
          name: '单个视角定位',
          start: 38,
          duration: 2,
          center: {
            lat: 31.844062,
            lng: 117.171172,
            alt: 227.9,
            heading: 4,
            pitch: 0,
          },
        },
        {
          type: 'pointRotate',
          name: '绕外旋转',
          start: 38,
          duration: 8,
          isRotateOut: true,
          time: 6,
        },
        {
          type: 'routeLine',
          name: '按路线漫游',
          start: 50,
          duration: 15,
          route: {
            position: {
              type: 'time',
              speed: 60,
              pauseTime: 0.5,
              list: [
                [117.220356, 31.833959, 43.67],
                [117.220361, 31.835111, 44.36],
                [117.213242, 31.835863, 42.31],
                [117.211926, 31.835738, 42.14],
                [117.183103, 31.833906, 47.17],
              ],
            },
            camera: {
              type: 'gs',
              radius: 300,
            },
            polyline: {
              color: '#ffff00',
              width: 3,
              clampToGround: true,
            },
            model: {
              url: 'https://data.mars3d.cn/gltf/mars/man/walk.gltf',
              scale: 5,
              minimumPixelSize: 50,
              clampToGround: true,
            },
          },
        },
        {
          type: 'cameraList',
          name: '视角列表播放',
          delay: 2, // 延迟执行秒数，当没有配置start时，内部自动算：start=前一个的stop + delay
          duration: 11,
          list: [
            {
              lat: 31.813938,
              lng: 117.240085,
              alt: 3243,
              heading: 357,
              pitch: -52,
            },
            {
              lat: 31.821728,
              lng: 117.253605,
              alt: 1702,
              heading: 319,
              pitch: -37,
            },
            {
              lat: 31.836674,
              lng: 117.260762,
              alt: 1779,
              heading: 269,
              pitch: -37,
            },
          ],
        },
      ],
    })
    task.on(mars3d.EventType.startItem, function (event) {
      const item = event.sourceTarget
      console.log(`第${event.index + 1}个任务开始执行`, item)

      // eventTarget.fire('changeIndex', {
      //   index: event.index,
      //   name: item.options.name,
      // })
    })
    task.on(mars3d.EventType.endItem, function (event) {
      const item = event.sourceTarget
      console.log(`第${event.index + 1}个任务完成释放`, item)
    })
    mars3dMap.value.addThing(task)

    mars3dMap.value.clock.onTick.addEventListener(({ currentTime }) => {
      // console.log('cu',  task.currentTime)
      // task.currentTime = currentTime
    })
    // 打印日志
    console.log(
      `当前共${task.count}个任务需要执行,总时长${task.duration}秒`,
      task
    )

    autoAddTimeControl()
  }
}
function autoAddTimeControl() {
  const map = mars3dMap.value
  if (!map) {
    return
  }
  const taskResult = Object.assign(
    { duration: 0, list: [] },
    map.getTimeTaskList()
  )
  if (taskResult.duration > 0 && taskResult.list?.length > 0) {
    console.log(`当前地图所有时序相关任务清单`, taskResult)

    // 停止，手动开始
    // map.clock.shouldAnimate = false

    // 修改时间
    const startTime = map.clock.startTime
    map.clock.currentTime = map.clock.startTime // 设置当前时间 = 开始时间

    const stopTime = Cesium.JulianDate.addSeconds(
      startTime,
      taskResult.duration + 1,
      new Cesium.JulianDate()
    )
    map.clock.stopTime = stopTime

    // 添加控件
    // if (!map.control.timeline) {
    //   const clockAnimate = new mars3d.control.ClockAnimate({ format: "duration" })
    //   map.addControl(clockAnimate)
    // }

    if (map.control.timeline) {
      map.control.timeline.zoomTo(startTime, stopTime)
    } else {
      // const timeline = new mars3d.control.Timeline({ format: "duration" })
      // map.addControl(timeline)
    }
  }
}


// 地面站图层
let dmzLayer: any
// 创建地面站
function creatreDmzList() {
  const map = mars3dMap.value
  if(!map) return

  const arr = [
    { name: "西安", radius: 1500000, point: [108.938314, 34.345614, 342.9] },
    { name: "喀什", radius: 1800000, point: [75.990372, 39.463507, 1249.5] },
    { name: "文昌", radius: 1200000, point: [110.755151, 19.606573, 21.1] }
  ]

  // 创建矢量数据图层
  dmzLayer = new mars3d.layer.GraphicLayer()
  map.addLayer(dmzLayer)

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    // 地面站gltf模型
    const graphic = new mars3d.graphic.ModelEntity({
      name: "地面站模型",
      position: item.point,
      style: {
        url: "https://data.mars3d.cn/gltf/mars/leida.glb",
        heading: 270,
        scale: 30,
        minimumPixelSize: 40
      },
      popup: item.name
    })
    dmzLayer.addGraphic(graphic)

    const dmfwGraphic = new mars3d.graphic.CircleEntity({
      name: item.name,
      position: item.point,
      style: {
        radius: item.radius,
        color: "#ff0000",
        opacity: 0.3
      },
      popup: item.name
    })
    dmzLayer.addGraphic(dmfwGraphic)

    // 判断时会用到的变量
    dmfwGraphic._isFW = true
    dmfwGraphic._lastInPoly = {}
  }
}
// 判断卫星是否在面内
function processInArea(weixin: any) {
  const position = weixin?.position
  if (!position) {
    return
  }
  const map = mars3dMap.value
  if(!map) return

  dmzLayer.eachGraphic(function (dmzGraphic) {
    if (!dmzGraphic._isFW) {
      return
    }

    dmzGraphic._lastInPoly[weixin.id] = dmzGraphic._lastInPoly[weixin.id] || {}
    const lastState = dmzGraphic._lastInPoly[weixin.id]

    const thisIsInPoly = dmzGraphic.isInPoly(position)
    if (thisIsInPoly !== lastState.state) {
      if (thisIsInPoly) {
        // 开始进入区域内
        console.log(`${weixin.name} 卫星开始进入 ${dmzGraphic.name} 地面站区域内`)

        const line = new mars3d.graphic.PolylineEntity({
          positions: new Cesium.CallbackProperty(function (time) {
            const pots = weixin.position
            if (!pots) {
              return []
            }
            return [pots, dmzGraphic.positionShow]
          }, false),
          style: {
            width: 7,
            // 动画线材质
            materialType: mars3d.MaterialType.LineFlow,
            materialOptions: {
              url: "https://data.mars3d.cn/img/textures/arrow-h.png",
              color: Cesium.Color.AQUA,
              repeat: new Cesium.Cartesian2(15, 1),
              speed: 60 // 时长，控制速度
            },
            arcType: Cesium.ArcType.NONE
          }
        })
        map.graphicLayer.addGraphic(line)
        lastState.line = line

        weixin.coneShow = true // 打开视锥体
      } else {
        // 离开区域
        console.log(`${weixin.name} 卫星离开 ${dmzGraphic.name} 地面站区域内`)

        if (lastState.line) {
          map.graphicLayer.removeGraphic(lastState.line)
          delete lastState.line
        }
        weixin.coneShow = false // 关闭视锥体
      }

      dmzGraphic._lastInPoly[weixin.id].state = thisIsInPoly
    }
  })
}

let lastSelectWX: any

function highlightSatellite(satelliteObj: any) {
  if (lastSelectWX && !lastSelectWX.isDestroy) {
    // 重置上次选中的轨道样式
    lastSelectWX.setOptions({
      path: {
        color: "#e2e2e2",
        opacity: 0.5,
        width: 1
      }
    })
    lastSelectWX.coneShow = false // 关闭视锥体
    lastSelectWX = null
  }

  if (satelliteObj) {
    // 高亮选中的轨道样式
    satelliteObj.setOptions({
      path: {
        color: "#ffff00",
        opacity: 1,
        width: 2
      }
    })
    satelliteObj.coneShow = true // 打开视锥体
    lastSelectWX = satelliteObj
  }
}

// 飞行到北京
const flyToBeijing = () => {
  if (viewer.value) {
    viewer.value.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.39, 39.91, 1000000),
    })
  }
}

// 飞行到上海
const flyToShanghai = () => {
  if (viewer.value) {
    viewer.value.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(121.47, 31.23, 1000000),
    })
  }
}

// 重置视图
const resetView = () => {
  if (viewer.value) {
    viewer.value.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.39, 39.91, 15000000),
    })
  }
}
</script>

<style scoped>
.map-container {
  position: relative;
  height: 100%;
  width: 100%;
  color: #fff;
}

.cesium-viewer {
  height: 100%;
  width: 100%;
}

.control-panel {
  position: absolute;
  top: 40px;
  right: 20px;
  background: rgba(42, 42, 42, 0.9);
  color: white;
  padding: 20px;
  border-radius: 8px;
  min-width: 200px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.control-panel h3 {
  margin: 0 0 15px 0;
  font-size: 1.2rem;
  text-align: center;
}

.control-btn {
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 10px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.control-btn:hover {
  background-color: #2980b9;
}

.control-btn:last-child {
  margin-bottom: 0;
}
</style>
