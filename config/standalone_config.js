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
module.exports = {

    mode: 'STANDALONE',  // valid modes: XGDS, XGDS_SSE, STANDALONE

	// The server that is running this node app 
    server : { port : 3002,
    		   cesium_port: 3002,
    		   name : 'localhost',
    		   protocol: 'http',
               public_prefix: '/wristApp',
    		   nginx_prefix: ''},
    		   
    // If we are using web sockets this should only exist in the default side
    socket : { protocol : 'http',
    		   port : 2999 },
    
    // How we talk to the python sextant service
    sextant : { protocol : 'http',
    		    nginx_prefix: '',
    	        port : 5000 },
    
    // Where we get the terrain data from, this was only from default side.
    terrain : { port : 9090 },
    
    // If you have base imagery include it locally or remotely here
    //baseImagery: {'url': '/cesium-assets/imagery/NaturalEarthII' },

    // Default geographical site
    defaultSite : 'HI_Mauna_Ulu',
    
    // list of various sites we support
    sites : {
        'HI_Mauna_Ulu' : {
            'imagery' : {'url':'/CustomMaps/MU_Pan_Sharp_contrast'},
            'elevation' : 'cesium_tilesets/HI_highqual',
            'centerPoint' : [-155.2118, 19.3647, 5000]
        },
        'HI_Kilauea' : {
            'imagery' : {'url':'/CustomMaps/HI_kilauea'},
            'elevation' : 'cesium_tilesets/HI2',
            'centerPoint' : [-155.260059,  19.408373, 5000]
        },
        'ID_COTM' : {'centerPoint' : [-113.5787682, 43.4633101, 5000]
        				},
        'Ames' : { 'centerPoint' : [-122.064789, 37.419362, 5000]
        			  },
        'Black_Point' : {  'centerPoint' : [-111.466442, 35.690775, 6000]
        					}
    },
	
	// list of kml links to load
    kml_urls : [],
    
    
    // whether or not this is a development server
    debug : true,
    
    // whether or not to show lat long elevation hovering over mouse move
    showCoordinates : false,
    
    // TODO override with your key.
    bing_key : '#TODO PUT IN YOUR BING KEY'

    // if you want express to add cors headers because pages from this server will be included in other websites
    //cors: true,

    // if you have other external websites that require authorization add them here
    //trustedServers: [{'name':'myhostname.com', 'port':80}]



}
