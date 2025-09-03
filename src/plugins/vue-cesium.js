import VueCesium from 'vue-cesium'
import * as mars3d from 'mars3d'
// 额外任务
import './extends/CameraList.js'
import './extends/CameraView.js'
import './extends/CreateTarget.js'
import './extends/GraphicStyle.js'
import './extends/MapRotate.js'
import './extends/PointRotate.js'
import './extends/RouteLine.js'
import './extends/SceneOptions.js'
import './extends/ZoomIn.js'
import './extends/ZoomOut.js'

window.mars3d = mars3d

import 'vue-cesium/dist/index.css'
// 引入css
import 'mars3d-cesium/Build/Cesium/Widgets/widgets.css'
import 'mars3d/mars3d.css' // v3.8.6及之前版本使用 import "mars3d/dist/mars3d.css";

import 'mars3d-space' // 导入mars3d插件，导入即可，自动注册（按需使用，需要先npm install mars3d-space）
import 'mars3d-heatmap' // 其他插件类型，自行修改名称

// 导入所有需要的URL
import fontAwesomeUrl from 'font-awesome/css/font-awesome.min.css?url'
import haoutilUrl from 'haoutil?url'
import turfUrl from '@turf/turf?url'
import mars3dSpaceUrl from 'mars3d-space?url'
import echartsUrl from 'echarts?url'
import echartsGlUrl from 'echarts-gl?url'
import mars3dEchartsUrl from 'mars3d-echarts?url'
import mapvUrl from 'mapv?url'
import mars3dMapvUrl from 'mars3d-mapv?url'
import heatmapjsUrl from 'heatmapjs?url'
import mars3dHeatmapUrl from 'mars3d-heatmap?url'
import netcdfjsUrl from 'netcdfjs?url'
import mars3dWindUrl from 'mars3d-wind?url'
import mars3dTdtUrl from 'mars3d-tdt?url'
import mars3dWidgetUrl from 'mars3d-widget?url'
import mars3dCesiumWidgetsUrl from 'mars3d-cesium/Build/Cesium/Widgets/widgets.css?url'
import mars3dCesiumJsUrl from 'mars3d-cesium/Build/Cesium/Cesium.js?url'
import mars3dCssUrl from 'mars3d/mars3d.css?url'
import mars3dJsUrl from 'mars3d/mars3d.js?url'

// Vue-Cesium配置
export const vueCesiumConfig = {
  mars3dConfig: {
    include: 'mars3d',
    libs: {
      'font-awesome': [
        // libpath + 'fonts/font-awesome/css/font-awesome.min.css'
        fontAwesomeUrl,
      ],
      haoutil: [
        // libpath + 'hao/haoutil.js'
        haoutilUrl,
      ],
      turf: [
        // libpath + 'turf/turf.min.js'
        turfUrl,
      ],
      // 'mars3d-space': [
      //   //卫星插件
      //   // libpath + 'mars3d/plugins/space/mars3d-space.js'
      //   mars3dSpaceUrl
      // ],
      // 'mars3d-echarts': [
      //   //echarts支持插件
      //   // libpath + 'echarts/echarts.min.js',
      //   echartsUrl,
      //   // libpath + 'echarts/echarts-gl.min.js',
      //   echartsGlUrl,
      //   // libpath + 'mars3d/plugins/echarts/mars3d-echarts.js'
      //   mars3dEchartsUrl
      // ],
      // 'mars3d-mapv': [
      //   //mapv支持插件
      //   // libpath + 'mapV/mapv.min.js',
      //   mapvUrl,
      //   // libpath + 'mars3d/plugins/mapv/mars3d-mapv.js'
      //   mars3dMapvUrl
      // ],
      // 'mars3d-heatmap': [
      //   //heatmap热力图支持插件
      //   // libpath + 'mars3d/plugins/heatmap/heatmap.min.js',
      //   heatmapjsUrl,
      //   // libpath + 'mars3d/plugins/heatmap/mars3d-heatmap.js'
      //   mars3dHeatmapUrl
      // ],
      // 'mars3d-wind': [
      //   //风场图层插件
      //   // libpath + 'mars3d/plugins/wind/netcdfjs.js', //m10_windLayer解析nc
      //   netcdfjsUrl,
      //   // libpath + 'mars3d/plugins/wind/mars3d-wind.js'
      //   mars3dWindUrl
      // ],
      // 'mars3d-tdt': [mars3dTdtUrl],
      // 'mars3d-widget': [mars3dWidgetUrl],
      mars3d: [
        //三维地球"主库"
        // libpath + 'Cesium/Widgets/widgets.css', //cesium
        mars3dCesiumWidgetsUrl,
        // libpath + 'Cesium/Cesium.js',
        mars3dCesiumJsUrl,
        // libpath + 'mars3d/mars3d.css', //mars3d
        mars3dCssUrl,
        // libpath + 'mars3d/mars3d.js'
        mars3dJsUrl,
      ],
    },
  },
  // cesiumPath: '/cesium'
}

// 导出VueCesium插件
export { VueCesium }
