import * as _ from 'lodash';
import * as $ from 'jquery';
//import 'bootstrap-loader';
import {config} from './../config/config_loader';
import {ViewerWrapper, zoom, heading, DynamicLines, loadKmls, buildSurfaceCircle} from './cesium_util/cesiumlib';
import {Cartesian3, CesiumMath, Color, CallbackProperty} from './cesium_util/cesium_imports'
import {statusChannel, connectedDevices, gpsChannel, plannerChannel} from './socket/socket'
const moment = require('moment');

// Configure the Cesium viewer
const viewerWrapper = new ViewerWrapper(config.urlPrefix, config.server.cesium_port,
	config.server.nginx_prefix, 1, 'cesiumContainer');
// Set up for SSE or GPS input
const hasSSE = ('xgds' in config);
import {TrackSSE} from './sse/trackSseUtils'
import {TrackManager} from "./cesium_util/cesiumtrack";
import {PlanManager, xgdsPlanManager} from './plan/plan'
let gps_tracks = undefined;
let tsse = undefined;
let planManager = undefined;

viewerWrapper.scene.camera.flyTo({
    destination: config.destination,
    duration: 3,
    complete: function() {
        //viewerWrapper.addLatLongHover();
    }
});

if (hasSSE) {
	tsse = new TrackSSE(viewerWrapper);
	planManager = new xgdsPlanManager(viewerWrapper);
} else {
	let track_manager = new TrackManager(viewerWrapper);
    let planManager = new PlanManager(viewerWrapper);
    let hostname = config.server.protocol + '://' + config.server.name + ':' + config.server.port;
    let resources = {
        pointerUrl: hostname + '/' + config.server.nginx_prefix + '/icons/pointer.png'
    };

    track_manager.addTrack("EV1", resources);
    console.log('track_manager');

    gpsChannel.setonrecieve(function(data){
        let jsondata = JSON.parse(data);
        track_manager.updateTrackFromData("EV1", {
            lat: jsondata["latitude"],
            lon: jsondata["longitude"],
            timestamp: moment().toISOString()
        })
    })
}

// Load the kml configured if any
loadKmls(config.kml_urls, viewerWrapper);

////GPS utility functions
//function zoomToGPSTracks(){
//	return gps_tracks.zoomTo();
//}

function addGPSLocation(data){
	const coords = JSON.parse(data);
	if(coords.latitude !== 0 && coords.longitude !== 0){
		const wrappedCoords = coords.longitude.toString() + ',' + coords.latitude.toString() +'</br>';
		const coordsContainer = document.getElementById('coords');
		coordsContainer.innerHTML = wrappedCoords+coordsContainer.innerHTML;
		gps_tracks.addPoint(coords.latitude, coords.longitude);
        //console.log(coords.longitude, coords.latitude);
	}
}

window.addEventListener("load",function() { // TODO not needed anymore
	// Set a timeout...
	setTimeout(function(){
		// Hide the address bar!
		window.scrollTo(0, 1);
	}, 0);
});

module.exports = {
	'camera': viewerWrapper.viewer.scene.camera,
	'viewerWrapper': viewerWrapper,
	'addGPSLocation': addGPSLocation,
    'zoom': zoom,
    'heading': heading,
    'tsse': tsse,
    'planManager': planManager,
    'gps_tracks': gps_tracks,
    'connectedDevices' : config.connectedDevices, //Added by Kenneth 9/4/17
    '$':$
};

//if (module.hot) {
//  module.hot.accept();
//  module.hot.dispose(function() {
    //clearInterval(timer):
//  });
//}
