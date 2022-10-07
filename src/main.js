// import { createApp } from 'vue'
// import './style.css'
// import App from './App.vue'
// import router from './router'
// import VueRouter from 'vue-router'
// Vue.use(VueRouter)
// Vue.config.productionTip = false
 
// new Vue({
//   el:'#app',
//   render: h => h(App),
//   router:router
// })

// // createApp(App).mount('#app')

import { createApp, VueElement } from 'vue'
import {newRouter} from './router/index.js'
import App from './App.vue'

const app = createApp(App)

    // .use(ElementPlus,{
    //     locale: zh, size: 'small'
    //   });
    // .use(ElContainer)
    // .use(ElAside)
    // .use(ElHeader)
    // .use(ElMain)
    // .use(ElFooter)
    // .use(ElMenu)
    // .use(ElButton);
    
// app.mount('#app');
//全局捕获错误，便于写入数据库，log文件什么的
app.config.errorHandler = (err, vm, info) => {
    // 处理错误
    // info` 是 Vue 特定的错误信息，比如错误所在的生命周期钩子
    console.log("mainjs:error: " + info);
    // err 显示具体错误位置
    console.log(err);
    // vm可以查看组件，文件路径什么的
}

//仅在开发环境起作用
app.config.warnHandler = function(msg, vm, trace) {
    // `trace` 是组件的继承关系追踪
    console.log("mainjs:warn: " + msg);
}  
    
app.use(newRouter()).mount('#app');
