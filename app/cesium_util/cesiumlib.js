import {config} from './../../config/config_loader';

import 'cesium/Source/Widgets/widgets.css';
import './style.css';

import buildModuleUrl from 'cesium/Source/Core/buildModuleUrl';
buildModuleUrl.setBaseUrl('./');

// Load all cesium components required
import {Viewer, EllipsoidTerrainProvider, Cartesian3, CesiumMath, Cartographic, Ellipsoid, Color,
		sampleTerrain, ScreenSpaceEventHandler, ScreenSpaceEventType, Rectangle,
		CreateTileMapServiceImageryProvider, CesiumTerrainProvider, CallbackProperty, VerticalOrigin, 
		PinBuilder} from './cesium_imports'

if (!('destination' in config)) {
	config.destination = Cartesian3.fromDegrees(config.siteConfig.centerPoint[0], config.siteConfig.centerPoint[1], config.siteConfig.centerPoint[2]);
}

const pinBuilder = new PinBuilder();

class ViewerWrapper{
    constructor(host, port, terrainExaggeration, container) {
        this.container = container;
        this.host = host;
        this.port = port;
        this.layerList = {};
        this.terrainList = {};
        this.terrainExaggeration = terrainExaggeration;
        this.globalpoint = null;
        this.mesh_upper_left = null;
        this.mesh_entities = [];
        this.mesh_rowcol = [];

        // Set simple geometry for the full planet
        const terrainProvider = new EllipsoidTerrainProvider();
        this.terrainList['default'] = terrainProvider;

        // Basic texture for the full planet
        this.layerList['default'] = 'Assets/Textures/NaturalEarthII';

        const imageryProvider = CreateTileMapServiceImageryProvider({
            url : this.serveraddress(this.port) + '/' + this.layerList['default'],
            fileExtension : 'jpg'
        });

        const viewer = new Viewer(this.container, {
            timeline : false,
            creditContainer : 'credits',
            terrainExaggeration : terrainExaggeration,
            baseLayerPicker : false,
            terrainProvider : terrainProvider,
            //imageryProvider : imageryProvider

        });
        viewer.infoBox.frame.sandbox = 
        	'allow-same-origin allow-top-navigation allow-pointer-lock allow-popups allow-forms allow-scripts';
        
        const flewTo = viewer.scene.camera.flyTo({
            destination: config.destination,
            duration: 3,
            complete: function(){
                //this.addTerrain('tilesets/HI_highqual');
                //this.addImagery('CustomMaps/MU_Pan_Sharp_contrast');
                //  'https://s3-us-west-2.amazonaws.com/sextantdata'
                // this.log('zoomed');
                //this.addImagery('CustomMaps/HI_air_imagery_relief_100');
            	
            	this.addLatLongHover();
            }.bind(this)
        });

        const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction(function(movement) {
            document.getElementById('hovercoord').innerHTML = this.globalpoint['latitude'].toString() + '</br>' 
            												+ this.globalpoint['longitude'].toString() + '</br>'
            												+ this.globalpoint['altitude'].toString();

        }.bind(this), ScreenSpaceEventType.LEFT_DOWN);

        this.viewer = viewer;
        this.scene = viewer.scene;
        this.camera = viewer.scene.camera;
        this.layers = viewer.scene.imageryLayers;
    }

    serveraddress(port){
        return this.host + ':' + this.port;
    };

    addGeoPoint(vizsocket){
        const viewer = this.viewer;
        const entity = viewer.entities.add({
            label : {
                show : false
            }
        });

        const scene = viewer.scene;
        const handler = new ScreenSpaceEventHandler(scene.canvas);
        handler.setInputAction(function(movement) {
            const ray = viewer.camera.getPickRay(movement.endPosition);
            const cartesian= viewer.scene.globe.pick(ray, viewer.scene);
            if (cartesian) {
                const cartographic = Cartographic.fromCartesian(cartesian);
                const longitudeString = CesiumMath.toDegrees(cartographic.longitude).toFixed(4);
                const latitudeString = CesiumMath.toDegrees(cartographic.latitude).toFixed(4);
                const carto_WGS84 = Ellipsoid.WGS84.cartesianToCartographic(cartesian);
                const heightString = carto_WGS84.height.toFixed(4)/this.terrainExaggeration;

                entity.position = cartesian;
            	entity.label.show = true;
            	entity.label.text = '(' + longitudeString + ', ' + latitudeString + ', ' + heightString + ')';

                const object = {
                    'name': 'GeoPoint',
                    'arguments': {
                        'type': 'LAT_LONG',
                        'latitude': CesiumMath.toDegrees(cartographic.latitude),
                        'longitude': CesiumMath.toDegrees(cartographic.longitude)
                    }
                };

                vizsocket.add(object);
            }
        }.bind(this), ScreenSpaceEventType.MOUSE_MOVE);
    };

    addImagery(folder_location, image_address){
        if(typeof image_address === 'undefined') {
            image_address = this.serveraddress();
        }
        this.layerList[folder_location] = this.layers.addImageryProvider(new CreateTileMapServiceImageryProvider({
            url : image_address + '/' + folder_location
        }));
    };

    addTerrain(folder_location, image_address) {
        if(typeof image_address === 'undefined') {
            image_address = this.serveraddress();
        }
        const new_terrain_provider = new CesiumTerrainProvider({
            url : image_address + '/' + folder_location
        });
        this.terrainList[folder_location] = new_terrain_provider;
        this.viewer.scene.terrainProvider = new_terrain_provider;
    };

    addRectangle(center, length){

    };

    addMesh(upperLeft, lowerRight, dem){
//        console.log('draping mesh');
//        console.log(dem[0]);
        if (upperLeft != this.mesh_upper_left) {
            this.mesh_upper_left = upperLeft;

            const [lon_west, lon_east] = [upperLeft.longitude, lowerRight.longitude];
            const lon_spacing = dem[0].length;
            const lonstep = (lon_east - lon_west) / lon_spacing;
            const [lat_north, lat_south] = [upperLeft.latitude, lowerRight.latitude];
            const lat_spacing = dem.length;
            const latstep = (lat_north - lat_south) / lat_spacing;

            const [ul_col, ul_row, lr_col, lr_row] = [upperLeft.col, upperLeft.row, lowerRight.col, lowerRight.row];
//            console.log(ul_col);
//            console.log(lr_row);

            // Remove all 'old' entities
//            console.log('made it until the loop');
            let col = ul_col-1;
            let i = -1;
            for (let lon = lon_west; lon < lon_east; lon += lonstep) {
                i++;
                col+=1;
                let row = lr_row+1;
                let j = lat_spacing+1;
                //console.log(lon);
                for (let lat = lat_south; lat < lat_north; lat += latstep) {
                    j-=1;
                    row -=1;
                    let hackyhash = row.toString()+col.toString();
                    if(!this.mesh_rowcol.includes(hackyhash)) {
//                        console.log(dem[j][i]);
                        let entity = this.viewer.entities.add({
                            rectangle: {
                                coordinates: Rectangle.fromDegrees(lon, lat, lon + lonstep, lat + latstep),
                                material: Color.fromRandom({alpha: 0.5})
                            }
                        });
                        this.mesh_entities.push(entity);
                        if(this.mesh_entities.length > 1000){
                            while(this.mesh_entities.length > 1000){
                                this.viewer.entities.remove(this.mesh_entities.shift());
                            }
                        }
                        this.mesh_rowcol.push(hackyhash);
                    }else{
//                        console.log('already included');
                    }
                }
            }
            //this.viewer.zoomTo(entity);
            //console.log('done with loop');
        }
    };

    addLatLongHover(){
        const viewer = this.viewer;
        const entity = viewer.entities.add({
            label : {
                show : false
            }
        });

        const scene = viewer.scene;
        const handler = new ScreenSpaceEventHandler(scene.canvas);
        handler.setInputAction(function(movement) {
            const ray = viewer.camera.getPickRay(movement.endPosition);
            const cartesian= viewer.scene.globe.pick(ray, viewer.scene);
            if (cartesian) {
                const cartographic = Cartographic.fromCartesian(cartesian);
                const longitudeString = CesiumMath.toDegrees(cartographic.longitude).toFixed(4);
                const latitudeString = CesiumMath.toDegrees(cartographic.latitude).toFixed(4);
                const carto_WGS84 = Ellipsoid.WGS84.cartesianToCartographic(cartesian);
                const heightString = carto_WGS84.height.toFixed(4)/this.terrainExaggeration;

                this.globalpoint = {
                    'latitude':CesiumMath.toDegrees(cartographic.latitude),
                    'longitude':CesiumMath.toDegrees(cartographic.longitude),
                    'altitude': heightString
                };

                entity.position = cartesian;
                if (config.showCoordinates) {
                	entity.label.show = true;
                	entity.label.text = '(' + longitudeString + ', ' + latitudeString + ', ' + heightString + ')';
                }
            }
        }.bind(this), ScreenSpaceEventType.MOUSE_MOVE);
    };

    // returns positions projected on the terrain in Cartesian3, required for entity creation
    // expecting data in dictionaries containing latitude and longitude as keys
    getRaisedPositions(latLongCoords) {
        //console.log(latLongCoords);
    	if (latLongCoords.length == 0){
    		return;
    	}
    	const cartographicArray = [];
    	if (Array.isArray(latLongCoords)) {
        	if (!('latitude' in latLongCoords[0])){
        		return this.getRaisedPositionsFromArray(latLongCoords);
        	}
        	latLongCoords.forEach(function(p) {
                let cartographicPoint = Cartographic.fromDegrees(p.longitude, p.latitude);
                cartographicArray.push(cartographicPoint);
            });
    	} else {
    		let cartographicPoint = Cartographic.fromDegrees(latLongCoords.longitude, latLongCoords.latitude);
            cartographicArray.push(cartographicPoint);
    	}
    	
        return this.getHeights(cartographicArray);
    };
    
    // returns positions projected on the terrain in Cartesian3, required for entity creation
    // expecting data in array of [[latitude, longitude],[latitude,longitude]]
    getRaisedPositionsFromArray(latLongCoords) {
    	const cartographicArray = [];
        latLongCoords.forEach(function(p) {
            let cartographicPoint = Cartographic.fromDegrees(p[0], p[1]);
            cartographicArray.push(cartographicPoint);
        });
        return this.getHeights(cartographicArray);
    };
    
    getHeights(cartographicArray) {
    	return new Promise(function(resolve, reject) {
	        const ellipsoid = this.viewer.scene.globe.ellipsoid;
	        const terrainExaggeration = this.terrainExaggeration;
	        // 18 is the level of detail
	        sampleTerrain(this.viewer.terrainProvider, 18, cartographicArray)
	            .then(function (raisedPositionsCartograhpic) {
	                raisedPositionsCartograhpic.forEach(function (coord, i) {
	                    raisedPositionsCartograhpic[i].height *= terrainExaggeration;
	                });
	                let inter = ellipsoid.cartographicArrayToCartesianArray(raisedPositionsCartograhpic);
	                resolve(inter);
	            });
	    }.bind(this));
    };
}

class DynamicLines{
	
	constructor(viewerWrapper, latLongPoints, name, styleOptions) {
		this.name = name || 'GPS Coordinates';
		this.freeze = false;
		this.viewerWrapper = viewerWrapper;
		this.points = [];
		this.pointcounter = 0;
		this.entity = undefined;
		this.styleOptions = styleOptions || {};
		if (latLongPoints !== undefined){
			this.initialize(latLongPoints);
		}
	};
    
	getEntity() {
		return this.entity;
	};
	
	getPoints(){
        return this.points;
    };
    
    initialize(latLongPoints) {
    	this.viewerWrapper.getRaisedPositions(latLongPoints).then(function (raisedMidPoints) {
    		//console.log(this.points);
    		this.points = raisedMidPoints;
    		
            const polylineArguments = Object.assign({positions: new CallbackProperty(this.getPoints.bind(this), false),
            										 width: 2,
            										 material : Color.GREEN}, 
            										 this.styleOptions);
            this.entity = this.viewerWrapper.viewer.entities.add({
            	name : this.name,
                polyline: polylineArguments
            });

    	}.bind(this));
    	
    };

    clearPoints(keepTwo=true) {
    	this.freeze = true;
    	if (keepTwo){
    		if (this.points.length > 2){
    			this.points.splice(0, this.points.length - 2);
    		}
    	} else {
    		this.points = [];
    	}
    	this.freeze = false;
    };
    
    pushPoint(lat, lon){
        this. viewerWrapper.getRaisedPositions({latitude: [lat], longitude: [lon]}).then(function(raisedMidPoints){
            this.points.push(raisedMidPoints[0]);
        }.bind(this));
    };
    
    // gps_mesh is undefined, this makes no sense.
//    addMesh(){
//        gps_mesh.send('');
//    };
    
	addPoint(lat, lon){
		if (this.freeze) {
			return; // drop
		}
        this.pushPoint(lat, lon);
		if(this.points.length === 2) {
			if (this.entity === undefined) {
				const polylineArguments = Object.assign({positions: new CallbackProperty(this.getPoints.bind(this), false),
					 width: 2,
					 material : Color.GREEN}, this.styleOptions);
				
				this.entity = this.viewerWrapper.viewer.entities.add({
				    name : this.name,
				    polyline : polylineArguments
				});
			}
		} 
		/* 
		 *  The below makes no sense.  this.pushPoint adds the current lat and lon to the points, so we have already added it above. 
		  else if(this.points.length > 2){
			let lastcoords = _.takeRight(this.points,2);
			if(lastcoords[0]!==lon) {
				this.pushPoint(lon, lat);
			}
		} */
	};
	
	zoomTo(){
		this.viewerWrapper.viewer.zoomTo(this.entity);
	}
};

const zoom = function(camera){
	const zoomto = camera.setView({
		destination: config.destination
	});
};

const heading = function(headingAngle, camera) {
    if (headingAngle != undefined) {
//        console.log(headingAngle);
        camera.setView({
            destination: config.destination,
            orientation: {
                heading: CesiumMath.toRadians(headingAngle),
                pitch: -CesiumMath.toRadians(90),
                roll: 0.0
            }
        })
    }
};


// TODO we could use this for notes on map but not good for stations.
const buildPin = function(position, label, url, viewerWrapper, callback) {
	viewerWrapper.getRaisedPositions(position).then(function(raisedPoint) {
		let stationPin = pinBuilder.fromUrl(url, Color.SALMON, 48);
		let options = {
		        position: raisedPoint[0],
		        label: {
		            text: label,
		            verticalOrigin: VerticalOrigin.TOP
		        },
		        billboard: {
		            image: stationPin,
		            verticalOrigin: VerticalOrigin.CENTER
		        }
		}
		let entity = viewerWrapper.viewer.entities.add(options);
        if (callback !== undefined){
        	callback(entity);
        }
	});
};

const buildLineString = function(latlongPoints, styleOptions, viewerWrapper, callback) {
    viewerWrapper.getRaisedPositions(latlongPoints).then(function (raisedMidPoints) {
        const polylinePositon = {
            positions: raisedMidPoints
        };
        const polylineArguments = Object.assign({}, polylinePositon, styleOptions);
        const entity = viewerWrapper.viewer.entities.add({
            polyline: polylineArguments
        });

        if (callback !== undefined){
        	callback(entity);
        }
    });
};


const buildCylinder = function(position, height, radius, label, styleOptions, viewerWrapper, callback) {
	viewerWrapper.getRaisedPositions(position).then(function(raisedPoint) {
		let options = {
				length: height,
				topRadius: radius,
				bottomRadius: radius,
				material : Color.RED,
				label: {
					text: label,
					verticalOrigin: VerticalOrigin.TOP
				}
		};

		options = Object.assign(options, styleOptions);
		
		let entity = viewerWrapper.viewer.entities.add({
			position: raisedPoint[0],
			cylinder: options
		})


		if (callback !== undefined){
			callback(entity);
		}
	});

};
export {ViewerWrapper, DynamicLines, zoom, heading, buildLineString, buildPin, buildCylinder}