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
const Cesium = require('cesium/Cesium');
const url = require('url');
import {ElementManager} from "cesium_util/elementManager";
import {buildRectangle, buildRectangleFromRadians} from "cesium_util/cesiumlib";
import {getRestUrl} from 'util/xgdsUtils';
import {projectionManager} from "cesium_util/projectionManager";
import {SingleTileTimeImageryProvider} from "cesium_util/SingleTileTimeImageryProvider";
import {buildTimeIntervalCollection} from "cesium_util/TimeUtils";
import {patchOptionsForRemote, prefixUrl} from 'util/xgdsUtils';


import * as _ from "lodash";


/**
 * @file groundOverlayTimeManager.js
 * Utilities for managing Ground Overlays with time in Cesium
 * These are images within bounding rectangles.
 *
 */

/**
 * @name GroundOverlayTimeManager
 * Singleton to bridge between the viewer and ground overlay time functionality.
 *
 */
class GroundOverlayTimeManager extends ElementManager{

    /**
     * @function load
     * @param options the ground overlay time options
     * "options": {
                                    "maxLon": 48.273283,
                                    "end": "2020-10-01T14:00:00Z",
                                    "minLon": 12.197847,
                                    "minLat": 86.565344,
                                    "timeUrl": "/xgds_map_server/overlayTime/ereachability/{Time}",
                                    ": "/xgds_map_server/overlayTimeImage/ereachability/{Time}",
                                    "interval": 7200.0,
                                    "start": "2020-09-22T14:00:00Z",
                                    "maxLat": 87.108042,
                                    "transparency": 50,
                                    "id": "ereachability",
                                    "name": "Reachability"
                                }
     *
     */
    load(options, callback){
        let newImageryLayer = undefined;
        let newImagery = undefined;
        options.ellipsoid = this.viewerWrapper.ellipsoid;
        options.clock = this.viewerWrapper.clock;
        if (Cesium.defined(options.start) && Cesium.defined(options.end)) {
            //TODO this will call the server for every single tick.
            // instead support intervals, do we really need to iterate through each?
            // options.times = new Cesium.TimeInterval({
            //     start: Cesium.JulianDate.fromIso8601(options.start),
            //     stop: Cesium.JulianDate.fromIso8601(options.end)
            // });
            options.times = buildTimeIntervalCollection(options.start, options.end, options.interval);
        }
        if (Cesium.defined(options.minLon)){
            let context = this;

            let rectangle = new Cesium.Rectangle(Cesium.Math.toRadians(options.minLon),
                Cesium.Math.toRadians(options.minLat),
                Cesium.Math.toRadians(options.maxLon),
                Cesium.Math.toRadians(options.maxLat));

            let resourceOptions = Object.assign({}, options);
            resourceOptions.url = prefixUrl(resourceOptions.url);
            resourceOptions = patchOptionsForRemote(resourceOptions);
            options.url = new Cesium.Resource(resourceOptions);
            if (options.projectionName !== undefined) {
                options.tilingScheme = projectionManager.getTilingScheme(options.projectionName, options.bounds);
            }


            newImagery = new SingleTileTimeImageryProvider(options);
            if (newImagery !== undefined){
                newImageryLayer = this.viewerWrapper.viewer.imageryLayers.addImageryProvider(newImagery);
                if ('alpha' in options){
                   newImageryLayer.alpha = options.alpha;
                }
                this.elementMap[options.id] = newImageryLayer;
                if (callback !== undefined) {
                    callback(newImageryLayer);
                }
            }
            return newImageryLayer;
        }
    };

    /**
     * @function show
     * @param options
     * Show the image layer identified by options, or loads it if it was not yet loaded
     *
     */
    show(options) {
        let id = options.id;

        if (id !== undefined) {
            if (id in this.elementMap){
                if (this.elementMap[id].isDestroyed()) {
                    this.load(options);
                } else {
                    this.viewerWrapper.viewer.imageryLayers.add(this.elementMap[id]);
                }
            } else {
                this.load(options);
            }
        } else {
            console.log('Invalid ground overlay options; id required.');
            console.log(options);
        }
    };

    /**
     * @function doHide
     * @param element
     * Hide the image layer
     *
     */
    doHide(element){
        this.viewerWrapper.viewer.imageryLayers.remove(element);
    };

}

export {GroundOverlayTimeManager}