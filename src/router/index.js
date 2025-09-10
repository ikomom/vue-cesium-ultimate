import { createRouter, createWebHistory } from 'vue-router'
import CesiumView from '@/containers/CesiumView.vue'
import ComponentDemo from '@/views/ComponentDemo.vue'
import CesiumRenderDemo from '@/views/CesiumRenderDemo.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: CesiumView,
    meta: {
      title: '首页 - Cesium地图',
    },
  },
  {
    path: '/cesium',
    name: 'Cesium',
    component: CesiumView,
    meta: {
      title: 'Cesium地图视图',
    },
  },
  {
    path: '/demo',
    name: 'Demo',
    component: ComponentDemo,
    meta: {
      title: '组件演示',
    },
  },
  {
    path: '/test-map',
    name: 'TestMap',
    component: () => import('@/views/TestMap.vue'),
    meta: {
      title: '测试地图页面',
    },
  },
  {
    path: '/render-demo',
    name: 'RenderDemo',
    component: CesiumRenderDemo,
    meta: {
      title: 'Cesium 原生渲染引擎演示',
    },
  },
  {
    path: '/mars3d',
    name: 'Mars3d',
    component: () => import('@/views/mars3d/MapView.vue'),
    meta: {
      title: 'Mars3d地图页面',
    },
  },
  {
    path: '/circle-connector-demo',
    name: 'CircleConnectorDemo',
    component: () => import('@/views/CircleConnectorDemo.vue'),
    meta: {
      title: '圆环节点连接器演示',
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

export default router
