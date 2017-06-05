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

const moment = require('moment');
import {Color, defined, ScreenSpaceEventHandler, ScreenSpaceEventType} from './../cesium_util/cesium_imports'
import {DynamicLines, buildLineString, buildCylinder} from './../cesium_util/cesiumlib';
import {config} from './../../config/config_loader';

const hostname = config.sse.protocol + '://' + config.sse.name;

class PlanManager {
	
	constructor(viewerWrapper) {
		this.plan = undefined;
		this.viewerWrapper = viewerWrapper;
		this.segmentElements = {};
		this.stationElements = {};
		this.segmentStyle = {'material':Color.ORANGE};
		this.stationImageUrl = hostname + '/' + config.server.nginx_prefix + '/icons/station_circle.png';
		this.stationCylinderStyle = {'material': this.stationImageUrl};
		this.fetchXGDSPlan();
		global.editMode = false;
		this.setupEditing();
	};
	
	toggleNavigation(value){
		// turn on or off ability to move around the scene
		this.viewerWrapper.viewer.scene.screenSpaceCameraController.enableRotate = value;
		this.viewerWrapper.viewer.scene.screenSpaceCameraController.enableTranslate = value;
		this.viewerWrapper.viewer.scene.screenSpaceCameraController.enableZoom = value;
		this.viewerWrapper.viewer.scene.screenSpaceCameraController.enableTilt = value;
		this.viewerWrapper.viewer.scene.screenSpaceCameraController.enableLook = value;
	};
	
	setupEditing() {
		this.editStationHandler = new ScreenSpaceEventHandler(this.viewerWrapper.viewer.scene.canvas);
		this.editStationHandler.setInputAction(function(movement) {
			if (global.editMode) {
				// get an array of all primitives at the mouse position
				var pickedObject = this.viewerWrapper.viewer.scene.pick(movement.position);
				if (defined(pickedObject)) {
					if (pickedObject.id.id in this.stationElements){
						this.selectedStation = pickedObject.id;
						this.toggleNavigation(false);
					}
				}
			}

		}.bind(this), ScreenSpaceEventType.LEFT_DOWN);
		this.editStationHandler.setInputAction(
				function(movement) {
					if (global.editMode && (this.selectedStation !== undefined)) {
						let newPosition = this.viewerWrapper.viewer.scene.camera.pickEllipsoid(movement.endPosition);
						this.selectedStation.position = newPosition;
					}
				}.bind(this),
				ScreenSpaceEventType.MOUSE_MOVE
		);

		this.editStationHandler.setInputAction(
				function() {
					if (global.editMode && this.selectedStation !== undefined){
						// update the actual segment with the new position
						let stationId = this.selectedStation.id;
						this.updateStationPosition(stationId, this.selectedStation.position);
						this.toggleNavigation(true);
						this.selectedStation = undefined;
					}

				}.bind(this),
				ScreenSpaceEventType.LEFT_UP
		);

	};
	
	updateStationPosition(id, position){
		this.plan.sequence.forEach(function(element){
			if (element.id == id){
				//TODO verify
				element.geometry.coordinates = position;
			}
		});
	};
	
	clearPlan(removePlan=true) {
		let keys = Object.keys(this.segmentElements);
		keys.forEach(function(key){
			this.viewerWrapper.viewer.entities.remove(this.segmentElements[key]);
		}, this);
		keys = Object.keys(this.stationElements);
		keys.forEach(function(key){
			this.viewerWrapper.viewer.entities.remove(this.segmentElements[key]);
		}, this);
		if (removePlan){
			this.plan = undefined;
		}
	};
	
	fetchXGDSPlan() {
		if (this.plan !== undefined){
			this.clearPlan();
		}
		
		let currentPlanUrl = hostname + '/xgds_planner2/plans/today/json'
		$.ajax({
            url: currentPlanUrl,
            dataType: 'json',
            success: $.proxy(function(data) {
            	if (data != null){
            		let planDict = data;
            		let thePlan = undefined;
            		let sortedKeys = Object.keys(planDict).sort();
            		// Right now we are just taking the last one.  Might want to give them a list or something.
            		if (!_.isEmpty(sortedKeys)) {
            			thePlan = planDict[sortedKeys[sortedKeys.length - 1]];
	            		if (thePlan !== undefined) {
	            			this.plan = thePlan;
	            			this.renderPlan();
	            		}
            		}
            	}
            }, this),
            error: $.proxy(function(data) {
            	//TODO handle error case
            }, this)
          });
	};
	
	renderPlan() {
		
		let sequence = this.plan.sequence;
		if (!_.isEmpty(sequence)){
			let lastStation = sequence[0];
			let nextStation = undefined;
			for (let i=0; i<sequence.length; i++){
				let pe = sequence[i];
				if (pe.type == 'Segment'){
					nextStation = sequence[i+1];
					this.renderSegment(pe, lastStation, nextStation);
					lastStation = nextStation;
				} else {
					this.renderStation(pe);
				}
				
			}
		}
	};
	
	renderSegment(segment, lastStation, nextStation) {
		if (!_.isEmpty(segment.geometry.coordinates)) {
			buildLineString(segment.geometry.coordinates, this.segmentStyle, segment.id, this.viewerWrapper, function(entity){
				this.segmentElements[segment.id] = entity;
			}.bind(this));
		} else {
			// no sextant path, just show straight line ...
			let stationCoordinates = [lastStation.geometry.coordinates, nextStation.geometry.coordinates];
			buildLineString(stationCoordinates, this.segmentStyle, segment.id, this.viewerWrapper, function(entity){
				this.segmentElements[segment.id] = entity;
			}.bind(this));
		}
	};
	
	renderStation(station){
		if (!_.isEmpty(station.geometry.coordinates)) {
			
			buildCylinder({longitude:station.geometry.coordinates[0], latitude:station.geometry.coordinates[1]},
						10.0, 3.0, station.name, this.stationCylinderStyle, station.id, this.viewerWrapper, function(entity){
				this.stationElements[station.id] = entity;
			}.bind(this));

		}
	};
	
	sendPlanToSextant(){
		if (this.plan === undefined){
			return;
		}
		let sextantUrl = config.sextant.protocol + '://' + config.server.name + ':' + config.sextant.port + '/setwaypoints';
		let sequence = this.plan.sequence;
		let waypoints = [];
		if (!_.isEmpty(sequence)){
			for (let i=0; i<sequence.length; i++){
				let element = sequence[i];
				if (element.type == 'Station'){
					waypoints.push([element.geometry.coordinates[1], element.geometry.coordinates[0]]);
				}
			}
			$.post(sextantUrl, {waypoints: waypoints, time: moment.utc().format()}).done(function(data){
				console.log('data loaded in sextant');
				console.log(data);
			})
		}
	};
	
	calculateNewPath() {
		// you must have already sent the waypoints to sextant
		let sextantUrl = config.sextant.protocol + '://' + config.server.name + ':' + config.sextant.port + '/solve';
		let data = {'xp_json' : this.plan,
					'return': 'segmented'}
		$.ajax({
            url: sextantUrl,
            data: data,
            dataType: 'json',
            success: $.proxy(function(data) {
            	if (data != null){
            		// should be a list of latitudes, longitudes
            		let latLongArrays = data.latlong;
            		let segmentCoordinates = [];
            		latLongArrays.forEach(function(latLongArray){
                		let latitudes = latLongArray.latitudes;
                		let longitudes = latLongArray.longitudes;
                		let zipped = _.zipWith(latLongArray.longitudes, latLongArray.latitudes, function(lon, lat) {
                			  return [lon, lat];
                			});
                		segmentCoordinates.push(zipped);
            		});
            		if (!_.isEmpty(segmentCoordinates)) {
            			this.updatePathFromSextant(segmentCoordinates);
            		} else {
            			//TODO alert the user
            			console.log('NO PATH FOUND FROM SEXTANT');
            		}
            	}
            }, this),
            error: $.proxy(function(data) {
            	//TODO handle error case
            }, this)
          });
		
	};
	
	updatePathFromSextant(segmentCoordinates){
		let sequence = this.plan.sequence;
		if (!_.isEmpty(sequence)){
			for (let i=0; i<sequence.length; i++){
				let pe = sequence[i];
				if (pe.type == 'Segment'){
					pe.geometry.coordinates = segmentCoordinates[i];
				}
			}
		}
		this.clearPlan(false);
		// we rerender everything, we could be fancy and just rerender the segments.
		this.renderPlan();
	};

}

export {PlanManager}