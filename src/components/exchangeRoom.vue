<template>
    <!-- <h1>Peer-to-Peer Cue System --- Diad</h1> -->
    <table class="control">
        
        <tr>
            <td class="title">Status:
                <button id="connect-button" @click="copyShareUrl">复制分享URL</button>
                <br />
                <div id="local-id" @click="copyId" style="font-weight: bold;" title="点击复制ID">ID:
                </div>
            </td>
            <td class="title">Messages:
                <br />
                <div id="status" class="status"></div>
            </td>
        </tr>
        <tr>
            <td>
                <span style="font-weight: bold">ID: </span>
                <input type="text" id="receiver-id" title="Input the ID from receive.html">
                <button id="connect-button" @click="join">Connect</button>
            </td>
            <td>
                <input type="text" id="sendMessageBox" placeholder="Enter a message..." autofocus="true" />
                <button type="button" id="sendButton" @click="send">Send</button>
                <button type="button" id="clearMsgsButton" @click="clearMessages">Clear Msgs (Local)</button>
            </td>
        </tr>
        <tr>
            <td>
                <div class="connectInfo">
                    <!-- <br/> -->
                    <shareIdVue :peerId="peerId"></shareIdVue>
                </div>

            </td>
            <td>
                <div class="message" id="message"></div>
            </td>
        </tr>
        <button type="button" @click="callUser">视频通话</button>
        <button type="button" @click="endCall">结束通话</button>
        <button type="button" @click="shareDesktop">桌面共享</button>
        <tr>
            <td class="display-video">
                <h3>本地摄像头</h3>
                    <video controls autoPlay ref='localVideo' poster="https://hipark.pythonanywhere.com/media/imgs/image.jpg" muted />
            </td>
            <td class="display-video">
                <h3>远程摄像头</h3>
                    <video controls autoPlay ref='remoteVideo' poster="https://hipark.pythonanywhere.com/media/imgs/image.jpg" />
            </td>
        </tr>
        <tr>
            <td>
                <input type="file" accept="*" id="inputFile" ref="file" v-on:input="inputFunc" />
                <button type="button" id="sendFile" @click="sendFileBtn">发送文件</button>
            </td>
            <td>
                <img id="demoImage" ref="img" style="width:50%;border:1px solid #efefef" />
                <button type="button" @click="downloadFile">下载文件</button>
            </td>
        </tr>
    </table>
</template>
    
<script>

import Peer from 'peerjs'
import shareIdVue from './shareId.vue';
import {encode, isAssetTypeAnImage, arrayBufferToBase64, base64ToUint8Array} from '../utils/utils.js'
import Message from './../libs/myMessage/components/message.js';

const BYTES_PER_CHUNK = 1200 * 1024;
var currentChunk = 0;
var file;

var incomingFileInfo;
var incomingFileData;
var bytesReceived;
var downloadInProgress = false;


export default {
    data() {
        return {
            peerId: ""
        };
    },
    components: {
        shareIdVue,
    },

    mounted() {
        let that = this;
        this.lastPeerId = null;
        this.peer = null; // own peer object
        this.conn = null;
        this.localId = document.getElementById("local-id");
        this.recvIdInput = document.getElementById("receiver-id");
        this.status = document.getElementById("status");
        this.message = document.getElementById("message");
        this.sendMessageBox = document.getElementById("sendMessageBox");
        this.cueString = "<span class=\"cueMsg\">Cue: </span>";

        //视频
        this.localVideo = this.$refs.localVideo;
        this.remoteVideo = this.$refs.remoteVideo;

        //文件
        this.fileReader = new FileReader();
        this.fileReader.onload = function () {
            that.conn.send(//that.fileReader.result);
                JSON.stringify({
                    type: "file",
                    fileContent: arrayBufferToBase64(that.fileReader.result)
                }));
            currentChunk++;
            if (BYTES_PER_CHUNK * currentChunk < file.size) {
                that.readNextChunk();
            }
        },
        //文件流式传输
        this.fileStream = null;
        this.writer = null;

        //由分享连接自动填入对方id
        let id = window.location.href.split('?id=')[1];
        if(id)
            this.recvIdInput.value = id;

        // Listen for enter in message box
        this.sendMessageBox.addEventListener('keypress', function (e) {
            var event = e || window.event;
            var char = event.which || event.keyCode;
            if (char == '13')
                that.send();
        });

        this.initialize();
    },

    created() {
        this.lastPeerId = null;
        this.peer = null; // Own peer object
        this.peerId = null;
        this.conn = null;
        this.currentCall = null;
        this.currentConnection = null;
    },

    methods: {
        /**
         * Create the Peer object for our end of the connection.
         *
         * Sets up callbacks that handle any events related to our
         * peer object.
         */
        initialize() {
            let that = this;
            // Create own peer object with connection to shared PeerJS server
            that.peer = new Peer(null, {
                debug: 2
            });

            //
            that.peer.on('open', function (id) {
                // Workaround for peer.reconnect deleting previous id
                if (that.peer.id === null) {
                    console.log('Received null id from peer open');
                    that.peer.id = that.lastPeerId;
                } else {
                    that.lastPeerId = that.peer.id;
                }
                console.log('ID: ' + that.peer.id);
                that.localId.innerHTML = "ID: " + that.peer.id;
                that.peerId = that.peer.id;
                that.status.style.color = "red";
                that.status.innerHTML = "Awaiting connection...";
            });

            // receive connection
            that.peer.on('connection', function (c) {
                // Allow only a single connection
                if (that.conn && that.conn.open) {
                    c.on('open', function () {
                        c.send("Already connected to another client");
                        setTimeout(function () { c.close(); }, 500);
                    });
                    return;
                }

                that.conn = c;
                console.log("Connected to: " + that.conn.peer);
                that.status.style.color = "green";
                that.status.innerHTML = "Friend: " + that.conn.peer;
                Message.success({message: '连接成功'});
                that.ready();
            });

            /**
             * 
             */
            that.peer.on('disconnected', function () {
                that.status.style.color = "red";
                console.log('Connection lost. Please reconnect');
                Message.warning({message: '连接断开'});
                // Workaround for peer.reconnect deleting previous id
                that.peer.id = that.lastPeerId;
                that.peer._lastServerId = that.lastPeerId;
                that.peer.reconnect();
            });

            /**
             * 
             */
            that.peer.on('close', function () {
                that.conn = null;
                that.status.style.color = "red";
                console.log('Connection destroyed');
                Message.warning({message: '连接关闭'});
            });

            /**
             * 
             */
            that.peer.on('error', function (err) {
                console.log(err);
                alert('' + err);
            });

            // 媒体传输，响应
            that.peer.on('call', async (call) => {
                if (window.confirm(`是否接受 ${call.peer}?`)) {

                    // 获取本地流
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                    that.localVideo.srcObject = stream
                    that.localVideo.play()

                    // 响应
                    call.answer(stream)

                    // 监听视频流，并更新到 remoteVideo 上
                    call.on('stream', (stream) => {
                        that.remoteVideo.srcObject = stream;
                        that.remoteVideo.play()
                    })

                    that.currentCall = call
                } else {
                    call.close()
                    alert('已关闭')
                }
            });

        },

        /**
         * 发起视频通话
         */
        async callUser() {
            let remoteId = this.conn.peer;
            let that = this;
            // 获取本地视频流
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            that.localVideo.srcObject = stream
            that.localVideo.play()

            // 多媒体传输
            const call = that.peer.call(remoteId, stream);
            call.on("stream", (stream) => {
                that.remoteVideo.srcObject = stream;
                that.remoteVideo.play()
            });
            call.on("error", (err) => {
                console.error(err);
            });
            call.on('close', () => {
                endCall();
            })

            that.currentCall = call
        },
        
        /**
         * 结束视频通话
         */
        endCall() {
            this.currentCall.close();
        },


        /**
         * 桌面共享
         */
        async shareDesktop() { 
            let remoteId = this.conn.peer;
            let that = this;

            var stream = new MediaStream();
            let audio_stm = await navigator.mediaDevices.getUserMedia({
                audio: true
            })
            let video_stm = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            })
            //组合桌面视频与话筒音频
            audio_stm.getAudioTracks().map(row => stream.addTrack(row))
            video_stm.getVideoTracks().map(row => stream.addTrack(row))

            // combine the streams, ... 是扩展运算符
            // const sstream = new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()])
            that.localVideo.srcObject = stream
            that.localVideo.play()

            // 多媒体传输
            const call = that.peer.call(remoteId, stream);
            call.on("stream", (stream) => {
                that.remoteVideo.srcObject = stream;
                that.remoteVideo.play()
            });
            call.on("error", (err) => {
                console.error(err);
            });
            call.on('close', () => {
                endCall();
            })

            that.currentCall = call
        },  

        /**
         * Create the connection between the two Peers.
         *
         * Sets up callbacks that handle any events related to the
         * connection and data received on it.
         */
        join() {
            let that = this;
            // Close old connection
            if (that.conn) {
                that.conn.close();
            }

            // Create connection to destination peer specified in the input field
            that.conn = that.peer.connect(that.recvIdInput.value, {
                reliable: true
            });

            that.conn.on('open', function () {
                that.status.style.color = "green";
                that.status.innerHTML = "Friend: " + that.conn.peer;
                console.log("Connected to: " + that.conn.peer);
                Message.success({message: '连接成功'});
                // Check URL params for comamnds that should be sent immediately
                var command = that.getUrlParam("command");
                if (command)
                    that.conn.send(command);
            });
            // Handle incoming data (messages only since this is the signal sender)
            that.conn.on('data', function (data) {
                that.dataProcess(data);
            });
            that.conn.on('close', function () {
                that.status.style.color = "red";
                that.status.innerHTML = "Connection closed";
                Message.warning({message: '连接关闭'});
            });
        },

        /**
         * Triggered once a connection has been achieved.
         * Defines callbacks to handle incoming data and connection events.
         */
        ready() {
            let that = this;
            //接收到信息
            that.conn.on('data', function (data) {
                console.log("Data recieved");
                that.dataProcess(data);
            });

            that.conn.on('close', function () {
                that.status.style.color = "red";
                that.status.innerHTML = "Connection reset! Awaiting connection...";
                that.conn = null;
            });
        },

        /**
         * 处理接收的数据
         * @param {*} data 
         */
        dataProcess(data) {
            let that = this;
            //判断是文本还是文件
            let jsonData = JSON.parse(data.toString());
            if(typeof(jsonData.type) != "undefined" && jsonData.type == "msg") {
                that.addMessage("<span class=\"peerMsg\">Peer: </span>" + jsonData.msg);
            }
            else if(downloadInProgress == false){
                that.startDownload(jsonData);
            }
            else if (downloadInProgress) {
                    that.progressDownload(base64ToUint8Array(jsonData.fileContent));
            }
        },

        /**
         * 分享连接ID
         */
        copyId() {
            let that = this;
            navigator.clipboard.writeText(""+that.peer.id).then(() => {
                Message.success({
                    message: '复制成功!'
                });
                console.log('复制成功');
            });
        },

        /**
         * 点击复制分享url
         */
        copyShareUrl() {
            let that = this;
            let local_url = window.location.href.split('?')[0];
            let val = local_url + "?id=" + that.peer.id;
            //新：
            navigator.clipboard.writeText(""+val).then(() => {
                Message.success({message: '已复制分享链接'});
                console.log('复制成功');
            });
        },

        /**
         * send msg to the other side
         */
        send() {
            let that = this;
            if (that.conn && that.conn.open) {
                var msg = that.sendMessageBox.value;
                that.sendMessageBox.value = "";
                that.conn.send(JSON.stringify({
                    type: "msg",
                    msg: msg
                }));
                console.log("Sent: " + msg);
                that.addMessage("<span class=\"selfMsg\">Self: </span> " + msg);
            } else {
                console.log('Connection is closed');
            }
        },

        /**
         * 监听input文件变化,不发送
         */
        inputFunc() {
            let that = this;
            const inputFile = this.$refs.file.files[0];
            //构造图片对应的blob对象     
            if (isAssetTypeAnImage(inputFile.name)) {
                that.$refs.img.src = window.URL.createObjectURL(inputFile);
            }
        },

        /**
         * 发送文件按钮回调
         */
        sendFileBtn() {
            let that = this;
            const inputFile = this.$refs.file.files[0];
            //切片
            currentChunk = 0;
            // send some metadata about our file
            // to the receiver
            if (!(that.conn && that.conn.open)) {
                alert("请先连接，在从新上传文件发送！");
                return;
            }
            //显示图像
            if (isAssetTypeAnImage(inputFile.name)) {
                that.$refs.img.src = window.URL.createObjectURL(inputFile);
            }
            that.conn.send(JSON.stringify({
                fileName: inputFile.name,
                fileSize: inputFile.size
            }));
            file = inputFile;
            that.readNextChunk();
        },

        /**
         * 发送文件
         */
        sendFile(blob, fileName, fileType) {
            let that = this;
            let message = { "file": blob, "filename": fileName, "filetype": fileType };
            if (!(that.conn && that.conn.open)) {
                alert("请先连接，在从新上传文件发送！");
                return;
            }
            that.conn.send(message);
            console.log('send file');
        },

        /**
         * 文件切片发送
         */
        readNextChunk() {
            let that = this;
            let start = BYTES_PER_CHUNK * currentChunk;
            let end = Math.min(file.size, start + BYTES_PER_CHUNK);
            that.fileReader.readAsArrayBuffer(file.slice(start, end));
        },

        /**
         * 
         * @param {文件信息接收} data 
         */
        startDownload(data) {
            let that = this;
            incomingFileInfo = data;//JSON.parse(data.toString());
            incomingFileData = [];
            bytesReceived = 0;
            downloadInProgress = true;
            console.log('incoming file <b>' + incomingFileInfo.fileName + '</b> of ' + incomingFileInfo.fileSize + ' bytes');
        },

        /**
         * 文件接收
         * @param {*} data 
         */
        progressDownload(data) {
            let that = this;
            bytesReceived += data.byteLength;
            incomingFileData.push(data);
            console.log('progress: ' + ((bytesReceived / incomingFileInfo.fileSize) * 100).toFixed(2) + '%');
            if (bytesReceived === incomingFileInfo.fileSize) {
                console.log("传输完成");
                if (isAssetTypeAnImage(incomingFileInfo.fileName)) {
                    that.addMessage("<span class=\"peerMsg\">Peer send a file </span>");
                    let blob = new window.Blob(incomingFileData);
                    that.$refs.img.src = window.URL.createObjectURL(blob);
                    downloadInProgress = false;
                }

            }
            if (bytesReceived > incomingFileInfo.fileSize) {
                console.log("失败");
                downloadInProgress = false;
            }
        },

        //启动下载
        downloadFile() {
            console.log("endDownload!");
            downloadInProgress = false;
            let blob = new window.Blob(incomingFileData);
            let anchor = document.createElement('a');
            anchor.href = URL.createObjectURL(blob);
            anchor.download = incomingFileInfo.fileName;
            anchor.textContent = 'XXXXXXX';

            if (anchor.click) {
                anchor.click();
            } else {
                var evt = document.createEvent('MouseEvents');
                evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                anchor.dispatchEvent(evt);
            }
        },

        /**
         * Get first "GET style" parameter from href.
         * This enables delivering an initial command upon page load.
         *
         * Would have been easier to use location.hash.
         */
        getUrlParam(name) {
            name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
            var regexS = "[\\?&]" + name + "=([^&#]*)";
            var regex = new RegExp(regexS);
            var results = regex.exec(window.location.href);
            if (results == null)
                return null;
            else
                return results[1];
        },

        /**
         * Send a signal via the peer connection and add it to the log.
         * This will only occur if the connection is still alive.
         */
        signal(sigName) {
            let that = this;
            if (that.conn && that.conn.open) {
                that.conn.send(sigName);
                console.log(sigName + " signal sent");
                that.addMessage(cueString + sigName);
            } else {
                console.log('Connection is closed');
            }
        },

        addMessage(msg) {
            var now = new Date();
            var h = now.getHours();
            var m = addZero(now.getMinutes());
            var s = addZero(now.getSeconds());

            if (h > 12)
                h -= 12;
            else if (h === 0)
                h = 12;

            function addZero(t) {
                if (t < 10)
                    t = "0" + t;
                return t;
            };

            this.message.innerHTML = "<br><span class=\"msg-time\">" + h + ":" + m + ":" + s + "</span>  -  " + msg + this.message.innerHTML;
        },

        clearMessages() {
            this.message.innerHTML = "";
            this.addMessage("Msgs cleared");
        }


    },
};
</script>

<style src="../assets/css/exchangeRoom.css" scoped>

</style>
<style>
button {
    margin: 5px;
}


</style>