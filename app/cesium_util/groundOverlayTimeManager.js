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
                                    "timeUrl": "/xgds_map_server/overlayTime/ereachability/",
                                    "
                                    ": "/xgds_map_server/overlayTimeImage/ereachability/",
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
        let newRectangle = undefined;
        let newMaterial = undefined;
        if (options.minLon !== undefined){
            let context = this;

            let rectangle = new Cesium.Rectangle(Cesium.Math.toRadians(options.minLon),
                           Cesium.Math.toRadians(options.minLat),
                           Cesium.Math.toRadians(options.maxLon),
                           Cesium.Math.toRadians(options.maxLat));
            let singleTileImageryProvider = new Cesium.SingleTileImageryProvider({
                                                   url: getRestUrl(options.imageUrl),
                                                   rectangle: rectangle,
                                                ellipsoid: this.viewerWrapper.ellipsoid
                //proxy: new Cesium.DefaultProxy('/proxy/')
            });

             let resultDict = {'rect': singleTileImageryProvider,
                                  'material': newMaterial};

             context.elementMap[options.id] = resultDict;

            // build the material
            //TODO use CompositeMaterial property to get the value of the material at the time
            // let theImage = Cesium.loadImage(getRestUrl(options.imageUrl));
            // newMaterial = new Cesium.ImageMaterialProperty({image: theImage});
            //
            //
            // buildRectangleFromRadians(Cesium.Math.toRadians(options.minLon),
            //                Cesium.Math.toRadians(options.minLat),
            //                Cesium.Math.toRadians(options.maxLon),
            //                Cesium.Math.toRadians(options.maxLat),
            //                newMaterial, options.id, options.name, this.viewerWrapper, function(entityRectangle){
            //     newRectangle = entityRectangle;
            //     let resultDict = {'rect': newRectangle,
            //                       'material': newMaterial}
            //     context.elementMap[options.id] = resultDict;
            //     if (callback !== undefined) {
            //         callback(resultDict);
            //     }
            // });

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
                let rect = this.elementMap[id].rect;
                if (rect !== undefined){
                    rect.show = true;
                }
            } else {
                this.load(options);
            }
        } else {
            console.log('Invalid ground overlay options.');
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
        let rect = element.rect;
        if (rect !== undefined){
            rect.show = false;
        }
    };

}

export {GroundOverlayTimeManager}