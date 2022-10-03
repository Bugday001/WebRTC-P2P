import { requests } from './foundation.js';
import axios from 'axios';

function pushId(params)
{
    return requests(
        {
            url: "/webrtcUserInfo/",
            type: "get",
            params: { // get用params，post用data
                "cmd": "insert",
                "name": params.name,
                "id": params.id
            },
            contentType: "application/json",
            dataType: "jsonp",
            responsetype: "json"

        }
    );
}

function pullId(params)
{
    return requests(
        {
            url: "/webrtcUserInfo/",
            type: "get",
            params: { // get用params，post用data
                "cmd": "find",
            },
            contentType: "application/json",
            responsetype: "application/json"
        }
    );
}

export {pushId, pullId};