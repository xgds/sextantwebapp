const path = require('path');

//import buildCartesian from './../app/cesiumutil'

let config = undefined;

const initialize = function() {
	if (config == undefined ) {
		// this totally used to work but now dirname is /.  Updated webpack settings.
		//let defaultConfigPath = path.resolve(__dirname, './config.js');
		let defaultConfigPath = './config.js';
		let configPath = (process.env.CONFIG_PATH || defaultConfigPath);
		console.log('LOADING CONFIG FROM: ' + configPath);
		
		config = require(configPath);
						
		config.urlPrefix = config.server.protocol + '://' + config.server.name;
		config.siteConfig = config.sites[config.defaultSite];
		//config.destination = buildCartesian(config.siteConfig.centerPoint[0], config.siteConfig.centerPoint[1], config.siteConfig.centerPoint[2]);
	}
}

initialize();

export {config}
