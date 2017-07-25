import * as _ from 'lodash';
import * as $ from 'jquery';
import 'bootstrap-loader';
import {config} from './../config/config_loader';
import {ViewerWrapper, zoom, heading, DynamicLines, loadKmls} from './cesium_util/cesiumlib';
import {Cartesian3, CesiumMath, Color, CallbackProperty} from './cesium_util/cesium_imports'


// Configure the Cesium viewer
const viewerWrapper = new ViewerWrapper(config.urlPrefix, config.server.cesium_port, config.server.nginx_prefix, 1, 'cesiumContainer');

// Set up for SSE or GPS input
const hasSSE = ('sse' in config);
import {TrackSSE} from './sse/trackSseUtils'
import {PlanManager} from './plan/plan'
let gps_tracks = undefined;
let tsse = undefined;
let planManager = undefined;

if (hasSSE) {
	tsse = new TrackSSE(viewerWrapper);
	planManager = new PlanManager(viewerWrapper);
} else {
	gps_tracks = new DynamicLines(viewerWrapper);
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


module.exports = {
	'camera': viewerWrapper.viewer.scene.camera,
	'viewerWrapper': viewerWrapper,
	'addGPSLocation': addGPSLocation,
    'zoom': zoom,
    'heading': heading,
    'tsse': tsse,
    //'zoomToGPSTracks': zoomToGPSTracks,
    //'reloadPlan': reloadPlan,
    'planManager': planManager,
    'gps_tracks': gps_tracks,
    '$':$
};

if (module.hot) {
  module.hot.accept();
  module.hot.dispose(function() {
    //clearInterval(timer):
  });
}