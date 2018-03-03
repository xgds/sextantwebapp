// __BEGIN_LICENSE__
//Copyright (c) 2015, United States Government, as represented by the 
//Administrator of the National Aeronautics and Space Administration. 
//All rights reserved.
//
//The xGDS platform is licensed under the Apache License, Version 2.0 
//(the "License"); you may not use this file except in compliance with the License. 
//You may obtain a copy of the License at 
//http://www.apache.org/licenses/LICENSE-2.0.
//
//Unless required by applicable law or agreed to in writing, software distributed 
//under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR 
//CONDITIONS OF ANY KIND, either express or implied. See the License for the 
//specific language governing permissions and limitations under the License.
// __END_LICENSE__

	/*window.addEventListener("devicemotion", function (event){
		xgds3dview.context.heading(event.alpha);
	}, true);*/

	// now you can use the plan maanger to send points to sextant
	function sextant_api() {
        json_data = {
            waypoints: [
                [  19.36479555, -155.20178273],
                [  19.3660102 , -155.2002431 ],
                [  19.36612641, -155.20061863],
                [  19.36670636, -155.20098881]
            ],
            time: "2pm"
        };

        $.post("http://localhost:5000/", JSON.stringify(json_data))
            .done(function (data) {
                alert("Data Loaded: " + data);
            });
    }

	function stop(){
		gpstracksilencer.connect();
		gpstracksilencer.send('stop');
	}
	
	function start(){
		gpstrack.connect('COM6');
		gpstrack.requestData();
	}
	
	function zoom(){
		xgds3dview.context.zoom(xgds3dview.context.viewerWrapper.viewer.scene.camera);
	}

	function setHeading(){
		xgds3dview.context.heading(90, xgds3dview.context.viewerWrapper.viewer.scene.camera);
	}

	function zoomToTracks(){
		if (xgds3dview.context.gps_tracks !== undefined) {
			xgds3dview.context.gps_tracks.zoomTo();
		}
	}
	
	function zoomToPlan(){
		if (xgds3dview.context.planManager !== undefined) {
			xgds3dview.context.planManager.zoomTo();
		}
	}
	
	function zoomToPosition(){
		if (xgds3dview.context.tsse !== undefined) {
			xgds3dview.context.tsse.zoomToPosition(config.xgds.follow_channel);
		}
	}
	
	
	function followPosition(follow){
		if (xgds3dview.context.tsse !== undefined) {
			xgds3dview.context.tsse.setFollowPosition(follow);
		}
	}
	
	function toggleTrack(show){
		if (xgds3dview.context.tsse !== undefined) {
			xgds3dview.context.tsse.toggleTrack(show);
		}
	}

	
	function serialstatus(){
		console.log('serialstatus0')
		xgds3dview.context.serialrequest.connect();
		xgds3dview.context.serialrequest.requestData();
	}
	
	function getwaypoints(){
		console.log('getting waypoints');
		xgds3dview.context.getwaypoints.connect();
		xgds3dview.context.getwaypoints.requestData();
	}
	
	function drawpextant(){
		xgds3dview.context.getwaypoints.send("bla")
	}
	
	function getpextant(){
		console.log('getting waypoints');
		xgds3dview.context.getpextant.connect();
		xgds3dview.context.getpextant.requestData();
	}
	
	function getpextantFromHere(){
		console.log('pextant from here');
		console.log(xgds3dview.context.globalpoint());

		document.getElementById("globalpoint").innerHTML =JSON.stringify(xgds3dview.context.globalpoint());

		xgds3dview.context.getpextant.connect();
		xgds3dview.context.getpextant.send(JSON.stringify(xgds3dview.context.globalpoint()));
	}

	function calibrate(){
		console.log('pextant from here');
		console.log(xgds3dview.context.globalpoint());

		document.getElementById("globalpoint").innerHTML =JSON.stringify(xgds3dview.context.globalpoint());

		xgds3dview.context.calibrate.connect();
		xgds3dview.context.calibrate.send(JSON.stringify(xgds3dview.context.globalpoint()));
	}
	
	function reloadPlan() {
		if (xgds3dview.context.planManager !== undefined){
			xgds3dview.context.planManager.fetchPlan();
		}
	}
	
	function sendPlanToSextant() {
		if (xgds3dview.context.planManager !== undefined){
			xgds3dview.context.planManager.invokePextant();
		}
	}
	
	function toggleEditMode(){
		//let button = $("#editButton");
		//let state = button.prop('checked');
		//window.editMode = state;
         window.editMode ^= true;
	}

	function reOrient(){ 
		xgds3dview.context.planManager.reOrient();
	}

	function savePlan(newName,newVersion,newNotes){ 
		return xgds3dview.context.planManager.savePlan(newName,newVersion,newNotes);
	}

	function toggleLayerTree() {
		if (xgds3dview.context.layerTree !== undefined){
			if (!xgds3dview.context.layerTree.layersInitialized) {
				alert('Layers not yet loaded.');
			} else {
                xgds3dview.context.layerTree.toggle();
            }
		}
	}

	function refreshLayerTree() {
        if (xgds3dview.context.layerTree !== undefined){
            xgds3dview.context.layerTree.refresh();
        }
	}

	function toggleTransparencySliders() {
		if (xgds3dview.context.layerTree !== undefined){
			if (!xgds3dview.context.layerTree.layersInitialized) {
				alert('Layers not yet loaded.');
			} else {
                xgds3dview.context.layerTree.toggleTransparencySliders();
            }
		}
	}

/**
 * @function setCameraControl
 * Set the camera control to move or stop moving the camera
 * @param name  The name to set, ie forward, backward, up, down, left, right
 * @param value true|false
 */
function setCameraControl(name, value) {
		xgds3dview.context.viewerWrapper.setCameraFlag(name, value);
	}
