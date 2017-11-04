const express = require('express');
const path = require('path');
const terrainServer = require('./terrainserver');
import {config} from './config/config_loader';
import {build} from './webpackbuild'

let app = express();

//Build webpack dev
build(app);

// Serve static files from the public folder
let public_extension = config.server.public_prefix;
public_extension = (public_extension  === undefined) ? '' : public_extension ;

const rerouting = [
	['/', path.resolve(__dirname, 'public')],
	['/', path.resolve(__dirname, 'node_modules', 'cesium', 'Build','Cesium')],
    ['/CustomMaps', path.resolve(__dirname, 'public', 'CustomMaps')],
	[public_extension + '/jquery', path.resolve(__dirname, 'node_modules', 'jquery', 'dist')],
	[public_extension + '/jquery-mobile', path.resolve(__dirname, 'node_modules', 'jquery-mobile', 'dist')],
	[public_extension + '/font-awesome', path.resolve(__dirname, 'node_modules', 'font-awesome')]
];

for (let route of rerouting){
    app.use(route[0], express.static(route[1]));
}

// Host terrain tiles
try {
	const terrainPath = config.sites[config.defaultSite].elevation; 
	if (terrainPath !== undefined){
		console.log('building terrain server for ' + terrainPath);
		app = terrainServer(app, terrainPath);
	}
} catch (e) {
	console.log(e);
}
const port = config.server.port;

app.use(function(req, res, next) {
	console.log('shoving headers in');
	  res.header("Access-Control-Allow-Origin", "*");
	  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	  next();
	});

app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});
