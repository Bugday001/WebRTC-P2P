<template>
    <div className="styles.container">
      <div>
        <Space>
          <button type="primary" onClick={callUser}>视频通话</button>
          <button type="primary" danger onClick={endCall}>结束通话</button>
        </Space>
      </div>
      <div class="videos">
            <div class="videoShow">
                <h2>本地摄像头</h2>
                <video controls autoPlay ref='localVideo' muted />
            </div>
            <div class="videoShow">
                <h2>远程摄像头</h2>
                <video controls autoPlay ref='remoteVideo' />
            </div>
            
      </div>
            
    </div>

</template>

<script>
export default {
    data() {
        return {
            boxStyle: {},
        };
    },
    mounted() {
        let that = this;
        this.localVideo = this.$refs.localVideo;
        const callUser = async () => {
        // 获取本地视频流
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        that.localVideo.srcObject = stream
        that.localVideo.play()
        }
        callUser();
    },
    methods: {
        open() {
            ;
        }
    }
}

</script>


<style>
videoShow {
    box-align: "left";
    width: 40%;
}
    
</style>