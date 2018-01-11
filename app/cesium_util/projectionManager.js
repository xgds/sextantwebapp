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
        let nps = new NorthPoleStereo(this.ellipsoid);
        this.add('NP_STEREO', nps);
        //this.add('SP_STEREO', new SouthPoleStereo(this.ellipsoid));
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
           console.log(boundsUTM);
           rectangleSouthwestInMeters = new Cesium.Cartesian2(boundsUTM.minx, boundsUTM.miny);
           rectangleNortheastInMeters = new Cesium.Cartesian2(boundsUTM.maxx, boundsUTM.maxy);

            let theMin = projection.unproject(rectangleSouthwestInMeters);
            let theMax = projection.unproject(rectangleNortheastInMeters);
            console.log('min');
            console.log(theMin);
            console.log('max');
            console.log(theMax);

           // the real one
           console.log("REAL ONE");
           let theRealOne = {topLeft: [24.070617695061806,87.90173269295278],
                         topRight: [49.598705282838125,87.04553528415659],
                         bottomRight:[34.373553362965566,86.015550572534],
                         bottomLeft: [14.570663006937881,86.60174704052636]};
           console.log(theRealOne);

           // console.log('bottomleft');
           // console.log(Cesium.Math.toRadians(theRealOne.bottomLeft[0]));
           // console.log(Cesium.Math.toRadians(theRealOne.bottomLeft[1]));
           // console.log('topright');
           // console.log(Cesium.Math.toRadians(theRealOne.topRight[0]));
           // console.log(Cesium.Math.toRadians(theRealOne.topRight[1]));

           let realMin = projection.project(new Cesium.Cartographic(theRealOne.bottomLeft[0], theRealOne.bottomLeft[1]));
           let realMax = projection.project(new Cesium.Cartographic(theRealOne.topRight[0], theRealOne.topRight[1]));
           console.log('realMin');
           console.log(realMin);
           console.log('realMax');
           console.log(realMax);

           //rectangle = new Cesium.Rectangle(theMin.longitude, theMin.latitude, theMax.longitude, theMax.latitude);
           // TODO hardcoded for now
           // rectangle = new Cesium.Rectangle(Cesium.Math.toRadians(theRealOne.bottomLeft[0]),
           //     Cesium.Math.toRadians(theRealOne.bottomLeft[1]),
           //     Cesium.Math.toRadians(theRealOne.topRight[0]),
           //     Cesium.Math.toRadians(theRealOne.topRight[1]));
           // rectangle = new Cesium.Rectangle(theRealOne.bottomLeft[0],
           //     theRealOne.bottomLeft[1],
           //     theRealOne.topRight[0],
           //     theRealOne.topRight[1]);
       }

       let options = {ellipsoid:this.ellipsoid,
                      //rectangle:rectangle,
                      projection: projection,
                      rectangleSouthwestInMeters: rectangleSouthwestInMeters,
                      rectangleNortheastInMeters: rectangleNortheastInMeters
       };
       return new ProjectionTilingScheme(options);
       /*if (key.includes('POLAR')){
           return new PolarTilingScheme(options);
       } else {
           return new ProjectionTilingScheme(options);
       }*/
    }

}

/**
 * A tiling scheme for geometry referenced to a Polar Stereographic Projection.
 *
 * @alias PolarStereoTilingScheme
 */
class PolarStereoTilingScheme {

    /**
     *  @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid whose surface is being tiled. Defaults to
     * the WGS84 ellipsoid.
     * @param {Number} [options.numberOfLevelZeroTilesX=1] The number of tiles in the X direction at level zero of
     *        the tile tree.
     * @param {Number} [options.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
     *        the tile tree.
     * @param {Cartesian2} [options.rectangleSouthwestInMeters] The southwest corner of the rectangle covered by the
     *        tiling scheme, in meters.  If this parameter or rectangleNortheastInMeters is not specified, the entire
     *        globe is covered in the longitude direction and an equal distance is covered in the latitude
     *        direction, resulting in a square projection.
     * @param {Cartesian2} [options.rectangleNortheastInMeters] The northeast corner of the rectangle covered by the
     *        tiling scheme, in meters.  If this parameter or rectangleSouthwestInMeters is not specified, the entire
     *        globe is covered in the longitude direction and an equal distance is covered in the latitude
     *        direction, resulting in a square projection.
     */
    constructor(options){
        this._ellipsoid = Cesium.defaultValue(options.ellipsoid, Cesium.Ellipsoid.WGS84);
        this._rectangle = options.rectangle;
        this._projection = options.projection;
        this._numberOfLevelZeroTilesX = Cesium.defaultValue(options.numberOfLevelZeroTilesX, 1);
        this._numberOfLevelZeroTilesY = Cesium.defaultValue(options.numberOfLevelZeroTilesY, 1);

        if (!_.isUndefined(options.rectangleSouthwestInMeters) &&
            !_.isUndefined(options.rectangleNortheastInMeters)) {
            this._rectangleSouthwestInMeters = options.rectangleSouthwestInMeters;
            this._rectangleNortheastInMeters = options.rectangleNortheastInMeters;
        } else {
            let semimajorAxisTimesPi = this._ellipsoid.maximumRadius * Math.PI;
            this._rectangleSouthwestInMeters = new Cesium.Cartesian2(-semimajorAxisTimesPi, -semimajorAxisTimesPi);
            this._rectangleNortheastInMeters = new Cesium.Cartesian2(semimajorAxisTimesPi, semimajorAxisTimesPi);
        }

        let southwest = this._projection.unproject(this._rectangleSouthwestInMeters);
        let northeast = this._projection.unproject(this._rectangleNortheastInMeters);
        this._rectangle = new Cesium.Rectangle(southwest.longitude, southwest.latitude,
            northeast.longitude, northeast.latitude);

        object.defineProperties(this, {
            /**
             * Gets the ellipsoid that is tiled by this tiling scheme.
             * @memberof PolarTilingScheme.prototype
             * @type {Ellipsoid}
             */
            ellipsoid : {
                get : function() {
                    return this._ellipsoid;
                }
            },

            /**
             * Gets the rectangle, in radians, covered by this tiling scheme.
             * @memberof PolarTilingScheme.prototype
             * @type {Rectangle}
             */
            rectangle : {
                get : function() {
                    return this._rectangle;
                }
            },

            /**
             * Gets the map projection used by this tiling scheme.
             * @memberof PolarTilingScheme.prototype
             * @type {MapProjection}
             */
            projection : {
                get : function() {
                    return this._projection;
                }
            }
        });
    }

    /**
     * Gets the total number of tiles in the X direction at a specified level-of-detail.
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the X direction at the given level.
     */
    getNumberOfXTilesAtLevel(level) {
        return this._numberOfLevelZeroTilesX << level;
    };

    /**
     * Gets the total number of tiles in the Y direction at a specified level-of-detail.
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the Y direction at the given level.
     */
    getNumberOfYTilesAtLevel(level) {
        return this._numberOfLevelZeroTilesY << level;
    };

    /**
     * Transforms a rectangle specified in geodetic radians to the native coordinate system
     * of this tiling scheme.
     *
     * @param {Rectangle} rectangle The rectangle to transform.
     * @param {Rectangle} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Rectangle} The specified 'result', or a new object containing the native rectangle if 'result'
     *          is undefined.
     */
    rectangleToNativeRectangle(rectangle, result) {
        let southwest = this._projection.project(Cesium.Rectangle.southwest(rectangle));
        let northeast = this._projection.project(Cesium.Rectangle.northeast(rectangle));

        if (!defined(result)) {
            return new Cesium.Rectangle(southwest.x, southwest.y, northeast.x, northeast.y);
        }

        result.west = southwest.x;
        result.south = southwest.y;
        result.east = northeast.x;
        result.north = northeast.y;
        return result;
    };
}

/**
 * A tiling scheme for geometry referenced to a custom projection where
 * longitude and latitude are directly mapped to X and Y.
 *
 */
class ProjectionTilingScheme extends Cesium.WebMercatorTilingScheme {

    /**
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid whose surface is being tiled. Defaults to
     * the WGS84 ellipsoid.
     * @param {Projection} The MapProjection to be used by the tiling scheme
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the tiling scheme.
     * @param {Number} [options.numberOfLevelZeroTilesX=2] The number of tiles in the X direction at level zero of
     * the tile tree.
     * @param {Number} [options.numberOfLevelZeroTilesY=1] The number of tiles in the Y direction at level zero of
     * the tile tree.
     */
    constructor(options){
        super(options);
        this._projection = options.projection;

        this._numberOfLevelZeroTilesX = Cesium.defaultValue(options.numberOfLevelZeroTilesX, 1);

        // the base class used the web mercator projection to figure out the rectangle.  Redo that work.
        let southwest = this._projection.unproject(options.rectangleSouthwestInMeters);
        let northeast = this._projection.unproject(options.rectangleNortheastInMeters);
        this._rectangle = new Cesium.Rectangle(southwest.longitude, southwest.latitude,
            northeast.longitude, northeast.latitude);
        console.log('projection rectangle in radians');
        console.log(this._rectangle);
    }


}


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
        return longitudeRadians - (Math.PI / 2.0);
    }

    /**
     * @function getRadsAwayFromPoleForProject internal function used when doing the projection
     * @param latitudeRadians
     * @returns {number}
     */
    getRadsAwayFromPoleForProject(latitudeRadians){
        return (Math.PI / 2.0 - latitudeRadians);
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
        // assume Cesium is giving us good values
        // longitude = this.valid_longitude(longitude);
        // if (latitude > 90 || latitude < -90){
        //     return [NaN, NaN];
        // }

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
        return ( Math.PI / 2.0 - radiansAwayFromPole);
    }

    /**
     * @function getUnprojectLongitude  internal function used when unprojecting
     * @param y
     * @param x
     * @returns {number}
     */
    getUnprojectLongitude(y, x){
        return Math.atan2(y, x) + (Math.PI / 2.0);
    }

    /**
     * @function unprojectToRadians Do the unprojection function for this projection and return the result as an object,
     * with values in radians
     *
     * @param cartesian
     * @returns {{latitude: number|*, longitude: number|*}}
     */
    unprojectToRadians(cartesian){
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
        return {latitude:latitude,
                longitude:longitude}
    }

    /**
     * @function unproject Unprojects projection-specific map Cartesian3 coordinates, in meters,
     * to Cartographic coordinates, in RADIANS.
     * @param cartesian The Cartesian position to unproject with height (z) in meters.
     * @param [result] An instance into which to copy the result. If this parameter is undefined, a new instance is created and returned.
     * @return Cartographic The unprojected coordinates. If the result parameter is not undefined, the coordinates are copied there and that instance is returned. Otherwise, a new instance is created and returned.
     */
    unproject(cartesian, result) {

        let radiansResult = this.unprojectToRadians(cartesian);

        if (result === undefined){
            result = new Cesium.Cartographic(radiansResult.longitude, radiansResult.latitude);
        } else {
            result.longitude = radiansResult.longitude;
            result.latitude = radiansResult.latitude;
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
        return longitudeRadians - ( - Math.PI / 2.0);
    }

    /**
     * @function getRadsAwayFromPoleForProject internal function used when doing the projection
     * @param latitudeRadians
     * @returns {number}
     */
    getRadsAwayFromPoleForProject(latitudeRadians){
        return (Math.PI / 2.0 + latitudeRadians);
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