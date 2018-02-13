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
import {projectionManager} from "cesium_util/projectionManager";
import {patchOptionsForRemote, prefixUrl} from 'util/xgdsUtils';
import * as _ from "lodash";


/**
 * @file imageLayerManager.js
 * Utilities for managing Image Layers in Cesium
 * These are tiled image sets.
 *
 */

/**
 * @name ImageLayerManager
 * Singleton to bridge between the viewer and image layer functionality.
 *
 */
class ImageLayerManager extends ElementManager{

    /**
     * @function initialize
     * Initialize with elements set up in config
     * @todo support cookies
     *
     */
    initialize(){
        super.initialize();
        let initialElements = this.getInitialElementList();
        if (Cesium.defined(initialElements) && !_.isEmpty(initialElements)) {
            this.loadElements(initialElements);
        }
    };

    /**
     * @function getInitialElementList
     * @returns Array returns the list of initial map elements to be loaded, by identifier metadata (ie url or options)
     * Initialize with kmls set up in config
     * @todo support cookies
     *
     */
    getInitialElementList(){
        let result = [];
        if ('baseImagery' in config){
            result.push(config.baseImagery);
        }
        try {
            if ('imagery' in config.sites[config.defaultSite]) {
                result.push(config.sites[config.defaultSite].imagery);
            }
        } catch (e) {
            //ulp
        }
        return result;
    };

    /**
     * @function buildRectangle
     * Build a rectangle from bounds using the projection in the tiling scheme
     * @param tilingScheme
     * @param boundsUTM must contain minx, miny, maxx, maxy in meters
     */
    buildRectangle(tilingScheme, boundsUTM) {
        let projection = tilingScheme.projection;
        let rectangleSouthwestInMeters = new Cesium.Cartesian2(boundsUTM.minx, boundsUTM.miny);
        let rectangleNortheastInMeters = new Cesium.Cartesian2(boundsUTM.maxx, boundsUTM.maxy);

        let southwest = projection.unproject(rectangleSouthwestInMeters);
        let northeast = projection.unproject(rectangleNortheastInMeters);
        let rectangle = new Cesium.Rectangle(southwest.longitude, southwest.latitude,
            northeast.longitude, northeast.latitude);
        return rectangle;
    };

    /**
      * @function loadImageLayer
      * @param options the image layer options
      * @param show boolean to add or not
      * Build an imagery provider based on the url
      *
      */
    load(options, callback){
        let newImageryLayer = undefined;
        let newImagery = undefined;
        let theUrl = String(options.url);
        options.ellipsoid = this.viewerWrapper.ellipsoid;
        if ('wms' in options && options.wms){
            newImagery = new Cesium.WebMapServiceImageryProvider(options);
            theUrl = options.url + '/' + options.layers;
        } else if ('url' in options) {
            let resourceOptions = Object.assign({}, options);
            resourceOptions.url = prefixUrl(resourceOptions.url);
            resourceOptions = patchOptionsForRemote(resourceOptions);
            
            if (Cesium.defined(options.projectionName)) {
                let tilingScheme = projectionManager.getTilingScheme(options.projectionName, options.bounds);
                if (Cesium.defined(tilingScheme)) {
                    options.tilingScheme = tilingScheme;
                    if ('bounds' in options){
                        options.rectangle = this.buildRectangle(tilingScheme, options.bounds);
                    } else {
                        options.rectangle = tilingScheme.rectangle;
                    }
                    resourceOptions.url = resourceOptions.url + '/{z}/{x}/{y}.png';  //TODO might be reverseY, see if flipXY is passed in
                }
                options.url = new Cesium.Resource(resourceOptions);
                newImagery = new Cesium.UrlTemplateImageryProvider(options);
            } else {
                options.url = new Cesium.Resource(resourceOptions);

                let tempImagery = Cesium.createTileMapServiceImageryProvider(options);

                //TODO test
                //options.url = tempImagery.url;
                options.rectangle = tempImagery.rectangle;
                options.tilingScheme = tempImagery.tilingScheme;
                newImagery = new Cesium.UrlTemplateImageryProvider(options);
            }
        }
        if (newImagery !== undefined){
            //create new imagery layer
            // if (options.projectionName !== undefined) {
            //     newImageryLayer = new Cesium.ImageryLayer(newImagery, options);
            //     this.viewerWrapper.viewer.imageryLayers.add(newImageryLayer);
            // } else {
                newImageryLayer = this.viewerWrapper.viewer.imageryLayers.addImageryProvider(newImagery);
                if ('alpha' in options){
                    newImageryLayer.alpha = options.alpha;
                }
            //}

            // for debugging imagery providers
            //let debugImageryLayer = new Cesium.TileCoordinatesImageryProvider(options);
            //this.viewerWrapper.viewer.imageryLayers.addImageryProvider(debugImageryLayer);


            this.elementMap[theUrl] = newImageryLayer;
            if (callback !== undefined) {
                callback(newImageryLayer);
            }
        }
        return newImageryLayer;

    };

    /**
     * @function show
     * @param options
     * Show the image layer identified by options, or loads it if it was not yet loaded
     *
     */
    show(options) {
        let theUrl = undefined;
        if ('wms' in options){
            theUrl = options.url + '/' + options.layers;
        } else if ('url' in options) {
            theUrl = options.url;
        }
        if (Cesium.defined(theUrl)) {
            if (theUrl in this.elementMap){
                if (this.elementMap[theUrl].isDestroyed()) {
                    this.load(options);
                } else {
                    this.viewerWrapper.viewer.imageryLayers.add(this.elementMap[theUrl]);
                }
            } else {
                this.load(options);
            }
        } else {
            console.log('Invalid layer options.');
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

        //TODO neither of these actually work.  We have to destroy the layer.  Stupid.
        //this.viewerWrapper.viewer.imageryLayers.remove(element, false);
        //element.show = false;

        this.viewerWrapper.viewer.imageryLayers.remove(element);
    };

}

export {ImageLayerManager}