import {createRouter,createWebHashHistory} from 'vue-router'
import sender from '../components/sender.vue'
import receiver from '../components/receiver.vue'
import exchangeRoom from '../components/exchangeRoom.vue'
import bigFileDrop from '../components/bigFileDrop.vue'
// const router=new VueRouter({
//     routes:[
//         //配置路由的路径
//         {
//             path:'/student',
//             component:student
//         },
//         {
//             path:'/school',
//             component:school
//         }
//     ]
// })
// export default router;

const routes = [
    // {
//     path: '/',
//         redirect: '/',
//         name: 'home',
//         component: sender,
//         meta: {
//             keepAlive: true
//         }
//     },
    {
        path: '/receiver',
        component: receiver,
    },
    {path: '/sender', component: sender},
    {path: '/exchangeroom', component: exchangeRoom},
    {path: '/bigfiledrop', component: bigFileDrop},
];
//};

function newRouter()
{
let router = null;
//    try{
    // 3. Create the router instance and pass the `routes` option
    // You can pass in additional options here, but let's
    // keep it simple for now.
    router = createRouter({
        // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
        history: createWebHashHistory(),
        //mode: 'history',
        //    // linkActiveClass: 'linkActive',
        routes: routes, // short for `routes: routes`
    });

    // 全局守卫 在路由进入之前进行一些操作, 例如判断是否登陆
    router.beforeEach((to, from, next) => {
        next();
    })
//    }
//    catch (err)
//    {
//      console.warn(err);
//}
return router;
}

export {newRouter};