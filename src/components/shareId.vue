<template>
    <input type="text"  ref="username" value="hello" class="username" />
    <button type="button" @click="pushID">上传ID</button>
    <button type="button" @click="getID">搜索ID</button>
    <div class="message" ref="message"></div>
</template>
    
<script>

import { pushId, pullId } from '../foundation/shareId-api'
import {watch} from 'vue'
export default {
  data() {
    return {
      
    };
  },

  props: {
    peerId: {
      type: String,
      required: true
    }
  },

  setup(props, context) {
  },

  watch: {
    peerId(newValue, oldValue) {
      console.log('sss:' + newValue)
      if (newValue) {
        this.peerIds = newValue
      }
    },
  },
  mounted() {
    this.message = this.$refs.message;
    this.$refs.username.value = this.randomName();
  },
  created() {

  },

  methods: {
    /**
     * 推id到服务器
     */
    pushID() {
        let params = {"name": this.$refs.username.value, "id": this.peerIds}
        pushId(params).then((res) => {
		    console.log(res)
	    }).catch((res) => {
            console.log(res)
        })
    },

    /**
     * 拉id下来
     */
     getID() {
      let params = {};
      let that = this;
      pullId(params).then((res) => {
        //清空
        that.message.innerHTML = ""
        // json转二维数组
        let entrys = Object.entries(res.data);
        if(entrys.length == 0){
          that.message.innerHTML += "<b>Not a sausage</b>"
        }
        //填充新数据
        for(let i=0; i<entrys.length; i++) {
          that.message.innerHTML += "<br>" + "<b>Name:</b>"+entrys[i][0]+
            "<b>"+", Id:"+"</b>"+entrys[i][1];
        }
		    console.log("success!")
	    }).catch((res) => {
            console.log(res)
        })
    },

    /**
     * 随机生成名字
     */
    randomName(){
      var result = [];
      let n = 4;//这个值可以改变的，对应的生成多少个字母，根据自己需求所改
      let ranNum = Math.ceil(Math.random() * 25);
      result.push(String.fromCharCode(65+ranNum));
      for(var i=0;i<n;i++){
          //生成一个0到25的数字
          ranNum = Math.ceil(Math.random() * 25);
          //大写字母'A'的ASCII是65,A~Z的ASCII码就是65 + 0~25;
          //然后调用String.fromCharCode()传入ASCII值返回相应的字符并push进数组里
          result.push(String.fromCharCode(97+ranNum));
      }
      return result.join('');
    }

  },
};

</script>

<style scoped>
.username {
  width: 150px;
}

.message {
    height: 80px;
    max-height: 80;
    margin-bottom: 10px;
    overflow: auto;
    font-size: 10px;
    font-weight: normal;
}

</style>