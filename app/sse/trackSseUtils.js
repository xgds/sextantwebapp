//__BEGIN_LICENSE__
//Copyright (c) 2015, United States Government, as represented by the 
//Administrator of the National Aeronautics and Space Administration. 
//All rights reserved.

//The xGDS platform is licensed under the Apache License, Version 2.0 
//(the "License"); you may not use this file except in compliance with the License. 
//You may obtain a copy of the License at 
//http://www.apache.org/licenses/LICENSE-2.0.

//Unless required by applicable law or agreed to in writing, software distributed 
//under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR 
//CONDITIONS OF ANY KIND, either express or implied. See the License for the 
//specific language governing permissions and limitations under the License.
//__END_LICENSE__

import {config} from './../../config/config_loader';
const hasSSE = ('xgds' in config);

const moment = require('moment');
import {Color, ImageMaterialProperty, ColorMaterialProperty, Cartesian2, Cartesian3, CallbackProperty, HeadingPitchRange, Clock} from './../cesium_util/cesium_imports'
import {DynamicLines, buildCylinder, buildArrow, updatePositionHeading, buildRectangle, buildPositionDataSource} from './../cesium_util/cesiumlib';
import {SSE} from './sseUtils'

const hostname = config.xgds.protocol + '://' + config.xgds.name;
let sse = undefined;
let fakeHeading = false;

if (hasSSE){
	sse = new SSE(hostname);
}

class TrackSSE {

	constructor(viewerWrapper) {
		this.viewerWrapper = viewerWrapper;
		this.positions = {};
		this.tracks =  {};
		this.colors = {'gray': Color.GRAY.withAlpha(0.75)};
		this.imageMaterials = {};
		this.colorMaterials = {};
		this.cTracks =  {};
		this.cStopped =  {};
		this.cPosition =  {};
		this.isStopped = [];
		this.STALE_TIMEOUT= 5000;
		this.pointerUrl = hostname + '/' + config.server.nginx_prefix + '/icons/pointer.png';
		this.stoppedCylinderStyle = {material: Color.GRAY};
		this.getCurrentPositions();
		this.allChannels(this.subscribe, this);
		let context = this;
		this.followPosition = true;
		setInterval(function() {context.allChannels(context.checkStale, context);}, context.STALE_TIMEOUT);
		 //Added by Kenneth for Follow position implementaiton 8/13/2017
		this.isInitialized=false;
		this.isMoving=false;
		var self = this;
		//Event listeners track when camera is moving or not, to prevent zooming during a move
		this.viewerWrapper.viewer.camera.moveStart.addEventListener(function(){self.isMoving=true;});
		this.viewerWrapper.viewer.camera.moveEnd.addEventListener(function(){self.isMoving=false;});

	};

	setFollowPosition(value) {
		this.followPosition = value;
	};
	
	allChannels(theFunction, context){
		let channels = sse.getChannels();
		if (channels !== undefined){
			for (let i=0; i<channels.length; i++){
				let channel = channels[i];
				if (channel != 'sse') {
					theFunction(channel, context);
				}
			}
		} else {
			alert("Problem connecting to xGDS");
		}
	};

	checkStale(channel, context) {
		let connected = false
		if (context.positions[channel] != undefined){
			let nowmoment =  moment().utc();
			let diff = moment.duration(nowmoment.diff(moment(context.positions[channel].timestamp)));
			if (diff.asSeconds() <= 10) {
				connected = true;
				let index = context.isStopped.indexOf(channel);
				if (index > -1) {
					context.isStopped.splice(index, 1);
				}
			}
		}
		if (!connected){
			context.isStopped.push(channel);
			//context.showDisconnected(channel);
		}
	};

	showDisconnected(channel) {
		this.renderPosition(channel, undefined, true);
	};

	subscribe(channel, context) {
		sse.subscribe('position', context.handlePositionEvent, context, channel);
	};

	handlePositionEvent(event, context){
		let data = JSON.parse(event.data);
		let channel = sse.parseEventChannel(event);
		context.updatePosition(channel, data);
		context.updateTrack(channel, data);
	};
	
	zoomToPosition(channel){
		if (channel === undefined){
			let keys = Object.keys(this.cPosition);
			if (keys.length > 0) {
				channel = keys[0];
			}
		}
		if (channel !== undefined) {
			let entity = this.cPosition[channel].entities.values[0];
			this.viewerWrapper.viewer.zoomTo(entity, new HeadingPitchRange(0, -Math.PI/2.0, 150.0));
		}
	};

	/*
	This Zoom to position method does not change bearing or height. Made by Kenneth Fang, hence the initals
	*/
	zoomToPositionKF(channel){
		if (channel === undefined){
			let keys = Object.keys(this.cPosition);
			if (keys.length > 0) {
				channel = keys[0];
			}
		}
		if (channel !== undefined && !this.isMoving) {

			let entity = this.cPosition[channel].entities.values[0];
            //this was useful: https://groups.google.com/forum/#!topic/cesium-dev/QSFf3RxNRfE
            
	        let ray = this.viewerWrapper.camera.getPickRay(new Cartesian2(
	            Math.round(this.viewerWrapper.viewer.scene.canvas.clientWidth / 2),
	            Math.round(this.viewerWrapper.viewer.scene.canvas.clientHeight / 2)
	        ));
			let position = this.viewerWrapper.viewer.scene.globe.pick(ray, this.viewerWrapper.viewer.scene);
			let range = Cartesian3.distance(position, this.viewerWrapper.camera.position);

			if(this.isInitialized){ //After inital zoom, follows target entity at the viewer's current height
			    this.viewerWrapper.viewer.zoomTo(entity, new HeadingPitchRange(0, -Math.PI/2.0, range));

		    }   

			else{ //Initial zoom to entity

				this.viewerWrapper.viewer.zoomTo(entity, new HeadingPitchRange(0, -Math.PI/2.0, 150.0));
				
				if(range<155.0 && range>145.0){
				    this.isInitialized = true;
			    }

			}
		}
	};
	
	zoomToTracks(channel){
		if (channel === undefined){
			let keys = Object.keys(this.cPosition);
			if (keys.length > 0) {
				channel = keys[0];
			}
		}
		this.viewerWrapper.viewer.zoomTo(this.cTracks[channel], new HeadingPitchRange(0, Math.PI/2.0, 15.0));
	};

	createPosition(channel, data, nonSse){
		// store the data, render the position and get the track
		//console.log(data);
		if (nonSse == undefined){
			nonSse = false;
		}
		this.positions[channel] = data;
		if (fakeHeading) {
			data.heading = (Math.random() * (2* Math.PI)); //TODO testing heading, delete
		}
		this.renderPosition(channel, data, nonSse);
		this.getTrack(channel, data);
	};

	modifyPosition(channel, data, disconnected){
		//console.log(data);
		this.positions[channel] = data;
		if (fakeHeading) {
			data.heading = (Math.random() * (2* Math.PI)); //TODO testing heading, delete
		}
		this.renderPosition(channel, data, disconnected);
	};

	updatePosition(channel, data){
		if (!(channel in this.positions)){
			this.createPosition(channel, data);
		} else {
			this.modifyPosition(channel, data, false);
			this.updateTrack(channel, data);
		}
	};

	clearTracks() {
		let keys = Object.keys(this.tracks);
		keys.forEach(function(key){
			let track = this.tracks[key];
			if (track.coords.length > 2){
				track.coords.splice(0, track.coords.length - 2);
			}
			let ctrack = this.cTracks[key];
			ctrack.clearPoints();
		}, this);
	};

	addColor(channel, newColor) {
		let color = Color.fromCssColorString('#' + newColor)
		// make a translucent one
		let cclone = color.clone().withAlpha(0.4);
		this.colors[channel] = cclone;
		return cclone;
	};
	
	renderTrack(channel, data){
		let color = Color.GREEN;
		if (! channel in this.colors){
			if (data.color !== undefined) {
				color = this.addColor(data.color);
			}
		} else {
			color = this.colors[channel];
		}
		
		let coords = data.coords;
		if (coords.length > 0) {
			this.cTracks[channel] = new DynamicLines(this.viewerWrapper, coords[0], channel, {'material':color});
		}
	};

	updateTrack(channel, position) {
		if (!(channel in this.cTracks)){
			//TODO render the track ... this should never happen
		} else {
			// append the point to the track
			let ctrack = this.cTracks[channel];
			ctrack.addPoint(position.lat, position.lon);
			let track = this.tracks[channel];
			track.coords.push([position.lon, position.lat]);
		}
	};

	convertTrackNameToChannel(track_name){
		let splits = track_name.split('_');
		if (splits.length > 1){
			return splits[1];
		}
		return track_name;
	};
	
	getLatestPosition(channel) {
		if (channel in this.positions) {
			return {'longitude':this.positions[channel].lon, 'latitude':this.positions[channel].lat};
		}
		return undefined;
	};
	
	getMaterial(channel, data) {
		// gets or initializes the material
		let material = undefined;
		let color = Color.GREEN;
		let colorInitialized = false;
		if (channel in this.colors){
			color = this.colors[channel];
			colorInitialized = true;
		}
		
		let hasHeading = (data.heading !== "");
		if (hasHeading) {
			// make sure it has the image material
			if (!(channel in this.imageMaterials)){
				material = new ImageMaterialProperty({'image': this.pointerUrl, 'transparent': true, 'color': color});
				if (colorInitialized) {
					this.imageMaterials[channel] = material;
				}
			} else {
				material = this.imageMaterials[channel];
			}
		} else {
			// make sure it has the color material
			if (!(channel in this.colorMaterials)){
				material = new ColorMaterialProperty({'color': color});
				if (colorInitialized) {
					this.colorMaterials[channel] = material;
				}
			} else {
				material = this.colorMaterials[channel];
			}
		} 
		
		return material;
		
	};
	
	getColor(channel) {
		if (channel in this.isStopped) {
			return this.colors['gray'];
		}
		if (channel in this.colors){
			return this.colors[channel];
		}
		return Color.GREEN;
	}
	
	getMaterial2(channel) {
		// gets or initializes the material
		let material = undefined;
		let data = this.positions[channel];
		let hasHeading = (data.heading !== "");
		if (hasHeading) {
			// make sure it has the image material
			if (!(channel in this.imageMaterials)){
				this.imageMaterials[channel] = new ImageMaterialProperty({'image': this.pointerUrl, 'transparent': true, 'color': new CallbackProperty(function() {context.getColor(channel);}, false)});
			} 
			material = this.imageMaterials[channel];
		} else {
			// make sure it has the color material
			if (!(channel in this.colorMaterials)){
				this.colorMaterials[channel] = new ColorMaterialProperty({'color': new CallbackProperty(function() {context.getColor(channel);}, false)});
			} 
			material = this.colorMaterials[channel];
		} 
		
		return material;
		
	};
	
	/*
	renderPosition(channel, data, stopped){
		console.log('rendering position');
		if (!(channel in this.cPosition)) {
			let color = Color.GREEN;
			if (channel in this.colors){
				color = this.colors[channel];
			}

			if (!_.isEmpty(data)){
//				let retrievedMaterial = this.getMaterial(channel, data);
				console.log('building position data source');
				let context = this;
				let newMaterial = new CallbackProperty(function() {
					context.getMaterial2(channel);
					}, false);
				buildPositionDataSource({longitude:data.lon, latitude:data.lat}, data.heading,
						channel, newMaterial, channel+'_POSITION', this.getLatestPosition, this, this.viewerWrapper, function(dataSource){
						console.log('built');
						this.cPosition[channel] = dataSource;
				}.bind(this));
			}
		} else {
			let dataSource = this.cPosition[channel];
			let pointEntity = dataSource.entities.values[0];
			
			// update it
			this.viewerWrapper.getRaisedPositions({longitude:data.lon, latitude:data.lat}).then(function(raisedPoint) {
				pointEntity.position.setValue(raisedPoint[0]);
				
			}.bind(this));
		}
	};
	*/

	renderPosition(channel, data, stopped){
//		console.log('rendering position');
		let color = Color.GREEN; 
		if (channel in this.colors){
			color = this.colors[channel];
		} else {
			color = this.addColor(channel, data.track_hexcolor);
		}
		
		if (!(channel in this.cPosition)) {

			if (!_.isEmpty(data)){
				let retrievedMaterial = this.getMaterial(channel, data);
//				console.log('building position data source ' + retrievedMaterial.getType());
				let context = this;
				buildPositionDataSource({longitude:data.lon, latitude:data.lat}, data.heading,
						channel, retrievedMaterial, channel+'_POSITION', this.getLatestPosition, this, this.viewerWrapper, function(dataSource){
						this.cPosition[channel] = dataSource;
						if (this.followPosition){
							this.zoomToPositionKF(channel);
						}
				}.bind(this));
			}
		} else {
			let dataSource = this.cPosition[channel];
			let pointEntity = dataSource.entities.values[0];
			
			if (stopped){
				let color = this.colors['gray'];
				if (!color.getValue().equals(pointEntity.ellipse.material.color.getValue())){
					pointEntity.ellipse.material.color = color;
				}
				return;
			}
			
			// update it
			this.viewerWrapper.getRaisedPositions({longitude:data.lon, latitude:data.lat}).then(function(raisedPoint) {
				pointEntity.position.setValue(raisedPoint[0]);
				if (this.followPosition){
							this.zoomToPositionKF(channel);
				}
				
				let retrievedMaterial = this.getMaterial(channel, data);
				let material = pointEntity.ellipse.material;
				
				let hasHeading = (data.heading !== "");
				if (hasHeading) {
//					console.log('setting orientation ' + data.heading);
					pointEntity.ellipse.stRotation.setValue(data.heading);
					// make sure it has the image material
					if (material.getType() == "Color"){
//						console.log('switching from color to ' + retrievedMaterial.getType());
						pointEntity.ellipse.material = retrievedMaterial;
					} else {
						// it already is, check the color
						if (!retrievedMaterial.color.getValue().equals(pointEntity.ellipse.material.color.getValue())){
							pointEntity.ellipse.material.color = color;
						}
					}
				} else {
					if (material.getType() != "Color"){
//						console.log('switching from ' + material.getType() + ' to ' + retrievedMaterial.getType());
						pointEntity.ellipse.material = retrievedMaterial;
					} else {
						// it already is, check the color
						try {
							if (!color.getValue().equals(pointEntity.ellipse.material.color.getValue())){
								pointEntity.ellipse.material.color = color;
							}
						} catch (err) {
							if (!color.equals(pointEntity.ellipse.material.color.getValue())){
								pointEntity.ellipse.material.color = color;
							}
						}
						
					}
				} 
				
			}.bind(this));
		}
	}; 

	getCurrentPositions() {
		let trackPKUrl = hostname + '/track/position/active/json'
		$.ajax({
			url: trackPKUrl,
			dataType: 'json',
			success: $.proxy(function(data) {
				if (data != null){
					// should return dictionary of channel: position
					for (let track_name in data){
						let channel = this.convertTrackNameToChannel(track_name);
						if (!(channel in this.positions)){
							this.createPosition(channel, data[track_name], true);
						}
					}
				}
			}, this),
			error: $.proxy(function(data) {
				console.log('could not get active track position');
				console.log(data);
			})
		});
	};

	getTrack(channel, data) {
		// first check if we already got it
		if (!_.isEmpty(this.tracks[channel])){
			return;
		}

		let trackUrl =  hostname + '/xgds_map_server/mapJson/basaltApp.BasaltTrack/pk:' + data.track_pk
		$.ajax({
			url: trackUrl,
			dataType: 'json',
			success: $.proxy(function(data) {
				if (data != null && data.length == 1){
					this.tracks[channel] = data[0];
					this.renderTrack(channel, data[0]);
				}
			}, this),
			error: $.proxy(function(response) {
				console.log('could not get track contents for ' + data.track_pk);
				console.log(response);
			})
		});

	};
}

export {TrackSSE}
