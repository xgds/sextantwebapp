import { ViewerWrapper} from './cesiumlib';
import {TrackManager, Track} from "./cesiumtrack";
import {config} from './../../config/config_loader';
import {statusChannel, connectedDevices, gpsChannel, plannerChannel} from './../socket/socket'
const moment = require('moment');

const viewerWrapper = new ViewerWrapper(config.urlPrefix, config.server.cesium_port,
    config.server.nginx_prefix, 1, 'cesiumContainer');

viewerWrapper.scene.camera.flyTo({
    destination: config.destination,
    duration: 3,
    complete: function() {
        const track_manager = new TrackManager(viewerWrapper);
        let hostname = config.server.protocol + '://' + config.server.name + ':' + config.server.port;
        let resources = {
            pointerUrl: hostname + '/' + config.server.nginx_prefix + '/icons/pointer.png'
        };

        track_manager.addTrack("EV1", resources);
        console.log('track_manager');

        gpsChannel.setonrecieve(function(data){
            let jsondata = JSON.parse(data);
            track_manager.updateTrackFromData("EV1", {
                lat: jsondata["latitude"],
                lon: jsondata["longitude"],
                timestamp: moment().toISOString()
            })
        })
        /*
        setInterval(function () {
            track_manager.updateTrackFromData("EV1", {
                lat: 19.400695,
                lon: -155.268440,
                timestamp: moment().toISOString()
            })
        }, 1000);*/
    }
});


