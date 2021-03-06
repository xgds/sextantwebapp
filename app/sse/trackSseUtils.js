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

import {config} from 'config_loader';
import {xgdsAuth} from 'util/xgdsUtils';

const hasSSE = ('mode' in config && config.mode == 'XGDS_SSE');

const moment = require('moment');
const Cesium = require('cesium/Cesium');

import {buildPath, buildEllipse } from './../cesium_util/cesiumlib';
import {SSE} from './sseUtils';

let sse = undefined;
let fakeHeading = false;
let hostname = undefined;
const PATH_TRAIL_TIME=60; // for the length of the path
const TRAIL_SECONDS = 1.0; // for the ellipse trailing behind to help the view

if (hasSSE){
    hostname = config.xgds.protocol + '://' + config.xgds.name;
	sse = new SSE(hostname);
}

class TrackSSE {

	constructor(viewerWrapper) {
		this.viewerWrapper = viewerWrapper;
		
		// cache of raw data
		this.positions = {};
		this.tracks =  {};
		this.loadingTracks = [];
		
		// cesium renderings
		this.cSampledPositionProperties = {};
		this.cTrailingSampledPositionProperties = {};
		this.cHeadings = {};
		this.cPaths = {};
		this.cEllipses = {};
		this.cTrailingEllipses = {};
		
		// colors and materials
		this.colors = {'gray': Cesium.Color.GRAY.withAlpha(0.25)};
		this.labelColors = {'gray': Cesium.Color.GRAY};
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
		this.range = 500; // current camera range
		
		// initialize
		this.getCurrentPositions();
		
		for (let channel in config.xgds.ev_channels){
			this.subscribe(config.xgds.ev_channels[channel], this);
		}
		
		let context = this;
		
		// show timeout state
		setInterval(function() {context.allChannels(context.checkStale, context);}, context.STALE_TIMEOUT);
		
		//Event listeners track when camera is moving or not, to prevent zooming during a move
		this.viewerWrapper.viewer.camera.moveStart.addEventListener(function(){context.isMoving=true;});
		this.viewerWrapper.viewer.camera.moveEnd.addEventListener(function(){context.isMoving=false;});

		this.viewerWrapper.viewer.scene.preRender.addEventListener(function(){
			if(this.followPosition && !this.isMoving){
				if (!(config.xgds.follow_channel in this.cPaths)){
					return;
				}
                let ray = this.viewerWrapper.camera.getPickRay(new Cesium.Cartesian2(
	            Math.round(this.viewerWrapper.viewer.scene.canvas.clientWidth / 2),
	            Math.round(this.viewerWrapper.viewer.scene.canvas.clientHeight / 2)
	            ));
			    let position = this.viewerWrapper.viewer.scene.globe.pick(ray, this.viewerWrapper.viewer.scene);
			    if(position != undefined){
				    let newRange = Cesium.Cartesian3.distance(position, this.viewerWrapper.camera.position);
				    if(newRange <this.range-5 || newRange > this.range + 5){ //Check if range is different
				    		this.range = newRange;
				    }
				    this.viewerWrapper.viewer.zoomTo(this.cTrailingEllipses[config.xgds.follow_channel], new Cesium.HeadingPitchRange(0, -Math.PI/2.0, this.range));
				
			}
			}
		},this);
	};

	setFollowPosition(value) {
		// follow the current position
		
		this.followPosition = value;
//		if (value){
//
//			let entity = this.cPaths[config.xgds.follow_channel];
//			let entityPosition = entity.position.getValue(JulianDate.now());
//			entity.viewFrom = new Cartesian3(0,0,this.viewerWrapper.viewer.camera.position.z-entityPosition.z);
//
//			this.viewerWrapper.viewer.trackedEntity = entity;
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
			let entity = this.cTrailingEllipses[channel];
			this.viewerWrapper.viewer.zoomTo(entity, new Cesium.HeadingPitchRange(0, -Math.PI/2.0, 150.0));
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

			let entity = this.cTrailingEllipses[channel]; //.ellipse;
            //this was useful: https://groups.google.com/forum/#!topic/cesium-dev/QSFf3RxNRfE
            
	        let ray = this.viewerWrapper.camera.getPickRay(new Cartesian2(
	            Math.round(this.viewerWrapper.viewer.scene.canvas.clientWidth / 2),
	            Math.round(this.viewerWrapper.viewer.scene.canvas.clientHeight / 2)
	        ));
			let position = this.viewerWrapper.viewer.scene.globe.pick(ray, this.viewerWrapper.viewer.scene);
			let range = Cesium.Cartesian3.distance(position, this.viewerWrapper.camera.position);

			if(this.isInitialized){ //After inital zoom, follows target entity at the viewer's current height
			    this.viewerWrapper.viewer.zoomTo(entity, new Cesium.HeadingPitchRange(0, -Math.PI/2.0, range));

		    }   

			else{ //Initial zoom to entity

				this.viewerWrapper.viewer.zoomTo(entity, new Cesium.HeadingPitchRange(0, -Math.PI/2.0, 150.0));
				
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
			if (!(channel in this.tracks)) {
				this.getTrack(channel, data);
			}
		}
	};

	toggleTrack(show) {
		// show or hide the full track
		if (show){
			this.cPaths[config.xgds.follow_channel].path.trailTime = undefined;
		} else {
			this.cPaths[config.xgds.follow_channel].path.trailTime = PATH_TRAIL_TIME;
		}
	};
	
	addColor(channel, newColor) {
		if (_.isEmpty(newColor)){
			newColor = '#00FF00'; // green by default
		}
		let color = Cesium.Color.fromCssColorString('#' + newColor)
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
			
			let cvm = new Cesium.ClockViewModel(this.viewerWrapper.viewer.clock);
			cvm.startTime = start.clone();
			
			let path = this.cPaths[channel];
			if (path !== undefined){
				path.availability =  new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
			        start : start.clone(),
			        stop : stop.clone()
			    })]);
				let ellipse = this.cEllipses[channel];
				ellipse.availability =  new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
			        start : start.clone(),
			        stop : stop.clone()
			    })]);
				let ellipse2 = this.cTrailingEllipses[channel];
				ellipse2.availability =  new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
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
					this.imageMaterials[channel] = new Cesium.ImageMaterialProperty({'image': this.pointerUrl, 'transparent': true, 'color': new Cesium.CallbackProperty(function() {return context.getColor(channel);}, false)});
				} 
				material = this.imageMaterials[channel];
			} else {
				// make sure it has the color material
				if (!(channel in this.colorMaterials)){
					this.colorMaterials[channel] = new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(function(time, result) {return context.getColor(channel);}, false));
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
			property = new Cesium.SampledProperty(Number);
			property.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
			this.cHeadings[channel] = property;
		} else {
			property = this.cHeadings[channel];
		}
		
		let cdate = Cesium.JulianDate.fromIso8601(data.timestamp);
		let trailDate = Cesium.JulianDate.fromIso8601(data.timestamp);
		Cesium.JulianDate.addSeconds(cdate, TRAIL_SECONDS, trailDate);
		var radians = ((data.heading/180.0)* Math.PI);
		//TODO right now we are trailing everything
		property.addSample(trailDate, radians);
	};
	
	updateSampledPositionProperty(channel, data) {
		// update the stored cesium position
		let property = this.cSampledPositionProperties[channel];
		let trailingProperty = undefined;
		if (_.isUndefined(property)){
			property = new Cesium.SampledPositionProperty();
			property.forwardExtrapolationType = ExtrapolationType.HOLD;
			this.cSampledPositionProperties[channel] = property;
			
			trailingProperty = new Cesium.SampledPositionProperty();
			trailingProperty.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
			this.cTrailingSampledPositionProperties[channel] = trailingProperty;
		} else  {
			trailingProperty = this.cTrailingSampledPositionProperties[channel];
		}
		
		if ('lon' in data) {
			// adding a point
			let cdate = Cesium.JulianDate.fromIso8601(data.timestamp);
			let trailDate = Cesium.JulianDate.fromIso8601(data.timestamp);
			Cesium.JulianDate.addSeconds(cdate, TRAIL_SECONDS, trailDate);
			this.viewerWrapper.getRaisedPositions({longitude:data.lon, latitude:data.lat}).then(function(raisedPoint){
				property.addSample(cdate, raisedPoint[0]);
				trailingProperty.addSample(trailDate, raisedPoint[0]);
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
							julianTimes.push(Cesium.JulianDate.fromIso8601(times[t]));
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
//				let retrievedMaterial = new CallbackProperty(function(time, result) {
//					return this.getMaterial(channel);
//				}.bind(this), false);
				
//				let retrievedColor = new CallbackProperty(function(time, result) {
//					return this.getColor(channel, true);
//				}.bind(this), false);

				let headingCallback = new CallbackProperty(function(time, result) {
					if (channel in this.cHeadings){
						var value = this.cHeadings[channel].getValue(time);
						return value;
					}
					return 0;  // it won't matter because we are not rendering a texture
				}.bind(this), false);
				
				buildEllipse(this.cTrailingSampledPositionProperties[channel], Cesium.Color.TRANSPARENT, this.viewerWrapper, function(ellipse){
					this.cTrailingEllipses[channel] = ellipse;
				}.bind(this));

				buildPath(this.cSampledPositionProperties[channel], channel, this.getColor(channel, true), retrievedMaterial, channel+'_POSITION', headingCallback, this.viewerWrapper, function(builtEntities){
					this.cPaths[channel] = builtEntities['path'];
					this.cEllipses[channel] = builtEntities['ellipse'];
					builtEntities['path'].path.trailTime = PATH_TRAIL_TIME;
				}.bind(this));
				

			} else {
				this.updateSampledPositionProperty(channel, data);
				if (_.isNumber(data.heading)) {
					this.updateHeading(channel, data);
				}

			}
		}
	}; 

	getCurrentPositions() {
		let trackPKUrl = hostname + '/track/rest/position/active/json';
		let settings = {
            url: trackPKUrl,
            dataType: 'json',
            success: $.proxy(function(data) {
                if (data != null){
                    // should return dictionary of channel: position
                    for (let track_name in data){
                        let channel = this.convertTrackNameToChannel(track_name);
                        if (!(channel in this.positions) && (channel in config.xgds.ev_channels)){
                            this.updatePosition(channel, data[track_name], true);
                        }
                    }
                }
            }, this),
            error: $.proxy(function(data) {
                console.log('could not get active track position');
                console.log(data);
            })
        };
		$.ajax(xgdsAuth(settings));
	};

	getTrack(channel, data) {
		// first check if we already got it
		if (this.loadingTracks.indexOf(channel) >= 0){
			return;
		}
		this.loadingTracks.push(channel);
		if (!_.isEmpty(this.tracks[channel])){
			return;
		}

		let trackUrl =  hostname + '/xgds_map_server/rest/mapJson/basaltApp.BasaltTrack/pk:' + data.track_pk
		let settings = {
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
        };
		$.ajax(xgdsAuth(settings));

	};
}

export {TrackSSE}
