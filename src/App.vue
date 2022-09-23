<script setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <h1>风月宝鉴</h1>
  <router-link to="/sender" class="function_router">发送端</router-link>

  <router-link to="/receiver" class="function_router">接收端</router-link>

  <router-link to="/exchangeroom" class="function_router">二合一端</router-link>
  <!-- <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div> -->
  <!-- <HelloWorld msg="Vite + Vue" /> -->
  <router-view></router-view>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

.function_router {
    margin: 10px;
    padding: 10px;
    text-decoration: none;
    background-image: linear-gradient(red, red);
    background-repeat: no-repeat;
    background-position: bottom left;
    background-size: 0 3px;
    transition: background-size 500ms ease-in-out;
    color: black;
}

.function_router:hover {
    background-size: 100% 3px;
    color:red;
}

h1 {
  padding: 20px 20px;
  border-left: 10px solid #ed515191;background-color: rgba(208, 208, 208, 0);
  font-size: 50px;
  line-height: 40px;
  color: cornflowerblue;
  font-weight: bold;margin: 5px 0;
}

</style>
