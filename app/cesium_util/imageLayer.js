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
const Cesium = require('cesium/Cesium');
const url = require('url');

/**
 * @file imageLayer.js
 * Utilities for managing Image Layers in Cesium
 * These are tiled image sets.
 *
 */

/**
 * @name ImageLayerManager
 * Singleton to bridge between the viewer and image layer functionality.
 *
 */
class ImageLayerManager {

    /**
     * @function constructor
     * @param viewerWrapper
     * Construct and initialize
     *
     */
    constructor(viewerWrapper) {
        this.viewerWrapper = viewerWrapper;
        this.layerMap = {};
        this.initialize();
    };

    /**
      * @function initialize
      * Initialize with image layers set up in config
      * @todo support cookies
      *
      */
    initialize(){
        if ('baseImagery' in config){
            this.viewerWrapper.viewer.imageryProvider = this.loadImageLayer(config.baseImagery, 0);
        }
        try {
            if ('imagery' in config.sites[config.defaultSite]) {
                this.loadImageLayer(config.sites[config.defaultSite].imagery);
            }
        } catch (e) {
            //ulp
        }
    };

    /**
      * @function loadImageLayer
      * @param options the image layer options
      * @param show boolean to add or not
      * Build an imagery provider based on the url
      *
      */
    loadImageLayer(options, index){
        let newImageryLayer = undefined;
        let newImagery = undefined;
        let theUrl = undefined;
        if ('url' in options) {
            const test = url.parse(options.url);
            if (test.hostname === null) {
                try {
                    options.url = config.urlPrefix + options.url;
                    console.log('Loading imagery from: ' + options.url);
                } catch (e) {
                    console.log(e);
                }
            }
            newImagery = Cesium.createTileMapServiceImageryProvider(options);
            theUrl = options.url;
        } else if ('wms' in options){
            newImagery = new Cesium.WebMapServiceImageryProvider(options.wms);
            theUrl = options.wms;
        }
        if (newImagery !== undefined){
            newImageryLayer = this.viewerWrapper.viewer.imageryLayers.addImageryProvider(newImagery, index);
            this.layerMap[theUrl] = newImageryLayer;
        }
        return newImageryLayer;

    };

    /**
     * @function showImageLayer
     * @param options
     * Show the image layer identified by options, or loads it if it was not yet loaded
     *
     */
    showImageLayer(options) {
        let theUrl = undefined;
        if ('url' in options) {
            theUrl = options.url;
        } else if ('wms' in options){
            theUrl = options.wms;
        }
        if (theUrl !== undefined) {
            if (theUrl in this.layerMap){
                this.layerMap[theUrl].show = true;
            } else {
                this.loadImageLayer(options);
            }
        } else {
            console.log('Invalid layer options.');
            console.log(options);
        }
    };

    /**
     * @function hideImageLayer
     * @param imageLayerUrl
     * Hide the image layer
     *
     */
    hideImageLayer(imageLayerUrl){
        if (imageLayerUrl in this.layerMap){
            this.layerMap[imageLayerUrl].show = false;
        }
    };

}

export {ImageLayerManager}