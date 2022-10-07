import Message from "./Message.vue";
import { createApp } from "vue";

const createMessage = function () {
    const div = document.createElement("div");
    div.id = "v-message";
    document.body.appendChild(div);
    return createApp(Message).mount("#v-message");
};

export default createMessage();
