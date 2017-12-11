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

/* We now segregate configuration for the server from configuration for the app itself.
Server configuration are in environment variables, which can be overridden with the .env file.
Make sure you use the following to change port, CORS and terrain:

SERVER_PORT=3001
SERVER_CORS=false
TERRAIN_PATH=/local/path/to/terrain/if/any  otherwise do not have this defined

 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const terrainServer = require('./terrainserver');

let app = express();


// Serve static files from the public folder
// let public_extension = config.server.public_prefix;
// public_extension = (public_extension  === undefined) ? '' : public_extension ;

const root = path.resolve(__dirname);
const rerouting = [
	['/', path.resolve(root, 'public')],
	['/', path.resolve(root, 'node_modules', 'cesium', 'Build','Cesium')],
	//['/cesiumNavigation', path.resolve(root, 'node_modules', 'cesium-navigation', 'dist','amd')],
    ['/cesium-assets/imagery', path.resolve(root, 'node_modules', 'cesium', 'Build','Cesium','Assets','Textures')],
    ['/CustomMaps', path.resolve(root, 'public', 'CustomMaps')],
	['/jquery', path.resolve(root, 'node_modules', 'jquery', 'dist')],
	['/jquery-mobile-min', path.resolve(root, 'node_modules', 'jquery-mobile-min')],
	['/font-awesome', path.resolve(root, 'node_modules', 'font-awesome')]
];

for (let route of rerouting){
    app.use(route[0], express.static(route[1]));
}

//Host terrain tiles
if (process.env.TERRAIN_PATH !== undefined) {
    try {
        const terrainPath = process.env.TERRAIN_PATH; // same as config.sites[config.defaultSite].elevation;
        if (terrainPath !== undefined) {
            console.log('building terrain server for ' + terrainPath);
            app = terrainServer(app, terrainPath);
        }
    } catch (e) {
        console.log(e);
    }
}


if (process.env.SERVER_CORS === true) {
    app.use(function (req, res, next) {
        console.log('shoving headers in');
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
}

const port = process.env.SERVER_PORT;

app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});
