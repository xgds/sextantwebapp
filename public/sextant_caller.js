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
		} else if  (sextant.tsse !== undefined) {
			sextant.tsse.zoomToTracks();
		}
	}
	
	function zoomToPlan(){
		if (sextant.planManager !== undefined) {
			sextant.planManager.zoomTo();
		}
	}
	
	function zoomToPosition(){
		if (sextant.tsse !== undefined) {
			sextant.tsse.zoomToPosition(config.sse.follow_channel);
		}
	}
	
	
	function followPosition(follow){
		if (sextant.tsse !== undefined) {
			sextant.tsse.setFollowPosition(follow);
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
	
	function clearTracks() {
		if (sextant.tsse !== undefined){
			sextant.tsse.clearTracks();
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

	function reOrient(){ // Added by Kenneth
		sextant.planManager.reOrient();
	}

	function getPlanName(){// Added by Kenneth
        return sextant.planManager.getPlanName();
	}

	function savePlan(newName,newVersion,newNotes){ //Added by Kenneth
		return sextant.planManager.savePlan(newName,newVersion,newNotes);
	}

	function loadDevices(){
		console.log(sextant.connectedDevices);
		$.each(sextant.connectedDevices, function( key, value ) {
            console.log( key + ": " + value );
            let listEntry="<li "+"id="+key+">"+value+"</li>";
			$('#deviceList').append(listEntry);
        });
	}

    function checkConnectedDevices(){ 
        let deviceNames="";
        $.each(sextant.connectedDevices, function( key, value ) {
            deviceNames= deviceNames + key + " ";
        });
        deviceNames=deviceNames.slice(0,-1);


        console.log(deviceNames);

        //TODO change to your ip address
        $.post("https://10.132.6.224/xgds_status_board/multiSubsystemStatusJson/",
        {
            names:deviceNames
        },
        function(data, status){ //TODO handle the color changing
            //console.log(data);
            $.each(sextant.connectedDevices, function( key, value ) {
                $("#"+key).css("color",data.key.statusColor);
            });

        });   
        //$.ajax({
        //url: "https://10.0.0.4/xgds_status_board/multiSubsystemStatusJson/",
        //method: "POST",
        //dataType: "json",
        //data: {names: "pXRF LIBS FLIR FTIR redCamera2 boat"},
        //success: function(data) {
        //    console.log(data);
        //}      
        //success: $.proxy(function(data) {
        //    console.log(data);
        //})//,
        //error: $.proxy(function(data) {
        //    console.log('Error checking devices');
        //    console.log(data);
        //}, this)
      //});
    }
