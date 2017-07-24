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
import {DynamicLines, buildCylinder, buildArrow, updatePositionHeading, buildRectangle, buildPositionDataSource} from './../cesium_util/cesiumlib';
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
		this.colors = {'gray': Color.GRAY.withAlpha(0.75)};
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
			let nowmoment =  moment().utc();
			let diff = moment.duration(nowmoment.diff(moment(context.positions[channel].timestamp)));
			if (diff.asSeconds() <= 10) {
				connected = true;
			}
		}
		if (!connected){
			context.showDisconnected(channel);
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

	createPosition(channel, data, nonSse){
		if (nonSse == undefined){
			nonSse = false;
		}
		// in this example we just store the data
		this.positions[channel] = data;
		this.renderPosition(channel, data, nonSse);
		this.getTrack(channel, data);
	};

	modifyPosition(channel, data, disconnected){
		this.positions[channel] = data;
		//data.heading = (Math.random() * (360.0)); //TODO testing heading, delete
		data.heading = (Math.random() * (2* Math.PI)); //TODO testing heading, delete
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

	renderTrack(channel, data){
		let styleDict = {};
		if (data.color !== undefined) {
			let color = Color.fromCssColorString('#' + data.color)
			styleDict['material'] = color;
			// make a translucent one
			let cclone = color.clone().withAlpha(0.25);
			this.colors[channel] = cclone;
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
	
	getLatestPosition(channel) {
		if (channel in this.positions) {
			return {'longitude':this.positions[channel].lon, 'latitude':this.positions[channel].lat};
		}
		return undefined;
	};

	renderPosition(channel, data, stopped){
		if (!(channel in this.cPosition)) {
			let color = Color.GREEN;
			if (channel in this.colors){
				color = this.colors[channel];
			}

			if (!_.isEmpty(data)){
				buildPositionDataSource({longitude:data.lon, latitude:data.lat}, data.heading,
						channel, color, channel+'_POSITION', this.getLatestPosition, this, this.viewerWrapper, function(dataSource){
						this.cPosition[channel] = dataSource;
				}.bind(this));
			}
		} else {
			let dataSource = this.cPosition[channel];
			let pointEntity = dataSource.entities.values[0];
			
			if (stopped){
				let color = this.colors['gray'];
				if (pointEntity.ellipse.material.color != color){
					pointEntity.ellipse.material.color = color;
				}
				return;
			}
			
			// update it
			this.viewerWrapper.getRaisedPositions({longitude:data.lon, latitude:data.lat}).then(function(raisedPoint) {
				pointEntity.position.setValue(raisedPoint[0]);
				let hasHeading = (data.heading !== "");
				if (hasHeading) {
					pointEntity.orientation.setValue(data.heading);
					pointEntity.ellipse.show = false;
					pointEntity.polygon.show = true;
				} else {
					pointEntity.ellipse.show = true;
					pointEntity.polygon.show = false;
				} 
				
				let color = Color.GREEN;
				if (channel in this.colors){
					color = this.colors[channel];
				}
				if (pointEntity.ellipse.material.color != color){
					pointEntity.ellipse.material.color = color;
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
