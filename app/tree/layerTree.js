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

import {beforeSend} from './../util/xgdsUtils';

const Cookies = require( 'js-cookie' );

import {config} from './../../config/config_loader';

import 'jquery.fancytree/dist/skin-lion/ui.fancytree.less';

const $ = require('jquery');

const fancytree = require('jquery.fancytree');
require('jquery.fancytree/dist/modules/jquery.fancytree.filter');
require('jquery.fancytree/dist/modules/jquery.fancytree.persist');


class LayerTree {
    constructor(viewerWrapper,  popupDivId) {
        this.viewerWrapper = viewerWrapper;
        this.popupDiv = $('#' + popupDivId);
        this.visible = false;
        this.layersInitialized = false;
        this.initializeMapData();
    };

    toggle() {
        this.visible = !this.visible;
        if (this.visible){
            this.popupDiv.show();
            this.createTree();
        } else {
            this.popupDiv.hide();
        }
    };


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
	    }
    	return null;
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
    
    createTree() {
        if (_.isUndefined(this.tree) && !_.isNull(this.treeData)){
            let layertreeNode = this.popupDiv.find('#layertree');
            if (layertreeNode.length == 0){
            	return;
            }
            let context = this;
            let mytree =  layertreeNode.fancytree({
                extensions: ['persist', 'filter'], //, 'transparency_slider'],
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
                	app.vent.trigger('tree:expanded', data.node);
                },
                lazyLoad: function(event, data){
                    data.result = $.ajax({
                        xhrFields: {withCredentials: true},
                        beforeSend: beforeSend,
                        url: data.node.data.childNodesUrl,
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
                    });
                },
                select: function(event, data) {
                    console.log('SELECTED');
                    console.log(data);
                    // new simpler way
                    if (_.isUndefined(data.node.mapView)){
                        //app.vent.trigger('mapNode:create', data.node);
                    } else {
                        data.node.mapView.onRender(data.node.selected);
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
            this.tree = layertreeNode.fancytree('getTree');  //TODO see if this differs from mytree
            //this.setupContextMenu(layertreeNode); //TODO see about integrating context menu, need to make it flexible.
        }
    };

    refreshTree() {
        if (!_.isUndefined(this.tree)){
            this.tree.reload({
                url: config.layer_tree_url
            }).done(function(){
                console.log('RELOADED');
                //app.vent.trigger('layerView:reloadLayers');
            });
        }
    };

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
    	      n = app.tree.filterNodes(match, opts);
    	      $('button#btnResetSearch').attr('disabled', false);
    	      $('span#matches').text('(' + n + ' matches)');
    	    }).focus();
    };

    // load map tree ahead of time to load layers into map
    initializeMapData() {
        if (!this.layersInitialized){
            $.ajax({
                url: config.layer_tree_url,
                dataType: 'json',
                xhrFields: {withCredentials: true},
                beforeSend: beforeSend,
                success: $.proxy(function (data) {
                    console.log('loaded tree data');
                    if (data != null) {
                        this.treeData = data;
                        this.layersInitialized = true;
                        //app.vent.trigger('treeData:loaded');
                        //this.initializeMapLayers(app.treeData[0]);
                    }
                }, this),
                error: $.proxy(function(xhr, textStatus, errorThrown) {
                    console.log(textStatus);
                })
              });
            // turn on layers that were turned on in the cookies
            let selected_uuids = Cookies.get('fancytree-1-selected');
            if (selected_uuids != undefined && selected_uuids.length > 0){
                $.ajax({
                    url: '/xgds_map_server/uuidsjson/',
                    dataType: 'json',
                    type: 'POST',
                    xhrFields: {withCredentials: true},
                    beforeSend: beforeSend,
                    data: {'uuids':selected_uuids},
                    success: $.proxy(function(data) {
                        if (data != null){
                            this.selectNodes(data);
                        }
                    }, this),
                    error: $.proxy(function(xhr, textStatus, errorThrown) {
                        console.log(textStatus);
                    })
                });
            }
        }
    };

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