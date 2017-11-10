import io from 'socket.io-client';
import {config} from './../../config/config_loader';


const socket = io(config.server.name + ':' + config.socket.port);

class SocketChannel{
    constructor(socketRef, channelName, onrecieve=function(message){console.log('   '+JSON.stringify(message))}) {
        this.socketRef = socketRef;
        this.channelName = channelName;
        this.onrecieve = onrecieve;
        this.socketRef.on(this.channelName, function(data){
            console.log("Server channel '"+this.channelName+"' says:");
            this.onrecieve(data);
        }.bind(this));
    }

    setonrecieve(onrecieve){
        this.onrecieve = onrecieve;
        this.socketRef.on(this.channelName, function(data){
            console.log("Server channel '"+this.channelName+"' says:");
            this.onrecieve(data);
        }.bind(this));
    }

    emit(message){
        let printStatement = "Client channel '" + this.channelName + "' emitting: " + JSON.stringify((message));
        console.log(printStatement);
        this.socketRef.emit(this.channelName, JSON.stringify((message)));
    }
}

let statusChannel = new SocketChannel(socket, 'status');
let connectedDevices = new SocketChannel(socket, 'connected_devices');
let gpsChannel = new SocketChannel(socket, 'gps');
let plannerChannel = new SocketChannel(socket, 'planner');

export {statusChannel, connectedDevices, gpsChannel, plannerChannel};

socket.on('connect', function(){
    //document.getElementById('header').style.backgroundColor = 'green';
    console.log('connected');
    statusChannel.emit('client connection received');
    connectedDevices.emit('');
    gpsChannel.emit({"command": "start", "data": "COM10"});
    plannerChannel.emit({command: 'listdir'});
    //gpsChannel.emit({command: 'start', data:'COM10'});
}.bind(this));

socket.on('disconnect', function(){
    //document.getElementById('header').style.backgroundColor = 'transparent';
    console.log('disconnected');
});
