<template>
    <div class='v-message'>
        <div v-for='(config, index) in messageList' :key='config.id' 
        :ref= 'el => { if (el) contentList[index] = el}'
        :class='["message-item", config.customClass, config.type, { center: config.center }]'>
            <i :class='[config.iconClass, "icon"]'></i>
            <p class='content'>{{ config.message }}</p>
            <i class='close iconfont icon-guanbi1' @click='close(config)' v-if='config.showClose'></i>
        </div>
    </div>
</template>

<script>
import { ref, defineComponent } from 'vue';

export default defineComponent({
    name: 'message',
    setup () {
        // 消息列表
        const messageList = ref([]);
        // ref列表
        const contentList = ref([]);

        const message = (options) => {
            computedConfig(options);
        }

        const success = (options) => {
            computedConfig(options, 'success');
        }

        const warning = (options) => {
            computedConfig(options, 'warning');
        }

        const error = (options) => {
            computedConfig(options, 'error');
        }

        const computedConfig = (options, type) => {
            var option = options || {};
            type && (option.type = type);
            const config = {
                type: option.type || 'prompt', // 没传消息类型就是默认消息
                message: option.message || '',
                iconClass: option.iconClass || computedIconClass(type || 'prompt'),
                customClass: option.customClass,
                duration: option.duration >= 0? option.duration : 3000,
                showClose: option.showClose,
                center: option.center,
                onClose: option.onClose,
                id: Math.floor(new Date())
            };
            messageList.value.push(config);
            // 如果延时不等于0，就要设置消失时间
            if (config.duration !== 0) {
                setTimeout(() => {
                    contentList.value[0].className += ' messageHide';
                    setTimeout(() => {
                        messageList.value.splice(0, 1);
                    }, 200);
                }, config.duration + messageList.value.length * 100);
            }
        };

        const computedIconClass = (type) => {
            switch (type) {
                case 'prompt':
                    return 'iconfont icon-tishi';
                case 'success':
                    return 'iconfont icon-success';
                case 'warning':
                    return 'iconfont icon-jinggao--';
                case 'error':
                    return 'iconfont icon-cuowu';
            }
        };

        const close = (config) => {
            const index = messageList.value.findIndex(item => item.id === config.id);
            if (index !== -1) {
                contentList.value[index].className += ' messageHide';
                setTimeout(() => {
                    messageList.value.splice(index, 1);
                    config.onClose && config.onClose(config);
                }, 200);
            }
        }

        return {
            messageList,
            contentList,
            close,
            message,
            success,
            warning,
            error
        }
    }
});
</script>

<style lang='less' scoped>
    @import url('../assets/css/animation.css');
    .v-message {
        position: fixed;
        z-index: 99999;
        top: 50px;
        left: 0;
        right: 0;
        margin: auto;
        width: 300px;
        .message-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 14px;
            box-sizing: border-box;
            border-radius: 6px;
            padding: 2px;
            overflow: hidden;
            border: 1px solid transparent;
            animation: messageShow .5s;
            animation-fill-mode: forwards;
            -webkit-box-shadow:0px 1px 10px gray;
            -moz-box-shadow:0px 1px 10px gray;
            box-shadow:5px 5px 10px gray;
            .content {
                font-size: 20px;
                line-height: 20px;
                flex: 1;
            }
            .close {
                cursor: pointer;
                &:hover {
                    color: #6b6b6b;
                }
            }
            i {
                font-size: 18px;
            }
            .icon {
                margin-right: 14px;
            }
        }
        .center {
            justify-content: center;
            .content {
                flex: 0 1 auto;
            }
        }
        .messageHide {
            animation: messageHide .2s linear;
            animation-fill-mode: forwards;
        }
        .prompt {
            border: 1px solid #ebeef5;
            background-color: #edf2fc;
            .content, i {
                color: #909399;
            }
        }
        .success {
            background-color: #f0f9eb;
            border-color: #e1f3d8;
            .content, i {
                color: #67C23A;
            }
        }
        .warning {
            background-color: #fdf6ec;
            border-color: #faecd8;
            .content, i {
                color: #E6A23C;
            }
        }
        .error {
            background-color: #fef0f0;
            border-color: #fde2e2;
            .content, i {
                color: #F56C6C;
            }
        }
    }
    </style>
    