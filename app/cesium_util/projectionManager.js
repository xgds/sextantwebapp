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
import {config} from 'config_loader';

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

}


/**
 * @class NorthPoleStereo  Map Projection to handle north pole stereographic projections.
 *
 */
class NorthPoleStereo extends Cesium.MapProjection {

    /**
     * @function constructor
     * @param ellipsoid the ellipsoid for this projection
     */
    constructor(ellipsoid){
        super();
        this.ellipsoid = ellipsoid;
    }

    /**
     * @function getTheta internal function used when doing the projection
     * @param longitudeRadians
     * @returns {number}
     */
    getTheta(longitudeRadians){
        return longitude - (Math.PI / 2.0);
    }

    /**
     * @function getRadsAwayFromPoleForProject internal function used when doing the projection
     * @param latitudeRadians
     * @returns {number}
     */
    getRadsAwayFromPoleForProject(latitudeRadians){
        return (Math.PI / 2.0 - latitude);
    }

    /**
     * @function project Projects Cartographic coordinates, in radians, to projection-specific map coordinates, in meters.
     * @param cartographic The coordinates to project.
     * @param [result] An instance into which to copy the result. If this parameter is undefined, a new instance is created and returned.
     * @return Cartesian3
     */
    project(cartographic, result) {
        let longitude = cartographic.longitude;
        let latitude = cartographic.latitude;
        // assume Cesium is giving us good values
        // longitude = this.valid_longitude(longitude);
        // if (latitude > 90 || latitude < -90){
        //     return [NaN, NaN];
        // }

        // To radians for math functions
        longitude = longitude * Math.PI / 180.0;
        latitude = latitude * Math.PI / 180.0;
        let x, y;
        let radiansAwayFromPole = this.getRadsAwayFromPoleForProject(latitude);
        let theta = this.getTheta(longitude);
        let R = 2.0 * this.ellipsoid.radii / Math.tan((Math.PI - radiansAwayFromPole) / 2.0);
        // Special case
        if (radiansAwayFromPole == 0){
            R = 0;
        }
        x = R * Math.cos(theta);
        y = R * Math.sin(theta);

        if (result === undefined){
            result = new Cesium.Cartesian3(x,y);
        } else {
            result.x = x;
            result.y = y;
        }
        return result;
    }

    /**
     * @function getUnprojectLatitude internal function used when unprojecting
     * @param radiansAwayFromPole
     * @returns {number}
     */
    getUnprojectLatitude(radiansAwayFromPole){
        return ( Math.PI / 2.0 - radiansAwayFromPole);
        // for south: (- Math.PI / 2.0 + radiansAwayFromPole);
    }

    /**
     * @function getUnprojectLongitude  internal function used when unprojecting
     * @param y
     * @param x
     * @returns {number}
     */
    getUnprojectLongitude(y, x){
        return Math.atan2(y, x) + (Math.PI / 2.0);
        // for south:
        // longitude = Math.atan2(y, x) + ( - Math.PI / 2.0);
        // longitude = -longitude; // because this is a south pole projection

    }

    /**
     * @function unproject Unprojects projection-specific map Cartesian3 coordinates, in meters, to Cartographic coordinates, in radians.
     * @param cartesian The Cartesian position to unproject with height (z) in meters.
     * @param [result] An instance into which to copy the result. If this parameter is undefined, a new instance is created and returned.
     * @return Cartographic The unprojected coordinates. If the result parameter is not undefined, the coordinates are copied there and that instance is returned. Otherwise, a new instance is created and returned.
     */
    unproject(cartesian, result) {
        let x = cartesian.x;
        let y = cartesian.y;
        // To radians for math functions
        let longitude;
        let latitude;
        let R = Math.sqrt(x * x + y * y);
        let radiansAwayFromPole = Math.PI - 2.0 * Math.atan((2.0 * this.ellipsoid.radii) / R);
        // Special case
        if (R == 0) {
            radiansAwayFromPole = 0;
        }
        latitude = this.getUnprojectLatitude(radiansAwayFromPole);
        longitude = this.getUnprojectLongitude(y, x);

        // Back to degrees
        longitude *= 180.0 / Math.PI;
        latitude *= 180.0 / Math.PI;

        if (result === undefined){
            result = new Cesium.Cartographic(longitude, latitude);
        } else {
            result.longitude = longitude;
            result.latitude = latitude;
        }
        return result;
    }
}

class SouthPoleStereo extends NorthPoleStereo {


    /**
     * @function getTheta internal function used when doing the projection
     * @param longitudeRadians
     * @returns {number}
     */
    getTheta(longitudeRadians){
        return longitude - ( - Math.PI / 2.0);
    }

    /**
     * @function getRadsAwayFromPoleForProject internal function used when doing the projection
     * @param latitudeRadians
     * @returns {number}
     */
    getRadsAwayFromPoleForProject(latitudeRadians){
        return (Math.PI / 2.0 + latitude);
    }

    /**
     * @function getUnprojectLatitude internal function used when unprojecting
     * @param radiansAwayFromPole
     * @returns {number}
     */
    getUnprojectLatitude(radiansAwayFromPole){
        return (- Math.PI / 2.0 + radiansAwayFromPole);
    }

    /**
     * @function getUnprojectLongitude  internal function used when unprojecting
     * @param y
     * @param x
     * @returns {number}
     */
    getUnprojectLongitude(y, x){
        let longitude = Math.atan2(y, x) + ( - Math.PI / 2.0);
        longitude = -longitude; // because this is a south pole projection
        return longitude;

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