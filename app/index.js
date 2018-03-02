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

import * as $ from 'jquery';
import 'bootstrap-loader';
import {config} from 'config_loader';
import {ViewerWrapper, zoom, heading, DynamicLines} from 'cesium_util/cesiumlib';




import {TrackSSE} from 'sse/trackSseUtils';
import {PlanManager, xgdsPlanManager} from 'plan/plan';
import {LayerTree} from 'tree/layerTree';
import {KmlManager} from 'cesium_util/kmlManager';
import {ImageLayerManager} from 'cesium_util/imageLayerManager';
import {GroundOverlayTimeManager} from 'cesium_util/groundOverlayTimeManager';

// Set up for SSE or GPS input
const hasSSE = ('mode' in config && config.mode == 'XGDS_SSE');
const STANDALONE = ('mode' in config && config.mode == 'STANDALONE');

let viewerWrapper = undefined;
let gps_tracks = undefined;
let tsse = undefined;
let planManager = undefined;
let kmlManager = undefined;
let imageLayerManager = undefined;
let groundOverlayTimeManager = undefined;
let layerTree = undefined;

function addGPSLocation(data){
    const coords = JSON.parse(data);
    if(coords.latitude !== 0 && coords.longitude !== 0){
        const wrappedCoords = coords.longitude.toString() + ',' + coords.latitude.toString() +'</br>';
        const coordsContainer = document.getElementById('coords');
        coordsContainer.innerHTML = wrappedCoords+coordsContainer.innerHTML;
        gps_tracks.addPoint(coords.latitude, coords.longitude);
    }
}

/*
 * @function initialize
 * @param container the DOM element or name of the container, defaults to 'cesiumContainer'
 * @param terrainExaggeration how much to exaggerate the terrain, defaults to 1
 */
function initialize(container, terrainExaggeration) {
    if (container === undefined) {
        container = 'cesiumContainer';
    }
    if (terrainExaggeration === undefined){
        terrainExaggeration = 1;
    }
    viewerWrapper = new ViewerWrapper(config.urlPrefix, config.server.cesium_port, config.server.nginx_prefix, terrainExaggeration, container);
    viewerWrapper.scene.camera.flyTo({
        destination: config.destination,
        duration: 3,
        complete: function() {
        }
    });

    if (hasSSE) {
        tsse = new TrackSSE(viewerWrapper);
        planManager = new xgdsPlanManager(viewerWrapper);
    } else if (STANDALONE) {
        gps_tracks = new DynamicLines(viewerWrapper);
        planManager = new PlanManager(viewerWrapper);
    }

    // Load the kml configured if any
    kmlManager = new KmlManager(viewerWrapper);

    // Load the image layers configured if any
    imageLayerManager = new ImageLayerManager(viewerWrapper);

    // Set up the ground overlay time manager
    groundOverlayTimeManager = new GroundOverlayTimeManager(viewerWrapper);

    if (config.layer_tree_url !== undefined){
        layerTree = new LayerTree(viewerWrapper, 'layersPopup', kmlManager, imageLayerManager, groundOverlayTimeManager);
    }
};

module.exports = {
    'config': config,
    'viewerWrapper': viewerWrapper,
    'addGPSLocation': addGPSLocation,
    'zoom': zoom,
    'heading': heading,
    'tsse': tsse,
    'planManager': planManager,
    'gps_tracks': gps_tracks,
    'connectedDevices' : config.connectedDevices,
    'layerTree': layerTree,
    '$':$,
    'initialize': initialize
};

