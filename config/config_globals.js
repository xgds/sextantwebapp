const path = require('path');

let config = undefined;

const initialize = function() {
	if (config === undefined ) {
		let defaultConfigPath = path.resolve(__dirname, './config.js');
		let configPath = (process.env.CONFIG_PATH || defaultConfigPath);
		console.log('GLOBAL CONFIG PATH ' + configPath);
		
		config = require(configPath);
		
		console.log('REQUIRED CONFIG');
		console.log(config.server);
						
		config.urlPrefix = config.server.protocol + '://' + config.server.name;
		config.siteConfig = config.sites[config.defaultSite];
		
		console.log(config.urlPrefix)
	}
}

initialize();

export {config}