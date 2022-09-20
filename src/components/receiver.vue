<template>
    <table class="display">
        <tr>
            <td class="title">Status:</td>
            <td class="title">Messages:</td>
        </tr>
        <tr>
            <td>
                <div id="receiver-id" style="font-weight: bold;" title="Copy this ID to the input on send.html.">ID:
                </div>
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
        <tr>
            <td class="display-box standby" id="standby">
                <h2>Standby</h2>
            </td>
            <td class="display-box hidden" id="go">
                <h2>Go</h2>
            </td>
        </tr>
        <tr>
            <td class="display-box hidden" id="fade">
                <h2>Fade</h2>
            </td>
            <td class="display-box hidden" id="off">
                <h2>All Off</h2>
            </td>
        </tr>
    </table>
</template>
    
<script>

import Peer from 'peerjs'

export default {
  data() {
    return {
      boxStyle: {},
    };
  },
  mounted() {
    let that = this;
    this.recvId = document.getElementById("receiver-id");
    this.status = document.getElementById("status");
    this.message = document.getElementById("message");
    this.standbyBox = document.getElementById("standby");
    this.goBox = document.getElementById("go");
    this.fadeBox = document.getElementById("fade");
    this.offBox = document.getElementById("off");
    this.sendMessageBox = document.getElementById("sendMessageBox");
    this.sendButton = document.getElementById("sendButton");
    this.clearMsgsButton = document.getElementById("clearMsgsButton");

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
            var msg = that.sendMessageBox.value;
            that.sendMessageBox.value = "";
            that.conn.send(msg);
            console.log("Sent: " + msg)
            that.addMessage("<span class=\"selfMsg\">Self: </span>" + msg);
        } else {
            console.log('Connection is closed');
        }
    }),

    // Clear messages box
    that.clearMsgsButton.addEventListener('click', that.clearMessages);

    this.initialize();
  },
  created() {
    this.lastPeerId = null;
    this.peer = null; // Own peer object
    this.peerId = null;
    this.conn = null;
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
            that.recvId.innerHTML = "ID: " + that.peer.id;
            that.status.innerHTML = "Awaiting connection...";
        });
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
        this.peer.on('disconnected', function () {
            this.status.innerHTML = "Connection lost. Please reconnect";
            console.log('Connection lost. Please reconnect');

            // Workaround for peer.reconnect deleting previous id
            this.peer.id = this.lastPeerId;
            this.peer._lastServerId = this.lastPeerId;
            this.peer.reconnect();
        });
        this.peer.on('close', function () {
            this.conn = null;
            this.status.innerHTML = "Connection destroyed. Please refresh";
            console.log('Connection destroyed');
        });
        this.peer.on('error', function (err) {
            console.log(err);
            alert('' + err);
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

    go() {
        this.standbyBox.className = "display-box hidden";
        this.goBox.className = "display-box go";
        this.fadeBox.className = "display-box hidden";
        this.offBox.className = "display-box hidden";
        return;
    },

    fade() {
        this.standbyBox.className = "display-box hidden";
        this.goBox.className = "display-box hidden";
        this.fadeBox.className = "display-box fade";
        this.offBox.className = "display-box hidden";
        return;
    },

    off() {
        this.standbyBox.className = "display-box hidden";
        this.goBox.className = "display-box hidden";
        this.fadeBox.className = "display-box hidden";
        this.offBox.className = "display-box off";
        return;
    },

    reset() {
        this.standbyBox.className = "display-box standby";
        this.goBox.className = "display-box hidden";
        this.fadeBox.className = "display-box hidden";
        this.offBox.className = "display-box hidden";
        return;
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
    },
  },
};

</script>

<style src="../assets/css/chat.css" scoped></style>