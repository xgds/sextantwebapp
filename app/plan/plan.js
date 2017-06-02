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
import {Color} from './../cesium_util/cesium_imports'
import {DynamicLines, buildLineString} from './../cesium_util/cesiumlib';
import {config} from './../../config/config_loader';

const hostname = config.sse.protocol + '://' + config.sse.name;

class PlanManager {
	
	constructor(viewerWrapper) {
		this.plan = undefined;
		this.viewerWrapper = viewerWrapper;
		this.elements = {};
		this.segmentStyle = {'material':Color.ORANGE}
		this.fetchXGDSPlan();
	};
	
	clearPlan() {
		let keys = Object.keys(this.elements);
		keys.forEach(function(key){
			let entity = this.elements[key];
			this.viewerWrapper.viewer.entities.remove(entity);
		}, this);
		this.plan = undefined;
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
		let context = this;
		if (!_.isEmpty(segment.geometry.coordinates)) {
			buildLineString(segment.geometry.coordinates, this.segmentStyle, this.viewerWrapper, function(entity){
				context.elements[segment.id] = entity;
				}, this);
		} else {
			// no sextant path, just show straight line ...
			let stationCoordinates = [lastStation.geometry.coordinates, nextStation.geometry.coordinates];
			buildLineString(stationCoordinates, this.segmentStyle, this.viewerWrapper, function(entity){
				context.elements[segment.id] = entity;
			}, this);
		}
	};
	
	renderStation(station){
		return undefined;
	}
	
}

export {PlanManager}