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

import {config} from 'config_loader';

require('cesium/Widgets/widgets.css');

import 'css/style.css';

if (config.server.nginx_prefix !== undefined) {
    window.CESIUM_BASE_URL = '/' + config.server.nginx_prefix + '/';
} else {
    window.CESIUM_BASE_URL = '../';  // TODO have not tested this running outside of nginx
}

const Cesium = require('cesium/Cesium');

Cesium.BingMapsApi.defaultKey = global.config.bing_key;

import {projectionManager} from "cesium_util/projectionManager";


// later when we have this provided from node module do this
//import viewerCesiumNavigationMixin from 'cesiumNavigation/viewerCesiumNavigationMixin';


if (!('destination' in config)) {
    config.destination = Cesium.Cartesian3.fromDegrees(config.siteConfig.centerPoint[0], config.siteConfig.centerPoint[1], config.siteConfig.centerPoint[2]);
}



class ViewerWrapper{
    constructor(host, port, url_prefix, terrainExaggeration, container) {
        this.container = container;
        this.host = host;
        this.port = port;
        this.urlPrefix = url_prefix;
        this.terrainList = {};
        this.terrainExaggeration = terrainExaggeration;
        this.globalpoint = null;
        this.mesh_upper_left = null;
        this.mesh_entities = [];
        this.mesh_rowcol = [];

        // set up the trusted server
        if (!_.isEmpty(config.xgds)) {
            Cesium.TrustedServers.add(config.xgds.name,  config.xgds.port);
        }

        if (Cesium.defined(config.trustedServers)){
            for (let ts of config.trustedServers) {
                Cesium.TrustedServers.add(ts.name,  ts.port);
            }

        }

        // Set simple geometry for the full planet

        // const theRealOne = {topLeft: [24.070617695061806,87.90173269295278],
        //     topRight: [49.598705282838125,87.04553528415659],
        //     bottomRight:[34.373553362965566,86.015550572534],
        //     bottomLeft: [14.570663006937881,86.60174704052636]};
        //
        // const rectangle = new Cesium.Rectangle(Cesium.Math.toRadians(theRealOne.bottomLeft[0]),
        //      Cesium.Math.toRadians(theRealOne.bottomLeft[1]),
        //      Cesium.Math.toRadians(theRealOne.topRight[0]),
        //      Cesium.Math.toRadians(theRealOne.topRight[1]));
        //const terrainProvider = new Cesium.EllipsoidTerrainProvider({tilingScheme:projectionManager.getTilingScheme('NP_STEREO', rectangle)});


        // may need to create geometry that matches the projection
        let terrainProvider = undefined;
        if ('globeTilingScheme' in config) {
            let tilingScheme = projectionManager.getTilingScheme(config.globeTilingScheme);
            terrainProvider = new Cesium.EllipsoidTerrainProvider({tilingScheme: tilingScheme});
        } else {
            terrainProvider = new Cesium.EllipsoidTerrainProvider();
        }
        this.terrainList['default'] = terrainProvider;


        let clockOptions = {clockRange: Cesium.ClockRange.UNBOUNDED};
        if ('startTime' in config){
            clockOptions.startTime = Cesium.JulianDate.fromIso8601(config.startTime);
        }

        this.clock = new Cesium.Clock(clockOptions);

        let sceneMode = Cesium.SceneMode.SCENE3D;
        if (Cesium.defined(config.sceneMode)){
            if (config.sceneMode == 'SCENE2D'){
                sceneMode = Cesium.SceneMode.SCENE2D;
            } else if (config.sceneMode == 'COLUMBUS_VIEW'){
                sceneMode = Cesium.SceneMode.COLUMBUS_VIEW;
            }
        }

        const viewerOptions = {
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
            sceneMode: sceneMode,
            clockViewModel: new Cesium.ClockViewModel(this.clock)
        };

        if ('showTimeline' in config) {
            viewerOptions.timeline = config.showTimeline;
            viewerOptions.animation = true;
        }

        if ('ellipsoid' in config){
            if (config.ellipsoid == 'MOON') {
                this.ellipsoid = Cesium.Ellipsoid.MOON;
                viewerOptions['globe'] = new Cesium.Globe(this.ellipsoid);
            }
        } else {
            this.ellipsoid = Cesium.Ellipsoid.WGS84;
        }

        const viewer = new Cesium.Viewer(this.container, viewerOptions);
        this.viewer = viewer;
        this.scene = viewer.scene;
        this.camera = viewer.scene.camera;
        this.globalrange = undefined;

        // viewer.extend(viewerCesiumNavigationMixin, {enableCompass:true,
        //                                             enableZoomControls:true,
        //                                             enableDistanceLegend:true
        //                                             });

        //viewer.extend(viewerCesiumNavigationMixin);

        try {
            const terrainPath = config.sites[config.defaultSite].elevation;
            if (terrainPath !== undefined) {
                this.addTerrain(terrainPath);
            }
        } catch (e) {
            console.log(e);
        }


        viewer.infoBox.frame.sandbox =
            'allow-same-origin allow-top-navigation allow-pointer-lock allow-popups allow-forms allow-scripts';

        /*this.hoverCoordHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
        this.hoverCoordHandler.setInputAction(function(movement) {
            document.getElementById('hovercoord').innerHTML = this.globalpoint['latitude'].toString() + '</br>'
                + this.globalpoint['longitude'].toString() + '</br>'
                + this.globalpoint['altitude'].toString();

        }.bind(this), ScreenSpaceEventType.LEFT_DOWN);*/

        //this.scene.preRender.addEventListener(this.getViewRange.bind(this));

        // set the navigation controls
        if ('mouseControls' in config){
            if (config.mouseControls == 'flatPan'){
                this.setFlatPanControls();
            }
        }

        // add inspector for debugging
        //viewer.extend(Cesium.viewerCesiumInspectorMixin);

    }

    getViewRange(){
        let upper_left = this.camera.getPickRay(new Cesium.Cartesian2(0, 0));
        let lower_right = this.camera.getPickRay(new Cesium.Cartesian2(
            this.viewer.scene.canvas.clientWidth,
            this.viewer.scene.canvas.clientHeight
        ));
        let position_ul = this.scene.globe.pick(upper_left, this.scene);
        if (position_ul === undefined){
            return;
        }
        let position_lr = this.scene.globe.pick(lower_right, this.scene);
        let range = Cesium.Cartesian3.distance(position_ul, position_lr);
        this.globalrange =  range;
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
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const longitude = CesiumMath.toDegrees(cartographic.longitude);
        const latitude = CesiumMath.toDegrees(cartographic.latitude);
        const carto_WGS84 = this.ellipsoid.cartesianToCartographic(cartesian);
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
        const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
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
        }.bind(this), Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    };

    addTerrain(folder_location, image_address) {
        //if(Cesium.defined(image_address)) {
        //    image_address = this.serveraddress();
        //}
        //let theUrl = path.join(image_address, folder_location);
        let theUrl = folder_location;
        const new_terrain_provider = new Cesium.CesiumTerrainProvider({
            url : theUrl
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
                                coordinates: Cesium.Rectangle.fromDegrees(lon, lat, lon + lonstep, lat + latstep),
                                material: Cesium.Color.fromRandom({alpha: 0.5})
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
        const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
        handler.setInputAction(function(movement) {
            const ray = viewer.camera.getPickRay(movement.endPosition);
            const cartesian= viewer.scene.globe.pick(ray, viewer.scene);
            if (cartesian) {
                const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                const longitudeString = Cesium.CesiumMath.toDegrees(cartographic.longitude).toFixed(4);
                const latitudeString = Cesium.CesiumMath.toDegrees(cartographic.latitude).toFixed(4);
                const carto_WGS84 = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cartesian);
                const heightString = carto_WGS84.height.toFixed(4)/this.terrainExaggeration;

                this.globalpoint = {
                    'latitude':Cesium.CesiumMath.toDegrees(cartographic.latitude),
                    'longitude':Cesium.CesiumMath.toDegrees(cartographic.longitude),
                    'altitude': heightString
                };

                entity.position = cartesian;
                if (config.showCoordinates) {
                    entity.label.show = true;
                    entity.label.text = '(' + longitudeString + ', ' + latitudeString + ', ' + heightString + ')';
                }
            }
        }.bind(this), Cesium.ScreenSpaceEventType.MOUSE_MOVE);
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
                let cartographicPoint = Cesium.Cartographic.fromDegrees(p.longitude, p.latitude);
                cartographicArray.push(cartographicPoint);
            });
        } else {
            let cartographicPoint = Cesium.Cartographic.fromDegrees(latLongCoords.longitude, latLongCoords.latitude);
            cartographicArray.push(cartographicPoint);
        }

        return this.getHeights(cartographicArray);
    };

    // returns positions projected on the terrain in Cartesian3, required for entity creation
    // expecting data in array of [[latitude, longitude],[latitude,longitude]]
    getRaisedPositionsFromArray(latLongCoords) {
        const cartographicArray = [];
        latLongCoords.forEach(function(p) {
            let cartographicPoint = Cesium.Cartographic.fromDegrees(p[0], p[1]);
            cartographicArray.push(cartographicPoint);
        });
        return this.getHeights(cartographicArray);
    };

    getHeights(cartographicArray) {
        return new Promise(function(resolve, reject) {
            const ellipsoid = this.viewer.scene.globe.ellipsoid;
            const terrainExaggeration = this.terrainExaggeration;
            // 18 is the level of detail
            Cesium.sampleTerrain(this.viewer.terrainProvider, 18, cartographicArray)
                .then(function (raisedPositionsCartograhpic) {
                    raisedPositionsCartograhpic.forEach(function (coord, i) {
                        raisedPositionsCartograhpic[i].height *= terrainExaggeration;
                    });
                    let inter = ellipsoid.cartographicArrayToCartesianArray(raisedPositionsCartograhpic);
                    resolve(inter);
                });
        }.bind(this));
    };

    /**
     * @function toggleNavigation
     * turn on or off ability to move around the scene
     * @param value
     */
    toggleNavigation(value){
        this.viewer.scene.screenSpaceCameraController.enableRotate = value;
        this.viewer.scene.screenSpaceCameraController.enableTranslate = value;
        this.viewer.scene.screenSpaceCameraController.enableZoom = value;
        this.viewer.scene.screenSpaceCameraController.enableTilt = value;
        this.viewer.scene.screenSpaceCameraController.enableLook = value;
    };

    setCameraFlag(key, value){
        this.cameraFlags[key] = value;
    };

    /**
     * @function setFlatPanControls
     * Set up the viewer controls to pan east west north south instead of rotating around the globe
     */
    setFlatPanControls(){
        this.cameraFlags = {forward: false,
            backward: false,
            up: false,
            down: false,
            left: false,
            right: false,
            home: false};

        this.toggleNavigation(false);

        let context = this;
        const zoomScale = Cesium.defaultValue(config.zoomScale, 200);
        const panScale = Cesium.defaultValue(config.panScale, 400);

        this.viewer.clock.onTick.addEventListener(function(clock) {
            let camera = context.viewer.camera;

            if (context.cameraFlags.home) {
                camera.flyTo({
                    destination: config.destination,
                    duration: 3,
                });
                return;
            }
            // Change movement speed based on the distance of the camera to the surface of the ellipsoid.
            let cameraHeight = context.ellipsoid.cartesianToCartographic(camera.position).height;
            let moveRate = camera.defaultMoveAmount;

            if (context.cameraFlags.forward) {
                moveRate = cameraHeight / zoomScale;
                camera.moveForward(moveRate);
                return;
            }
            if (context.cameraFlags.backward) {
                moveRate = cameraHeight / zoomScale;
                camera.moveBackward(moveRate);
                return;
            }
            if (context.cameraFlags.up) {
                moveRate = cameraHeight / panScale;
                camera.moveUp(moveRate);
                return;
            }
            if (context.cameraFlags.down) {
                moveRate = cameraHeight / panScale;
                camera.moveDown(moveRate);
                return;
            }
            if (context.cameraFlags.left) {
                moveRate = cameraHeight / panScale;
                camera.moveLeft(moveRate);
                return;
            }
            if (context.cameraFlags.right) {
                moveRate = cameraHeight / panScale;
                camera.moveRight(moveRate);
                return;
            }

        });
    };

    /*
     * @function setCurrentTime
     * @param newTime in milliseconds
     */
    setCurrentTime(newTime) {
        let julianTime = Cesium.JulianDate.fromDate(new Date(newTime));
        this.clock.currentTime = julianTime;
    };

    /*
     * @function setClock
     * @param start in milliseconds
     * @param end in milliseconds
     * @param current in milliseconds (current time) (optional)
     */
    setClock(start, end, current) {
        if (_.isUndefined(current)) {
            current = end;
        }
        let julianTime = Cesium.JulianDate.fromDate(new Date(current));
        this.clock.currentTime = julianTime;
        this.clock.startTime = Cesium.JulianDate.fromDate(new Date(start));
        this.clock.endTime = Cesium.JulianDate.fromDate(new Date(end));

    }


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
                    material : Cesium.Color.GREEN}, this.styleOptions);

                this.entity = this.viewerWrapper.viewer.entities.add({
                    name : this.name,
                    polyline : polylineArguments
                });
            }
        }
    };

    zoomTo(){
        this.viewerWrapper.viewer.zoomTo(this.entity);
    };


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
                heading: Cesium.CesiumMath.toRadians(headingAngle),
                pitch: -Cesium.CesiumMath.toRadians(90),
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
                verticalOrigin: Cesium.VerticalOrigin.TOP,
                horizontalOrigin: Cesium.HorizontalOrigin.RIGHT,
                fillColor: Cesium.Color.YELLOW,
                outlineWidth: 3.0,
                eyeOffset: new Cesium.Cartesian3(radius + 2, 0, 1.0)
            }
        }
        let cylinderEntity = viewerWrapper.viewer.entities.add(cylinderOptions);

        if (callback !== undefined){
            callback(cylinderEntity);
        }
    });

};


const buildSurfaceCircle = function(position, radius, styleOptions, id, viewerWrapper, callback) {
    /*const color = new ColorGeometryInstanceAttribute.fromColor(Color.YELLOW.withAlpha(0.25));
    const ellipseInstance = new GeometryInstance({
        geometry : new EllipseGeometry({
            center : Cartesian3.fromDegrees(position["longitude"], position["latitude"]),
            semiMinorAxis : radius,
            semiMajorAxis : radius
        }),
        id : 'ellipse',
        attributes : {
            color : color
        }
    });
    viewerWrapper.scene.primitives.add(new GroundPrimitive({
        geometryInstances : ellipseInstance
    }));*/
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
// const buildRectangle = function(position, width, height, label, color, id, viewerWrapper, callback) {
// 	viewerWrapper.getRaisedPositions(position).then(function(raisedPoint) {
// 		const rectangleInstance = new Cesium.GeometryInstance({
// 			  geometry : new Cesium.RectangleGeometry({
// 			    rectangle : Cesium.Rectangle.fromDegrees(-140.0, 30.0, -100.0, 40.0)
// 			  }),
// 			  id : id,
// 			  attributes : {
// 			    color : new Cesium.ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5)
// 			  }
// 			});
//
// 		const primitive = viewerWrapper.viewer.scene.primitives.add(new Cesium.Primitive({
// 			  geometryInstances : [rectangleInstance],
// 			  debugShowBoundingVolume: true
// 			}));
//
// 		if (callback !== undefined){
// 	    	callback(primitive);
// 	    }
// 	});
// }

//Build a rectangle entity with the given material
const buildRectangle = function(positions, material, id, name, viewerWrapper, callback) {
    // if (material === undefined){
    //     material = Cesium.Color.WHITE;
    // }
    viewerWrapper.getRaisedPositions(positions).then(function(raisedPositions)
    {
        let entityRectangle = viewerWrapper.viewer.entities.add({
            id: id,
            name: name,
            rectangle: {
                coordinates: Cesium.Rectangle.fromCartesianArray(raisedPositions, viewerWrapper.ellipsoid),
                height: 1,
                extrudedHeight: 0,
                material: material
            }
        });

        if (callback !== undefined) {
            callback(entityRectangle);
        }
    });
};

//Build a rectangle entity with the given material
const buildRectangleFromRadians = function(west, south, east, north, material, id, name, viewerWrapper, callback) {
    // if (material === undefined){
    //     material = Cesium.Color.WHITE;
    // }
    let entityRectangle = viewerWrapper.viewer.entities.add({
        id: id,
        name: name,
        rectangle: {
            coordinates: Cesium.Rectangle.fromRadians(west, south, east, north),
            height: 1,
            extrudedHeight: 0,
            material: material
        }
    });

    if (callback !== undefined) {
        callback(entityRectangle);
    }
};


//build a simple ellipse.  We will be using this as a trailing ellipse to have a smooth camera when following
const buildEllipse = function(spp, color, viewerWrapper, callback) {
    let entityEllipse = viewerWrapper.viewer.entities.add({
        position : spp,
        name : 'ellipse',
        ellipse : {
            semiMinorAxis: 2,
            semiMajorAxis: 2,
            height: 1,
            extrudedHeight: 0,
            material: color
        }
    });

    if (callback !== undefined){
        callback(entityEllipse);
    }
};

// this is the main function we are using to render a path and an ellipse with the current position.
const buildPath = function(spp, label, labelColor, ellipseColor, id, headingCallback, viewerWrapper, callback){

    let newEntities = {};
    let entityPath = viewerWrapper.viewer.entities.add({
        position : spp,
        name : 'path',
        path : {
            resolution : 1,
            material : labelColor
        }
    });
    newEntities['path'] = entityPath;

    let entityEllipse = viewerWrapper.viewer.entities.add({
        position : spp,
        name : 'ellipse',
        label : {
            text: label,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            eyeOffset: new Cesium.Cartesian3(2.0, 0, 1.0),  //TODO zoom this better so it stays same distance from ellipse
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
    newEntities['ellipse'] = entityEllipse;

    if (callback !== undefined){
        callback(newEntities);
    }
}






export {ViewerWrapper, DynamicLines, zoom, heading, buildLineString, buildCylinder, buildRectangle, buildSurfaceCircle,
    buildPath, buildEllipse, buildRectangleFromRadians}