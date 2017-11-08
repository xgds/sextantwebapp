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
import * as moment from 'moment'
import {Color, ImageMaterialProperty, ColorMaterialProperty, Cartesian2, Cartesian3, CallbackProperty,
    HeadingPitchRange, SampledPositionProperty, JulianDate, TimeIntervalCollection, TimeInterval, ClockViewModel,
    SampledProperty, ExtrapolationType} from './../cesium_util/cesium_imports'
import {buildPath} from './../cesium_util/cesiumlib';

let fakeHeading = false;
//data.heading = (Math.random() * (2* Math.PI));
let resources = {
    pointerUrl: hostname + '/' + config.server.nginx_prefix + '/icons/pointer.png'
};

class Track {
    constructor (position, heading, color, resources=resources){
        this.position = position;
        this.heading = heading;

        this.lastHeading = undefined;
        this.cLastPosition = undefined;
        this.cSampledPositionProperty = undefined;
        this.cHeading = undefined;
        this.cPath = undefined;

        this.color = color;
        this.imageMaterials = undefined;
        this.colorMaterials = undefined;
        this.cEllipseMaterial = undefined;
        this.pointerUrl = resources["pointerUrl"];

        this.colors = {'gray': Color.GRAY.withAlpha(0.25)};
        this.labelColors = {'gray': Color.GRAY};
    }

    getColor(forLabel = false) {
        const sourceMap = forLabel ? this.labelColors : this.colors;
        if (this.isStopped[track_name]) {
            const color =  sourceMap['gray'];
        }else if (track_name in this.colors) {
            const color = sourceMap[track_name];
        }else{
            const color = Color.GREEN
        }
        return color;
    };
}

class Tracker {

    constructor(viewerWrapper, resources) {
        this.viewerWrapper = viewerWrapper;

        // cache of raw data
        this.position_heading = {};
        this.tracks = {};
        this.lastHeading = {};

        // cesium renderings
        this.cLastPosition = {};
        this.cSampledPositionProperties = {};
        this.cHeadings = {};
        this.cPaths = {};

        // colors and materials
        this.colors = {'gray': Color.GRAY.withAlpha(0.25)};
        this.labelColors = {'gray': Color.GRAY};
        this.imageMaterials = {};
        this.colorMaterials = {};
        this.cEllipseMaterial = {};
        this.pointerUrl = resources["pointerUrl"];

        // various flags
        this.isStopped = {};
        this.followPosition = true;
        this.isInitialized = false;
        this.isMoving = false;
        this.followingTrackName = undefined;

        // initialize
        this.getCurrentPositions();

        //Event listeners track when camera is moving or not, to prevent zooming during a move
        this.viewerWrapper.viewer.camera.moveStart.addEventListener(() => this.isMoving = true);
        this.viewerWrapper.viewer.camera.moveEnd.addEventListener(() => this.isMoving = false);
    };

    handlePositionEvent(track_name, event) {
        let data = JSON.parse(event.data);
        context.updatePosition(track_name, data);
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
            let entity = this.cPaths[track_name]; //.ellipse;
            //this was useful: https://groups.google.com/forum/#!topic/cesium-dev/QSFf3RxNRfE

            let ray = this.viewerWrapper.camera.getPickRay(new Cartesian2(
                Math.round(this.viewerWrapper.viewer.scene.canvas.clientWidth / 2),
                Math.round(this.viewerWrapper.viewer.scene.canvas.clientHeight / 2)
            ));
            let position = this.viewerWrapper.viewer.scene.globe.pick(ray, this.viewerWrapper.viewer.scene);
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

    modifyPosition(track_name, data, disconnected = false) {
        // stores the data & updates so position can be rendered
        this.tracks[track_name].position = data["position"];
        this.renderPosition(track_name, data, disconnected);
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

    toggleTrack(show) {
        // show or hide the full track
        this.tracks[this.followingTrackName].cPath.path.trailTime = show ? undefined : 60
    };

    addColor(track_name, newColor = '#00FF00') {
        let color = Color.fromCssColorString('#' + newColor);
        this.labelColors[channel] = color;
        this.colors[track_name] = color.clone().withAlpha(0.4); // make a translucent one
    };

    getColor(track_name, forLabel = false) {
        const sourceMap = forLabel ? this.labelColors : this.colors;
        if (this.isStopped[track_name]) {
            const color =  sourceMap['gray'];
        }else if (track_name in this.colors) {
            const color = sourceMap[track_name];
        }else{
            const color = Color.GREEN
        }
        return color;
    };

    renderTrack(channel, data) {
        if (!channel in this.colors) {
            if (data.color !== undefined) {
                this.addColor(data.color);
            }
        }

        // update the viewer clock start
        if (data.times.length > 0) {
            let start = JulianDate.fromIso8601(data.times[0][0]);
            let stop = JulianDate.addHours(start, 12, new JulianDate());

            let cvm = new ClockViewModel(this.viewerWrapper.viewer.clock);
            cvm.startTime = start.clone();

            let path = this.cPaths[channel];
            if (path !== undefined) {
                path.availability = new TimeIntervalCollection([new TimeInterval({
                    start: start.clone(),
                    stop: stop.clone()
                })]);
            }
        }


        this.updateSampledPositionProperty(channel, data);
    };


    getMaterial(track_name) {
        // gets or initializes the material
        let material = undefined;
        if (!(track_name in this.cEllipseMaterial)) {
            let data = this.position_heading[track_name];
            let hasHeading = (_.isNumber(data.heading));
            if (hasHeading) {
                // make sure it has the image material
                if (!(track_name in this.imageMaterials)) {
                    this.imageMaterials[track_name] = new ImageMaterialProperty({
                        'image': this.pointerUrl,
                        'transparent': true,
                        'color': new CallbackProperty(() => {
                            return this.getColor(track_name);
                        }, false)
                    });
                }
                material = this.imageMaterials[track_name];
            } else {
                // make sure it has the color material
                if (!(track_name in this.colorMaterials)) {
                    this.colorMaterials[track_name] = new ColorMaterialProperty(
                        new CallbackProperty((time, result) => {
                        return this.getColor(track_name);
                    }, false));
                }
                material = this.colorMaterials[track_name];
            }
            this.cEllipseMaterial[track_name] = material;
        } else {
            material = this.cEllipseMaterial[track_name];
        }
        return material;
    };

    updateHeading(channel, data) {
        // update the stored heading
        let property = undefined;
        if (!(channel in this.cHeadings)) {
            let context = this;
            property = new SampledProperty(Number);
            property.forwardExtrapolationType = ExtrapolationType.HOLD;
            this.cHeadings[channel] = property;
        } else {
            property = this.cHeadings[channel];
        }

        let cdate = JulianDate.fromIso8601(data.timestamp);
        property.addSample(cdate, data.heading);
        this.lastHeading[channel] = data.heading;
    };

    updateSampledPositionProperty(channel, data) {
        // update the stored cesium position
        let property = this.cSampledPositionProperties[channel];
        ;
        if (_.isUndefined(property)) {
            property = new SampledPositionProperty();
            property.forwardExtrapolationType = ExtrapolationType.HOLD;
            this.cSampledPositionProperties[channel] = property;
        }
        if ('lon' in data) {
            // adding a point
            let cdate = JulianDate.fromIso8601(data.timestamp);
            this.viewerWrapper.getRaisedPositions({
                longitude: data.lon,
                latitude: data.lat
            }).then(function (raisedPoint) {
                property.addSample(cdate, raisedPoint[0]);
                this.cLastPosition[channel] = raisedPoint[0];
//				if (this.followPosition){
//					this.zoomToPosition(channel);
//				}

            }.bind(this));
        } else {
            // adding a track
            if (data.coords.length > 0) {
                // tracks come in blocks of times & coords to handle gaps.  Cesium is doing linear interpolation here.
                for (let i = 0; i < data.coords.length; i++) {
                    let times = data.times[i];
                    let lastI = i;
                    this.viewerWrapper.getRaisedPositions(data.coords[i]).then(function (raisedPoints) {
                        let julianTimes = [];
                        for (let t = 0; t < times.length; t++) {
                            julianTimes.push(JulianDate.fromIso8601(times[t]));
                        }
                        ;

                        property.addSamples(julianTimes, raisedPoints);
                    });

                }
            }
        }
    }

    renderPosition(track_name, data, stopped) {

        let color = undefined;
        if (track_name in this.colors) {
            color = this.colors[track_name];
        } else {
            color = this.addColor(track_name, data.track_hexcolor);
        }

        if (!_.isEmpty(data)) {
            if (!(track_name in this.cSampledPositionProperties)) {


                this.updateSampledPositionProperty(track_name, data);
                if (_.isNumber(data.heading)) {
                    this.updateHeading(track_name, data);
                }

                let retrievedMaterial = this.getMaterial(track_name);

                let headingCallback = new CallbackProperty(function (time, result) {
                    if (track_name in this.cHeadings) {
                        return this.cHeadings[track_name].getValue(time);
                    }
                    return 0;  // it won't matter because we are not rendering a texture
                }.bind(this), false);

                buildPath(this.cSampledPositionProperties[track_name], track_name, this.getColor(track_name, true), retrievedMaterial, track_name + '_POSITION', headingCallback, this.viewerWrapper, function (entity) {
                    let builtPath = entity;
                    this.cPaths[track_name] = builtPath;
                }.bind(this));

            } else {
                this.updateSampledPositionProperty(track_name, data);
                if (_.isNumber(data.heading)) {
                    this.updateHeading(track_name, data);
                }

            }
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
        /*function(data) {
            console.log('could not get active track position');
            console.log(data);
        })*/
    };

}

class SocketTracker{
    constructor(){

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

    setFollowPosition(value) {
        this.followPosition = value;
    };

    convertTrackNameToChannel(track_name) {
        let splits = track_name.split('_');
        if (splits.length > 1) {
            return splits[1];
        }
        return track_name;
    };

    _getTrack(data, response_callback){
        let trackUrl =  hostname + '/xgds_map_server/rest/mapJson/basaltApp.BasaltTrack/pk:' + data.track_pk
        $.ajax({
            url: trackUrl,
            dataType: 'json',
            xhrFields: {withCredentials: true},
            beforeSend: beforeSend,
            success: $.proxy(response_callback),
            error: $.proxy(function(response) {
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
                    this.tracks[track_name] = response_data[0];
                    this.renderTrack(track_name, response_data[0]);
                }
            })
        }
    }
}

export {Tracker}
