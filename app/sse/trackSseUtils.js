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
import {beforeSend} from './../util/xgdsUtils';

const hasSSE = ('xgds' in config);

const moment = require('moment');
import {Color, ImageMaterialProperty, ColorMaterialProperty, Cartesian2, Cartesian3, CallbackProperty, HeadingPitchRange, ClockRange,
		Clock, SampledPositionProperty, JulianDate, HermitePolynomialApproximation, TimeIntervalCollection, TimeInterval, ClockViewModel,
		CompositePositionProperty, ConstantPositionProperty, ReferenceFrame, SampledProperty, ExtrapolationType} from './../cesium_util/cesium_imports'
import {DynamicLines, buildCylinder, updatePositionHeading, buildRectangle,
	    buildPath } from './../cesium_util/cesiumlib';
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
		
		// cache of raw data
		this.positions = {};
		this.tracks =  {};
		this.lastHeading = {};
		
		// cesium renderings
		this.cLastPosition = {};
		this.cSampledPositionProperties = {};
		this.cHeadings = {};
		this.cPaths = {};
		
		// colors and materials
		this.colors = {'gray': Color.GRAY.withAlpha(0.25)};
		this.labelColors = {'gray': Color.GRAY};
		this.imageMaterials = {};
		this.colorMaterials = {};
		this.cEllipseMaterial = {};
		this.pointerUrl = hostname + '/' + config.server.nginx_prefix + '/icons/pointer.png';

		// various flags
		this.isStopped = {};
		this.STALE_TIMEOUT= 5000;
		this.followPosition = true;
		this.isInitialized=false;
		this.isMoving=false;
		
		// initialize
		this.getCurrentPositions();
		this.allChannels(this.subscribe, this);
		
		let context = this;
		
		// show timeout state
		setInterval(function() {context.allChannels(context.checkStale, context);}, context.STALE_TIMEOUT);
		
		//Event listeners track when camera is moving or not, to prevent zooming during a move
		this.viewerWrapper.viewer.camera.moveStart.addEventListener(function(){context.isMoving=true;});
		this.viewerWrapper.viewer.camera.moveEnd.addEventListener(function(){context.isMoving=false;});

	};

	setFollowPosition(value) {
		// follow the current position
		
		this.followPosition = value;
		// tracked entity does follow it but it mucks with the camera angle
//		if (value){
//			this.viewerWrapper.viewer.trackedEntity = this.cPaths[config.xgds.follow_channel];
//		} else {
//			this.viewerWrapper.viewer.trackedEntity = undefined;
//		}
	};
	
	allChannels(theFunction, context){
		// look up all the channels from the server
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
		// check if we have lost our data, gray out.
		let connected = false
		if (context.positions[channel] != undefined){
			let nowmoment =  moment().utc();
			let diff = moment.duration(nowmoment.diff(moment(context.positions[channel].timestamp)));
			if (diff.asSeconds() <= 10) {
				connected = true;
				context.isStopped[channel] = false;
			}
		}
		if (!connected){
			context.isStopped[channel] = true;
		}
	};

	subscribe(channel, context) {
		context.isStopped[channel] = false; //weird, but we want the default colors
		sse.subscribe('position', context.handlePositionEvent, context, channel);
	};

	handlePositionEvent(event, context){
		let data = JSON.parse(event.data);
		let channel = sse.parseEventChannel(event);
		context.updatePosition(channel, data);
	};
	
	zoomToPositionBadHeight(channel){
		if (channel === undefined){
			channel = config.xgds.follow_channel;
		}
		if (channel !== undefined) {
			let entity = this.cPaths[channel];
			this.viewerWrapper.viewer.zoomTo(entity, new HeadingPitchRange(0, -Math.PI/2.0, 150.0));
		}
	};

	/*
	This Zoom to position method does not change bearing or height. 
	*/
	zoomToPosition(channel){
		if (channel === undefined){
			channel = config.xgds.follow_channel;
		}
		
		if (!this.isMoving) {

			let entity = this.cPaths[channel]; //.ellipse;
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
	
	
	modifyPosition(channel, data, disconnected){
		// stores the data & updates so position can be rendered
		if (disconnected == undefined){
			disconnected = false;
		}
		this.positions[channel] = data;
		if (fakeHeading) {
			data.heading = (Math.random() * (2* Math.PI)); //TODO testing heading, delete
		}
		this.renderPosition(channel, data, disconnected);
	};

	updatePosition(channel, data){
		// updates the position, gets the track if need be
		if (!(channel in this.positions)){
			this.modifyPosition(channel, data);
			this.getTrack(channel, data);
		} else {
			this.modifyPosition(channel, data, false);
		}
	};

	toggleTrack(show) {
		// show or hide the full track
		if (show){
			this.cPaths[config.xgds.follow_channel].path.trailTime = undefined;
		} else {
			this.cPaths[config.xgds.follow_channel].path.trailTime = 60;
		}
	};
	
	addColor(channel, newColor) {
		if (_.isEmpty(newColor)){
			newColor = '#00FF00'; // green by default
		}
		let color = Color.fromCssColorString('#' + newColor)
		// make a translucent one
		let cclone = color.clone().withAlpha(0.4);
		this.colors[channel] = cclone;
		this.labelColors[channel] = color;
		return cclone;
	};
	
	renderTrack(channel, data){
		if (! channel in this.colors){
			if (data.color !== undefined) {
				color = this.addColor(data.color);
			}
		}
		
		// update the viewer clock start
		if (data.times.length > 0){
			let start = JulianDate.fromIso8601(data.times[0][0]);
			let stop = JulianDate.addHours(start, 12, new JulianDate());
			
			let cvm = new ClockViewModel(this.viewerWrapper.viewer.clock);
			cvm.startTime = start.clone();

			let path = this.cPaths[channel];
			if (path !== undefined){
				path.availability =  new TimeIntervalCollection([new TimeInterval({
			        start : start.clone(),
			        stop : stop.clone()
			    })]);
			}
		}
		
		
		this.updateSampledPositionProperty(channel, data);
	};

	convertTrackNameToChannel(track_name){
		let splits = track_name.split('_');
		if (splits.length > 1){
			return splits[1];
		}
		return track_name;
	};
	
	
	getColor(channel, forLabel) {
		if (forLabel === undefined){
			forLabel = false;
		}
		let sourceMap = this.colors;
		if (forLabel){
			sourceMap = this.labelColors;
		}
		if (this.isStopped[channel]) {
			return sourceMap['gray'];
		}
		if (channel in this.colors){
			return sourceMap[channel];
		}
		return Color.GREEN;
	};
	
	
	getMaterial(channel) {
		// gets or initializes the material
		let material = undefined;
		let context = this;
		if (!(channel in this.cEllipseMaterial)){
			let data = this.positions[channel];
			let hasHeading = (_.isNumber(data.heading));
			if (hasHeading) {
				// make sure it has the image material
				if (!(channel in this.imageMaterials)){
					this.imageMaterials[channel] = new ImageMaterialProperty({'image': this.pointerUrl, 'transparent': true, 'color': new CallbackProperty(function() {return context.getColor(channel);}, false)});
				} 
				material = this.imageMaterials[channel];
			} else {
				// make sure it has the color material
				if (!(channel in this.colorMaterials)){
					this.colorMaterials[channel] = new ColorMaterialProperty(new CallbackProperty(function(time, result) {return context.getColor(channel);}, false));
				} 
				material = this.colorMaterials[channel];
			}
			this.cEllipseMaterial[channel] = material;
		} else {
			material = this.cEllipseMaterial[channel];
		}
			
		return material;
		
	};
	
	updateHeading(channel, data) {
		// update the stored heading
		let property = undefined;
		if (!(channel in this.cHeadings)){
			let context = this;
			property = new SampledProperty(Number);
			property.forwardExtrapolationType = ExtrapolationType.HOLD;
			this.cHeadings[channel] = property;
		} else {
			property = this.cHeadings[channel];
		}
		
		let cdate = JulianDate.fromIso8601(data.timestamp);
		property.addSample(cdate, data.heading);
		this.lastHeading[channel] = data.heading;
	};
	
	updateSampledPositionProperty(channel, data) {
		// update the stored cesium position
		let property = this.cSampledPositionProperties[channel];;
		if (_.isUndefined(property)){
			property = new SampledPositionProperty();
			property.forwardExtrapolationType = ExtrapolationType.HOLD;
			this.cSampledPositionProperties[channel] = property;
		}
		if ('lon' in data) {
			// adding a point
			let cdate = JulianDate.fromIso8601(data.timestamp);
			this.viewerWrapper.getRaisedPositions({longitude:data.lon, latitude:data.lat}).then(function(raisedPoint){
				property.addSample(cdate, raisedPoint[0]);
				this.cLastPosition[channel]=raisedPoint[0];
//				if (this.followPosition){
//					this.zoomToPosition(channel);
//				}

			}.bind(this));
		} else {
			// adding a track 
			if (data.coords.length > 0) {
				// tracks come in blocks of times & coords to handle gaps.  Cesium is doing linear interpolation here.
				for (let i=0; i< data.coords.length; i++){
					let times = data.times[i];
					let lastI = i;
					this.viewerWrapper.getRaisedPositions(data.coords[i]).then(function(raisedPoints){
						let julianTimes = [];
						for (let t=0; t<times.length; t++){
							julianTimes.push(JulianDate.fromIso8601(times[t]));
						};
						
						property.addSamples(julianTimes, raisedPoints);
					});
					
				}
			}
		}
	}

	renderPosition(channel, data, stopped){

		let color = undefined;
		if (channel in this.colors){
			color = this.colors[channel];
		} else {
			color = this.addColor(channel, data.track_hexcolor);
		}

		if (!_.isEmpty(data)){
			if (!(channel in this.cSampledPositionProperties)) {
			

				this.updateSampledPositionProperty(channel, data);
				if (_.isNumber(data.heading)) {
					this.updateHeading(channel, data);
				}

				let retrievedMaterial = this.getMaterial(channel);

				let headingCallback = new CallbackProperty(function(time, result) {
					if (channel in this.cHeadings){
						return this.cHeadings[channel].getValue(time);
					}
					return 0;  // it won't matter because we are not rendering a texture
				}.bind(this), false);
				
				buildPath(this.cSampledPositionProperties[channel], channel, this.getColor(channel, true), retrievedMaterial, channel+'_POSITION', headingCallback, this.viewerWrapper, function(entity){
					let builtPath = entity;
					this.cPaths[channel] = builtPath;
				}.bind(this));

			} else {
				this.updateSampledPositionProperty(channel, data);
				if (_.isNumber(data.heading)) {
					this.updateHeading(channel, data);
				}


				/*let dataSource = this.cPosition[channel];
			let pointEntity = dataSource.entities.values[0];

			if (stopped){
				let color = this.colors['gray'];
				if (!color.getValue().equals(pointEntity.ellipse.material.color.getValue())){
					pointEntity.ellipse.material.color = color;
				}
				return;
			} */

				// update it
				/*
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
				 */
			}
		}
	}; 

	getCurrentPositions() {
		let trackPKUrl = hostname + '/track/rest/position/active/json'
		$.ajax({
			url: trackPKUrl,
			dataType: 'json',
			xhrFields: {withCredentials: true},
			beforeSend: beforeSend,
			success: $.proxy(function(data) {
				if (data != null){
					// should return dictionary of channel: position
					for (let track_name in data){
						let channel = this.convertTrackNameToChannel(track_name);
						if (!(channel in this.positions)){
							this.updatePosition(channel, data[track_name], true);
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

		let trackUrl =  hostname + '/xgds_map_server/rest/mapJson/basaltApp.BasaltTrack/pk:' + data.track_pk
		$.ajax({
			url: trackUrl,
			dataType: 'json',
			xhrFields: {withCredentials: true},
			beforeSend: beforeSend,
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
