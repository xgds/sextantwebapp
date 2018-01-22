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
import {ElementManager} from "cesium_util/elementManager";
import {xgdsAuth} from "util/xgdsUtils";
import * as _ from "lodash";


/**
 * @file kmlManager.js
 * Utilities for managing KML in Cesium
 *
 */

/**
 * @name KmlManager extends ElementManager
 * Singleton to bridge between the viewer and kml functionality.
 *
 */
class KmlManager extends ElementManager {

    /**
     * @function getInitialElementList
     * @returns {undefined} returns the list of initial map elements to be loaded, by identifier metadata (ie url or options)
     * Initialize with kmls set up in config
     * @todo support cookies
     *
     */
    getInitialElementList(){
        return config.kml_urls;
    }

     /**
     * @function doHide
     * @param element the element to hide
     * Actually hide the element in Cesium.
     * @abstract this function must be overridden
     *
     */
    doHide(element){
        this.viewerWrapper.viewer.dataSources.remove(element);
    };

     /**
      * @function doShow
      * @param elementUrl
      * Add an element to the viewer if it was already loaded
      * Otherwise, load it and then show it.
      *
      */
    doShow(element){
        this.viewerWrapper.viewer.dataSources.add(element);
    }

     /**
     * @function load
     * @param elementUrl
     * @param callback
     * Load an element from url and add it to the viewer and the elementmap to toggle later
     *
     */
     load(elementUrl, callback) {
         if (!(elementUrl in this.elementMap)) {
             try {
                 let context = this;
                 let options = {
                     name: elementUrl,
                     camera: context.viewerWrapper.viewer.camera,
                     canvas: context.viewerWrapper.viewer.canvas
                 };

                 // load text from a URL, setting a custom header
                 let settings = {};
                 if (!elementUrl.includes(config.server.name)){
                     if (!_.isUndefined(config.xgds)) {
                         if (elementUrl.includes(config.xgds.name)) {
                             settings = xgdsAuth(settings);
                         }
                     }
                 }
                 if ('headers' in settings) {
                     Cesium.loadBlob(elementUrl, settings.headers).then(function (blob) {
                            context.viewerWrapper.viewer.dataSources.add(Cesium.KmlDataSource.load(blob, options)
                         ).then(function (dataSource) {
                             context.elementMap[elementUrl] = dataSource;
                             if (callback !== undefined) {
                                 callback(dataSource);
                             }
                         })
                     }).otherwise(function (error) {
                         console.log(error);
                         alert('Problem loading kml: ' + elementUrl);
                     });
                 } else {

                     this.viewerWrapper.viewer.dataSources.add(Cesium.KmlDataSource.load(elementUrl, options)
                     ).then(function (dataSource) {
                         context.elementMap[elementUrl] = dataSource;
                         if (callback !== undefined) {
                             callback(dataSource);
                         }
                     });
                 }
             } catch(err) {
                 console.log('Problem loading kml: ' + elementUrl);
                 console.log(err);
             }
         } else {
             console.log('kml attempted to be loaded more than once: ' + kmlUrl);
         }
     };


}

export {KmlManager}