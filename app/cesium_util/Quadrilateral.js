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
const classifyPoint = require ('robust-point-in-polygon');
import {getPointsFromRectangle} from "cesium_util/RectangleUtil";

const Units = Object.freeze({
    METERS:   Symbol("m"),
    RADIANS: Symbol("rad"),
    DEGREES: Symbol("deg")
});

const Hit = Object.freeze({
    INSIDE: -1,
    OUTSIDE: 1,
    EDGE: 0
});

class Quadrilateral {

    /**
     *
     * @param options
     * @param options.points array of 4 x,y points expressing bounds of the quadrilateral, in RADIANS, long lat
     * Order must be sw, nw, ne, se
     * @param options.units which units this is in.  Deafults to radians.
     */
    constructor(options) {
        if (!Cesium.defined(options.points) || (options.points.length !== 4)) {
            throw new Cesium.DeveloperError('4 points are required.');
        }

        this.setPoints(options.points);
        this._units = Cesium.defaultValue(options.units, Units.RADIANS);

        Object.defineProperties(this, {
            /**
             * Gets the points
             * @readonly
             */
            points : {
                get : function() {
                    return this._points;
                },
                set : function(points){
                    if (!Cesium.defined(points) || (points.length !== 4)) {
                        throw new Cesium.DeveloperError('4 points are required.');
                    }
                    this.setPoints(points);
                }
            },

            width: {
                get: function() {
                    return this.computeWidth();
                }
            },

            height: {
                get: function() {
                    return this.computeHeight();
                }
            },

            units: {
                get : function() {
                    return this._units;
                },
                set : function(units){
                    this._units = Cesium.defaultValue(units, 'radians');;
                }
            }

        });
    };

    setPoints(points){
        this._latitudeClosestToEquator = undefined;
        this._westAvg = undefined;
        this._southAvg = undefined;
        this._northAvg = undefined;
        this._eastAvg = undefined;
        this._westMost = undefined;
        this._southMost = undefined;
        this._northMost= undefined;
        this._eastMost = undefined;
        this._width = undefined;
        this._height = undefined;
        this._points = points;
    };

    /**
     * @function getExtremes
     * @return {Object} Return the southmost, northmost, eastmost & westmost values of lat / long, respectively, as radians in an object.
     */
    getExtremes() {
        if (!Cesium.defined(this._southMost)){
            this.getLatitudeClosestToEquator();
        }
        let result = this.computeLongitudeExtremes();
        result['south'] = this._southMost;
        result['north'] = this._northMost;
        return result;
    };


    /**
     * Test if a point is inside this quadrilateral
     * @function classifyPoint
     * @param point the longitude, latitude point to test
     * @returns Hit (INSIDE, OUTSIDE, EDGE)
     */
    classifyPoint(point) {
        return  classifyPoint(this.points, point);
    };

    /**
     * Test if points are inside this quadrilateral
     * @function classifyPoints
     * @param points
     * @returns -1 if inside or on the edge and inside or all on the edge,
     *     0 crossing the edge, 1 if outside or outside and on the edge
     */
    classifyPoints(points){
        let result = undefined;
        let inside = 0;
        let outside = 0;
        let edge = 0;
        for (let i=0; i<points.length; i++) {
            let value = this.classifyPoint(points[i]);
            switch(value){
                case -1:
                    inside += 1;
                    break;
                case 0:
                    edge += 1;
                case 1:
                    outside += 1;
            }
        }
        if (outside == 0){
            // none outside
            return Hit.INSIDE;
        }
        if (inside == 0) {
            if (outside == 0){
                // all on the edge
                return Hit.EDGE;
            } else {
                // outside & edge
                return Hit.OUTSIDE;
            }
        }
        if (inside > 0) {
            if (outside > 0){
                // crossing edge
                return Hit.EDGE;
            } else {
                // inside
                return Hit.INSIDE;
            }
        }

        throw new Cesium.DeveloperError('Problem classifying points.');

    };

    /**
     * @function classifyRectangle
     * @param rectangle
     * @returns @returns -1 if inside or on the edge and inside or all on the edge,
     *     0 crossing the edge, 1 if outside or outside and on the edge
     */
    classifyRectangle(rectangle) {
        return this.classifyPoints(getPointsFromRectangle(rectangle));
    };

    /**
     * @function getLatitudeClosestToEquator
     * @returns {number} in radians
     */
    getLatitudeClosestToEquator(){
        if (Cesium.defined(this._latitudeClosestToEquator)) {
            return this._latitudeClosestToEquator;
        }
        let minLat = Number.MAX_VALUE;
        let maxLat = Number.MIN_VALUE;
        for (let i=0; i<this._points.length; i++){
            let point = this._points[i];
            let lat = point[1];
            if (lat < minLat){
                minLat = lat;
            }
            if (lat > maxLat){
                maxLat = lat;
            }
        }

        this._southMost = minLat;
        this._northMost = maxLat;

        if (minLat <= 0.0 && maxLat <= 0.0) {
            //this._hemisphere = SOUTH;
            this._latitudeClosestToEquator = maxLat;
        } else if (minLat >= 0.0 && maxLat >= 0.0){
            //this._hemisphere = NORTH;
            this._latitudeClosestToEquator = minLat;
        } else {
            if (Math.abs(minLat) <= Math.abs(maxLat)){
                this._latitudeClosestToEquator =  minLat;
            } else {
                this._latitudeClosestToEquator = maxLat;
            }
        }
        return this._latitudeClosestToEquator;

    };

    /**
     * @function computePointAlongEdge
     * @param index0 the first index, must be between 0 and 3
     * @param index1 the second index, must be between 0 and 3
     * @param percent the percentage from index0 to index1
     */
    computePointAlongEdge(index0, index1, percent) {
        let point0 = this.points[index0];
        let point1 = this.points[index1];
        let result = [(point0[0] + point1[0]) * percent,
                      (point0[1] + point1[1] * percent)];
        return result;
    }

    /**
     * @function computeLongitudeExtremes
     * @returns {Object} in radians
     */
    computeLongitudeExtremes(){
        if (Cesium.defined(this._eastMost)) {
            return {'east':this._eastMost,
                    'west':this._westMost};
        }
        let minLon = Number.MAX_VALUE;
        let maxLon = Number.MIN_VALUE;
        for (let i=0; i<this._points.length; i++){
            let point = this._points[i];
            let lon = point[0];
            if (lon < minLon){
                minLon = lon;
            }
            if (lon > maxLon){
                maxLon = lon;
            }
        }

        this._westMost = minLon;
        this._eastMost = maxLon;

        return {'east':this._eastMost,
                'west':this._westMost};

    };

    /**
     * Computes the width of a rectangle in radians.
     * @returns {Number} The width in radians.
     */
    computeWidth() {
        if (Cesium.defined(this._width)){
            return this._width;
        }
        if (!Cesium.defined(this._westAvg)) {
            this._westAvg = [(this._points[0][0] + this._points[1][0]) / 2.0, (this._points[0][1] + this._points[1][1]) / 2.0];
        }
        if (!Cesium.defined(this._eastAvg)) {
            this._eastAvg = [(this._points[2][0] + this._points[3][0]) / 2.0, (this._points[2][1] + this._points[3][1]) / 2.0];

            if (this._eastAvg < this._westAvg) {
                this._eastAvg += Cesium.Math.TWO_PI;
            }
        }
        this._width = this.distance(this._eastAvg, this._westAvg);
        return this._width;
    };

    /**
     * Computes the height of a rectangle in radians.
     * @returns {Number} The height.
     */
    computeHeight() {
        if (Cesium.defined(this._height)){
            return this._height;
        }
        if (!Cesium.defined(this._northAvg)) {
            this._northAvg = [(this._points[1][0] + this._points[2][0]) / 2.0, (this._points[1][1] + this._points[1][1]) / 2.0];
        }

        if (!Cesium.defined(this._southAvg)) {
            this._southAvg = [(this._points[0][0] + this._points[3][0]) / 2.0, (this._points[0][1] + this._points[3][1]) / 2.0];
        }
        this._height = this.distance(this._northAvg,this._southAvg);
        return this._height;
    };

    /**
     * @function distanceToEdge
     * Calculate the distance to an edge from a point
     * This should be done in METERS
     * @param edge0 [x,y] coordinates of the first edge point in meters
     * @param edge1 [x,y] coordiantes of the second edge point in meters
     * @param point [x,y] coordinates of the point not on the edge
     * @returns {number} meters result
     */
    distanceToEdge(edge0, edge1, point){
        let result = Math.abs((edge0[1] - edge1[1])* point[0] -
            (edge0[0] - edge1[0])*point[1] +
             edge1[0]*edge0[1] -
             edge1[1]*edge0[0])/this.straightDistance(edge0, edge1);
        return result;
    };

    /**
     * @function straightDistance
     * Do a straight math calculation of distance between two points
     * @param one first location [x, y]
     * @param two second location [x, y]
     * @erturns {number} in whatever units this is in
     */
    straightDistance(one, two) {
        let result = Math.sqrt(Math.pow(one[0] - two[0],2) +
                               Math.pow(one[1] - two[1],2));
        return result;
    };

    /**
     * @function distance
     * Do a haversine calculation of distance between two points on a globe
     * @param one first location [lon, lat]
     * @param two second location [lon, lat]
     * @returns {number} in radians
     */
    distance(one, two) {
        let oneRadians = one;
        let twoRadians = two;
        if (this._units !== Units.RADIANS) {
            if (this._units == Units.DEGREES) {
                oneRadians = Cesium.Math.toRadians(one);
                twoRadians = Cesium.Math.toRadians(two);
            } else {
                // meters or km
                return straightDistance(one, two);
            }
        }
        let dLat = (twoRadians[1]-oneRadians[1]);
        let dLon = (twoRadians[0]-oneRadians[0]);
        let a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(oneRadians[1]) * Math.cos(twoRadians[1]) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
        ;
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return c;
    };

    /**
     * @function northwest
     * @returns {*} cartographic of the northwest point
     */
    northwest() {
        return new Cesium.Cartographic(this._points[1][0], this._points[1][1]);
    };

    /**
     * @function southeast
     * @returns {*} cartographic of the southeast point
     */
    southeast() {
        return new Cesium.Cartographic(this._points[3][0], this._points[3][1]);
    };

    /**
     * @function southwest
     * @returns {*} cartographic of the southwest point
     */
    southwest() {
        return new Cesium.Cartographic(this._points[0][0], this._points[0][1]);
    };

    /**
     * @function northeast
     * @returns {*} cartographic of the northeast point
     */
    northeast() {
        return new Cesium.Cartographic(this._points[2][0], this._points[2][1]);
    };

    /**
     * Given a rectangle, use the projection to compute a quadrilateral.
     * @function Quadrilateral.fromRectangle
     * @param rectangle
     * @param projection
     * @returns {Quadrilateral} (coordinates in radians)
     */
    static fromRectangle(rectangle, projection, units) {
        let projectionBounds = [];
        units = Cesium.defaultValue(units, Units.RADIANS);
        let swRadians = Cesium.Rectangle.southwest(rectangle);
        let neRadians = Cesium.Rectangle.northeast(rectangle);

        let swProjected = projection.project(swRadians);
        let neProjected = projection.project(neRadians);
        let nwProjected = new Cesium.Cartesian3(swProjected.x, neProjected.y, swProjected.z);
        let seProjected = new Cesium.Cartesian3(neProjected.x, swProjected.y, swProjected.z);

        if (units == Units.RADIANS) {
            let nwRadians = projection.unproject(nwProjected);
            let seRadians = projection.unproject(seProjected);

            projectionBounds.push([swRadians.longitude, swRadians.latitude]);
            projectionBounds.push([nwRadians.longitude, nwRadians.latitude]);
            projectionBounds.push([neRadians.longitude, neRadians.latitude]);
            projectionBounds.push([seRadians.longitude, seRadians.latitude]);
        } else if (units == Units.METERS) {
            projectionBounds.push([swProjected.x, swProjected.y]);
            projectionBounds.push([neProjected.x, neProjected.y]);
            projectionBounds.push([nwProjected.x, nwProjected.y]);
            projectionBounds.push([seProjected.x, seProjected.y]);
        }
        if (projectionBounds.length > 0) {
            return new Quadrilateral({points: projectionBounds});
        }

        throw new Cesium.DeveloperError('Building quadrilateral from rectangle, only radians or meters are supported');
    }

}

export {Quadrilateral, Units, Hit}