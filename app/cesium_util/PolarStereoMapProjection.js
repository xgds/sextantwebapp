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

const HALF_PI = Math.PI/2.0;
const TWICE_PI = Math.PI*2.0;

/**
 * @class NorthPoleStereo  Map Projection to handle north pole stereographic projections.
 *
 */
class NorthPoleStereo {

    /**
     * @function constructor
     * @param ellipsoid the ellipsoid for this projection
     */
    constructor(ellipsoid){
        this.ellipsoid = ellipsoid;
    }


    /**
     * @function getTheta internal function used when doing the projection
     * @param longitudeRadians
     * @returns {number}
     */
    getTheta(longitudeRadians){
        return longitudeRadians - HALF_PI;
    }

    /**
     * @function getRadsAwayFromPoleForProject internal function used when doing the projection
     * @param latitudeRadians
     * @returns {number}
     */
    getRadsAwayFromPoleForProject(latitudeRadians){
        return (HALF_PI - latitudeRadians);
    }

    /**
     * Correct longitude if it has wrapped over to be between -PI and PI
     * @param lon
     * @returns {*}
     */
    fixLongitude(lon) {
        while (lon > Math.PI) lon -= TWICE_PI;
        while (lon < -Math.PI) lon += TWICE_PI;
        return lon;
    }

    /**
     * @function project Projects Cartographic coordinates, in RADIANS, to projection-specific map coordinates, in meters.
     * @param cartographic The coordinates to project.
     * @param [result] An instance into which to copy the result. If this parameter is undefined, a new instance is created and returned.
     * @return Cartesian3
     */
    project(cartographic, result) {
        let longitude = cartographic.longitude;
        let latitude = cartographic.latitude;

        longitude = this.fixLongitude(longitude);
        if (latitude > HALF_PI || latitude < -HALF_PI){
            console.log('BAD LATITUDE VALUE: ' + latitude);
            //TODO throw exception
            return Cesium.Cartesian3.ZERO;
        }

        let x, y;
        let radiansAwayFromPole = this.getRadsAwayFromPoleForProject(latitude);
        let theta = this.getTheta(longitude);
        let R = 2.0 * this.ellipsoid.maximumRadius / Math.tan((Math.PI - radiansAwayFromPole) / 2.0);
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
        return ( HALF_PI - radiansAwayFromPole);
    }

    /**
     * @function getUnprojectLongitude  internal function used when unprojecting
     * @param y
     * @param x
     * @returns {number}
     */
    getUnprojectLongitude(y, x){
        return Math.atan2(y, x) + HALF_PI;
    }


    /**
     * @function unproject Unprojects projection-specific map Cartesian3 coordinates, in meters,
     * to Cartographic coordinates, in RADIANS.
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
        let radiansAwayFromPole = Math.PI - 2.0 * Math.atan((2.0 * this.ellipsoid.maximumRadius) / R);
        // Special case
        if (R == 0) {
            radiansAwayFromPole = 0;
        }
        latitude = this.getUnprojectLatitude(radiansAwayFromPole);
        longitude = this.getUnprojectLongitude(y, x);

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
        return longitudeRadians - ( - HALF_PI);
    }

    /**
     * @function getRadsAwayFromPoleForProject internal function used when doing the projection
     * @param latitudeRadians
     * @returns {number}
     */
    getRadsAwayFromPoleForProject(latitudeRadians){
        return (HALF_PI + latitudeRadians);
    }

    /**
     * @function getUnprojectLatitude internal function used when unprojecting
     * @param radiansAwayFromPole
     * @returns {number}
     */
    getUnprojectLatitude(radiansAwayFromPole){
        return (-HALF_PI + radiansAwayFromPole);
    }

    /**
     * @function getUnprojectLongitude  internal function used when unprojecting
     * @param y
     * @param x
     * @returns {number}
     */
    getUnprojectLongitude(y, x){
        let longitude = Math.atan2(y, x) + ( - HALF_PI);
        longitude = -longitude; // because this is a south pole projection
        return longitude;

    }
}

export {NorthPoleStereo, SouthPoleStereo}