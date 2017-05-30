const path = require('path');

const config = undefined;

const globalConfig = {
		initialize: function() {
			if (globalConfig.defaultConfigPath === undefined ) {
				globalConfig.defaultConfigPath = path.resolve(__dirname, './config.js');
				globalConfig.configPath = (process.env.CONFIG_PATH || globalConfig.defaultConfigPath);
				console.log('GLOBAL CONFIG PATH ' + globalConfig.configPath);
				
				//config = require(globalConfig.configPath);
				
				console.log('REQUIRED CONFIG');
				console.log(config.server);
				
//				config.urlPrefix = config.config.get('server.protocol') + '://' + config.config.get('server.name');
//				config.siteConfig = config.config.get('sites.' + config.defaultSiteName);
			}
		}
}

globalConfig.initialize();

export {config}