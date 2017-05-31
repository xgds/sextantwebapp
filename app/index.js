import * as _ from 'lodash';
import 'bootstrap-loader';
import {ViewerWrapper} from './cesiumlib';
import {Cartesian3, CesiumMath, Color, CallbackProperty} from './demo_code/cesium_imports'
import {config} from './../config/config_globals';


//TODO this is defined both in cesium.js and here in index.js.  Why?
//TODO why is this on the sextant port?  suspicious.  Sextant is doing the math.  Seems like javascript can do the math too.
const destination = Cartesian3.fromDegrees(config.siteConfig.centerPoint[0], config.siteConfig.centerPoint[1], config.sextant.port);

//TODO there are 3 viewer wrappers and all called cesiumContainer.  maps.js, cesium.js and index.js
const viewerWrapper = new ViewerWrapper(config.urlPrefix, config.server.port, 1, 'cesiumContainer');

const hasSSE = config.sse;
// ah well, import has to be outside the if.
import {SSE} from './sseUtils'
if (hasSSE != undefined) {
	const sse = new SSE(config.sse.protocol + '://' + config.sse.name);
	sse.subscribe('position', logpoint, 'EV2');
}

const viewer = viewerWrapper.viewer;
const camera = viewer.scene.camera;

//TODO zoom is already defined in cesium.js
function zoom(){
	const hawaii = camera.setView({
		destination: destination
	});
}

//TODO should this be refactored to cesium.js?
function heading(headingAngle) {
    if (headingAngle != undefined) {
        console.log(headingAngle);
        camera.setView({
            destination: destination,
            orientation: {
                heading: CesiumMath.toRadians(headingAngle),
                pitch: -CesiumMath.toRadians(90),
                roll: 0.0
            }
        })
    }
}

function LineString(latlongPoints, styleOptions) {
    viewerWrapper.getRaisedPositions(latlongPoints).then(function (raisedMidPoints) {
        //console.log(raisedMidPoints);
        const polylinePositon = {
            positions: raisedMidPoints
        };
        const polylineArguments = Object.assign({}, polylinePositon, styleOptions);
        const entity = viewer.entities.add({
            polyline: polylineArguments
        });
        viewer.zoomTo(entity);
    });
}

function DynamicLines(){
	this.points = [];
	this.pointcounter = 0;
	this.entity = Object();
    this.getPoints = function(){
        return this.points;
    };

    this.pushPoint = function(lat, lon){
        console.log(lat.toString()+','+lon.toString());
        viewerWrapper.getRaisedPositions({latitude: [lat], longitude: [lon]}).then(function(raisedMidPoints){
            this.points.push(raisedMidPoints[0]);
        }.bind(this));
    };
    this.addMesh = function(){
        gps_mesh.send('')
    };
	this.addPoint = function(lat, lon){
        console.log('adding point');
		this.pointcounter+=1;
        this.pushPoint(lat, lon);
		if(this.pointcounter === 2) {
			console.log(this.points);
			this.entity = viewer.entities.add({
			    name : 'GPS coordinates',
			    polyline : {
			        positions : new CallbackProperty(this.getPoints.bind(this), false),
			        width : 2,
			        material : Color.GREEN
			    }
			});
			//this.zoomTo()
		}else if(this.pointcounter > 2){
			lascoords = _.takeRight(this.points,2);
			console.log(lascoords[0]===lon);
			console.log(lascoords[1]===lat);
			if(lascoords[0]!==lon) {
				this.pushPoint(lon, lat);
				//this.zoomTo()
			}
		}
	};
	this.zoomTo = function(){
		viewer.zoomTo(this.entity);
	}
}


const gps_tracks = new DynamicLines();
function logpoint(point){
    console.log(point)
}

function zoomtotracks(){
	return gps_tracks.zoomTo();
}

const doPrintLatLong = true;

const coordsContainer = document.getElementById('coords');

function getLocation(data){
	if (doPrintLatLong){
			const coords = JSON.parse(data);
			if(coords.latitude !== 0 && coords.longitude !== 0){
				const wrappedCoords = coords.longitude.toString() + ',' +
				coords.latitude.toString() +'</br>';
				coordsContainer.innerHTML = wrappedCoords+coordsContainer.innerHTML;
				gps_tracks.addPoint(coords.latitude, coords.longitude);
                //console.log(coords.longitude, coords.latitude);
			}
	}
}

function getglobalpoint(){
	return viewerWrapper.globalpoint;
}

module.exports = {
    'zoom': zoom,
    'heading': heading,
    'zoomtotracks': zoomtotracks,
    'globalpoint': getglobalpoint
};

if (module.hot) {
  module.hot.accept();
  module.hot.dispose(function() {
    //clearInterval(timer):
  });
}