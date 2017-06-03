import * as _ from 'lodash';
import 'bootstrap-loader';
import {config} from './../config/config_loader';
import {ViewerWrapper, zoom, heading, DynamicLines} from './cesium_util/cesiumlib';
import {Cartesian3, CesiumMath, Color, CallbackProperty} from './cesium_util/cesium_imports'


// Configure the Cesium viewer
const viewerWrapper = new ViewerWrapper(config.urlPrefix, config.server.port, 1, 'cesiumContainer');

// Set up for SSE or GPS input
const hasSSE = config.sse;
import {TrackSSE} from './sse/trackSseUtils'
import {PlanManager} from './plan/plan'
let tsse = undefined;
let planManager = undefined;
if (hasSSE != undefined) {
	tsse = new TrackSSE(viewerWrapper);
	planManager = new PlanManager(viewerWrapper);
} else {
	const gps_tracks = new DynamicLines(viewerWrapper);
}

//xGDS utility functions
function reloadPlan() {
	planManager.fetchXGDSPlan();
}

//GPS utility functions
function zoomToGPSTracks(){
	return gps_tracks.zoomTo();
}

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
    'zoomToGPSTracks': zoomToGPSTracks,
    'reloadPlan': reloadPlan
};

if (module.hot) {
  module.hot.accept();
  module.hot.dispose(function() {
    //clearInterval(timer):
  });
}