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
import {Quadrilateral, Units, Hit} from 'cesium_util/Quadrilateral';
import {ProjectionTilingScheme} from "cesium_util/ProjectionTilingScheme";

class QuadrilateralTilingScheme extends ProjectionTilingScheme {

    constructor(options) {
        super(options);

        this._imageryBounds = this.rectangleToQuadrilateral();

        if (Cesium.defined(options.rectangleSouthwestInMeters) &&
            Cesium.defined(options.rectangleNortheastInMeters)){
            let points = [];
            points.push([options.rectangleSouthwestInMeters.x, options.rectangleSouthwestInMeters.y]);
            points.push([options.rectangleSouthwestInMeters.x, options.rectangleNortheastInMeters.y]);
            points.push([options.rectangleNortheastInMeters.x, options.rectangleNortheastInMeters.y]);
            points.push([options.rectangleNortheastInMeters.x, options.rectangleSouthwestInMeters.y]);
            this._imageryBoundsInMeters = new Quadrilateral({points:points, units:Units.METERS});
        } else {

            this._imageryBoundsInMeters = this.quadrilateralToNativeQuadrilateral(this._imageryBounds);
        }

        this.enlargeRectangle();

         Object.defineProperties(this, {
             /**
              * Gets the Imagery Bounds that is tiled by this tiling scheme.
              * @memberof QuadrilateralTilingScheme.prototype
              * @type {Quadrilateral} with radians units
              */
             imageryBounds: {
                 get: function () {
                     return this._imageryBounds;
                 }
             },

             /**
              * Gets the Imagery Bounds that is tiled by this tiling scheme.
              * @memberof QuadrilateralTilingScheme.prototype
              * @type {Quadrilateral} with meters units
              */
             imageryBoundsInMeters: {
                 get: function () {
                     return this._imageryBoundsInMeters;
                 }
             },
         });
    }

    /**
     * Increase the size of the rectangle to fully contain the quadrilateral
     */
    enlargeRectangle() {
        let extremes = this._imageryBounds.getExtremes();
        this._rectangle = new Cesium.Rectangle(extremes.west, extremes.south, extremes.east, extremes.north);
    }

    /**
     * Transforms a quadrilateral specified in geodetic radians to the native coordinate system
     * of this tiling scheme.
     *
     * @param {Quadrilateral} quadrilateral The quadrilateral to transform.
     * @param {Quadrilateral} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Quadrilateral} The specified 'result', or a new object containing the native quadrilateral if 'result'
     *          is undefined.
     */
    quadrilateralToNativeQuadrilateral(quadrilateral, result) {
        let projection = this._projection;
        let southwest = projection.project(quadrilateral.southwest());
        let northwest = projection.project(quadrilateral.northwest());
        let northeast = projection.project(quadrilateral.northeast());
        let southeast = projection.project(quadrilateral.southeast());
        let points = [[southwest.x, southwest.y], [northwest.x, northwest.y],
            [northeast.x, northeast.y], [southeast.x, southeast.y]];

        if (!Cesium.defined(result)) {
            return new Quadrilateral({points:points, units:Units.METERS});
        }

        result.points = points;
        result.units = Units.METERS;
        return result;
    }


    /**
     * Given a rectangle, use the projection to compute a quadrilateral.
     * @function rectangleToQuadrilateral
     * @param rectangle
     * @returns {Quadrilateral} (all in long lat)
     */
    rectangleToQuadrilateral(rectangle) {
        if (!Cesium.defined(rectangle)) {
            rectangle = this._rectangle;
        }
        return Quadrilateral.fromRectangle(rectangle, this._projection);
     }

    /**
     * Converts tile x, y coordinates and level to a quadrilateral expressed in the native coordinates
     * of the tiling scheme.
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Quadrilateral} The specified 'result', or a new object containing the quadrilateral
     *          if 'result' is undefined.
     */
    tileXYToNativeQuadrilateral(x, y, level, result) {
        let radiansQuadrilateral = this.tileXYToQuadrilateral(x, y, level);
        let points = radiansQuadrilateral.points;

        // the result needs to be in the coordinate system of the tiling scheme, so projected.
        let projection = this._projection;
        let projectedSW = projection.project(Cesium.Cartographic.fromRadians(points[0][0], points[0][1]));
        let projectedNW = projection.project(Cesium.Cartographic.fromRadians(points[1][0], points[1][1]));
        let projectedNE = projection.project(Cesium.Cartographic.fromRadians(points[2][0], points[2][1]));
        let projectedSE = projection.project(Cesium.Cartographic.fromRadians(points[3][0], points[3][1]));

        let projectedPoints = [[projectedSW.x, projectedSW.y],
            [projectedNW.x, projectedNW.y],
            [projectedNE.x, projectedNE.y],
            [projectedSE.x, projectedSE.y]];


        if (!Cesium.defined(result)) {
            return new Quadrilateral({points:projectedPoints,
                                      units:Units.METERS});
        }

        result.points = projectedPoints;
        result.units = Units.METERS;
        return result;
    }

    /**
     * Converts tile x, y coordinates and level to a quadrilateral in radians.
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Quadrilateral} The specified 'result', or a new object containing the quadrilateral
     *          if 'result' is undefined.
     */
    tileXYToQuadrilateral(x, y, level, result) {
        let xTiles = this.getNumberOfXTilesAtLevel(level);
        let yTiles = this.getNumberOfYTilesAtLevel(level);

        // find the points along the x axis between sw and se
        let xTileWidth = (this._imageryBounds.width) / xTiles;
        let percentage0 = (x * xTileWidth)/this._imageryBounds.width;
        let percentage1 = ((x + 1) * xTileWidth)/this._imageryBounds.width;
        let edgeWest = this._imageryBounds.computePointAlongEdge(0, 3, percentage0);
        let edgeEast = this._imageryBounds.computePointAlongEdge(0, 3, percentage1);

        let yTileHeight = (this._imageryBounds.height) / yTiles;
        let percentage2 = (y * yTileHeight)/this._imageryBounds.height;
        let percentage3 = ((y + 1) * yTileHeight)/this._imageryBounds.height;
        let edgeSouth = this._imageryBounds.computePointAlongEdge(0, 1, percentage2);
        let edgeNorth = this._imageryBounds.computePointAlongEdge(0, 1, percentage3);

        let newSW = [edgeWest[0], edgeSouth[1]];
        let newNW = [edgeWest[0], edgeNorth[1]];
        let newNE = [edgeEast[0], edgeNorth[1]];
        let newSE = [edgeEast[0], edgeSouth[1]];

        let radiansPoints = [newSW, newNW, newNEW, newSE];
        if (!Cesium.defined(result)) {
            return new Quadrilateral({points:radiansPoints,
                                      units:Units.RADIANS});
        }

        result.points = radiansPoints;
        result.units = Units.RADIANS;
        return result;
    }


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
        let bounds = this._imageryBounds;
        let classifiedPoint = bounds.classifyPoint([Cesium.Math.toRadians(position.longitude), Cesium.Math.toRadians(position.latitude)])
        if (classifiedPoint == Hit.OUTSIDE) {
            // outside the bounds of the tiling scheme
            return undefined;
        }

        let xTiles = this.getNumberOfXTilesAtLevel(level);
        let yTiles = this.getNumberOfYTilesAtLevel(level);

        let overallWidth = bounds.width;
        let xTileWidth = overallWidth / xTiles;
        let overallHeight = bounds.height;
        let yTileHeight = overallHeight / yTiles;

        let projection = this._projection;

        let projectedPosition = projection.project(position);
        let rawProjectedPosition = [projectedPosition.x, projectedPosition.y];
        let boundsMeters = this._imageryBoundsInMeters.straightDistance(rawProjectedPosition, [boundsMeters.points[0][0], rawProjectedPosition[1]]);

        let distanceFromWest = boundsMeters.distanceToEdge(boundsMeters.points[0], boundsMeters.points[1], rawProjectedPosition);
        let distanceFromNorth = boundsMeters.distanceToEdge(boundsMeters.points[1], boundsMeters.points[2], rawProjectedPosition);
        //TODO what if we are tiling from the lower left?

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

export {QuadrilateralTilingScheme}