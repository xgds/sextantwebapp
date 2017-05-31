const path = require('path');

//import buildCartesian from './../app/cesiumutil'


const initialize = function() {
		// this totally used to work but now dirname is /.  Updated webpack settings.
		//let defaultConfigPath = path.resolve(__dirname, './config.js');
		let defaultConfigPath = './config.js';
		let configPath = (process.env.CONFIG_PATH || defaultConfigPath);
		console.log('LOADING CONFIG FROM: ' + configPath);
		
		let result = require(configPath);
						
		result.urlPrefix = result.server.protocol + '://' + result.server.name;
		result.siteConfig = result.sites[result.defaultSite];
		//result.destination = buildCartesian(result.siteConfig.centerPoint[0], result.siteConfig.centerPoint[1], result.siteConfig.centerPoint[2]);
		return result;
}

const config = initialize();


export {config}
