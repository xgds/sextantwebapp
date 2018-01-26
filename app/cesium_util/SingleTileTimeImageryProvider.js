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
require('cesium_util/ImagePatch');

   /**
     * Provides a single, top-level imagery tile.
    * The single image uses whatever tiling scheme is passed in.
    * The single image also can vary with time.
     *
     * @alias SingleTimeImageryProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The url for the tile.
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
     * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
     * @param {Object} [options.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthEnterpriseMapsProvider
     * @see createOpenStreetMapImageryProvider
     * @see createTileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     * @see WebMapTileServiceImageryProvider
     * @see UrlTemplateImageryProvider
     */
class SingleTileTimeImageryProvider  {

    /**
     * @constructor
     * @param options
     * @param {String} options.xhr.headers the headers
     * @param {Clock} [options.clock] A Clock instance that is used when determining the value for the time dimension. Required when options.times is specified.
     * @param {TimeIntervalCollection} [options.times] TimeIntervalCollection with its data property being an object containing time dynamic dimension and their values.
     */
    constructor(options){

        options = Cesium.defaultValue(options, {});

        this._xhr = Cesium.defaultValue(options.xhr, {});

        let url = options.url;

        //>>includeStart('debug', pragmas.debug);
        if (_.isUndefined(url)) {
            throw new DeveloperError('url is required.');
        }
        if (!_.isUndefined(options.times) && _.isUndefined(options.clock)) {
            throw new DeveloperError('options.times was specified, so options.clock is required.');
        }

        //>>includeEnd('debug');

        this._url = url;

        let proxy = options.proxy;
        this._proxy = proxy;

        let rectangle = Cesium.defaultValue(options.rectangle, Cesium.Rectangle.MAX_VALUE);
        let tilingScheme = options.tilingScheme;
        if (_.isUndefined(tilingScheme)) {
            tilingScheme = new Cesium.GeographicTilingScheme({
                rectangle : rectangle,
                numberOfLevelZeroTilesX : 1,
                numberOfLevelZeroTilesY : 1,
                ellipsoid : options.ellipsoid
            });
        }
        this._tilingScheme = tilingScheme;

        let that = this;
        
        if (!_.isUndefined(options.times)) {
            this._timeDynamicImagery = new Cesium.TimeDynamicImagery({
                clock : options.clock,
                times : options.times,
                requestImageFunction : function(x, y, level, request, interval) {
                    return that.requestIntervalImage(x, y, level, request, interval);
                },
                reloadFunction : function() {
                    if (!_.isUndefined(that._reload)) {
                        that._reload();
                    }
                }
            });
        }

        this._image = undefined;
        this._texture = undefined;
        this._tileWidth = 0;
        this._tileHeight = 0;

        //this._errorEvent = new Event();

        //this._ready = false;
        //this._readyPromise = when.defer();

        let imageUrl = url;
        if (!_.isUndefined(proxy)) {
            imageUrl = proxy.getURL(imageUrl);
        }

        let credit = options.credit;
        if (typeof credit === 'string') {
            credit = new Cesium.Credit({text: credit});
        }
        this._credit = credit;

        Object.defineProperties(this, {

        /**
         * Gets the URL of the single, top-level imagery tile.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {String}
         * @readonly
         */
        url : {
            get : function() {
                return this._url;
            }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {Proxy}
         * @readonly
         */
        proxy : {
            get : function() {
                return this._proxy;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link SingleTileTimeImageryProvider#ready} returns true.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileWidth : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileWidth must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tileWidth;
            }
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link SingleTileTimeImageryProvider#ready} returns true.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileHeight: {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileHeight must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tileHeight;
            }
        },

        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link SingleTileTimeImageryProvider#ready} returns true.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        maximumLevel : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('maximumLevel must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return 0;
            }
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link SingleTileTimeImageryProvider#ready} returns true.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        minimumLevel : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('minimumLevel must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return 0;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link SingleTileTimeImageryProvider#ready} returns true.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {TilingScheme}
         * @readonly
         */
        tilingScheme : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tilingScheme must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tilingScheme;
            }
        },

        /**
         * Gets the rectangle, in radians, of the imagery provided by this instance.  This function should
         * not be called before {@link SingleTileTimeImageryProvider#ready} returns true.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {Rectangle}
         * @readonly
         */
        rectangle : {
            get : function() {
                return this._tilingScheme.rectangle;
            }
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link SingleTileTimeImageryProvider#ready} returns true.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {TileDiscardPolicy}
         * @readonly
         */
        tileDiscardPolicy : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileDiscardPolicy must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return undefined;
            }
        },

        /**
         * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {Event}
         * @readonly
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets a promise that resolves to true when the provider is ready for use.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {Promise.<Boolean>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery.  This function should not be called before {@link SingleTileTimeImageryProvider#ready} returns true.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {Credit}
         * @readonly
         */
        credit : {
            get : function() {
                return this._credit;
            }
        },

        /**
         * Gets a value indicating whether or not the images provided by this imagery provider
         * include an alpha channel.  If this property is false, an alpha channel, if present, will
         * be ignored.  If this property is true, any images without an alpha channel will be treated
         * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
         * and texture upload time are reduced.
         * @memberof SingleTileTimeImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        hasAlphaChannel : {
            get : function() {
                return true;
            }
        }
    });

    };

    requestImage(x, y, level, request) {
        let result;
        let timeDynamicImagery = this._timeDynamicImagery;
        let currentInterval;

        // Try and load from cache
        if (!_.isUndefined(timeDynamicImagery)) {
            currentInterval = timeDynamicImagery.currentInterval;
            result = timeDynamicImagery.getFromCache(x, y, level, request);
        }

        // Couldn't load from cache
        if (_.isUndefined(result)) {
            result = this.requestIntervalImage(x, y, level, request, currentInterval);
        }

        // If we are approaching an interval, preload this tile in the next interval
        if (!_.isUndefined(result) && _.isUndefined(timeDynamicImagery)) {
            timeDynamicImagery.checkApproachingInterval(x, y, level, request);
        }

        return result;
    };

    requestIntervalImage(col, row, level, request, interval) {
        let labels = this._tileMatrixLabels;
        let tileMatrix = !_.isUndefined(labels) ? labels[level] : level.toString();
        let subdomains = this._subdomains;
        let url;
        let key;
        let staticDimensions = this._dimensions;
        let dynamicIntervalData = !_.isUndefined(interval) ? interval.data : undefined;

        if (this._url.indexOf('{') >= 0) {
            // resolve tile-URL template
            url = this._url;

            if (!_.isUndefined(dynamicIntervalData)) {
                for (key in dynamicIntervalData) {
                    if (dynamicIntervalData.hasOwnProperty(key)) {
                        url = url.replace('{' + key + '}', dynamicIntervalData[key]);
                    }
                }
            }
        }
       /* else {
            // build KVP request
            let uri = new Cesium.Uri(this._url);
            let queryOptions = queryToObject(Cesium.defaultValue(uri.query, ''));

            queryOptions = Cesium.combine(defaultParameters, queryOptions);

            if (!_.isUndefined(dynamicIntervalData)) {
                for (key in dynamicIntervalData) {
                    if (dynamicIntervalData.hasOwnProperty(key)) {
                        queryOptions[key] = dynamicIntervalData[key];
                    }
                }
            }

            uri.query = Cesium.objectToQuery(queryOptions);

            url = uri.toString();
        } */

        let proxy = this._proxy;
        if (!_.isUndefined(proxy)) {
            url = proxy.getURL(url);
        }

        let headers = undefined;
        if ('headers' in this._xhr) {
            headers = this._xhr.headers;
        }
        return Cesium.ImageryProvider.loadImage(this, url, request, headers);

    }
}

export {SingleTileTimeImageryProvider}