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
import {Color, defined, ScreenSpaceEventHandler, ScreenSpaceEventType, ImageMaterialProperty, HeadingPitchRange,Cartesian3, CesiumMath, CallbackProperty, EntityCollection } from './../cesium_util/cesium_imports'
import {DynamicLines, buildLineString, buildCylinder, buildSurfaceCircle} from './../cesium_util/cesiumlib';
import {config} from './../../config/config_loader';
import {getXgdsToken} from './../util/xgdsUtils';

const hostname = config.sse.protocol + '://' + config.sse.name;

class PlanManager {
	
	constructor(viewerWrapper) {
		this.plan = undefined;
		this.viewerWrapper = viewerWrapper;
		this.segmentElements = {};
		this.stationElements = {};
		this.stationBoundaries = {};
		this.segmentStyle = {'material':Color.ORANGE};
		this.stationImageUrl = hostname + '/' + config.server.nginx_prefix + '/icons/station_circle.png';
		//this.stationImageUrl = config.server.protocol + "://" + config.server.name + '/' + config.server.nginx_prefix + '/' + '/icons/station_circle.png';
		this.stationCylinderStyle = {'material': new ImageMaterialProperty({'image':this.stationImageUrl, 'transparent':true}), 'translucent': true, 'color': new Color(1.0, 1.0, 1.0, 0.5)};
		this.stationBoundaryStyle = {'material': Color.YELLOW.withAlpha(0.25)};
		this.fetchXGDSPlan();
		global.editMode = false;
		this.setupEditing();
		this.initializedPextant = false;
		this.planName = undefined; //Added by Kenneth
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
						let llh = this.viewerWrapper.toLongLatHeight(this.selectedStation.position._value);
						let newPosition = [llh[0], llh[1]];
						this.updateStationPosition(stationId, newPosition, this.selectedStation.position._value);
						this.toggleNavigation(true);
						this.selectedStation = undefined;
					}
				}.bind(this),
				ScreenSpaceEventType.LEFT_UP
		);

	};
	
	updateStationPosition(id, llPosition, rawPosition){
		this.plan.sequence.forEach(function(element){
			if (element.id == id){
				element.geometry.coordinates = llPosition;
			}
		});
		
		let foundBoundary = this.stationBoundaries[id];
		if (foundBoundary !== undefined){
			foundBoundary.position = rawPosition;
		}
	};
	
	clearPlan(removePlan=true) {
		let keys = Object.keys(this.segmentElements);
		keys.forEach(function(key){
			this.viewerWrapper.viewer.entities.remove(this.segmentElements[key]);
		}, this);
		keys = Object.keys(this.stationElements);
		keys.forEach(function(key){
			this.viewerWrapper.viewer.entities.remove(this.stationElements[key]);
		}, this);
		keys = Object.keys(this.stationBoundaries);
		keys.forEach(function(key){
			this.viewerWrapper.viewer.entities.remove(this.stationBoundaries[key]);
		}, this);
		if (removePlan){
			this.plan = undefined;
			this.segmentElements = {};
			this.stationElements = {};
			this.stationBoundaries = {};
		}
	};
	
	zoomTo() { //TODO
		let entityGroup = new EntityCollection;
		let keys = Object.keys(this.segmentElements);

		if (keys.length > 0) {

			for(let i = 0; i<keys.length; i++){
				entityGroup.add(this.segmentElements[keys[i]]);
			}

			this.viewerWrapper.viewer.zoomTo(entityGroup, new HeadingPitchRange(0, -Math.PI/2.0, 150.0));
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
            data: getXgdsToken(),
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
            	console.log('Could not get plan for today');
            	console.log(data);
            }, this)
          });
	};
	
	renderPlan() {
		
		$(".planNameSpan").html(this.plan.name);
		
		let sequence = this.plan.sequence;
		if (!_.isEmpty(sequence)){
			let lastStation = sequence[0];
			let nextStation = undefined;
			let stationIndex = 0;
			for (let i=0; i<sequence.length; i++){
				let pe = sequence[i];
				if (pe.type == 'Segment'){
					nextStation = sequence[i+1];
					this.renderSegment(pe, lastStation, nextStation);
					lastStation = nextStation;
				} else {
					if (pe.name === undefined || _.isEmpty(pe.name)){
						if (stationIndex == 0){
							pe.name = 'Start';
						} else if (i == sequence.length-1){
							pe.name = 'End';
						} else {
							pe.name = stationIndex.toString();
						}
					}
					this.renderStation(pe);
					stationIndex++;
				}
			}
		}
	};
	
	renderSegment(segment, lastStation, nextStation) {
		if (!_.isEmpty(segment.geometry) && !_.isEmpty(segment.geometry.coordinates)) {
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
						10.0, 3.0, 128, station.name, this.stationCylinderStyle, station.id, this.viewerWrapper, function(entity){
				this.stationElements[station.id] = entity;
			}.bind(this));
			
			if (station.boundary !== undefined && station.boundary > 0.6) {
				buildSurfaceCircle({longitude: station.geometry.coordinates[0], latitude: station.geometry.coordinates[1]},
						station.boundary, this.stationBoundaryStyle, station.id + "_boundary", this.viewerWrapper, function(entity){
					this.stationBoundaries[station.id] = entity;
				}.bind(this));
			}

		}
	};
	
	sendPlanToSextant(solve=false){
		if (this.plan === undefined){
			return;
		}
		let sextantUrl = config.sextant.protocol + '://' + config.server.name + '/' + config.sextant.nginx_prefix + '/setwaypoints';
		if (!_.isEmpty(this.plan.sequence)){
			let data = JSON.stringify({'xp_json':this.plan});
			$.ajax({
            url: sextantUrl,
            data: data,
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            context: this,
            success: $.proxy(function(data) {
            	console.log('DATA LOADED IN SEXTANT');
            	if (solve){
            		console.log('CALLING SOLVER');
            		this.calculateNewPath(true);
            	}
            }),
            error: $.proxy(function(data){
            	console.log('FAILED TO LOAD TO SEXTANT');
            })
            });
			
			
			
		}
	};
	
	calculateNewPath(justSentPlan=false) {
		// you must have already sent the waypoints to sextant
		let sextantUrl = config.sextant.protocol + '://' + config.server.name + '/' + config.sextant.nginx_prefix + '/solve';
		let dict = {'return': 'segmented'};
		if (!justSentPlan){
			dict['xp_json'] = this.plan;
		}
		let data = JSON.stringify(dict);
		$.ajax({
            url: sextantUrl,
            data: data,
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            context: this,
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
            			console.log('GOT GREAT RESULTS FROM SOLVER! RENDERING!');
            			this.updatePathFromSextant(segmentCoordinates);
            		} else {
            			//TODO alert the user
            			console.log('NO PATH FOUND FROM SEXTANT');
            		}
            	}
            }, this),
            error: $.proxy(function(data) {
            	//TODO handle error case
            	console.log(data);
            	console.log('NO PATH FOUND FROM SEXTANT');
            	alert('NO PATH FOUND FROM SEXTANT');
            }, this)
          });
		
	};
	
	invokePextant() {
		if (!this.initializedPextant){
			this.sendPlanToSextant(true);
			this.initializedPextant = true;
		} else {
			this.calculateNewPath(false);
		}
	}
	
	updatePathFromSextant(segmentCoordinates){
		let sequence = this.plan.sequence;
		let lastIndex = 0;
		if (!_.isEmpty(sequence)){
			for (let i=0; i<sequence.length; i++){
				let pe = sequence[i];
				if (pe.type == 'Segment'){
					if ('geometry' in pe){
						pe.geometry.coordinates = segmentCoordinates[lastIndex];
					} else {
						pe['geometry'] = {'coordinates': segmentCoordinates[lastIndex],
								 		  'type': 'LineString'};
						
					}
					lastIndex++;
				}
			}
		}
		this.clearPlan(false);
		// we rerender everything, we could be fancy and just rerender the segments.
		this.renderPlan();
	};


	//Added by Kenneth- reorients camera
	reOrient(){
		this.viewerWrapper.viewer.camera.flyTo({
			destination: camera.position,
            orientation: {
            heading : 0.0,
            pitch : -CesiumMath.PI_OVER_TWO,
            roll : 0.0
        }
    });
	};

	//Added by Kenneth- handles name saving
	savePlan(newPlanName){
		if(newPlanName!== undefined && newPlanName.length>0){
			if(this.planName !== newPlanName){
				this.planName = newPlanName
			}
			//TODO fix URL
            $.post("xgds.url.potato",
            {
                planName: this.planName,
                plan: this.plan
            },
            function(data, status){
                if(status === 200){
                	alert("Save Successful");
                	return true;
                }
                else{
	                alert("Data: " + data + "\nStatus: " + status);
                	return false;
                }
            });
		}
		else{
		alert("Please enter a Plan Name");
		return false;
		}
	}

	//Added by Kenneth Fang- simple getter method 
	getPlanName(){
		return this.planName;
	}




}

export {PlanManager}
