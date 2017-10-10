import {config} from './../../config/config_loader';

import 'cesium/Source/Widgets/widgets.css';
import './style.css';

import buildModuleUrl from 'cesium/Source/Core/buildModuleUrl';
buildModuleUrl.setBaseUrl('./');

// Load all cesium components required
import {Viewer, EllipsoidTerrainProvider, Cartesian3, Cartesian2, PolygonGeometry, PolygonHierarchy, CesiumMath, Cartographic, Ellipsoid, Color,
		sampleTerrain, ScreenSpaceEventHandler, ScreenSpaceEventType, Rectangle, RectangleGeometry, LabelStyle, CzmlDataSource, CustomDataSource,
		CreateTileMapServiceImageryProvider, CesiumTerrainProvider, CallbackProperty, VerticalOrigin, HorizontalOrigin, Matrix4, ConstantProperty,
		SceneMode, SampledPositionProperty, JulianDate, ColorMaterialProperty, ClockRange, ClockViewModel,
		Transforms, HeadingPitchRoll, ColorGeometryInstanceAttribute, GeometryInstance, Primitive, KmlDataSource, Clock} from './cesium_imports'

import viewerCesiumNavigationMixin from './cesium-navigation/viewerCesiumNavigationMixin';

if (!('destination' in config)) {
	config.destination = Cartesian3.fromDegrees(config.siteConfig.centerPoint[0], config.siteConfig.centerPoint[1], config.siteConfig.centerPoint[2]);
}

class ViewerWrapper{
    constructor(host, port, url_prefix, terrainExaggeration, container) {
        this.container = container;
        this.host = host;
        this.port = port;
        this.urlPrefix = url_prefix;
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
            url : this.serveraddress() + '/' + this.layerList['default'],
            fileExtension : 'jpg'
        });

        let clock = new Clock({
			clockRange: ClockRange.UNBOUNDED
		});
		
        const viewer = new Viewer(this.container, {
            timeline : false,
            animation : false,
            homeButton : false,
            navigationHelpButton : false,
            geocoder : false,
            sceneModePicker : false,
            creditContainer : 'credits',
            terrainExaggeration : terrainExaggeration,
            baseLayerPicker : false,
            terrainProvider : terrainProvider,
            sceneMode: SceneMode.SCENE3D,
            clockViewModel: new ClockViewModel(clock)
            //imageryProvider : imageryProvider

        });
        
        viewer.extend(viewerCesiumNavigationMixin, {enableCompass:true, enableZoomControls:true, enableDistanceLegend:true
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

        this.hoverCoordHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
        this.hoverCoordHandler.setInputAction(function(movement) {
            document.getElementById('hovercoord').innerHTML = this.globalpoint['latitude'].toString() + '</br>' 
            												+ this.globalpoint['longitude'].toString() + '</br>'
            												+ this.globalpoint['altitude'].toString();

        }.bind(this), ScreenSpaceEventType.LEFT_DOWN);
        
        this.viewer = viewer;
        this.scene = viewer.scene;
        this.camera = viewer.scene.camera;
        this.layers = viewer.scene.imageryLayers;
    }

    serveraddress(){
    	let result = this.host;
    	if (this.port !== undefined){
    		result +=  ':' + this.port;
    	}
    	if (this.urlPrefix !== undefined) {
    		result += '/' + this.urlPrefix;
    	}
    	console.log('server address:' + result);
    	return result;
    };
    
    toLongLatHeight(cartesian) {
    	const cartographic = Cartographic.fromCartesian(cartesian);
        const longitude = CesiumMath.toDegrees(cartographic.longitude);
        const latitude = CesiumMath.toDegrees(cartographic.latitude);
        const carto_WGS84 = Ellipsoid.WGS84.cartesianToCartographic(cartesian);
        const height = carto_WGS84.height/this.terrainExaggeration;  //TODO need to look up the height from the terrain
        return [longitude, latitude, height];
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
            	const longLatHeight = this.toLongLatHeight(cartesian);
                const longitudeString = longLatHeight[0].toFixed(4);
                const latitudeString = longLatHeight[1].toFixed(4);
                const heightString = longLatHeight[2].toFixed(4)

                entity.position = cartesian;
            	entity.label.show = true;
            	entity.label.text = '(' + longitudeString + ', ' + latitudeString + ', ' + heightString + ')';

                const object = {
                    'name': 'GeoPoint',
                    'arguments': {
                        'type': 'LAT_LONG',
                        'latitude': longLatHeight[1],
                        'longitude': longLatHeight[0]
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

// We are no longer using this class, we are using path instead.
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



const buildLineString = function(latlongPoints, styleOptions, id, viewerWrapper, callback) {
    viewerWrapper.getRaisedPositions(latlongPoints).then(function (raisedMidPoints) {
        const polylinePositon = {
            positions: raisedMidPoints
        };
        const polylineArguments = Object.assign({}, polylinePositon, styleOptions);
        const entity = viewerWrapper.viewer.entities.add({
            polyline: polylineArguments,
            id: id
        });

        if (callback !== undefined){
        	callback(entity);
        }
    });
};


const buildCylinder = function(position, height, radius, slices, label, styleOptions, id, viewerWrapper, callback) {
	viewerWrapper.getRaisedPositions(position).then(function(raisedPoint) {
		let options = {
				length: height,
				topRadius: radius,
				bottomRadius: radius,
				slices: slices
		};

		options = Object.assign(options, styleOptions);
		
		let cylinderOptions = {
				position: raisedPoint[0],
				cylinder: options,
				id: id,
			};
		
		if (label !== undefined && !_.isEmpty(label)){
			cylinderOptions['label'] = {
				text: label,
				verticalOrigin: VerticalOrigin.TOP,
		        horizontalOrigin: HorizontalOrigin.RIGHT,
		        fillColor: Color.YELLOW,
		        outlineWidth: 3.0,
		        eyeOffset: new Cartesian3(radius + 2, 0, 1.0)
			}
		}
		let cylinderEntity = viewerWrapper.viewer.entities.add(cylinderOptions);

		if (callback !== undefined){
			callback(cylinderEntity);
		}
	});

};


const buildSurfaceCircle = function(position, radius, styleOptions, id, viewerWrapper, callback) {
	
	viewerWrapper.getRaisedPositions(position).then(function(raisedPoint) {
		let options = {
				semiMinorAxis: radius,
				semiMajorAxis: radius,
				height: 0,
				extrudedHeight: 0
		};

		options = Object.assign(options, styleOptions);
		
		let surfaceCircleOptions = {
				position: raisedPoint[0],
				ellipse: options,
				id: id,
			};
		
		let entity = viewerWrapper.viewer.entities.add(surfaceCircleOptions);

		if (callback !== undefined){
			callback(entity);
		}
	});

};


//this was a debugging function, if you ever need to build a rectangle have to use the parameters
const buildRectangle = function(position, width, height, label, color, id, viewerWrapper, callback) {
	viewerWrapper.getRaisedPositions(position).then(function(raisedPoint) {
		const rectangleInstance = new GeometryInstance({
			  geometry : new RectangleGeometry({
			    rectangle : Rectangle.fromDegrees(-140.0, 30.0, -100.0, 40.0)
			  }),
			  id : id,
			  attributes : {
			    color : new ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5)
			  }
			});
		
		const primitive = viewerWrapper.viewer.scene.primitives.add(new Primitive({
			  geometryInstances : [rectangleInstance],
			  debugShowBoundingVolume: true
			}));
		
		if (callback !== undefined){
	    	callback(primitive);
	    }
	});
}

// this is the main function we are using to render a path and an ellipse with the current position.
const buildPath = function(spp, label, labelColor, ellipseColor, id, headingCallback, viewerWrapper, callback){
	
	let entityPath = viewerWrapper.viewer.entities.add({
	    position : spp,
	    name : 'path',
	    path : {
	        resolution : 1,
	        material : labelColor
	    },
	    label : {
			text: label,
			verticalOrigin: VerticalOrigin.CENTER,
	        horizontalOrigin: HorizontalOrigin.CENTER,
	        eyeOffset: new Cartesian3(8, 0, 1.0),
	        fillColor: labelColor,
	        outlineWidth: 3.0
		},
		ellipse : {
				semiMinorAxis: 2,
				semiMajorAxis: 2,
				height: 1,
				extrudedHeight: 0,
				material: ellipseColor,
				stRotation: headingCallback
		}
	});
	
	if (callback !== undefined){
		callback(entityPath);
	}
}




const loadKml = function(kmlUrl, viewerWrapper, callback) {
	viewerWrapper.viewer.dataSources.add(KmlDataSource.load(kmlUrl, {
				name: kmlUrl,
		        camera: viewerWrapper.viewer.camera,
		        canvas: viewerWrapper.viewer.canvas
		    })
		).then( function (dataSource) {
			if (callback !== undefined) {
				callback(dataSource);
			}
		});
}

const loadKmls = function(kmlUrls, viewerWrapper, callback){
	if (!_.isEmpty(kmlUrls)) {
		console.log('Loading kml:');
		for (let i=0; i<kmlUrls.length; i++){
			console.log(kmlUrls[i]);
			loadKml(kmlUrls[i], viewerWrapper, callback);
		}
	}
}

export {ViewerWrapper, DynamicLines, zoom, heading, buildLineString, buildCylinder, buildRectangle, buildSurfaceCircle, 
		loadKml, loadKmls, buildPath}