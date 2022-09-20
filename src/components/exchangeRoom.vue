<template>
    <h1>Peer-to-Peer Cue System --- Diad</h1>
    <table class="control">
        <tr>
            <td class="title">Status:
            <br/>
            <div id="local-id" style="font-weight: bold;" title="Copy this ID to the input on send.html.">ID:
            </div>
            </td>
            <td class="title">Messages:</td>
        </tr>
        <tr>
            <td>
                <span style="font-weight: bold">ID: </span>
                <input type="text" id="receiver-id" title="Input the ID from receive.html">
                <button id="connect-button">Connect</button>
            </td>
            <td>
                <input type="text" id="sendMessageBox" placeholder="Enter a message..." autofocus="true" />
                <button type="button" id="sendButton">Send</button>
                <button type="button" id="clearMsgsButton">Clear Msgs (Local)</button>
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
    </table>
    <!-- <VideoChatVue></VideoChatVue> -->
</template>
    
<script>

import Peer from 'peerjs'
import VideoChatVue from './VideoChat.vue';

export default {
    data() {
        return {
            boxStyle: {},
        };
    },
    components: {
        VideoChatVue
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
        this.goButton = document.getElementById("goButton");
        this.resetButton = document.getElementById("resetButton");
        this.fadeButton = document.getElementById("fadeButton");
        this.offButton = document.getElementById("offButton");
        this.sendMessageBox = document.getElementById("sendMessageBox");
        this.sendButton = document.getElementById("sendButton");
        this.clearMsgsButton = document.getElementById("clearMsgsButton");
        this.connectButton = document.getElementById("connect-button");
        this.cueString = "<span class=\"cueMsg\">Cue: </span>";

        //视频
        this.localVideo = this.$refs.localVideo;
        this.remoteVideo = this.$refs.remoteVideo;
        this.callButton = document.getElementById("callUser");

        // Listen for enter in message box
        this.sendMessageBox.addEventListener('keypress', function (e) {
            var event = e || window.event;
            var char = event.which || event.keyCode;
            if (char == '13')
                that.sendButton.click();
        });
        // Send message
        this.sendButton.addEventListener('click', function () {
            if (that.conn && that.conn.open) {
                var msg = sendMessageBox.value;
                that.sendMessageBox.value = "";
                that.conn.send(msg);
                console.log("Sent: " + msg);
                that.addMessage("<span class=\"selfMsg\">Self: </span> " + msg);
            } else {
                console.log('Connection is closed');
            }
        });
        // Clear messages box
        this.clearMsgsButton.addEventListener('click', that.clearMessages);
        // Start peer connection on click
        this.connectButton.addEventListener('click', that.join);

        //视频
        this.callButton

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
            that.peer.on('connection', function (c) {
                // // Disallow incoming connections
                // c.on('open', function () {
                //     c.send("Sender does not accept incoming connections");
                //     setTimeout(function () { c.close(); }, 500);
                // });
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
            that.peer.on('disconnected', function () {
                that.status.innerHTML = "Connection lost. Please reconnect";
                console.log('Connection lost. Please reconnect');

                // Workaround for peer.reconnect deleting previous id
                that.peer.id = that.lastPeerId;
                that.peer._lastServerId = that.lastPeerId;
                that.peer.reconnect();
            });
            that.peer.on('close', function () {
                that.conn = null;
                that.status.innerHTML = "Connection destroyed. Please refresh";
                console.log('Connection destroyed');
            });
            that.peer.on('error', function (err) {
                console.log(err);
                alert('' + err);
            });

            // 媒体传输
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

            // 数据传输
            const connection = that.peer.connect(remoteId);
            that.conn = connection
            connection.on('open', () => {
                // message.info('已连接')
                console.log("已连接 remote")
            })
            // 多媒体传输
            const call = that.peer.call(remoteId, stream)
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
                that.addMessage("<span class=\"peerMsg\">Peer:</span> " + data);
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
            that.conn.on('data', function (data) {
                console.log("Data recieved");
                var cueString = "<span class=\"cueMsg\">Cue: </span>";
                switch (data) {
                    case 'Go':
                        that.go();
                        that.addMessage(cueString + data);
                        break;
                    case 'Fade':
                        that.fade();
                        that.addMessage(cueString + data);
                        break;
                    case 'Off':
                        that.off();
                        that.addMessage(cueString + data);
                        break;
                    case 'Reset':
                        that.reset();
                        that.addMessage(cueString + data);
                        break;
                    default:
                        that.addMessage("<span class=\"peerMsg\">Peer: </span>" + data);
                        break;
                };
            });
            that.conn.on('close', function () {
                that.status.innerHTML = "Connection reset<br>Awaiting connection...";
                that.conn = null;
            });
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
            that.addMessage("Msgs cleared");
        }


    },
};
</script>

<style src="../assets/css/chat.css" scoped>
.display-video{
    width: 90%;
    height: 90%;
}
</style>