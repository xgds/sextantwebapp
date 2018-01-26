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

const Cesium = require('cesium/Cesium');
import * as _ from 'lodash';
const moment = require('moment');


/** @function buildTimeIntervalCollection
 * Build a Cesium.TimeIntervalCollection with 0 duration events at interval intervals between start and end
 *
 * @param start Start time as iso8601 string
 * @param end end time as iso8601 string
 * @param interval the interval in seconds between start and end
 */
const buildTimeIntervalCollection = function(start, end, interval){

    let intervals = new Array();
    let theNow = moment(start);
    let theEnd = moment(end);
    while(theNow.isSameOrBefore(theEnd)) {
        let julianNow = Cesium.JulianDate.fromIso8601(theNow.format());
        intervals.push(new Cesium.TimeInterval({start: julianNow, stop: julianNow}));
        theNow.add(interval, 's');
    }

    return new Cesium.TimeIntervalCollection({intervals:intervals});

}

export {buildTimeIntervalCollection}