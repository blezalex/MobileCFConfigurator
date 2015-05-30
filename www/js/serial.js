'use strict';

var serial = {
    connectionId:    false,
    openRequested:   false,
    openCanceled:    false,
    bitrate:         0,
    bytesReceived:   0,
    bytesSent:       0,
    failed:          0,

    transmitting:   false,
    socket: null,

    connect: function (path, options, callback) {
        var self = this;
        self.openRequested = true;

        console.log('SERIAL: connecting to: ' + path);
        this.socket = new WebSocket(path);
        this.socket.binaryType = "arraybuffer";

        this.socket.addEventListener('open', function(openInfo) {
            self.connectionId = 1;
            self.bytesReceived = 0;
            self.bytesSent = 0;
            self.failed = 0;
            self.openRequested = false;

            var connectionInfo = {
                bitrate: -1
            };

            console.log('SERIAL: Connection opened with ID: ' + path + ', Baud: ' + connectionInfo.bitrate);
            if (callback) callback(connectionInfo);  
        });


        this.socket.addEventListener('message', function(msg) {
         //   console.log("RCVD: " + JSON.stringify(msg.data));
            self.bytesReceived += msg.data.byteLength;
        });


        this.socket.addEventListener('error', function(info) {
             console.error('socket error ' + JSON.stringify(info));
        });

        this.socket.addEventListener('close', function (c){
            console.log('socket closed: ' + JSON.stringify(c));
        });
    },
    disconnect: function (callback) {
        var self = this;

        if (self.connectionId) {
            self.emptyOutputBuffer();

            // remove listeners
            for (var i = (self.onReceive.listeners.length - 1); i >= 0; i--) {
                self.onReceive.removeListener(self.onReceive.listeners[i]);
            }

            for (var i = (self.onReceiveError.listeners.length - 1); i >= 0; i--) {
                self.onReceiveError.removeListener(self.onReceiveError.listeners[i]);
            }

            var onClosed = function (result) {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                }

                if (result) {
                    console.log('SERIAL: Connection with ID: ' + self.connectionId + ' closed, Sent: ' + self.bytesSent + ' bytes, Received: ' + self.bytesReceived + ' bytes');
                } else {
                    console.log('SERIAL: Failed to close connection with ID: ' + self.connectionId + ' closed, Sent: ' + self.bytesSent + ' bytes, Received: ' + self.bytesReceived + ' bytes');
                    googleAnalytics.sendException('Serial: FailedToClose', false);
                }

                self.connectionId = false;
                self.bitrate = 0;

                if (callback) callback(result);
            };

            this.socket.close();
            onClosed(true);
        } else {
            // connection wasn't opened, so we won't try to close anything
            // instead we will rise canceled flag which will prevent connect from continueing further after being canceled
            self.openCanceled = true;
        }
    },
    getDevices: function (callback) {
        var devices = ['ws://192.168.4.1:8088'];
        callback(devices);
    },
    getInfo: function (callback) {
        callback({connectionId: 1, paused: false, persistent: false, name: 'ws', bufferSize: 256, receiveTimeout: 0, sendTimeout: 0});
    },
    getControlSignals: function (callback) {
        callback({dcd: true, cts: true, ri: false, dsr: true});
        console.log('NOT IMPLEMENTED: getControlSignals');
    },
    setControlSignals: function (signals, callback) {
        callback(true);
        console.log('NOT IMPLEMENTED: setControlSignals');
    },
    send: function (data, callback) {
        var self = this;
        self.socket.send(data);

        if (callback) callback({bytesSent: data.byteLength});
    },
    onReceive: {
        listeners: [],

        addListener: function (function_reference) {
            serial.socket.addEventListener('message', function_reference);
            this.listeners.push(function_reference);
        },
        removeListener: function (function_reference) {
            for (var i = (this.listeners.length - 1); i >= 0; i--) {
                if (this.listeners[i] == function_reference) {
                    serial.socket.removeEventListener('message', function_reference);

                    this.listeners.splice(i, 1);
                    break;
                }
            }
        }
    },
    onReceiveError: {
        listeners: [],

        addListener: function (function_reference) {
            serial.socket.addEventListener('error', function_reference);
            this.listeners.push(function_reference);
        },
        removeListener: function (function_reference) {
            for (var i = (this.listeners.length - 1); i >= 0; i--) {
                if (this.listeners[i] == function_reference) {
                    serial.socket.removeEventListener('error', function_reference);

                    this.listeners.splice(i, 1);
                    break;
                }
            }
        }
    },
    emptyOutputBuffer: function () {
        this.transmitting = false;
    }
};