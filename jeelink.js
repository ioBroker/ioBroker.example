/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

var serialport = require("serialport");
var SerialPort = serialport.SerialPort; // localize object constructor
var sp = new SerialPort("/dev/ttyUSB0", {
    baudrate:57600,
    parser: serialport.parsers.readline('\r\n')
});


// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils


// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
var adapter = utils.adapter('jeelink');

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
        adapter.log.info('entered ready');
    main();
});

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:

    var obj = adapter.config.sensors;
    for (var anz in obj){
        adapter.log.info("anz : " + anz);
        if(obj[anz].stype=="emonTH") {
            adapter.setObject('emonTH_' + anz, {
                type: 'channel',
                common: {
                    name: 'emonTH ' + obj[anz].room,
                    role: 'sensor'
                },
                native: {
                    "addr": anz
                }
            });
            adapter.log.info('RFM12B setting up object ' + anz);

            adapter.setObject('emonTH_' + anz + '.temp', {
                type: 'state',
                common: {
                    "name": "Temperature",
                    "type": "number",
                    "unit": "°C",
                    "min": -50,
                    "max": 50,
                    "read": true,
                    "write": false,
                    "role": "value.temperature",
                    "desc": "Temperature"
                },
                native: {}
            });
            adapter.setObject('emonTH_' + anz + '.humid', {
                type: 'state',
                common: {
                    "name": "Humidity",
                    "type": "number",
                    "unit": "%",
                    "min": 0,
                    "max": 100,
                    "read": true,
                    "write": false,
                    "role": "value.humidity",
                    "desc": "Humidity"
                },
                native: {}
            });
            adapter.setObject('emonTH_' + anz + '.batt', {
                type: 'state',
                common: {
                    "name": "Battery",
                    "type": "number",
                    "unit": "V",
                    "min": 0,
                    "max": 4,
                    "read": true,
                    "write": false,
                    "role": "value.battery",
                    "desc": "Battery"
                },
                native: {}
            });
        }else if(obj[anz].stype=="waterMote"){
            adapter.setObject('waterMote_' + anz, {
                type: 'channel',
                common: {
                    name: 'waterMote ' + obj[anz].room,
                    role: 'sensor'
                },
                native: {
                    "addr": anz
                }
            });
            adapter.log.info('RFM12B setting up object ' + anz);

            adapter.setObject('waterMote_' + anz + '.cw_mom', {
                type: 'state',
                common: {
                    "name": "Cold Water",
                    "type": "number",
                    "unit": "l",
                    "min": 0,
                    "max": 100,
                    "read": true,
                    "write": false,
                    "role": "value",
                    "desc": "Cold Water"
                },
                native: {}
            });
            adapter.setObject('waterMote_' + anz + '.cw_cum', {
                type: 'state',
                common: {
                    "name": "Cold Water",
                    "type": "number",
                    "unit": "m3",
                    "min": 0,
                    "max": 10000,
                    "read": true,
                    "write": false,
                    "role": "value",
                    "desc": "Cold Water counter"
                },
                native: {}
            });
            adapter.setObject('waterMote_' + anz + '.ww_mom', {
                type: 'state',
                common: {
                    "name": "Warm Water",
                    "type": "number",
                    "unit": "l",
                    "min": 0,
                    "max": 100,
                    "read": true,
                    "write": false,
                    "role": "value",
                    "desc": "Warm Water"
                },
                native: {}
            });
            adapter.setObject('waterMote_' + anz + '.cw_cum', {
                type: 'state',
                common: {
                    "name": "Warm Water",
                    "type": "number",
                    "unit": "m3",
                    "min": 0,
                    "max": 10000,
                    "read": true,
                    "write": false,
                    "role": "value",
                    "desc": "Warm Water counter"
                },
                native: {}
            });
            adapter.setObject('waterMote_' + anz + '.batt', {
                type: 'state',
                common: {
                    "name": "Battery",
                    "type": "number",
                    "unit": "V",
                    "min": 0,
                    "max": 4,
                    "read": true,
                    "write": false,
                    "role": "value.battery",
                    "desc": "Battery"
                },
                native: {}
            });
        }
    }

    var options = {
        serialport:     adapter.config.serialport || '/dev/ttyUSB0',
        baudrate:       adapter.config.baudrate   || 57600,
    };

    sp.open(function (error) {
        if ( error ) {
            adapter.log.info('failed to open: '+error);
        } else {
            adapter.log.info('open');
            sp.on('data', function(data) {

                adapter.log.info('data received: ' + data);

                var tmp = data.split(' ');
                if(tmp[0]==='OK'){
                    if(tmp[2]=='19'){
                        //we are expecting data in form \"OK nodeid data1 data2 etc
                        var tmpp=tmp.splice(3,8);
                        adapter.log.info('splice:'+tmpp);
                        var buf = new Buffer(tmpp);
                        adapter.log.info('Temperature:'+ (buf.readInt16LE(0))/10);
                        adapter.setState('emonTH_'+ tmp[2] +'.temp', {val: (buf.readInt16LE(0))/10, ack: true});
                        adapter.log.info('Humidty: ' + (buf.readInt16LE(4))/10);
                        adapter.setState('emonTH_'+ tmp[2] +'.humid', {val: (buf.readInt16LE(4))/10, ack: true});
                        adapter.log.info('Voltage: ' + (buf.readInt16LE(6))/10);
                        adapter.setState('emonTH_'+ tmp[2] +'.batt', {val: (buf.readInt16LE(6))/10, ack: true});
                    }
                    else if(tmp[2]=='21' || tmp[2]=='22'){
                        //we are expecting data in form \"OK nodeid data1 data2 etc
                        var tmpp=tmp.splice(3,12);
                        adapter.log.info('splice:'+tmpp);
                        var buf = new Buffer(tmpp);
                        adapter.log.info('cw_mom:'+ (buf.readInt16LE(0))/10);
                        adapter.setState('waterMote_'+ tmp[2] +'.cw_mom', {val: (buf.readInt16LE(0))/10, ack: true});
                        adapter.log.info('cw counter: ' + (buf.readInt16LE(4))/10);
                        adapter.setState('waterMote_'+ tmp[2] +'.cw_cum', {val: (buf.readInt16LE(4))/10, ack: true});
                        adapter.log.info('ww_mom:'+ (buf.readInt16LE(6))/10);
                        adapter.setState('waterMote_'+ tmp[2] +'.ww_mom', {val: (buf.readInt16LE(6))/10, ack: true});
                        adapter.log.info('ww counter: ' + (buf.readInt16LE(8))/10);
                        adapter.setState('waterMote_'+ tmp[2] +'.ww_cum', {val: (buf.readInt16LE(8))/10, ack: true});
                        adapter.log.info('Voltage: ' + (buf.readInt16LE(10))/10);
                        adapter.setState('waterMote_'+ tmp[2] +'.batt', {val: (buf.readInt16LE(10))/10, ack: true});
                    }
                }
            });
        }
    });

    // in this template all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');


    /**
     *   setState examples
     *
     *   you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
     *
     */

    // the variable testVariable is set to true as command (ack=false)
    adapter.setState('testVariable', true);

    // same thing, but the value is flagged "ack"
    // ack should be always set to true if the value is received from or acknowledged from the target system
    adapter.setState('testVariable', {val: true, ack: true});

    // same thing, but the state is deleted after 30s (getState will return null afterwards)
    adapter.setState('testVariable', {val: true, ack: true, expire: 30});


}
