import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import VueCesium from 'vue-cesium'
import 'vue-cesium/dist/index.css'

const app = createApp(App)

app.use(VueCesium)
app.use(createPinia())

app.mount('#app')
