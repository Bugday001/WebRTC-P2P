<template>
<h1>Peer-to-Peer Cue System --- Sender</h1>
<table class="control">
    <tr>
        <td class="title">Status:</td>
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
        <td><div id="status" class="status"></div></td>
        <td><div class="message" id="message"></div></td>
    </tr>
    <tr>
        <td>
            <button type="button" class="control-button" id="resetButton">Reset</button>
        </td>
        <td>
            <button type="button" class="control-button" id="goButton">Go</button>
        </td>
    </tr>
    <tr>
        <td>
            <button type="button" class="control-button" id="fadeButton">Fade</button>
        </td>
        <td>
            <button type="button" class="control-button" id="offButton">Off</button>
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
    components:{
        // VideoChatVue
    },
    setup() {
        let that = this;
        const peer = ref(that.peer);
        return {
            peer,
        };
    },
  mounted() {

    let that = this;
    this.lastPeerId = null;
    this.peer = null; // own peer object
    this.conn = null;
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

    
    this.goButton.addEventListener('click', function () {
        that.signal("Go");
    });
    this.resetButton.addEventListener('click', function () {
        that.signal("Reset");
    });
    this.fadeButton.addEventListener('click', function () {
        that.signal("Fade");
    });
    this.offButton.addEventListener('click', function () {
        that.signal("Off");
    });

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
        });
        that.peer.on('connection', function (c) {
            // Disallow incoming connections
            c.on('open', function() {
                c.send("Sender does not accept incoming connections");
                setTimeout(function() { c.close(); }, 500);
            });
        });
        that.peer.on('disconnected', function () {
            that.status.innerHTML = "Connection lost. Please reconnect";
            console.log('Connection lost. Please reconnect');

            // Workaround for peer.reconnect deleting previous id
            that.peer.id = that.lastPeerId;
            that.peer._lastServerId = that.lastPeerId;
            that.peer.reconnect();
        });
        that.peer.on('close', function() {
            that.conn = null;
            that.status.innerHTML = "Connection destroyed. Please refresh";
            console.log('Connection destroyed');
        });
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
            that.addMessage("<span class=\"peerMsg\">Peer:</span> " + data);
        });
        that.conn.on('close', function () {
            that.status.innerHTML = "Connection closed";
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

<style src="../assets/css/chat.css" scoped></style>