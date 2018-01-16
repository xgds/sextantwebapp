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
        if (initialElements !== undefined && !_.isEmpty(initialElements)) {
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
    }

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
        let theUrl = undefined;
        options.ellipsoid = this.viewerWrapper.ellipsoid;
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
            if (!options.url.includes(config.server.name)){
                if (!_.isUndefined(config.xgds)) {
                    if (!options.url.includes(config.xgds.name)) {
                        options.proxy = new Cesium.DefaultProxy('/proxy/');
                    }
                }  else {
                    options.proxy = new Cesium.DefaultProxy('/proxy/');
                }
            }
            if (options.projectionName !== undefined) {
                let tilingScheme = projectionManager.getTilingScheme(options.projectionName, options.bounds);
                if (tilingScheme !== undefined) {
                    options.tilingScheme = tilingScheme;
                    options.rectangle = tilingScheme.rectangle;
                    options.url = options.url + '/{z}/{x}/{y}.png';
                }
                newImagery = new Cesium.UrlTemplateImageryProvider(options);

            } else {
                newImagery = Cesium.createTileMapServiceImageryProvider(options);
            }
            theUrl = options.url;

        } else if ('wms' in options){
            newImagery = new Cesium.WebMapServiceImageryProvider(options.wms);
            theUrl = options.wms;
        }
        if (newImagery !== undefined){
            newImageryLayer = this.viewerWrapper.viewer.imageryLayers.addImageryProvider(newImagery);
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
        if ('url' in options) {
            theUrl = options.url;
        } else if ('wms' in options){
            theUrl = options.wms;
        }
        if (theUrl !== undefined) {
            if (theUrl in this.elementMap){
                this.elementMap[theUrl].show = true;
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
        element.show = false;
    };

}

export {ImageLayerManager}