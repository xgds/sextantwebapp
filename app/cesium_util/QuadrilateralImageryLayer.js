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
import {Quadrilateral} from 'cesium_util/Quadrilateral';

class ProjectionImageryLayer extends Cesium.ImageryLayer{

    constructor(imageryProvider, options){
        super(imageryProvider, options);

        if ('tilingScheme' in options) {
            this._tilingScheme = options.tilingScheme;
            if ('projection' in options.tilingScheme){
                this._projection = options.tilingScheme.projection;
            }
        }

        if (!Cesium.defined(this._projection)) {
            throw new Cesium.DeveloperError('Tiling scheme with projection is required.');
        }

        this._quadrilateral = this._tilingScheme.rectangleToQuadrilateral();
    };



    getViewableRectangle() {
        //TODO this needs to return a quadrangle, it's really only used by picking
        return imageryProvider.rectangle;
        // let imageryProvider = this._imageryProvider;
        // let rectangle = this._rectangle;
        // return imageryProvider.readyPromise.then(function() {
        //     return Rectangle.intersection(imageryProvider.rectangle, rectangle);
        // });
    };

    /**
     * Gets the level with the specified world coordinate spacing between texels, or less.
     *
     * @param {ImageryLayer} layer The imagery layer to use.
     * @param {Number} texelSpacing The texel spacing for which to find a corresponding level.
     * @param {Number} latitudeClosestToEquator The latitude closest to the equator that we're concerned with.
     * @returns {Number} The level with the specified texel spacing or less.
     */
    getLevelWithMaximumTexelSpacing(layer, texelSpacing, latitudeClosestToEquator) {
        // PERFORMANCE_IDEA: factor out the stuff that doesn't change.
        let imageryProvider = layer._imageryProvider;
        let tilingScheme = imageryProvider.tilingScheme;
        let ellipsoid = tilingScheme.ellipsoid;
        let latitudeFactor = !(layer._imageryProvider.tilingScheme instanceof GeographicTilingScheme) ? Math.cos(latitudeClosestToEquator) : 1.0;
        let tilingSchemeRectangle = tilingScheme.rectangle;
        let levelZeroMaximumTexelSpacing = ellipsoid.maximumRadius * tilingSchemeRectangle.width * latitudeFactor / (imageryProvider.tileWidth * tilingScheme.getNumberOfXTilesAtLevel(0));

        let twoToTheLevelPower = levelZeroMaximumTexelSpacing / texelSpacing;
        let level = Math.log(twoToTheLevelPower) / Math.log(2);
        let rounded = Math.round(level);
        return rounded | 0;
    }

    /**
     * Gets the level with the specified world coordinate spacing between texels, or less.
     *
     * @param {ImageryLayer} layer The imagery layer to use.
     * @param {Number} texelSpacing The texel spacing for which to find a corresponding level.
     * @param {Number} latitudeClosestToEquator The latitude closest to the equator that we're concerned with.
     * @returns {Number} The level with the specified texel spacing or less.
     */
    getLevelWithMaximumTexelSpacing(layer, texelSpacing, latitudeClosestToEquator, imageryBounds) {
        // PERFORMANCE_IDEA: factor out the stuff that doesn't change.
        let imageryProvider = layer._imageryProvider;
        let tilingScheme = imageryProvider.tilingScheme;
        let ellipsoid = tilingScheme.ellipsoid;
        let latitudeFactor = Math.cos(latitudeClosestToEquator);
        let levelZeroMaximumTexelSpacing = ellipsoid.maximumRadius * imageryBounds.width * latitudeFactor / (imageryProvider.tileWidth * tilingScheme.getNumberOfXTilesAtLevel(0));

        let twoToTheLevelPower = levelZeroMaximumTexelSpacing / texelSpacing;
        let level = Math.log(twoToTheLevelPower) / Math.log(2);
        let rounded = Math.round(level);
        return rounded | 0;
    };

    _createTileImagerySkeletons(tile, terrainProvider, insertionPoint) {
        let surfaceTile = tile.data;

        if (Cesium.defined(this._minimumTerrainLevel) && tile.level < this._minimumTerrainLevel) {
            return false;
        }
        if (Cesium.defined(this._maximumTerrainLevel) && tile.level > this._maximumTerrainLevel) {
            return false;
        }

        let imageryProvider = this._imageryProvider;

        if (!Cesium.defined(insertionPoint)) {
            insertionPoint = surfaceTile.imagery.length;
        }

        if (!imageryProvider.ready) {
            // The imagery provider is not ready, so we can't create skeletons, yet.
            // Instead, add a placeholder so that we'll know to create
            // the skeletons once the provider is ready.
            this._skeletonPlaceholder.loadingImagery.addReference();
            surfaceTile.imagery.splice(insertionPoint, 0, this._skeletonPlaceholder);
            return true;
        }


        // Compute the rectangle of the imagery from this imageryProvider that overlaps
        // the geometry tile.  The ImageryProvider and ImageryLayer both have the
        // opportunity to constrain the rectangle.  The imagery TilingScheme's rectangle
        // always fully contains the ImageryProvider's rectangle.
        let imageryBounds = this._tilingScheme.rectangleToQuadrilateral();
        //let quadrilateral = this._tilingScheme.rectangleToQuadrilateral(tile.rectangle);
        let hit = imageryBounds.classifyRectangle(tile.rectangle);


        //let imageryBounds = Rectangle.intersection(imageryProvider.rectangle, this._rectangle, imageryBoundsScratch);
        //let rectangle = Rectangle.intersection(tile.rectangle, imageryBounds, tileImageryBoundsScratch);

        if (hit > 0) {
            // totally outside
            return false;

            //TODO support base layer.
        }

        let latitudeClosestToEquator = Cesium.Math.toRadians(imageryBounds.getLatitudeClosestToEquator());

        // Compute the required level in the imagery tiling scheme.
        // The errorRatio should really be imagerySSE / terrainSSE rather than this hard-coded value.
        // But first we need configurable imagery SSE and we need the rendering to be able to handle more
        // images attached to a terrain tile than there are available texture units.  So that's for the future.
        let errorRatio = 1.0;
        let targetGeometricError = errorRatio * terrainProvider.getLevelMaximumGeometricError(tile.level);
        let imageryLevel = this.getLevelWithMaximumTexelSpacing(this, targetGeometricError, latitudeClosestToEquator, imageryBounds);
        imageryLevel = Math.max(0, imageryLevel);
        let maximumLevel = imageryProvider.maximumLevel;
        if (imageryLevel > maximumLevel) {
            imageryLevel = maximumLevel;
        }

        if (Cesium.defined(imageryProvider.minimumLevel)) {
            let minimumLevel = imageryProvider.minimumLevel;
            if (imageryLevel < minimumLevel) {
                imageryLevel = minimumLevel;
            }
        }

        let imageryTilingScheme = imageryProvider.tilingScheme;
        let northwestTileCoordinates = imageryTilingScheme.positionToTileXY(imageryBounds.northwest(), imageryLevel);
        let southeastTileCoordinates = imageryTilingScheme.positionToTileXY(imageryBounds.southeast(), imageryLevel);

        // If the southeast corner of the rectangle lies very close to the north or west side
        // of the southeast tile, we don't actually need the southernmost or easternmost
        // tiles.
        // Similarly, if the northwest corner of the rectangle lies very close to the south or east side
        // of the northwest tile, we don't actually need the northernmost or westernmost tiles.

        // We define "very close" as being within 1/512 of the width of the tile.
        let veryCloseX = tile.rectangle.width / 512.0;
        let veryCloseY = tile.rectangle.height / 512.0;

        let northwestTileRectangle = imageryTilingScheme.tileXYToRectangle(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);
        if (Math.abs(northwestTileRectangle.south - tile.rectangle.north) < veryCloseY && northwestTileCoordinates.y < southeastTileCoordinates.y) {
            ++northwestTileCoordinates.y;
        }
        if (Math.abs(northwestTileRectangle.east - tile.rectangle.west) < veryCloseX && northwestTileCoordinates.x < southeastTileCoordinates.x) {
            ++northwestTileCoordinates.x;
        }

        let southeastTileRectangle = imageryTilingScheme.tileXYToRectangle(southeastTileCoordinates.x, southeastTileCoordinates.y, imageryLevel);
        if (Math.abs(southeastTileRectangle.north - tile.rectangle.south) < veryCloseY && southeastTileCoordinates.y > northwestTileCoordinates.y) {
            --southeastTileCoordinates.y;
        }
        if (Math.abs(southeastTileRectangle.west - tile.rectangle.east) < veryCloseX && southeastTileCoordinates.x > northwestTileCoordinates.x) {
            --southeastTileCoordinates.x;
        }

        // Create TileImagery instances for each imagery tile overlapping this terrain tile.
        // We need to do all texture coordinate computations in the imagery tile's tiling scheme.

        let terrainRectangle = Rectangle.clone(tile.rectangle, terrainRectangleScratch);
        let imageryRectangle = imageryTilingScheme.tileXYToRectangle(northwestTileCoordinates.x, northwestTileCoordinates.y, imageryLevel);
        let clippedImageryRectangle = Rectangle.intersection(imageryRectangle, imageryBounds, clippedRectangleScratch);

        let imageryTileXYToRectangle;
        if (useWebMercatorT) {
            imageryTilingScheme.rectangleToNativeRectangle(terrainRectangle, terrainRectangle);
            imageryTilingScheme.rectangleToNativeRectangle(imageryRectangle, imageryRectangle);
            imageryTilingScheme.rectangleToNativeRectangle(clippedImageryRectangle, clippedImageryRectangle);
            imageryTilingScheme.rectangleToNativeRectangle(imageryBounds, imageryBounds);
            imageryTileXYToRectangle = imageryTilingScheme.tileXYToNativeRectangle.bind(imageryTilingScheme);
            veryCloseX = terrainRectangle.width / 512.0;
            veryCloseY = terrainRectangle.height / 512.0;
        } else {
            imageryTileXYToRectangle = imageryTilingScheme.tileXYToRectangle.bind(imageryTilingScheme);
        }

        let minU;
        let maxU = 0.0;

        let minV = 1.0;
        let maxV;

        // If this is the northern-most or western-most tile in the imagery tiling scheme,
        // it may not start at the northern or western edge of the terrain tile.
        // Calculate where it does start.
        if (!this.isBaseLayer() && Math.abs(clippedImageryRectangle.west - terrainRectangle.west) >= veryCloseX) {
            maxU = Math.min(1.0, (clippedImageryRectangle.west - terrainRectangle.west) / terrainRectangle.width);
        }

        if (!this.isBaseLayer() && Math.abs(clippedImageryRectangle.north - terrainRectangle.north) >= veryCloseY) {
            minV = Math.max(0.0, (clippedImageryRectangle.north - terrainRectangle.south) / terrainRectangle.height);
        }

        let initialMinV = minV;

        for ( let i = northwestTileCoordinates.x; i <= southeastTileCoordinates.x; i++) {
            minU = maxU;

            imageryRectangle = imageryTileXYToRectangle(i, northwestTileCoordinates.y, imageryLevel);
            clippedImageryRectangle = Rectangle.simpleIntersection(imageryRectangle, imageryBounds, clippedRectangleScratch);

            if (!Cesium.defined(clippedImageryRectangle)) {
                continue;
            }

            maxU = Math.min(1.0, (clippedImageryRectangle.east - terrainRectangle.west) / terrainRectangle.width);

            // If this is the eastern-most imagery tile mapped to this terrain tile,
            // and there are more imagery tiles to the east of this one, the maxU
            // should be 1.0 to make sure rounding errors don't make the last
            // image fall shy of the edge of the terrain tile.
            if (i === southeastTileCoordinates.x && (this.isBaseLayer() || Math.abs(clippedImageryRectangle.east - terrainRectangle.east) < veryCloseX)) {
                maxU = 1.0;
            }

            minV = initialMinV;

            for ( let j = northwestTileCoordinates.y; j <= southeastTileCoordinates.y; j++) {
                maxV = minV;

                imageryRectangle = imageryTileXYToRectangle(i, j, imageryLevel);
                clippedImageryRectangle = Rectangle.simpleIntersection(imageryRectangle, imageryBounds, clippedRectangleScratch);

                if (!Cesium.defined(clippedImageryRectangle)) {
                    continue;
                }

                minV = Math.max(0.0, (clippedImageryRectangle.south - terrainRectangle.south) / terrainRectangle.height);

                // If this is the southern-most imagery tile mapped to this terrain tile,
                // and there are more imagery tiles to the south of this one, the minV
                // should be 0.0 to make sure rounding errors don't make the last
                // image fall shy of the edge of the terrain tile.
                if (j === southeastTileCoordinates.y && (this.isBaseLayer() || Math.abs(clippedImageryRectangle.south - terrainRectangle.south) < veryCloseY)) {
                    minV = 0.0;
                }

                let texCoordsRectangle = new Cartesian4(minU, minV, maxU, maxV);
                let imagery = this.getImageryFromCache(i, j, imageryLevel);
                surfaceTile.imagery.splice(insertionPoint, 0, new TileImagery(imagery, texCoordsRectangle, useWebMercatorT));
                ++insertionPoint;
            }
        }

        return true;
    };


}

export {ProjectionImageryLayer}