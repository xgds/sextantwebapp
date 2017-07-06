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
const path = require('path');

const initialize = function() {
	if (global.config === undefined){
		let defaultConfigPath = './iphone_xgds_config.js'; 
		let configPath = (process.env.CONFIG_PATH || defaultConfigPath);
		console.log('LOADING CONFIG FROM: ' + configPath);
		
		let result = require(configPath);
						
		result.urlPrefix = result.server.protocol + '://' + result.server.name;
		result.siteConfig = result.sites[result.defaultSite];
		return result;
	}
	return global.config;
}

global.config = initialize();
const config = global.config;

export {config}
