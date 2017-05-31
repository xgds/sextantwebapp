const path = require('path');

const initialize = function() {
		let defaultConfigPath = './config.js';
		let configPath = (process.env.CONFIG_PATH || defaultConfigPath);
		console.log('LOADING CONFIG FROM: ' + configPath);
		
		let result = require(configPath);
						
		result.urlPrefix = result.server.protocol + '://' + result.server.name;
		result.siteConfig = result.sites[result.defaultSite];
		return result;
}

const config = initialize();

export {config}
