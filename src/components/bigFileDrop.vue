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
        <tr>
            <td>
                <input type="file" accept="*" id="inputFile" ref="file" v-on:input="inputFunc" />
                <div id="dropTarget"></div>
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
import {encode, isAssetTypeAnImage, arrayBufferToBase64, base64ToUint8Array} from '../utils/utils.js'
// const WebTorrent = require('webtorrent')
// import WebTorrent from '../utils/webtorrent'
import dragDrop from 'drag-drop'
import WebTorrent from 'webtorrent/webtorrent.min'

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
        this.initAll();
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
         * 初始化
         */
        initAll() {
            const client = new WebTorrent()

            // When user drops files on the browser, create a new torrent and start seeding it!
            dragDrop('#dropTarget', function (files) {
            client.seed(files, function (torrent) {
                console.log('Client is seeding ' + torrent.magnetURI)
            })
            })
        },

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
            //新：
            navigator.clipboard.writeText(""+that.peer.id).then(() => {
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

        },

        /**
         * 发送文件按钮回调
         */
        sendFileBtn() {
            this.downloadFile();
        },

        /**
         * 下载文件
         */
        downloadFile() {
            let that = this;
            const client = new WebTorrent()
            const magnetURI = that.sendMessageBox.value

            client.add(magnetURI, function (torrent) {
            // Got torrent metadata!
            console.log('Client is downloading:', torrent.infoHash)

            torrent.files.forEach(function (file) {
                // Display the file by appending it to the DOM. Supports video, audio, images, and
                // more. Specify a container element (CSS selector or reference to DOM node).
                file.appendTo('body')
            })
            })
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

<style src="../assets/css/bigFileDrop.css" scoped>

</style>