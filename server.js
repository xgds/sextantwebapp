const express = require('express');
//const cors = require('cors')
const path = require('path');
const terrainServer = require('./terrainserver');
import {config} from './config/config_loader';
import {build} from './webpackbuild'

let app = express();

build(app); //build webpack dev

// Serve static files from the public folder
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));

//TODO might want webpack version of cesium just require it
const cesiumPath = path.resolve(__dirname, 'node_modules', 'cesium', 'Build','Cesium');
app.use(express.static(cesiumPath));

const jqueryPath = path.resolve(__dirname, 'node_modules', 'jquery', 'dist');
app.use('/jquery', express.static(jqueryPath));

//require("imports?this=>window!jquery-mobile/dist/jquery.mobile.js");

const jqueryMobilePath = path.resolve(__dirname, 'node_modules', 'jquery-mobile', 'dist');
app.use('/jquery-mobile', express.static(jqueryMobilePath));

const fontAwesomePath = path.resolve(__dirname, 'node_modules', 'font-awesome');
app.use('/font-awesome', express.static(fontAwesomePath));

const imageryPath = path.resolve(__dirname, 'public', 'CustomMaps');
app.use('/CustomMaps', express.static(imageryPath));

// Host terrain tiles
try {
	const terrainPath = config.sites[config.defaultSite].elevation; 
	if (terrainPath !== undefined){
		console.log('building terrain server for ' + terrainPath);
		app = terrainServer(app, terrainPath);
	}
} catch (e) {
	console.log(e);
	// pass
}

//require("!style!css!./style.css");

//TODO this seems to work without this but may need it later.
//app.set('trust proxy', true);
//app.set('trust proxy', 'loopback');

// Trying to set up CORS, no joy
//app.options('*', cors())
//app.use(cors())

//app.use(function(req, res, next) {
//	console.log('shoving headers in');
//	  res.header("Access-Control-Allow-Origin", "*");
//	  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//	  next();
//	});

const port = config.server.port;
app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});