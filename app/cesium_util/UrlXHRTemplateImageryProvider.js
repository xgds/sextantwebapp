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
 * Provides imagery by requesting tiles using specified
 * Supports authentication headers, which can be passed in with the xhr value in options
 * @link UrlTemplateImageryProvider
 *
 */

class UrlXHRTemplateImageryProvider extends Cesium.UrlTemplateImageryProvider {
    /**
     * @constructor
     * @param options
     * @param {String} options.xhr.headers the headers
     */
    constructor(options){
        super(options);

        this._xhr = Cesium.defaultValue(options.xhr, {});
        
        // extension of the parent class does not give access to locally defined things.
        this.degreesScratchComputed = false;
        this.degreesScratch = new Cesium.Rectangle();
        this.projectedScratchComputed = false;
        this.projectedScratch = new Cesium.Rectangle();


    };

    pickFeatures(x, y, level, longitude, latitude) {
        //>>includeStart('debug', pragmas.debug);
        if (!this.ready) {
            throw new DeveloperError('pickFeatures must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        if (!this.enablePickFeatures || !defined(this._pickFeaturesUrl) || this._getFeatureInfoFormats.length === 0) {
            return undefined;
        }

        let formatIndex = 0;

        let that = this;

        function handleResponse(format, data) {
            return format.callback(data);
        }

        function doRequest() {
            if (formatIndex >= that._getFeatureInfoFormats.length) {
                // No valid formats, so no features picked.
                return when([]);
            }

            let format = that._getFeatureInfoFormats[formatIndex];
            let url = this.buildPickFeaturesUrl(that, x, y, level, longitude, latitude, format.format);

            ++formatIndex;

            let xhrOptions = this._xhr;
            xhrOptions.url = url;
            if (format.type === 'json') {
                return Cesium.loadJson(xhrOptions).then(format.callback).otherwise(this.doRequest);
            } else if (format.type === 'xml') {
                return Cesium.loadXML(xhrOptions).then(format.callback).otherwise(this.doRequest);
            } else if (format.type === 'text' || format.type === 'html') {
                return Cesium.loadText(xhrOptions).then(format.callback).otherwise(this.doRequest);
            }

            xhrOptions.responseType = format.format;
            return Cesium.loadWithXhr(xhrOptions).then(handleResponse.bind(undefined, format)).otherwise(this.doRequest);
        }

        return this.doRequest();
    };


     buildUrl(imageryProvider, parts, partFunctionInvoker) {
        let url = '';

        for (let i = 0; i < parts.length; ++i) {
            let part = parts[i];
            if (typeof part === 'string') {
                url += part;
            } else {
                url += encodeURIComponent(partFunctionInvoker(part));
            }
        }

        let proxy = imageryProvider._proxy;
        if (!_.isUndefined(proxy)) {
            url = proxy.getURL(url);
        }

        return url;
    }
    
    buildImageUrl(imageryProvider, x, y, level) {
        this.degreesScratchComputed = false;
        this.projectedScratchComputed = false;

        return this.buildUrl(imageryProvider, imageryProvider._urlParts, function(partFunction) {
            return partFunction(imageryProvider, x, y, level);
        });
    };
    requestImage(x, y, level, request) {
        //>>includeStart('debug', pragmas.debug);
        if (!this.ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');
        let url = this.buildImageUrl(this, x, y, level);
        let headers = undefined;
        if ('headers' in this._xhr) {
            headers = this._xhr.headers;
        }
        return Cesium.ImageryProvider.loadImage(this, url, request, headers);
    };
}

export {UrlXHRTemplateImageryProvider}