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
 * @file
 * Utilities for managing KML in Cesium
 *
 */

class KmlManager {
    /**
     * @name KmlManager
     * Singleton to bridge between the viewer and kml functionality.
     * Uses CesiumJS events.
     *
     */
    constructor(viewerWrapper) {
        /**
         * @function constructor
         * @property viewerWrapper
         * Construct and initialize
         *
         */
        this.viewerWrapper = viewerWrapper;
        this.kmlMap = {};
        this.initialize();
    };

    initialize(){
        /**
         * @function initialize
         * Initialize with kmls set up in config
         * @todo support cookies
         *
         */
        this.loadKmls(config.kml_urls);
    };

    hideKml(kmlUrl){
         /**
          * @function hideKml
          * @property kmlUrl
          * Remove a kml from the viewer's data sources (if it was loaded)
          *
          */
        if (kmlUrl in this.kmlMap){
            this.viewerWrapper.viewer.dataSources.remove(this.kmlMap(kmlUrl));
        }
    };

    showKml(kmlUrl){
        /**
         * @function showKml
         * @property kmlUrl
         * Add a kml to the viewer's data sources (if it was loaded)
         * Otherwise, load it
         *
         */

        if (kmlUrl in this.kmlMap){
            this.viewerWrapper.viewer.dataSources.add(this.kmlMap(kmlUrl));
        } else {
            this.loadKml(kmlUrl);
        }
    }

    loadKml(kmlUrl, callback) {
        /**
         * @function loadKml
         * @property kmlUrl
         * @property callback
         * Load a kml from url and add it to the viewer's data sources and the map to toggle later
         *
         */
        if (!(kmlUrl in this.kmlMap)) {
            try {
                this.viewerWrapper.viewer.dataSources.add(Cesium.KmlDataSource.load(kmlUrl, {
                        name: kmlUrl,
                        camera: this.viewerWrapper.viewer.camera,
                        canvas: this.viewerWrapper.viewer.canvas
                    })
                ).then(function (dataSource) {
                    this.kmlMap[kmlUrl] = dataSource;
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

    loadKmls(kmlUrls, callback) {
        /**
         * @function loadKmls
         * @property kmlUrls array of kml urls
         * @property callback
         * Load a many kmls from an array of urls
         *
         */
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