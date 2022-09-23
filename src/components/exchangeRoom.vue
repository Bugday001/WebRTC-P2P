<template>
    <!-- <h1>Peer-to-Peer Cue System --- Diad</h1> -->
    <table class="control">
        <tr>
            <td class="title">Status:
                <br />
                <div id="local-id" style="font-weight: bold;" title="Copy this ID to the input on send.html.">ID:
                </div>
            </td>
            <td class="title">Messages:</td>
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
                <div id="status" class="status"></div>
            </td>
            <td>
                <div class="message" id="message"></div>
            </td>
        </tr>
        <button type="button" @click="callUser">Send</button>
        <tr>
            <td class="display-video">
                <h3>本地摄像头</h3>
                <video controls autoPlay ref='localVideo' muted />
            </td>
            <td class="display-video">
                <h3>远程摄像头</h3>
                <video controls autoPlay ref='remoteVideo' />
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
import streamSaver from 'streamsaver'
import { encode, isAssetTypeAnImage } from '../utils/utils.js'

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
            boxStyle: {},
        };
    },
    components: {
        // VideoChatVue
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
            that.conn.send(that.fileReader.result);
            currentChunk++;
            if (BYTES_PER_CHUNK * currentChunk < file.size) {
                that.readNextChunk();
            }
        },
            //文件流式传输
            this.fileStream = null;
        this.writer = null;


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
                that.status.innerHTML = "Connected";
                that.ready();
            });

            /**
             * 
             */
            that.peer.on('disconnected', function () {
                that.status.innerHTML = "Connection lost. Please reconnect";
                console.log('Connection lost. Please reconnect');

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
                that.status.innerHTML = "Connection destroyed. Please refresh";
                console.log('Connection destroyed');
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

        async callUser() {
            let remoteId = this.conn.peer;
            let that = this;
            // 获取本地视频流
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            that.localVideo.srcObject = stream
            that.localVideo.play()

            // 数据传输, start connection
            const connection = that.peer.connect(remoteId);
            that.conn = connection
            connection.on('open', () => {
                // message.info('已连接')
                console.log("已连接 remote")
            })
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
                endCall()
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
                that.status.innerHTML = "Connected to: " + that.conn.peer;
                console.log("Connected to: " + that.conn.peer);

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
                that.status.innerHTML = "Connection closed";
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
                that.status.innerHTML = "Connection reset<br>Awaiting connection...";
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
            // if(typeof(data) == 'string') {
            //     that.addMessage("<span class=\"peerMsg\">Peer: </span>" + data);
            // }
            // else {
            //     that.addMessage("<span class=\"peerMsg\">Peer send a file </span>");
            //     const bytes = new Uint8Array(data.file)
            //     //用base64编码，还原图片
            //     that.$refs.img.src = 'data:image/png;base64,' + encode(bytes)
            // }
            if (downloadInProgress == false) {
                that.startDownload(data);
            } else if (downloadInProgress) {
                that.progressDownload(data);
            }
        },

        /**
         * send msg to the other side
         */
        send() {
            let that = this;
            if (that.conn && that.conn.open) {
                var msg = that.sendMessageBox.value;
                that.sendMessageBox.value = "";
                that.conn.send(msg);
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
            that.conn.send("ok");
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
            incomingFileInfo = JSON.parse(data.toString());
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

            this.message.innerHTML = "<br><span class=\"msg-time\">" + h + ":" + m + ":" + s + "</span>  -  " + msg + message.innerHTML;
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