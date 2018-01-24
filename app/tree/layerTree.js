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


window.Cookies = require('js-cookie');  // normal imports did not work so hardcoded here.

import {config} from 'config_loader';
import {xgdsAuth, getRestUrl} from 'util/xgdsUtils';

import 'jquery.fancytree/dist/skin-lion/ui.fancytree.css';

const $ = require('jquery');


const fancytree = require('jquery.fancytree');
require('jquery.fancytree/dist/modules/jquery.fancytree.filter');
require('jquery.fancytree/dist/modules/jquery.fancytree.select');
require('jquery.fancytree/dist/modules/jquery.fancytree.ui-deps');

require('jquery.fancytree/dist/modules/jquery.fancytree.persist');
//require('jquery.slider');
require('tree/fancyTreeSlider');


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
        this.transparencySlidersVisible = false;
        this.initializeMapData();
    };

    /**
     * @function toggle show or hide the popup for the layer manager
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
                extensions: ['filter', 'transparency_slider', 'persist'],
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
                    context.doSelect(data, context);
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
            this.connectFilter(this);
            //this.setupContextMenu(layertreeNode); //TODO see about integrating context menu, need to make it flexible.
        }
    };

    doSelect(data, context) {
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
    };

    loadTreeData(afterLoad) {
        let settings = {
            url: config.layer_tree_url,
            dataType: 'json',
            success: $.proxy(function (data) {
                if (data != null) {
                    this.treeData = data;
                    this.layersInitialized = true;
                    if (!_.isUndefined(afterLoad)){
                        afterLoad(data);
                    }
                    //this.initializeMapLayers(app.treeData[0]);
                }
            }, this),
            error: $.proxy(function(xhr, textStatus, errorThrown) {
                console.log(textStatus);
                alert("Problem loading layers.");
            })
        };
        $.ajax(xgdsAuth(settings));
    };

    /**
     * @function refresh
     * Refresh the fancy tree with data from its url
     *
     */
    refresh() {
        if (!_.isUndefined(this.tree)){
            let context = this;

            this.loadTreeData(function(data) { context.tree.reload(data)});
            //this.tree.reload(this.treeData);
            // this.tree.reload({
            //     url: config.layer_tree_url
            // }).done(function(){
            //     console.log('RELOADED');
            //     //app.vent.trigger('layerView:reloadLayers');
            // });
        }
    };

    /**
     * @function connectFilter
     * Connect the filter input and button to the fancy tree
     *
     */
    connectFilter(context) {
        $('#btnResetSearch').click(function(e){
            $('input[name=searchTree]').val('');
            $('span#matches').text('');
            context.tree.clearFilter();
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
            n = context.tree.filterNodes(match, opts);
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
            this.loadTreeData();
            // turn on layers that were turned on in the cookies
            let selected_uuids = Cookies.get('fancytree-1-selected');
            if (!_.isEmpty(selected_uuids)){
                let settings2 = {
                    url: config.layer_tree_get_node_data_url,
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
            this.doSelect({node:node}, this);
        }
    };

    handleTransparencySliderChange(event, ui) {
        let newValue = ui.value;
        let node_id = ui.handle.parentElement.id.substring(0, ui.handle.parentElement.id.length - 7);
        let node = app.tree.getNodeByKey(node_id);
        if (node.mapView != undefined) {
            node.mapView.setTransparency(newValue);
        }
        // set the printed value
        let transparencyValueID = '#' + node_id + '_transparencyValue';
        let transparencyValueSpan = $(ui.handle.parentElement.parentElement).find(transparencyValueID);
        $(transparencyValueSpan).html(newValue);

        Cookies.set(node_id, {transparency: newValue});
    };

    toggleTransparencySliders(rootNode) {
        this.transparencySlidersVisible = !this.transparencySlidersVisible;
        if (this.transparencySlidersVisible){
            if (rootNode == undefined){
                rootNode = this.tree.getRootNode();
            }
            this.showTransparencySliders(rootNode);
        } else {
            $(".transparency_value").hide();
            $(".transparency_slider").hide(); //.slider("destroy");
        }
    };


    showTransparencySliders(node){
        let context = this;
        node.visit(function(node) {
            if (node.data.transparency != undefined){
                let el = $(node.li)
                let value_span = el.find(".transparency_value");

                if (value_span.length == 0){
                    let slider_div = el.find(".transparency_slider");
                    let theSlider = slider_div.slider({value:node.data.transparency,
                        slide: context.handleTransparencySliderChange});

                    // add the value
                    let transparencyValueID = node.key + '_transparencyValue';
                    let transparencyHtml = '<span style="float:right;" class="transparency_value" id=' + transparencyValueID + '>' + node.data.transparency + '</span>';
                    $(slider_div).parent().append($(transparencyHtml));
                } else {
                    let slider_div = $(value_span).prev();
                    slider_div.toggle();
                    value_span.toggle();
                }
            }
            return true;
        });
    };
};


export {LayerTree}