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
const hasSSE = ('sse' in config);

const moment = require('moment');
import {Color} from './../cesium_util/cesium_imports'
import {DynamicLines, buildCylinder, buildArrow, updatePositionHeading, buildRectangle} from './../cesium_util/cesiumlib';
import {SSE} from './sseUtils'

const hostname = config.sse.protocol + '://' + config.sse.name;
let sse = undefined;

if (hasSSE){
	sse = new SSE(hostname);
}

class TrackSSE {

	constructor(viewerWrapper) {
		this.viewerWrapper = viewerWrapper;
		this.positions = {};
		this.tracks =  {};
		this.cTracks =  {};
		this.cStopped =  {};
		this.cPosition =  {};
		this.isStopped = {};
		this.STALE_TIMEOUT= 5000;
		this.stoppedCylinderStyle = {material: Color.GRAY};
		this.getCurrentPositions();
		this.allChannels(this.subscribe, this);
		let context = this;
		setInterval(function() {context.allChannels(context.checkStale, context);}, context.STALE_TIMEOUT);
	};

	allChannels(theFunction, context){
		let channels = sse.getChannels();
		for (let i=0; i<channels.length; i++){
			let channel = channels[i];
			if (channel != 'sse') {
				theFunction(channel, context);
			}
		}
	};

	checkStale(channel, context) {
		let connected = false
		if (context.positions[channel] != undefined){
			let nowmoment =  moment();
			let diff = moment.duration(nowmoment.diff(context.positions[channel].timestamp));
			if (diff.asSeconds() <= 10) {
				connected = true;
			}
		}
		if (!connected){
			context.showDisconnected(channel);
		}
	};

	showDisconnected(channel) {
		//		console.log(channel + ' DISCONNECTED');
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

	createPosition(channel, data, nonSse){
		if (nonSse == undefined){
			nonSse = false;
		}
		// in this example we just store the data
		this.positions[channel] = data;
		this.renderPosition(channel, [data.lon, data.lat], nonSse);
		this.getTrack(channel, data);
	};

	modifyPosition(channel, data, disconnected){
		this.positions[channel] = data;
		this.renderPosition(channel, [data.lon, data.lat], disconnected);
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

	renderTrack(channel, data){
		let styleDict = {};
		if (data.color !== undefined) {
			let color = Color.fromCssColorString('#' + data.color)
			styleDict['material'] = color;
		}
		let coords = data.coords;
		if (coords.length > 0) {
			this.cTracks[channel] = new DynamicLines(this.viewerWrapper, coords[0], channel, styleDict);
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

	renderPosition(channel, data, stopped){
		return;
		if (!_.isEmpty(data)) {
			if (stopped) {
				//				if (!(channel in this.cStopped)) {
				//					buildCylinder({longitude:data[0], latitude:data[1]},
				//							5.0, 2.5, 8, channel, this.stoppedCylinderStyle, channel+'_STOPPED', this.viewerWrapper, function(entity){
				//						this.cStopped[channel] = entity;
				//					}.bind(this));
				//				} else {
				//					//update its position
				//					this.cStopped[channel].position = this.viewerWrapper.getRaisedPositions([data]);
				//				}
				//				if (channel in this.cPosition){
				//					this.viewerWrapper.viewer.scene.primitives.remove(this.cPosition[channel]);
				//					this.isStopped[channel] = true;
				//				}
			} else {
				if (!(channel in this.cPosition)) {
					buildArrow({longitude:data[0], latitude:data[1]}, 0.0,
							5.0, channel, Color.GREEN, channel+'_POSITION', this.viewerWrapper, function(entity){
						this.cPosition[channel] = entity;
					}.bind(this));
					// TODO also build active cylinder
				} else {
					if (this.isStopped[channel]){
						this.viewerWrapper.viewer.scene.primitives.add(this.cPosition[channel]);
						this.isStopped[channel] = false;
					}
					// update its position
					//updatePositionHeading(this.cPosition[channel],{longitude:data[0], latitude:data[1]}, 1.0, this.viewerWrapper);
					//this.cPosition[channel].position = this.viewerWrapper.getRaisedPositions([data]);
				}

				if(channel in this.isStopped){
					if (this.isStopped[channel]){
						this.viewerWrapper.viewer.entities.remove(this.cStopped[channel]);
						this.isStopped[channel] = false;
					}
				}
			}
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
			}, this)
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
			}, this)
		});

	};
}

export {TrackSSE}
