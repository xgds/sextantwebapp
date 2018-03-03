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

let deviceNames = "";

//If the connected devices are defined, they will be loaded into a toolbar and the polling will be started
//Otherwise, the entire connected devices functionality will not be started
function loadDevices(){
	if(xgds3dview.context.connectedDevices !== undefined){

		if (!_.isEmpty(xgds3dview.context.connectedDevices)) {
			$('#connectedDevices').show();
		}
		$.each(xgds3dview.context.connectedDevices, function( key, value ) { //key here is the device name, and value is the displayName corresponding to it.
			let listEntry="<li "+"id='"+key+"'>"+value+"</li>";
			$('#deviceList').append(listEntry); //Display all connected devices using their display names from config
			deviceNames += key + " ";
		});

		deviceNames = deviceNames.slice(0,-1);
		
		if (!_.isEmpty(deviceNames)){
			setInterval(function(){checkConnectedDevices();},1000);//Start Polling
		}
	}
	else{
		$('#connectedDevices').css("display","none");
		console.log("Your configuration doesn't have any devices to check.");
	}
};

function checkConnectedDevices(){
    const hostname = config.xgds.protocol + '://' + config.xgds.name;
	let url= hostname + '/xgds_status_board/rest/multiSubsystemStatusJson/';
	let settings = {
        type: "POST",
        url: url,
        dataType: 'json',
        data: {names:deviceNames},
        success: $.proxy(function(data, status) {
            $.each(xgds3dview.context.connectedDevices, function( key, value ) {
                for(let i=0;i<data.length;i++){
                    if ('statusColor' in data[i]){
                        let statusColor = data[i].statusColor;
                        if (!_.isEmpty(statusColor)){
                            $("#"+data[i].name).css('background-color', statusColor);
                        }
                    }
                }
            });
        }, this),
        error: $.proxy(function(data) {
            console.log('Could not get active channels');
            console.log(data);
        }, this)
    };
    if (!_.isEmpty(config.xgds) && !_.isEmpty(config.xgds.username)){
        settings['headers'] =  "Basic " + btoa(config.xgds.username + ":" + config.xgds.password);
    }
	$.ajax(settings);
	
};

//Helper method used to toggle between views
function toggleMode(){
	$('#viewModeToolbar').toggle(); 
	$('#editModeToolbar').toggle();
	$('.editModeText').toggle();
};

//jQuery scripts for handling saving path. Currently does nothing, but can be altered to send http POST request to xgds server 

function handleSave(){ //TODO rather redundant. Also, will break if user names their plan "REQUIRED"

	if($('#saveAsName').val() === "") {
		alert('Please input a new name!');
	}else{
		if($('#saveAsName').val() === "")
			$('#saveAsName').val(defaultName);

		savePlan($('#saveAsName').val(),$('#saveAsVersion').val(),$('#saveAsNotes').val()); //Returns array with [Name,Version]
	}
};

function hideFooterMenu() {
	if ('hideFooter' in xgds3dview.config && xgds3dview.config.hideFooter){
		$('.footer-menu').hide();
	}
};

function hideConnected() {
	if ('hideConnected' in xgds3dview.config && xgds3dview.config.hideConnected){
		$('#connected_div').hide();
	}
};

function showNav() {
	if ('showNav' in xgds3dview.config && xgds3dview.config.showNav){
		$('#nav_div').show();
	}
};

function hookCameraButtons() {
	$(".camera-btn").mousedown(function(event) {
		let thisval = $(this).attr("value");
		setCameraControl(thisval, true);
	});
	$(".camera-btn").mouseup(function(event) {
		let thisval = $(this).attr("value");
		setCameraControl(thisval, false);
	});
}