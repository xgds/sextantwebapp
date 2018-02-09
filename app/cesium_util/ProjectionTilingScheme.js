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
import {Quadrilateral, Units} from 'cesium_util/Quadrilateral';


/**
 * A tiling scheme for geometry referenced to a {@link MapProjection}.
 *
 * @alias ProjectionTilingScheme
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {MapProjection} The map projection that will be used for this
 * tiling scheme.  Defaults to a WebMercatorProjection.
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
class ProjectionTilingScheme {

    constructor(options) {
        options = Cesium.defaultValue(options, {});

        this._ellipsoid = Cesium.defaultValue(options.ellipsoid, Cesium.Ellipsoid.WGS84);
        this._numberOfLevelZeroTilesX = Cesium.defaultValue(options.numberOfLevelZeroTilesX, 1);
        this._numberOfLevelZeroTilesY = Cesium.defaultValue(options.numberOfLevelZeroTilesY, 1);

        this._projection = options.projection;
        if (!Cesium.defined(this._projection)) {
            this._projection = new Cesium.WebMercatorProjection(this._ellipsoid);
        }

        if (Cesium.defined(options.rectangle)){
            this._rectangle = options.rectangle;
            this._rectangleSouthwestInMeters = this._projection.project(Cesium.Rectangle.southwest(options.rectangle));
            this._rectangleNortheastInMeters = this._projection.project(Cesium.Rectangle.northeast(options.rectangle));

        } else {
            if (Cesium.defined(options.rectangleSouthwestInMeters) &&
                Cesium.defined(options.rectangleNortheastInMeters)) {
                this._rectangleSouthwestInMeters = options.rectangleSouthwestInMeters;
                this._rectangleNortheastInMeters = options.rectangleNortheastInMeters;
            } else {
                let semimajorAxisTimesPi = this._ellipsoid.maximumRadius * Math.PI;
                // full bounds
                this._rectangleSouthwestInMeters = new Cesium.Cartesian2(-semimajorAxisTimesPi, -semimajorAxisTimesPi);
                this._rectangleNortheastInMeters = new Cesium.Cartesian2(semimajorAxisTimesPi, semimajorAxisTimesPi);
            }

            let southwest = this._projection.unproject(this._rectangleSouthwestInMeters);
            let northeast = this._projection.unproject(this._rectangleNortheastInMeters);
            this._rectangle = new Cesium.Rectangle(southwest.longitude, southwest.latitude,
                northeast.longitude, northeast.latitude);
        }


        Object.defineProperties(this, {
            /**
             * Gets the ellipsoid that is tiled by this tiling scheme.
             * @memberof WebMercatorTilingScheme.prototype
             * @type {Ellipsoid}
             */
            ellipsoid: {
                get: function () {
                    return this._ellipsoid;
                }
            },

            /**
             * Gets the rectangle, in radians, covered by this tiling scheme.
             * @memberof WebMercatorTilingScheme.prototype
             * @type {Rectangle}
             */
            rectangle: {
                get: function () {
                    return this._rectangle;
                }
            },

            /**
             * Gets the map projection used by this tiling scheme.
             * @memberof WebMercatorTilingScheme.prototype
             * @type {MapProjection}
             */
            projection: {
                get: function () {
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
        let projection = this._projection;
        let southwest = projection.project(Cesium.Rectangle.southwest(rectangle));
        let northeast = projection.project(Cesium.Rectangle.northeast(rectangle));

        if (!Cesium.defined(result)) {
            return new Rectangle(southwest.x, southwest.y, northeast.x, northeast.y);
        }

        result.west = southwest.x;
        result.south = southwest.y;
        result.east = northeast.x;
        result.north = northeast.y;
        return result;
    };

    /**
     * Converts tile x, y coordinates and level to a rectangle expressed in the native coordinates
     * of the tiling scheme.
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
     *          if 'result' is undefined.
     */
    tileXYToNativeRectangle(x, y, level, result) {
        let xTiles = this.getNumberOfXTilesAtLevel(level);
        let yTiles = this.getNumberOfYTilesAtLevel(level);

        let xTileWidth = (this._rectangleNortheastInMeters.x - this._rectangleSouthwestInMeters.x) / xTiles;
        let west = this._rectangleSouthwestInMeters.x + x * xTileWidth;
        let east = this._rectangleSouthwestInMeters.x + (x + 1) * xTileWidth;

        let yTileHeight = (this._rectangleNortheastInMeters.y - this._rectangleSouthwestInMeters.y) / yTiles;
        let north = this._rectangleNortheastInMeters.y - y * yTileHeight;
        let south = this._rectangleNortheastInMeters.y - (y + 1) * yTileHeight;

        if (!Cesium.defined(result)) {
            return new Cesium.Rectangle(west, south, east, north);
        }

        result.west = west;
        result.south = south;
        result.east = east;
        result.north = north;
        return result;
    };

    /**
     * Converts tile x, y coordinates and level to a cartographic rectangle in radians.
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
     *          if 'result' is undefined.
     */
    tileXYToRectangle(x, y, level, result) {
        let nativeRectangle = this.tileXYToNativeRectangle(x, y, level, result);

        let projection = this._projection;
        let southwest = projection.unproject(new Cesium.Cartesian2(nativeRectangle.west, nativeRectangle.south));
        let northeast = projection.unproject(new Cesium.Cartesian2(nativeRectangle.east, nativeRectangle.north));

        nativeRectangle.west = southwest.longitude;
        nativeRectangle.south = southwest.latitude;
        nativeRectangle.east = northeast.longitude;
        nativeRectangle.north = northeast.latitude;
        return nativeRectangle;
    };

    /**
     * Calculates the tile x, y coordinates of the tile containing
     * a given cartographic position.
     *
     * @param {Cartographic} position The position.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Cartesian2} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Cartesian2} The specified 'result', or a new object containing the tile x, y coordinates
     *          if 'result' is undefined.
     */
    positionToTileXY(position, level, result) {
        let rectangle = this._rectangle;
        if (!Cesium.Rectangle.contains(rectangle, position)) {
            // outside the bounds of the tiling scheme
            return undefined;
        }

        let xTiles = this.getNumberOfXTilesAtLevel(level);
        let yTiles = this.getNumberOfYTilesAtLevel(level);

        let overallWidth = this._rectangleNortheastInMeters.x - this._rectangleSouthwestInMeters.x;
        let xTileWidth = overallWidth / xTiles;
        let overallHeight = this._rectangleNortheastInMeters.y - this._rectangleSouthwestInMeters.y;
        let yTileHeight = overallHeight / yTiles;

        let projection = this._projection;

        let projectedPosition = projection.project(position);
        let distanceFromWest = projectedPosition.x - this._rectangleSouthwestInMeters.x;
        let distanceFromNorth = this._rectangleNortheastInMeters.y - projectedPosition.y;

        let xTileCoordinate = distanceFromWest / xTileWidth | 0;
        if (xTileCoordinate >= xTiles) {
            xTileCoordinate = xTiles - 1;
        }
        let yTileCoordinate = distanceFromNorth / yTileHeight | 0;
        if (yTileCoordinate >= yTiles) {
            yTileCoordinate = yTiles - 1;
        }

        if (!Cesium.defined(result)) {
            return new Cesium.Cartesian2(xTileCoordinate, yTileCoordinate);
        }

        result.x = xTileCoordinate;
        result.y = yTileCoordinate;
        return result;
    }
}

export {ProjectionTilingScheme}
