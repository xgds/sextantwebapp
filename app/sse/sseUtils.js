// __BEGIN_LICENSE__
//Copyright (c) 2015, United States Government, as represented by the 
//Administrator of the National Aeronautics and Space Administration. 
//All rights reserved.
//
//The xGDS platform is licensed under the Apache License, Version 2.0 
//(the "License"); you may not use this file except in compliance with the License. 
//You may obtain a copy of the License at 
//http://www.apache.org/licenses/LICENSE-2.0.
//
//Unless required by applicable law or agreed to in writing, software distributed 
//under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR 
//CONDITIONS OF ANY KIND, either express or implied. See the License for the 
//specific language governing permissions and limitations under the License.
// __END_LICENSE__

import {config} from './../../config/config_loader';
import {beforeSend} from './../util/xgdsUtils';

const moment = require('moment');

class SSE{
    constructor(host){
        this.host = host;
        this.activeChannels = undefined;
        this.lastHeartbeat = undefined;
        this.heartbeat()
    };

    heartbeat(){
    	let context = this;
        setInterval(function() {context.checkHeartbeat();}, 11000);
        this.subscribe('heartbeat', this.connectedCallback, this, 'sse');
    };

    checkHeartbeat() {
        let connected = false;
        if (this.lastHeartbeat !== undefined) {
            const diff = moment.duration(moment().diff(this.lastHeartbeat));
            if (diff.asSeconds() <= 10) {
                connected = true;
            }
        }
        if (!connected) {
            this.disconnectedCallback();
        }
    };

    connectedCallback(event, context){
        try {
        	context.lastHeartbeat = moment(JSON.parse(event.data).timestamp);
            const cdiv = $("#connected_div");
            if (cdiv.hasClass('alert-danger')){
                cdiv.removeClass('alert-danger');
                cdiv.addClass('alert-success');
                const c = $("#connected");
                c.removeClass('fa-bolt');
                c.addClass('fa-plug');
            }
        } catch(err){
            // in case there is no such page
        }
    };

    disconnectedCallback(){
        try {
            const cdiv = $("#connected_div");
            if (cdiv.hasClass('alert-success')){
                cdiv.removeClass('alert-success');
                cdiv.addClass('alert-danger');
                const c = $("#connected");
                c.addClass('fa-bolt');
                c.removeClass('fa-plug');
            }
        } catch(err){
            // in case there is no such page
        }
    };
    
    parseEventChannel(event){
        return this.parseChannel(event.target.url);
    };
    
    parseChannel(fullUrl){
        const splits = fullUrl.split('=');
        if (splits.length > 1){
            return splits[splits.length-1];
        }
        return 'sse';
    };
    
    getChannels() {
        // get the active channels over AJAX
        if (this.activeChannels === undefined){
        	
            $.ajax({
            		url: this.host + '/xgds_core/rest/sseActiveChannels/',
            		dataType: 'json',
            		xhrFields: {withCredentials: true},
            		beforeSend: beforeSend,
            		async: false,
            		success: $.proxy(function(data) {
                    this.activeChannels = data;
            		}, this),
            		error: $.proxy(function(data) {
                    console.log('Could not get active channels');
                    console.log(data);
            		}, this)
            });
        }
        return this.activeChannels;
    };

    sourceAddress(channel){
        return this.host + "/sse/stream?channel=" + channel
    };

    subscribe(event_type, callback, context, channel = undefined) {
        if (channel !== undefined) {
            const address = this.sourceAddress(channel);
            const source = new EventSource(address);
            source.addEventListener(event_type, function(event) { callback(event, context); }, false);
            return source;
        } else {
            for (let channel of this.getChannels()){
                let source = new EventSource("/sse/stream?channel=" + channel);
                source.addEventListener(event_type, function(event) { callback(event, context); }, false);
            }
        }
    };
    
}

export {SSE}
