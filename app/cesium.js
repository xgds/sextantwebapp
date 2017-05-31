//TODO it looks like none of this gets used at all.

//import ViewerWrapper from './cesiumlib';
//import {config} from './../config/config_loader';
//
//const viewerWrapper = new ViewerWrapper(config.urlPrefix, config.server.port, 1, 'cesiumContainer');
//const viewer = viewerWrapper.viewer;
//const camera = viewer.scence.camera;
//
//const currentSite = camera.flyTo({
//    destination: config.destination,
//    duration: 3,
//    complete: function(){
//        viewerWrapper.addImagery(config.server.port, config.siteConfig.imagery);
//        viewerWrapper.addTerrain(config.terrain.port, config.siteConfig.elevation);
//        hoverLatLong()
//    }
//});
//
//function zoom(){
//	currentSite = camera.setView({
//        destination: config.destination
//    });
//}
