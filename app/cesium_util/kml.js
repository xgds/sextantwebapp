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

import * as _ from 'lodash';
import {config} from './../../config/config_loader';
const Cesium = require('cesium/Cesium');


/**
 * @file kml.js
 * Utilities for managing KML in Cesium
 *
 */

/**
 * @name KmlManager
 * Singleton to bridge between the viewer and kml functionality.
 *
 */
class KmlManager {

    /**
     * @function constructor
     * @param viewerWrapper
     * Construct and initialize
     *
     */
    constructor(viewerWrapper) {
        this.viewerWrapper = viewerWrapper;
        this.kmlMap = {};
        this.initialize();
    };

     /**
      * @function initialize
      * Initialize with kmls set up in config
      * @todo support cookies
      *
      */
    initialize(){
        this.loadKmls(config.kml_urls);
    };

    /**
     * @function hideKml
     * @param kmlUrl
     * Remove a kml from the viewer's data sources (if it was loaded)
     *
     */
    hideKml(kmlUrl){
        if (kmlUrl in this.kmlMap){
            this.viewerWrapper.viewer.dataSources.remove(this.kmlMap[kmlUrl]);
        }
    };

     /**
      * @function showKml
      * @param kmlUrl
      * Add a kml to the viewer's data sources (if it was loaded)
      * Otherwise, load it
      *
      */
    showKml(kmlUrl){
        if (kmlUrl in this.kmlMap){
            this.viewerWrapper.viewer.dataSources.add(this.kmlMap[kmlUrl]);
        } else {
            this.loadKml(kmlUrl);
        }
    }

    /**
     * @function loadKml
     * @param kmlUrl
     * @param callback
     * Load a kml from url and add it to the viewer's data sources and the map to toggle later
     *
     */
    loadKml(kmlUrl, callback) {
        if (!(kmlUrl in this.kmlMap)) {
            try {
                let context = this;
                this.viewerWrapper.viewer.dataSources.add(Cesium.KmlDataSource.load(kmlUrl, {
                        name: kmlUrl,
                        camera: context.viewerWrapper.viewer.camera,
                        canvas: context.viewerWrapper.viewer.canvas
                    })
                ).then(function (dataSource) {
                    context.kmlMap[kmlUrl] = dataSource;
                    if (callback !== undefined) {
                        callback(dataSource);
                    }
                });
            } catch(err) {
                console.log('Problem loading kml: ' + kmlUrl);
                console.log(err);
            }
        } else {
            console.log('kml attempted to be loaded more than once: ' + kmlUrl);
        }
    };

    /**
     * @function loadKmls
     * @param kmlUrls array of kml urls
     * @param callback
     * Load a many kmls from an array of urls
     *
     */
    loadKmls(kmlUrls, callback) {
        if (!_.isEmpty(kmlUrls)) {
            console.log('Loading kml:');
            for (let i = 0; i < kmlUrls.length; i++) {
                console.log('KML Loading: ' + kmlUrls[i]);
                this.loadKml(kmlUrls[i], callback);
            }
        }
    };
}

export {KmlManager}