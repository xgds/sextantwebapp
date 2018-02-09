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

const Cesium = require('cesium/Cesium');
import * as _ from 'lodash';

import {config} from 'config_loader';
import {QuadrilateralTilingScheme} from "cesium_util/QuadrilateralTilingScheme";
import {NorthPoleStereo, SouthPoleStereo} from "cesium_util/PolarStereoMapProjection";

/**
 * @file projectionManager.js
 * Utilities for managing projections in Cesium
 *
 */

/**
 * @name ProjectionManager
 * Singleton to manage Cesium projections
 *
 */
class ProjectionManager {

    /**
     * @function constructor
     *
     */
    constructor(ellipsoid) {
        this.ellipsoid = ellipsoid;
        this.projectionMap = {}; // map to store projections
        this.initialize();
    }

    /**
     * @function initialize
     * Set up the default projections
     */
    initialize() {
        this.add('NP_STEREO', new NorthPoleStereo(this.ellipsoid));
        this.add('SP_STEREO', new SouthPoleStereo(this.ellipsoid));
    }

    /**
     * @function add  Adds a projection to the projection manager
     * @param key the key for the projection
     * @param projection the MapProjection
     */
    add(key, projection){
        this.projectionMap[key] = projection;
    }

    /**
     * @function remove Removes a projection from the projection manager
     * @param key
     */
    remove(key){
        this.projectionMap.delete(key);
    }

    /**
     * @function get Retrieves a projection from the projection manager
     * @param key
     * @returns {*} The projection, or undefined
     */
    get(key){
        return this.projectionMap[key];
    }

    /**
     * @function getTilingScheme Creates and returns a tiling scheme given the projection defined by key and the bounds
     * defined by rectangle.
     * @param key
     * @param rectangle
     * @return Cesium.TilingScheme, or undefined
     */
    getTilingScheme(key, boundsUTM){
       let projection = this.get(key);
       if (projection === undefined){
           return undefined;
       }
       let rectangle = undefined;
       let rectangleSouthwestInMeters = undefined;
       let rectangleNortheastInMeters = undefined;
       if (boundsUTM !== undefined){
           rectangleSouthwestInMeters = new Cesium.Cartesian2(boundsUTM.minx, boundsUTM.miny);
           rectangleNortheastInMeters = new Cesium.Cartesian2(boundsUTM.maxx, boundsUTM.maxy);

            //let theMin = projection.unproject(rectangleSouthwestInMeters);
            //let theMax = projection.unproject(rectangleNortheastInMeters);

           //rectangle = new Cesium.Rectangle(theMin.longitude, theMin.latitude, theMax.longitude, theMax.latitude);
       } else {
           //TODO handle
       }

       let options = {ellipsoid:this.ellipsoid,
                      rectangle: rectangle,
                      projection: projection,
                      rectangleSouthwestInMeters: rectangleSouthwestInMeters,
                      rectangleNortheastInMeters: rectangleNortheastInMeters
       };
       return new QuadrilateralTilingScheme(options);
    }

}







let ellipsoid = Cesium.Ellipsoid.WGS84;
if ('ellipsoid' in config){
    if (config.ellipsoid == 'MOON') {
        ellipsoid = Cesium.Ellipsoid.MOON;
    }
}

let projectionManager = new ProjectionManager(ellipsoid);
export {projectionManager}