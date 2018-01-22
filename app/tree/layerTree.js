// __BEGIN_LICENSE__
//Copyright (c) 2015, United States Government, as represented by the
//Administrator of the National Aeronautics and Space Administration.
//All rights reserved.
//
//The xGDS platform is licensed under the Apache License, Version 2.0
//(the 'License'); you may not use this file except in compliance with the License.
//You may obtain a copy of the License at
//http://www.apache.org/licenses/LICENSE-2.0.
//
//Unless required by applicable law or agreed to in writing, software distributed
//under the License is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR
//CONDITIONS OF ANY KIND, either express or implied. See the License for the
//specific language governing permissions and limitations under the License.
// __END_LICENSE__


const Cookies = require( 'js-cookie/src/js.cookie' );

import {config} from 'config_loader';
import {xgdsAuth, getRestUrl} from 'util/xgdsUtils';

import 'jquery.fancytree/dist/skin-lion/ui.fancytree.css';

const $ = require('jquery');


const fancytree = require('jquery.fancytree');
require('jquery.fancytree/dist/modules/jquery.fancytree.filter');
require('jquery.fancytree/dist/modules/jquery.fancytree.select');
require('jquery.fancytree/dist/modules/jquery.fancytree.ui-deps');

//require('jquery.fancytree/dist/modules/jquery.fancytree.persist');

/**
 * @file layerTree.js
 * Use a provider of fancytree json data to drive a fancytree
 * When the nodes in the fancy tree are turned on/off they show or hide the layers in the Cesium view
 * For right now this controls the following:
 * -KML layers
 * -Map layers
 * -Map tiles
 * -Map data tiles
 * ** in progress
 * -Plans
 *
 * @todo refactor so that this is not so xGDS specific
 * @todo persist & use cookies
 * @todo test filtering
 * @todo customize tree styling
 *
 */

/**
 * @name LayerTree
 * Singleton to bridge between the viewer and fancytree
 *
 */
class LayerTree {

    /**
     * @function constructor
     * @param viewerWrapper the Viewerwrapper from cesiumlib
     * @param popupDivId the ID of the div that is the popup for fancytree
     * @param kmlManager
     * @param imageLayerManager
     *
     */
    constructor(viewerWrapper,  popupDivId, kmlManager, imageLayerManager, groundOverlayTimeManager) {
        this.viewerWrapper = viewerWrapper;
        this.kmlManager = kmlManager;
        this.imageLayerManager = imageLayerManager;
        this.groundOverlayTimeManager = groundOverlayTimeManager;
        this.popupDiv = $('#' + popupDivId);
        this.visible = false;
        this.layersInitialized = false;
        this.initializeMapData();
    };

    /**
     * @function toggle show or hide the popup for the layer manager
     * @todo turn this in to a dialog
     */
    toggle() {
        this.visible = !this.visible;
        if (this.visible){
            this.popupDiv.show();
            this.createTree();
        } else {
            this.popupDiv.hide();
        }
    };


    /**
     * @function getTreeIcon get the url for the icon to render in the tree node.
     * @param key
     * @returns {*}  the path to the png to render in the tree
     * @todo this is pretty brittle, defining all the icons right here.  Make it model driven.
     */
    getTreeIcon(key) {
    	switch (key) {
	        case 'MapLink':
	            return config.layer_tree_icon_url + 'link-16.png';
	        case 'KmlMap':
	            return config.layer_tree_icon_url + 'gearth.png';
	        case 'MapLayer':
	            return config.layer_tree_icon_url + 'maplayer.png';
	        case 'MapTile':
	            return config.layer_tree_icon_url + 'tif.png';
	        case 'MapDataTile':
	            return config.layer_tree_icon_url + 'dataTif.png';
            case 'PlanLink':
                return config.layer_tree_icon_url + 'plan.png';
            case 'GroundOverlayTime':
                return config.layer_tree_icon_url + 'overlayTime.svg';
	    }
    	return null;
    };

    /**
     * @function getKmlUrl
     * @param data the data from the selected node
     * @returns {*} the rest friendly url to get the data for a map layer or kml map
     *
     */
    getKmlUrl(data) {
        if ('kmlFile' in data.node.data){
            return getRestUrl(data.node.data.kmlFile);
        }
        return undefined;
    };

    /**
     * @function getImageLayerUrl
     * @param data
     * @returns {*} the rest url for getting the image layer
     *
     */
    getImageLayerUrl(data) {
        switch(data.node.data.type) {
            case 'MapTile':
            case 'MapDataTile':
                return getRestUrl(data.node.data.tilePath);
            default:
                return undefined;
        }
    };

    /*
    setupContextMenu(layertreeNode) {
    	layertreeNode.contextmenu({
    	      delegate: 'span.fancytree-title',
    	      menu: [
    	          {title: 'Download KML', cmd: 'download', uiIcon: 'ui-icon-arrowthickstop-1-s', disabled: false }
    	          ],
    	      beforeOpen: function(event, ui) {
    	        let node = $.ui.fancytree.getNode(ui.target);
    	        if (node !== null){
    	        		layertreeNode.contextmenu('enableEntry','download', _.contains(['MapLayer', 'KmlMap'], node.data.type))
    	        		node.setActive();
    	        }
    	      },
    	      select: function(event, ui) {
    	        let node = $.ui.fancytree.getNode(ui.target);
    	        if (node !== null){
    	        		if (ui.cmd == 'download') {
    	        			let url = '';
    	        			if (node.data.type == 'MapLayer'){
	    	        			url = '/xgds_map_server/maplayer/kml/';
	    	        			url += node.key + '.kml';
    	        			} else if (node.data.type == 'KmlMap'){
	    	        			url = node.data.kmlFile;
    	        			}
    	        			$.fileDownload(url, {
    	            		 	httpMethod: 'GET',
    	                     failCallback: function (htmlResponse, url) {
    	                    	 	console.log(htmlResponse);
    	                    	 	alert('Could not download kml.');
    	                     }
    	                 });
    	        		}
    	        }
    	      }
    	    });
    };
    */

    /**
     * @function createTree
     * Actually construct the fancytree
     *
     */
    createTree() {
        if (_.isUndefined(this.tree) && !_.isNull(this.treeData)){
            let layertreeNode = this.popupDiv.find('#layertree');
            if (layertreeNode.length == 0){
            	return;
            }
            let context = this;

            let mytree =  layertreeNode.fancytree({
                //extensions: ['persist', 'filter'], //, 'transparency_slider'],
                extensions: ['filter'],
                source: this.treeData,
                filter: {
                    autoApply: true,  // Re-apply last filter if lazy data is loaded
                    counter: true,  // Show a badge with number of matching child nodes near parent icons
                    fuzzy: false,  // Match single characters in order, e.g. 'fb' will match 'FooBar'
                    hideExpandedCounter: true,  // Hide counter badge, when parent is expanded
                    highlight: true,  // Highlight matches by wrapping inside <mark> tags
                    mode: 'hide',  // Hide unmatched nodes (pass 'dimm' to gray out unmatched nodes)
                    autoExpand: true
                  },
                checkbox: true,
                icon: function(event, data) {
                	  if( !data.node.isFolder() ) {
                		  return context.getTreeIcon(data.node.data.type);
                	  }
                	},
                expand: function(event, data){
                	//app.vent.trigger('tree:expanded', data.node);
                },
                lazyLoad: function(event, data){
                    let settings = {
                        url: getRestUrl(data.node.data.childNodesUrl),
                        dataType: 'json',
                        success: $.proxy(function (data) {
                            if (!_.isUndefined(data) && data.length > 0) {
                                $.each(data, function (index, datum) {
                                    console.log(datum);
                                    //app.vent.trigger('treeNode:loaded', datum);
                                    //app.vent.trigger('mapNode:create', datum);
                                    if (!_.isUndefined(datum.children)) {
                                        $.each(datum.children, function (index, child) {
                                            console.log(child);
                                            //app.vent.trigger('mapNode:create', child);
                                        });
                                    }
                                });
                            }
                        }, this),
                        error: $.proxy(function(xhr, textStatus, errorThrown) {
                            console.log(textStatus);
                        })
                    };
                    data.result = $.ajax(xgdsAuth(settings));
                },
                select: function(event, data) {
                    let kmlUrl = context.getKmlUrl(data);
                    if (kmlUrl !== undefined) {
                        if (data.node.selected) {
                            context.kmlManager.show(kmlUrl);
                        } else {
                            context.kmlManager.hide(kmlUrl);
                        }
                    } else  {
                        // see if it is an image layer
                        let imageLayerUrl = context.getImageLayerUrl(data);
                        if (imageLayerUrl !== undefined){
                            if (data.node.selected) {
                                let options = {url:imageLayerUrl,
                                               flipXY: true}; // we know that we want this set for layers we made
                                if (data.node.data.projectionName !== undefined){
                                    options.projectionName = data.node.data.projectionName;
                                    if (data.node.data.minx !== undefined) {
                                        //build bounding rectangle
                                        options.bounds = {minx: data.node.data.minx,
                                                          miny: data.node.data.miny,
                                                          maxx: data.node.data.maxx,
                                                          maxy: data.node.data.maxy
                                        }
                                        // console.log(options.url);
                                        // options.url = options.url + '/{z}/{x}/{y}.png';
                                        // console.log(options.url);
                                    }
                                    options.flipXY = false;
                                }
                                context.imageLayerManager.show(options);
                            } else {
                                context.imageLayerManager.hide(imageLayerUrl);
                            }
                        } else {
                            // see if it is a ground overlay time layer
                            if (data.node.data.type == "GroundOverlayTime") {
                                if (data.node.selected) {
                                    data.node.data.id = data.node.key;
                                    data.node.data.name = data.node.title;
                                    context.groundOverlayTimeManager.show(data.node.data);
                                } else {
                                    context.groundOverlayTimeManager.hide(data.node.key);
                                }
                            }
                        }
                    }
                  },
                  persist: {
                      cookieDelimiter: '~',    // character used to join key strings
                      cookiePrefix: undefined, // 'fancytree-<treeId>-' by default
                      cookie: { // settings passed to js.cookie plugin
                        raw: false,
                        expires: '',
                        path: '',
                        domain: '',
                        secure: false
                      },
                      expandLazy: false, // true: recursively expand and load lazy nodes
                      overrideSource: true,  // true: cookie takes precedence over `source` data attributes.
                      store: 'cookie',     // 'cookie': use cookie, 'local': use localStore, 'session': use sessionStore
                      types: 'active expanded focus selected'  // which status types to store
                    }
            });
            this.tree = fancytree.getTree(layertreeNode);  //TODO see if this differs from mytree
            //this.setupContextMenu(layertreeNode); //TODO see about integrating context menu, need to make it flexible.
        }
    };

    /**
     * @function refresh
     * Refresh the fancy tree with data from its url
     *
     */
    refresh() {
        if (!_.isUndefined(this.tree)){
            this.tree.reload({
                url: config.layer_tree_url
            }).done(function(){
                console.log('RELOADED');
                //app.vent.trigger('layerView:reloadLayers');
            });
        }
    };

    /**
     * @function connectFilter
     * Connect the filter input and button to the fancy tree
     *
     */
    connectFilter() {
    	$('#btnResetSearch').click(function(e){
    	      $('input[name=searchTree]').val('');
    	      $('span#matches').text('');
    	      this.tree.clearFilter();
    	    }).attr('disabled', true);

    	$('input[name=searchTree]').keyup(function(e){
    	      let n,
    	        opts = {
    	          autoExpand: true,
    	          leavesOnly: false
    	        },
    	        match = $(this).val();

    	      if(e && e.which === $.ui.keyCode.ESCAPE || $.trim(match) === ''){
    	        $('button#btnResetSearch').click();
    	        return;
    	      }
    	      // Pass a string to perform case insensitive matching
    	      n = this.tree.filterNodes(match, opts);
    	      $('button#btnResetSearch').attr('disabled', false);
    	      $('span#matches').text('(' + n + ' matches)');
    	    }).focus();
    };

    /**
     * @function initializeMapData
     * load map tree ahead of time to load layers into map, using cookies from persistence and original forced-on layers from server
     * @todo does this need refactoring?
     *
     */
    initializeMapData() {
        if (!this.layersInitialized){
            let settings = {
                url: config.layer_tree_url,
                dataType: 'json',
                success: $.proxy(function (data) {
                    if (data != null) {
                        this.treeData = data;
                        this.layersInitialized = true;
                        //this.initializeMapLayers(app.treeData[0]);
                    }
                }, this),
                error: $.proxy(function(xhr, textStatus, errorThrown) {
                    console.log(textStatus);
                })
            };
            $.ajax(xgdsAuth(settings));
            // turn on layers that were turned on in the cookies
            let selected_uuids = Cookies.get('fancytree-1-selected');
            if (!_.isEmpty(selected_uuids)){
                let settings2 = {
                    url: '/xgds_map_server/uuidsjson/',
                    dataType: 'json',
                    type: 'POST',
                    data: {'uuids':selected_uuids},
                    success: $.proxy(function(data) {
                        if (data != null){
                            this.selectNodes(data);
                        }
                    }, this),
                    error: $.proxy(function(xhr, textStatus, errorThrown) {
                        console.log(textStatus);
                    })
                };
                $.ajax(xgdsAuth(settings2));
            }
        }
    };

    /**
     * @function selectNodes Preselect (check) nodes in the fancytree that are cookied as selected
     * @param nodes
     */
    selectNodes(nodes){
        // select specific nodes that were set in cookies
        for (let i=0; i<nodes.length; i++){
            let node = nodes[i];
            node.selected = true;
            //this.createNode(nodes[i]);
        }
    };
}

export {LayerTree}