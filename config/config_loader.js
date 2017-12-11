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
const request = require('then-request');

const initialize = function() {
	console.log('initializing config');
	if (global.config === undefined){
//		let defaultConfigPath = './standalone_config.js';
		debugger;
		let result = undefined;
		if (process.env.CONFIG_PATH !== undefined) {
			// external file load
			console.log('LOADING CONFIG FROM: ' + process.env.CONFIG_PATH);
			let result = require(process.env.CONFIG_PATH);
			// request('GET', process.env.CONFIG_PATH).done(function(res) {
  			// 	let result = res.getBody();
            	// result.urlPrefix = result.server.protocol + '://' + result.server.name;
            	// result.siteConfig = result.sites[result.defaultSite];
            	// return result;
			// });
		} else {
            // internal file load

            console.log('LOADING CONFIG FROM DEFAULT: ' + DEFAULT_CONFIG_PATH);

//		let result = require('./moon_xgds_config.js');
            // (async () => {
            // let result = await require(configPath);
            //
            // 	result.urlPrefix = result.server.protocol + '://' + result.server.name;
            // 	result.siteConfig = result.sites[result.defaultSite];
            // 	return result;
            // })();
            let result = require(DEFAULT_CONFIG_PATH);

        }
        result.urlPrefix = result.server.protocol + '://' + result.server.name;
		result.siteConfig = result.sites[result.defaultSite];
		return result;

	}
	return global.config;
}

global.config = initialize();
const config = global.config;

export {config}
