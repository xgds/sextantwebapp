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
		sextant.heading(event.alpha);
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
		sextant.zoom(sextant.camera);
	}

	function setHeading(){
		sextant.heading(90, sextant.camera);
	}

	function zoomToTracks(){
		if (sextant.gps_tracks !== undefined) {
			sextant.gps_tracks.zoomTo();
		}
	}
	
	function zoomToPlan(){
		if (sextant.planManager !== undefined) {
			sextant.planManager.zoomTo();
		}
	}
	
	function zoomToPosition(){
		if (sextant.tsse !== undefined) {
			sextant.tsse.zoomToPosition(config.xgds.follow_channel);
		}
	}
	
	
	function followPosition(follow){
		if (sextant.tsse !== undefined) {
			sextant.tsse.setFollowPosition(follow);
		}
	}
	
	function toggleTrack(show){
		if (sextant.tsse !== undefined) {
			sextant.tsse.toggleTrack(show);
		}
	}

	
	function serialstatus(){
		console.log('serialstatus0')
		sextant.serialrequest.connect();
		sextant.serialrequest.requestData();
	}
	
	function getwaypoints(){
		console.log('getting waypoints');
		sextant.getwaypoints.connect();
		sextant.getwaypoints.requestData();
	}
	
	function drawpextant(){
		sextant.getwaypoints.send("bla")
	}
	
	function getpextant(){
		console.log('getting waypoints');
		sextant.getpextant.connect();
		sextant.getpextant.requestData();
	}
	
	function getpextantFromHere(){
		console.log('pextant from here');
		console.log(sextant.globalpoint());

		document.getElementById("globalpoint").innerHTML =JSON.stringify(sextant.globalpoint());

		sextant.getpextant.connect();
		sextant.getpextant.send(JSON.stringify(sextant.globalpoint()));
	}

	function calibrate(){
		console.log('pextant from here');
		console.log(sextant.globalpoint());

		document.getElementById("globalpoint").innerHTML =JSON.stringify(sextant.globalpoint());

		sextant.calibrate.connect();
		sextant.calibrate.send(JSON.stringify(sextant.globalpoint()));
	}
	
	function reloadPlan() {
		if (sextant.planManager !== undefined){
			sextant.planManager.fetchXGDSPlan();
		}
	}
	
	function sendPlanToSextant() {
		if (sextant.planManager !== undefined){
			sextant.planManager.invokePextant();
		}
	}
	
	function toggleEditMode(){
		//let button = $("#editButton");
		//let state = button.prop('checked');
		//window.editMode = state;
         window.editMode ^= true;
	}

	function reOrient(){ 
		sextant.planManager.reOrient();
	}

	function savePlan(newName,newVersion,newNotes){ 
		return sextant.planManager.savePlan(newName,newVersion,newNotes);
	}

    
