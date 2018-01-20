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

import * as _ from 'lodash';
const Cesium = require('cesium/Cesium');


/**
 * @file elementManager.js
 * Utilities for managing elements in Cesium
 *
 */

/**
 * @name ElementManager
 * Singleton to manage Cesium elements
 * This class is intended to be extended
 *
 */
class ElementManager {

    /**
     * @function constructor
     * @param viewerWrapper
     * Construct and initialize
     *
     */
    constructor(viewerWrapper) {
        this.viewerWrapper = viewerWrapper;
        this.elementMap = {};
        this.initialize();
    };

    /**
     * @function getInitialElementList
     * @returns {undefined} returns the list of initial map elements to be loaded, by identifier metadata (ie url or options)
     */
    getInitialElementList(){
        return undefined;
    }

     /**
      * @function initialize
      * Initialize with elements set up in config
      * @todo support cookies
      *
      */
    initialize(){
        let initialElements = this.getInitialElementList();
        if (initialElements !== undefined && !_.isEmpty(initialElements)) {
            this.loadElements(initialElements);
        }
    };

    /**
     * @function hide
     * @param elementUrl
     * Remove an element from the viewer's data sources (if it was loaded)
     * Each type of element must show or hide itself in the appropriate way.
     *
     */
    hide(elementUrl){
        if (elementUrl in this.elementMap){
            this.doHide(this.elementMap[elementUrl]);
        }
    };

    /**
     * @function doHide
     * @param element the element to hide
     * Actually hide the element in Cesium.
     * @abstract this function must be overridden
     *
     */
    doHide(element){
        console.log('DOHIDE FUNCTION UNDEFINED');
        // pass
    }

     /**
      * @function show
      * @param elementUrl
      * Add an element to the viewer if it was already loaded
      * Otherwise, load it and then show it.
      *
      */
    show(elementUrl){
        if (elementUrl in this.elementMap){
            this.doShow(this.elementMap[elementUrl])
        } else {
            this.load(elementUrl);
        }
    }

    /**
     * @function load
     * @param elementUrl
     * @param callback
     * Load an element from url and add it to the viewer and the elementmap to toggle later
     * @abstract
     *
     */
    load(elementUrl, callback) {
        console.log('ATTEMPTED TO CALL ABSTRACT LOAD FUNCTION');
    };

    /**
     * @function loadElements
     * @param elementUrls array of kml urls
     * @param callback
     * Load many elements from an array of urls
     *
     */
    loadElements(elementUrls, callback) {
        if (!_.isEmpty(elementUrls)) {
            for (let i = 0; i < elementUrls.length; i++) {
                this.load(elementUrls[i], callback);
            }
        }
    };
}

export {ElementManager}