// __BEGIN_LICENSE__
//Copyright (c) 2015, United States Government, as represented by the 
//Administrator of the National Aeronautics and Space Administration. 
//All rights reserved.
//
//The xGDS platform is licensed under the Apache License, Version 2.0 
//(the "License"); you may not use this file except in compliance with the License. 
//You may obtain a copy of the License at 
//http://www.apache.org/licenses/LICENSE-2.0.
//
//Unless required by applicable law or agreed to in writing, software distributed 
//under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR 
//CONDITIONS OF ANY KIND, either express or implied. See the License for the 
//specific language governing permissions and limitations under the License.
// __END_LICENSE__

const USERNAME = 'TODO:USERNAME';
const PASSWORD = 'TODO:PASSWORD';
const SERVER_NAME = 'localhost';
const LOCAL_SERVER_NAME = 'localhost';
const NGINX_PREFIX = 'wristApp';


module.exports = {

	mode: 'XGDS_SSE',  // valid modes: XGDS, XGDS_SSE, STANDALONE

	// The server that is running this node app 
    server : { port : 3001,
    		   cesium_port: undefined,
    		   name : LOCAL_SERVER_NAME,
    		   protocol: 'https',
    		   nginx_prefix: NGINX_PREFIX},
    		   
    // This should only exist in xGDS side
    xgds : { port : 443, 
    		name : SERVER_NAME,
    		protocol : 'https',
    	    ev_channels: ['EV1'],
    	    follow_channel: 'EV1',
	    	username: USERNAME,
	    	password: PASSWORD
    },
    
    // If we are using web sockets this should only exist in the default side
    socket : { protocol : 'http',
    	       port : 2999 },
    
    // How we talk to the python sextant service
    sextant : { protocol : 'https',
       		    nginx_prefix: 'pextant',
       	        port : 5000 },
    
    // Where we get the terrain data from, this was only from default side.
    terrain : { port : 9090 },
    
    baseImagery: {'url': '/cesium-assets/imagery/NaturalEarthII' },
    //baseImagery: {'url': '/Assets/Textures/NaturalEarthII' },

    // Default geographical site
    defaultSite : 'HI_Kilauea',
    
    // list of kml links to load
    kml_urls : ['https://'  + SERVER_NAME + '/notes/rest/notesFeed.kml',
    				'https://'  + SERVER_NAME + '/xgds_sample/rest/samplesFeed.kml',
    				//'https://'  + SERVER_NAME + '/xgds_map_server/rest/maplayer/kml/765f45be-bb57-4695-af40-36d5b86eb728.kml',
        		    'https://'  + SERVER_NAME + '/basaltApp/rest/https_hvnp_so2_link.kml'],
    
    // list of various sites we support
    sites : { 'HI_Mauna_Ulu' : {'imagery': {'url': 'https://' + SERVER_NAME + '/data/rest/xgds_map_server/geoTiff/KI_lidar_slope_tile2',
    									 				'flipXY': true
    									 				},
    								//'elevation' : 'cesium_tilesets/HI_mauna_ulu',
    								'centerPoint' : [-155.2118, 19.3647, 5000]
    							},
			'HI_Kilauea' : { 
							 'imagery': {'url': 'https://' + SERVER_NAME + '/data/rest/xgds_map_server/geoTiff/Kilauea_True_Color',
								         'flipXY': true},
				 			 //'elevation' : 'cesium_tilesets/HI_kilauea',
				 			 'centerPoint' : [-155.260059,  19.408373, 5000]
				},
    			  'ID_COTM' : { 'tileMapResource': {'url': 'https://' + SERVER_NAME + '/data/rest/xgds_map_server/geoTiff/hwy_flow_k',
		 					'flipXY': true},
       						'centerPoint' : [-113.5787682, 43.4633101, 5000]
       					  },
       		  'Ames' : { 'imagery': 'TODO',
       			  		 'centerPoint' : [-122.064789, 37.419362, 5000]
       		  		  },
       	       'Black_Point' : { 'imagery' : 'TODO',
 						 'centerPoint' : [-111.466442, 35.690775, 6000]
 		  }

    },

	// url for fancytree json data for layers
	layer_tree_url: 'https://'  + SERVER_NAME + '/xgds_map_server/rest/treejson/',
	layer_tree_icon_url:  'https://' + LOCAL_SERVER_NAME + '/' + NGINX_PREFIX + '/icons/',

    // whether or not to show lat long elevation hovering over mouse move
    showCoordinates : false,

    // TODO override with your key if using bing.
    //bing_key : 'PUT YOUR BING KEY HERE',
    
    //List of Connected Devices 
    //connectedDevices : {  redCamera1 : 'CAM1', 
    //                      boat2 : 'IV'
    //                    }
    connectedDevices : {}

    // if you want express to add cors headers because pages from this server will be included in other websites
    //cors: true,

    // if you have other external websites that require authorization add them here
    //trustedServers: [{'name':'myhostname.com', 'port':80}]


}
