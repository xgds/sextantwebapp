const express = require('express');
const path = require('path');
const terrainServer = require('./terrainserver');
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
import {config} from './config/config_loader';

let app = express();

(function() {
  // Step 1: Create & configure a webpack compiler
  const webpack = require('webpack');
  const webpackConfig = require('./webpack.config');
  const compiler = webpack(webpackConfig);

//  if (config.debug) {
	  // Step 2: Attach the dev middleware to the compiler & the server
	  app.use(webpackDevMiddleware(compiler, {
	    noInfo: true, publicPath: webpackConfig.output.publicPath
	  }));
	
	  // Step 3: Attach the hot middleware to the compiler & the server
	  app.use(webpackHotMiddleware(compiler, {
	    log: console.log, path: '/' + config.server.nginx_prefix + '/__webpack_hmr', heartbeat: 10 * 1000
	  }));
//  }
})();

// Serve static files from the public folder
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));

/* // For rendering files to jupyter notebook
app.get('/CustomMaps/:tileset/:z/:x/:y.png', function (req, res) {
    const x = req.params.x;
    let y = req.params.y;
    const z = req.params.z;
    y = 2**z-y-1;

    const tileset = req.params.tileset;
    console.log(path.resolve(__dirname, 'public', 'CustomMaps', tileset, z, x, y + '.png'));
    //res.set('Content-Encoding', 'gzip');
    res.sendFile(path.resolve(__dirname, 'public', 'CustomMaps', tileset, z, x, y + '.png'));
});*/

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

// Host terrain tiles
// TODO: move terrain folder in here?
//const terrainPath = 'https://s3-us-west-2.amazonaws.com/sextantdata';
//const terrainPath = 'C:\\Users\\johan\\Dropbox (MIT)\\BASALT\\pextant\\data\\maps\\terrain';
//app = terrainServer(app, terrainPath);

//require("!style!css!./style.css");

//TODO this seems to work without this but may need it later.
//app.set('trust proxy', true);
//app.set('trust proxy', 'loopback');

const port = config.server.port;
app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});