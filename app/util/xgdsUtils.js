//__BEGIN_LICENSE__
//Copyright (c) 2015, United States Government, as represented by the 
//Administrator of the National Aeronautics and Space Administration. 
//All rights reserved.

//The xGDS platform is licensed under the Apache License, Version 2.0 
//(the 'License'); you may not use this file except in compliance with the License. 
//You may obtain a copy of the License at 
//http://www.apache.org/licenses/LICENSE-2.0.

//Unless required by applicable law or agreed to in writing, software distributed 
//under the License is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR 
//CONDITIONS OF ANY KIND, either express or implied. See the License for the 
//specific language governing permissions and limitations under the License.
//__END_LICENSE__

import {config} from 'config_loader';
import * as _ from "lodash";
const url = require('url');



/**
 * @function xgdsAuth
 * adds basic authentication headers to a map to be used by ajax calls
 * only if there are username/password in the config
 *
 */
const xgdsAuth = function(settings) {
    if (!_.isEmpty(config.xgds) && !_.isEmpty(config.xgds.username)){
        settings['headers'] = {'authorization': 'Basic ' + btoa(config.xgds.username + ':' + config.xgds.password)};
        settings['xhrFields'] = {withCredentials: true};
    }
    return settings;
}

/**
 * @function getRestUrl
 * @param originalUrl
 * @returns {string} the fully qualified url with rest injected between the first and second element in the original url
 *
 */
const getRestUrl = function(originalUrl) {
    let splits = originalUrl.split('/');
    let result = config.urlPrefix + '/' + splits[1] + '/rest';
    for (let i=2; i<splits.length; i++){
        result += '/' + splits[i];
    }
    return result;
};

/**
 * Update the options to either use the proxy or add the xgdsAuth to the xhr value
 * @function patchOptionsForRemote
 * @param options
 * @returns {*}
 */
const patchOptionsForRemote = function(options) {
    if (!options.url.includes(config.server.name)){
        if (!_.isUndefined(config.xgds)) {
            if (!options.url.includes(config.xgds.name)) {
                options.proxy = new Cesium.DefaultProxy('/proxy/');
            } else {
                xgdsAuth(options);
            }
        }  else {
            options.proxy = new Cesium.DefaultProxy('/proxy/');
        }
    }
    return options;
}

const prefixUrl = function(theUrl){
    let result = theUrl;
    // if this is not a fully qualified url, patch it.
    const test = url.parse(theUrl);
    if (test.hostname === null) {
        try {
            result = config.urlPrefix + theUrl;
        } catch (e) {
            console.log(e);
        }
    }
    return result;
}

export {xgdsAuth, getRestUrl, patchOptionsForRemote, prefixUrl}