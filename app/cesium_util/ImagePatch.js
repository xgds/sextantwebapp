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
//

/*
  Right now (version 1.41) Cesium does not nicely handle authentication when loading images.
  Here we will override their functions to include headers, so our UrlXHRTemplateImageryProvider can pass along the headers
 */
import * as _ from "lodash";

const Cesium = require('cesium/Cesium');

const ktxRegex = /\.ktx$/i;
const crnRegex = /\.crn$/i;

let xhrBlobSupported = (function() {
    try {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', '#', true);
        xhr.responseType = 'blob';
        return xhr.responseType === 'blob';
    } catch (e) {
        return false;
    }
})();

Cesium.loadImageViaBlob = function(url, request, headers) {
    if (!xhrBlobSupported || Cesium.isDataUri(url)) {
        return Cesium.loadImage(url, undefined, request);
    }

    let blobPromise = Cesium.loadBlob(url, headers, request);
    if (_.isUndefined(blobPromise)) {
        return undefined;
    }

    return blobPromise.then(function(blob) {
        if (_.isUndefined(blob)) {
            return;
        }
        let blobUrl = window.URL.createObjectURL(blob);

        return Cesium.loadImage(blobUrl, false).then(function(image) {
            image.blob = blob;
            window.URL.revokeObjectURL(blobUrl);
            return image;
        }, function(error) {
            window.URL.revokeObjectURL(blobUrl);
            return when.reject(error);
        });
    });
};

Cesium.ImageryProvider.loadImage = function(imageryProvider, url, request, headers) {
    if (ktxRegex.test(url)) {
        return Cesium.loadKTX(url, headers, request);
    } else if (crnRegex.test(url)) {
        return Cesium.loadCRN(url, headers, request);
    } else if (!_.isUndefined(headers) || !_.isUndefined(imageryProvider.tileDiscardPolicy)) {
        return Cesium.loadImageViaBlob(url, request, headers);
    }

    return Cesium.loadImage(url, undefined, request);
};



