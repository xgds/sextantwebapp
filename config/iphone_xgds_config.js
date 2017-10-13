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

	// The server that is running this node app 
    server : { port : 3001,
    		   cesium_port: undefined,
    		   name : '128.102.236.78', //TODO REPLACE THIS WITH YOUR IP ADDRESS 
    		   //name : 'tamar-docker.xgds.org', //TODO REPLACE THIS WITH YOUR SSL-CERT NAME
    		   protocol: 'https',
    		   nginx_prefix: 'wristApp'},
    		   
    // This should only exist in xGDS side
    xgds : { port : 443, 
    		name : '128.102.236.78', //TODO REPLACE THIS WITH YOUR IP ADDRESS 
		   //name : 'tamar-docker.xgds.org', //TODO REPLACE THIS WITH YOUR SSL-CERT NAME
    	    protocol : 'https',
    	    ev_channels: ['EV1', 'EV2'],
       	follow_channel: 'EV1',
       	username: 'ev1', //TODO put in username',
       	password: 'ev1', //TODO put in auth token'
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
    
    // Default geographical site
    defaultSite : 'HI_Kilauea',
    
    // list of kml links to load
    kml_urls : ['https://128.102.236.78/notes/rest/notesFeed.kml',
        		    'https://128.102.236.78/basaltApp/rest/hvnp_so2.kml'], //TODO REPLACE THIS WITH YOUR IP ADDRESS

    // list of various sites we support
    sites : { 'HI_Mauna_Ulu' : { 'imagery' : 'CustomMaps/HI_lowqual_relief',
    							 'elevation' : 'tilesets/HI_highqual',
    							 'centerPoint' : [-155.2118, 19.3647, 5000]
    							},
				'HI_Kilauea' : { 'imagery' : 'CustomMaps/HI_kilauea',
					'elevation' : 'tilesets/HI_kilauea',
					'centerPoint' : [-155.260059,  19.408373, 5000]
				},
    			  'ID_COTM' : { 'imagery' : 'TODO',
       						'elevation' : 'TODO',
       						'centerPoint' : [-113.5787682, 43.4633101, 5000]
       					  },
       		  'Ames' : { 'imagery': 'TODO',
       			  		 'elevation': 'TODO',
       			  		 'centerPoint' : [-122.064789, 37.419362, 5000]
       		  		  },
       	       'Black_Point' : { 'imagery' : 'TODO',
 						 'elevation' : 'TODO',
 						 'centerPoint' : [-111.466442, 35.690775, 6000]
 		  }

    },
    
    // whether or not this is a development server
    debug : true,
    
    // whether or not to show lat long elevation hovering over mouse move
    showCoordinates : false,

    // TODO override with your key if using bing.
    bing_key : 'Ak71PK14Ypz2_IuQ2-TGbV-OVYLKeg_KEXFFYiNmEny6aFJVYxUg_pUxZfhaQ2vy',

    //List of Connected Devices TODO replace with your IP
//    connectedDevices : { url : 'https://10.131.26.180/xgds_status_board/rest/multiSubsystemStatusJson/',
//
//                        list : 
//                          {pXRF : 'pXRF', 
//                          LIBS : 'LIBS', 
//                          FLIR : 'FLIR', 
//                          FTIR : 'FTIR', 
//                          redCamera2 : 'CAM2', 
//                          boat2 : 'IV'}
//                        }
    connectedDevices : {pXRF : 'pXRF', 
          			   LIBS : 'LIBS', 
          			   FLIR : 'FLIR', 
          			   FTIR : 'FTIR', 
          			   redCamera2 : 'CAM2', 
          			   boat : 'IV'}
}
