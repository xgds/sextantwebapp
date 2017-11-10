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

import {config} from './../../config/config_loader';
import * as _ from 'lodash';
import * as moment from 'moment'
import {
    Color, ImageMaterialProperty, ColorMaterialProperty, Cartesian2, Cartesian3, CallbackProperty,
    HeadingPitchRange, SampledPositionProperty, JulianDate, TimeIntervalCollection, TimeInterval, ClockViewModel,
    SampledProperty, ExtrapolationType
} from './../cesium_util/cesium_imports'
import {buildPath} from './../cesium_util/cesiumlib';

let fakeHeading = false;
//data.heading = (Math.random() * (2* Math.PI));
let hostname = config.server.protocol + '://' + config.server.name + ':' + config.server.port;
let resources = {
    pointerUrl: hostname + '/' + config.server.nginx_prefix + '/icons/pointer.png'
};

class Track {
    constructor(name, resources, viewerWrapper, hasHeading=false, color='00FF00') {
        this.viewerWrapper = viewerWrapper;
        this.cSampledPositionProperty = Track.initializeSampledProperty();
        this.cHeading = Track.initializeSampledProperty();
        this.lastHeading = undefined;
        this.hasHeading = hasHeading;
        this.cLastPosition = undefined;
        this.cPath = undefined;
        this.name = name;

        this.cEllipseMaterial = this.initializeMaterial(resources["pointerUrl"]);

        this.colors = {'track_off': Color.GRAY.withAlpha(0.25), "track_on": Color.GREEN.withAlpha(0.25)};
        this.labelColors = {'track_off': Color.GRAY, "track_on": Color.GREEN};
        this.isStopped = false;
    }

    getColor(getLabelColor = false) {
        let color = undefined;
        const sourceMap = getLabelColor ? this.labelColors : this.colors;
        if (this.isStopped) {
            color = sourceMap['track_off'];
        } else if ('track_on' in sourceMap) {
            color = sourceMap['track_on'];
        } else {
            color = Color.GREEN
        }
        return color;
    };

    setOnlineTrackColor(colorHexCode = '00FF00') {
        let color = Color.fromCssColorString('#' + colorHexCode);
        this.labelColors['track_on'] = color;
        this.colors['track_on'] = color.clone().withAlpha(0.4); // make a translucent one
    };

    loadFromData(data) {
        if ("track_hexcolor" in data) {
            this.setOnlineTrackColor(data.track_hexcolor);
        }
        if (_.isNumber(data.heading)) {
            this.updateHeading(data.heading)
        }
        if ('lon' in data) {    // adding a point
            this.addPoint(data)
        } else if (('coords' in data) && data.coords.length > 0) {    // adding a track
            this.addTrackChunck(data)
        }
        if (this.cPath === undefined){
            this.buildPath()
        }
    }

    buildPath() {
        this.cPath = true;
        let headingCallback = new CallbackProperty((time, result) => {
            if (this.hasHeading) {
                return this.cHeadings.getValue(time);
            }
            return 0;  // it won't matter because we are not rendering a texture
        }, false);

        buildPath(
            this.cSampledPositionProperty,
            this.name,
            this.getColor(true), // label color
            this.cEllipseMaterial,
            this.name + '_POSITION',
            headingCallback,
            this.viewerWrapper,
            (entity) => {
                let builtPath = entity;
                this.cPaths = entity;
            });
    }

    initializeMaterial(pointerUrl = false) {
        const colorCallbackProperty = new CallbackProperty(() => {
            return this.getColor();
        }, false);
        if (pointerUrl) { // if it is set to an image, this will evaluate to true
            return new ImageMaterialProperty({
                'image': pointerUrl,
                'transparent': true,
                'color': colorCallbackProperty
            });
        } else {
            return new ColorMaterialProperty(colorCallbackProperty)
        }
    }

    static initializeSampledProperty() {
        const property = new SampledPositionProperty();
        property.forwardExtrapolationType = ExtrapolationType.HOLD;
        return property;
    }


    // update the stored cesium position
    addPoint(data) {
        let cdate = JulianDate.fromIso8601(data.timestamp);
        this.viewerWrapper.getRaisedPositions({
            longitude: data.lon,
            latitude: data.lat
        }).then(function (raisedPoint) {
            this.cSampledPositionProperty.addSample(cdate, raisedPoint[0]);
            this.cLastPosition = raisedPoint[0];
        }.bind(this));
    }

    addTrackChunck(data) {
        for (let i = 0; i < data.coords.length; i++) {
            let times = data.times[i];
            this.viewerWrapper.getRaisedPositions(data.coords[i]).then(function (raisedPoints) {
                let julianTimes = [];
                for (let t = 0; t < times.length; t++) {
                    julianTimes.push(JulianDate.fromIso8601(times[t]));
                }
                this.cSampledPositionProperties.addSamples(julianTimes, raisedPoints);
                //should we udpdate last position?
            });

        }
    }

    updateHeading(data) {
        // update the stored heading
        if (_.isNumber(data.heading)) {
            let cdate = JulianDate.fromIso8601(data.timestamp);
            this.hasHeading = true;
            this.cHeading.addSample(cdate, data.heading);
            this.lastHeading = data.heading;
        }
    };
}

class TrackManager {
    constructor(viewerWrapper) {
        this.viewerWrapper = viewerWrapper;

        // cache of raw data
        this.tracks = {};

        // various flags
        this.isStopped = {};
        this.followPosition = true;
        this.isInitialized = false;
        this.isMoving = false;
        this.followingTrackName = undefined;

        //Event listeners track when camera is moving or not, to prevent zooming during a move
        this.viewerWrapper.viewer.camera.moveStart.addEventListener(() => this.isMoving = true);
        this.viewerWrapper.viewer.camera.moveEnd.addEventListener(() => this.isMoving = false);
    };

    addTrack(track_name, resources){
        this.tracks[track_name] = new Track(track_name, resources, this.viewerWrapper)
    };

    zoomToPositionBadHeight(track_name) {
        let entity = this.cPaths[track_name];
        this.viewerWrapper.viewer.zoomTo(entity, new HeadingPitchRange(0, -Math.PI / 2.0, 150.0));
    };

    /*
    This Zoom to position method does not change bearing or height.
    */
    zoomToPosition(track_name) {
        if (!this.isMoving) {
            let entity = this.tracks[track_name].cPaths; //.ellipse;
            let scene = this.viewerWrapper.viewer.scene;
            let canvas = scene;
            //this was useful: https://groups.google.com/forum/#!topic/cesium-dev/QSFf3RxNRfE

            let ray = this.viewerWrapper.camera.getPickRay(new Cartesian2(
                Math.round(canvas.clientWidth / 2),
                Math.round(canvas.clientHeight / 2)
            ));
            let position = this.viewerWrapper.viewer.scene.globe.pick(ray, scene);
            let range = Cartesian3.distance(position, this.viewerWrapper.camera.position);

            if (this.isInitialized) { //After inital zoom, follows target entity at the viewer's current height
                this.viewerWrapper.viewer.zoomTo(entity, new HeadingPitchRange(0, -Math.PI / 2.0, range));

            } else { //Initial zoom to entity
                this.viewerWrapper.viewer.zoomTo(entity, new HeadingPitchRange(0, -Math.PI / 2.0, 150.0));
                if (range < 155.0 && range > 145.0) {
                    this.isInitialized = true;
                }
            }
        }
    };

    updateTrackFromData(track_name, data, disconnected = false) {
        // stores the data & updates so position can be rendered
        //this.tracks[track_name].position = data["position"];
        this.tracks[track_name].loadFromData(data);
    };

    toggleTrack(show) {
        // show or hide the full track
        this.tracks[this.followingTrackName].cPath.path.trailTime = show ? undefined : 60
    };
}

/*
tracker = new TrackManager();
tracker.tracks["EV1"] = new Track("EV1");
socket.ongps(function(data) {
    tracker.updateTrackFromData("EV1", data)
});

class GeneralTracker {
    constructor() {

    }

    updatePosition(track_name, data) {
        // updates the position, gets the track if need be
        if (!(track_name in this.position_heading)) {
            this.modifyPosition(track_name, data);
            this.getTrack(track_name, data);
        } else {
            this.modifyPosition(track_name, data, false);
        }
    };

    handlePositionEvent(track_name, event) {
        let data = JSON.parse(event.data);
        context.updatePosition(track_name, data);
    };

    updatePosition(track_name, data) {
        // updates the position, gets the track if need be
        if (!(track_name in this.position_heading)) {
            this.modifyPosition(track_name, data);
            this.getTrack(track_name, data);
        } else {
            this.modifyPosition(track_name, data, false);
        }
    };

    getCurrentPositions() {
        this.socket.getCurrentPosition().then(function (data) {
            if (data != null) {
                // should return dictionary of channel: position
                for (let track_name in data) {
                    let channel = this.convertTrackNameToChannel(track_name);
                    if (!(channel in this.position_heading)) {
                        this.updatePosition(channel, data[track_name], true);
                    }
                }
            }
        });
        function(data) {
            console.log('could not get active track position');
            console.log(data);
        })
    };

    setFollowPosition(value){
        this.followPosition = value;
    };

    convertTrackNameToChannel(track_name){
        let splits = track_name.split('_');
        if (splits.length > 1) {
            return splits[1];
        }
        return track_name;
    };

    _getTrack(data, response_callback) {
        let trackUrl = hostname + '/xgds_map_server/rest/mapJson/basaltApp.BasaltTrack/pk:' + data.track_pk
        $.ajax({
            url: trackUrl,
            dataType: 'json',
            xhrFields: {withCredentials: true},
            beforeSend: beforeSend,
            success: $.proxy(response_callback),
            error: $.proxy(function (response) {
                console.log('could not get track contents for ' + data.track_pk);
                console.log(response);
            })
        });
    };

    getTrack(track_name, data) {
        // first check if we already got it
        if (_.isEmpty(this.tracks[track_name])) {
            // asynchronous callback
            this._getTrack(data, (response_data) => {
                if (response_data !== null && response_data.length === 1) {
                    this.tracks[track_name] = Track(); // need to add options
                    this.renderTrack(track_name, response_data[0]);
                }
            })
        }
    }
}
*/
export {TrackManager, Track}
