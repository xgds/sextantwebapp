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

/**
 * @function getPoints
 * @param rectangle
 * @return array of [[long,lat]] in radians
 */
const getPointsFromRectangle = function(rectangle){
    let points = [];
    let southwestRadians = Cesium.Rectangle.southwest(rectangle);
    let northeastRadians = Cesium.Rectangle.northeast(rectangle);

    points.push([southwestRadians.longitude, southwestRadians.latitude]);
    //nw
    points.push([southwestRadians.longitude, northeastRadians.latitude]);
    points.push([northeastRadians.longitude, northeastRadians.latitude]);
    //se
    points.push([northeastRadians.longitude, southwestRadians.latitude]);
    return points;

}

export {getPointsFromRectangle}