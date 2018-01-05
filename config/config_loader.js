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

//const request = require('then-request');
//const request = require('request');
import * as _ from 'lodash';
const configPath = (process.env.CONFIG_PATH || DEFAULT_CONFIG_PATH);

function populateConfig(result) {
	result.urlPrefix = result.server.protocol + '://' + result.server.name;
    if (!_.isUndefined(result.xgds)) {
        result.urlPrefix = result.xgds.protocol + '://';
        if (!_.isUndefined(result.xgds.username)) {
            result.urlPrefix += result.xgds.username + ':' + result.xgds.password + '@';
        }
        result.urlPrefix += result.xgds.name;
    }
	result.siteConfig = result.sites[result.defaultSite];
	return result;
};

function initialize() {
	if (global.config === undefined){
		//let defaultConfigPath = './standalone_config.js';
		console.log('PREPPING CONFIG FROM: ' + configPath);
		let result = require(`${configPath}`);
		global.config = populateConfig(result);
		return result;
	}
	return global.config;
}

// all of the following was experimental and code needs to be refactored to properly work with async / promise.
// https://github.com/react-boilerplate/react-boilerplate/issues/1250

/*

let delay = time =>
    new Promise(resolve =>
        setTimeout(resolve, time)
    );

let until = (cond, time) =>
    cond().then(result =>
        result || delay(time).then(() =>
            until(cond, time)
        )
    );


// async function doInitialize() {
// 	// https://medium.com/@bluepnume/even-with-async-await-you-probably-still-need-promises-9b259854c161
// 	if (global.loadingConfig === undefined){
// 		if (configPath !== undefined) {
// 			debugger;
// 			global.loadingConfig = true;
//             console.log('FETCHING CONFIG FROM: ' + configPath);
//             await until(async () => {
//             	await request('GET', configPath).done(res => {
//                     let result = eval(res.getBody());
//                     return populateConfig(result);
//                 });
//             }, 400);
//         }
// 	}
// }

async function doInitialize() {
	if (global.loadingConfig === undefined){
		if (configPath !== undefined) {
			global.loadingConfig = true;
            console.log('FETCHING CONFIG FROM: ' + configPath);
            return await request('GET', configPath).done(res => {
            	console.log('OK GOT IT');
				let result = eval(res.getBody());
				return populateConfig(result);
			});
        }
	}
}

function initializeConfig() {
	// either return the config or load it.
	if (global.config === undefined){
		let result = doInitialize();
		return result;
	} else {
		return Promise.resolve();
	}
}

*/


let config = initialize();

export {config}
