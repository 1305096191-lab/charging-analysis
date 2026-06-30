import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Vant 样式（按需引入由 vite 插件处理，这里导入全局基础样式）
import 'vant/lib/index.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
