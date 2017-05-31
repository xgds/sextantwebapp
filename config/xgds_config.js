module.exports = {

	// The server that is running this node app 
    server : { port : 3001, //(process.env.PORT || 3001),
    		   name : 'localhost',
    		   protocol: 'http' },
    		   
    // This should only exist in xGDS side
    sse : { port : 443, 
    	    name : 'localhost',
    	    protocol : 'https' },
    
    // If we are using web sockets this should only exist in the default side
    socket : { port : 2999 },
    
    // How we talk to the python sextant service
    sextant : { port : 5000 },
    
    // Where we get the terrain data from, this was only from default side.
    terrain : { port : 9090 },
    
    // Default geographical site
    defaultSite : 'HI_Mauna_Ulu',
    
    // list of various sites we support
    sites : { 'HI_Mauna_Ulu' : { 'imagery' : 'CustomMaps/HI_lowqual_relief',
    							 'elevation' : 'tilesets/HI_highqual',
    							 'centerPoint' : [-155.2118, 19.3647, 5000]
    							},
    		  'ID_COTM' : { 'imagery' : 'TODO',
       						'elevation' : 'TODO',
       						'centerPoint' : [-113.5787682, 43.4633101, 5000]
       					  }
             },
    
    // whether or not this is a development server
    debug : true

}
