/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

const SerialPort = require("serialport");
const Readline = SerialPort.parsers.Readline;
var sp = null;

// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils


// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
var adapter = utils.Adapter('jeelink');

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

function getConfigObjects(Obj, where, what){
    var foundObjects = [];
    for (var prop in Obj){
        if (Obj[prop][where] == what){
            foundObjects.push(Obj[prop]);
        }
    }
    return foundObjects;
}
function round(value, digits) //digits 1 for 1 digit after comma
{
	var factor = Math.pow(10, digits);
	value = Math.round(value*factor);
	return value/factor;
}


// OK 21 XXX XXX XXX XXX XXX
// |  |  |   |   |   |   |
// |  |  |   |   |   |   |- [11]Battery Volatge
// |  |  |   |   |   |----- [9]warm Water
// |  |  |   |   |--------- [7]warm Water
// |  |  |   |------------- [5]cold Water
// |  |  |----------------- [3]cold Water
// |  |-------------------- [2]Sensor ID
// |----------------------- [0]fix "OK"


function defineemonWater(id){
    adapter.setObjectNotExists('emonWater_' + id, {
        type: 'channel',
        common: {
            name: 'emonWater ' + id,
            role: 'sensor'
        },
        native: {
            "addr": id
        }
    });
    adapter.log.info('RFM12B setting up object = emonWater' + id);

    adapter.setObjectNotExists('emonWater_' + id + '.cw_mom', {
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
    adapter.setObjectNotExists('emonWater_' + id + '.cw_cum', {
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
    adapter.setObjectNotExists('emonWater_' + id + '.ww_mom', {
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
    adapter.setObjectNotExists('emonWater_' + id + '.ww_cum', {
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
    adapter.setObjectNotExists('emonWater_' + id + '.batt', {
        type: 'state',
        common: {
            "name": "Battery",
            "type": "number",
            "unit": "V",
            "min": 0,
            "max": 5,
            "read": true,
            "write": false,
            "role": "value.battery",
            "desc": "Battery"
        },
        native: {}
    });
}



function logemonWater(data){
    var tmp = data.split(' ');
    //we are expecting data in form \"OK nodeid data1 data2 etc
    if(tmp[0]==='OK'){
        var tmpp=tmp.splice(3,12);
        adapter.log.debug('splice:' + tmpp);
        var buf = new Buffer(tmpp);
        var array=getConfigObjects(adapter.config.sensors, 'sid', tmp[2]);
        if (array.length === 0 || array.length !== 1) {
            adapter.log.debug('received ID :' + tmp[2] + ' is not defined in the adapter or not unique received address');
            
            /** new sensor -> config (not nice, because auf adapter restart, but works)
            adapter.getForeignObject('system.adapter.' + adapter.namespace, function(err,obj){
                if (err){
                    adapter.log.error(err);
                }
                else {
                    adapter.log.debug("native object : " + JSON.stringify(obj.native.sensors));
                    obj.native.sensors.push({"sid":tmp[2] , "usid":"nodef" , "stype":"emon???" , "name":"room???"});
                    adapter.setForeignObject('system.adapter.' + adapter.namespace, obj, function(err){
                       if(err) {adapter.log.error(err);}
                       else{
                           adapter.log.info("new sensor ID = " + tmp[2] + " added to config, please see admin page of adapter for further configuration");
                       }
                    });
                }
            });
            **/
            /** new sensor -> array in objects (push to state works but admin does not show the table) 
            adapter.getState('foundDevices.state', function(err,state){
                if (err){
                    adapter.log.error(err);
                }
                else {
                    adapter.log.debug("found devices : " + JSON.stringify(state));
                    var found = []; //alte Wert erstmal nicht übernehmen, damit nur ein neuer Sensor erscheint
                    found.push({"sid":tmp[2],"usid":"nodef","stype":"emon???","name":"room???"});
                    adapter.log.debug("found push = " + JSON.stringify(found));
                    adapter.setState('foundDevices.state', {val: found, ack: true}, function(err){
                       if(err) {adapter.log.error(err);}
                       else{
                           adapter.log.info("new sensor ID = "+ tmp[2] + " added to foundDevices, please see admin page of adapter for further configuratiuon");
                       }
                    });
                }
            });
            **/

        }
        else if (array[0].stype !== 'emonWater'){
            adapter.log.debug('received ID :' + tmp[2] + ' is not defined in the adapter as emonWater');
        }
        else if (array[0].usid != 'nodef'){
            adapter.log.info('cw_mom:'  +     (buf.readInt16LE(0))/10);
            adapter.log.info('cw counter: ' + (buf.readInt16LE(2))/10);
            adapter.log.info('ww_mom:'  +     (buf.readInt16LE(4))/10);
            adapter.log.info('ww counter: ' + (buf.readInt16LE(6))/10);
            adapter.log.info('Voltage: ' +    (buf.readInt16LE(8))/10);
            adapter.setState('emonWater_'+ array[0].usid +'.cw_mom', {val: (buf.readInt16LE(0))/10, ack: true});
            adapter.setState('emonWater_'+ array[0].usid +'.cw_cum', {val: (buf.readInt16LE(2))/10, ack: true});
            adapter.setState('emonWater_'+ array[0].usid +'.ww_mom', {val: (buf.readInt16LE(4))/10, ack: true});
            adapter.setState('emonWater_'+ array[0].usid +'.ww_cum', {val: (buf.readInt16LE(6))/10, ack: true});
            adapter.setState('emonWater_'+ array[0].usid +'.batt',   {val: (buf.readInt16LE(8))/10, ack: true});
        }
    }
}



// OK 19 XXXX XXXX XXXX XXXX XXXX
// |  |   |   |    |    |    |
// |  |   |   |    |    |    |-- [11]Pulsecount (firmware v2.1 onwards) -> not evaluated in adapter
// |  |   |   |    |    |------- [9]Battery Voltage
// |  |   |   |    |------------ [7]DHT22 Humidity
// |  |   |   |----------------- [5]DS18B20 Temperature
// |  |   |--------------------- [3]DHT22 Temperature
// |  |------------------------- [2]Sensor ID
// |---------------------------- [0]fix "OK"


function defineemonTH(id, name){
    adapter.setObjectNotExists('emonTH_' + id, {
        type: 'channel',
        common: {
            name: name,
            role: 'sensor'
        },
        native: {
            "addr": id
        }
    });
    adapter.log.info('RFM12B setting up object = emonTH' + id);

    adapter.setObjectNotExists('emonTH_' + id + '.temp', {
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
    adapter.setObjectNotExists('emonTH_' + id + '.humid', {
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
    adapter.setObjectNotExists('emonTH_' + id + '.batt', {
        type: 'state',
        common: {
            "name": "Battery",
            "type": "number",
            "unit": "V",
            "min": 0,
            "max": 5,
            "read": true,
            "write": false,
            "role": "value.battery",
            "desc": "Battery"
        },
        native: {}
    });
    adapter.setObjectNotExists('emonTH_' + id + '.abshumid', {
        type: 'state',
        common: {
            "name":     "abs Humidity",
            "type":     "number",
            "unit":     "g/m3",
            "min":      0,
            "max":      100,
            "read":     true,
            "write":    false,
            "role":     "value.humidity",
        },
        native: {}
    });
    adapter.setObjectNotExists('emonTH_' + id + '.dewpoint', {
        type: 'state',
        common: {
            "name":     "Dewpoint",
            "type":     "number",
            "unit":     "°C",
            "min":      -50,
            "max":      50,
            "read":     true,
            "write":    false,
            "role":     "value.temperature",
        },
        native: {}
    });
}

function logemonTH(data){
    var tmp = data.split(' ');
    //we are expecting data in form \"OK nodeid data1 data2 etc
    if(tmp[0]==='OK'){
        var tmpp=tmp.splice(3,8);
        adapter.log.debug('splice:' + tmpp);
        var buf = new Buffer(tmpp);
        var array=getConfigObjects(adapter.config.sensors, 'sid', tmp[2]);
        if (array.length === 0 || array.length !== 1) {
            adapter.log.debug('received ID :' + tmp[2] + ' is not defined in the adapter or not unique received address');
            
            /** new sensor -> config (not nice, because auf adapter restart, but works)
            adapter.getForeignObject('system.adapter.' + adapter.namespace, function(err,obj){
                if (err){
                    adapter.log.error(err);
                }
                else {
                    adapter.log.debug("native object : " + JSON.stringify(obj.native.sensors));
                    obj.native.sensors.push({"sid":tmp[2] , "usid":"nodef" , "stype":"emon???" , "name":"room???"});
                    adapter.setForeignObject('system.adapter.' + adapter.namespace, obj, function(err){
                       if(err) {adapter.log.error(err);}
                       else{
                           adapter.log.info("new sensor ID = " + tmp[2] + " added to config, please see admin page of adapter for further configuration");
                       }
                    });
                }
            });
            **/
        }
        else if (array[0].stype !== 'emonTH'){
            adapter.log.debug('received ID :' + tmp[2] + ' is not defined in the adapter as emonTH');
        }
        else if (array[0].usid != 'nodef'){
            adapter.log.info('Temperature:'+ (buf.readInt16LE(0))/10);
            adapter.log.info('Humidty: ' +   (buf.readInt16LE(4))/10);
            adapter.log.info('Voltage: ' +   (buf.readInt16LE(6))/10);
            adapter.setState('emonTH_'+ array[0].usid +'.temp',  {val: (buf.readInt16LE(0))/10, ack: true});
            adapter.setState('emonTH_'+ array[0].usid +'.humid', {val: (buf.readInt16LE(4))/10, ack: true});
            adapter.setState('emonTH_'+ array[0].usid +'.batt',  {val: (buf.readInt16LE(6))/10, ack: true});
            //absolute Feuchte und Taupunkt
            var temp = (buf.readInt16LE(0))/10;
            var rel = (buf.readInt16LE(4))/10;
            var vappress =rel/100 * 6.1078 * Math.exp(((7.5*temp)/(237.3+temp))/Math.LOG10E);
            var v = Math.log(vappress/6.1078) * Math.LOG10E;
            var dewp = (237.3 * v) / (7.5 - v);
            var habs = 1000 * 18.016 / 8314.3 * 100*vappress/(273.15 + temp );
            adapter.setState('emonTH_'+ array[0].usid +'.abshumid',   {val: round(habs, 1), ack: true});
            adapter.setState('emonTH_'+ array[0].usid +'.dewpoint',   {val: round(dewp, 1), ack: true});
        }
    }
}

// TX29DTH-IT mit H0...
// H005400750255
// H000700320268
// H001000290270
// H002700680253
// H002500390426

// H 00 AA F S T1T2H1T3H2H3
//   0  1  2 3 4 5 6 7 8 9
// H 00 ID X X X X X X X X
// |  | |  | | | | | | | |-[10] Humidity H3
// |  | |  | | | | | | |---[9] Humidity H2
// |  | |  | | | | | | ----[8] Temperature T3
// |  | |  | | | | |-------[7] Humidity H1
// |  | |  | | | |-------- [6] Temperature T2
// |  | |  | | |---------- [5] Temperature T1
// |  | |  | |------------ [4] Sensor type (0 = HMS100TF or 1 = HMS100T)
// |  | |  |-------------- [3] Flag und Temp Vorzeichen; 8 = <0°C, 2 = low Batt, A?=low Batt and <0°C
// |  | |----------------- [2] Sensor ID
// |  |------------------- [1] fix "00"
// |---------------------- [0] fix "H"
// Temp = (10*T3 + T1 + T2/10)* Vorzeichen
// Feuchte = (10*H2 + H3 + H1/10)

function defineHMS100TF(id, name){
    adapter.setObjectNotExists('HMS100TF_' + id, {
        type: 'channel',
        common: {
            name: name,
            role: 'sensor'
        },
        native: {
            "addr": id
        }
    });
    adapter.log.info('RFM12B setting up object = HMS100TF ' + id);

    adapter.setObjectNotExists('HMS100TF_' + id + '.temp', {
        type: 'state',
        common: {
            "name":     "Temperature",
            "type":     "number",
            "unit":     "°C",
            "min":      -50,
            "max":      50,
            "read":     true,
            "write":    false,
            "role":     "value.temperature",
            "desc":     "Temperature"
        },
        native: {}
    });
    adapter.setObjectNotExists('HMS100TF_' + id + '.humid', {
        type: 'state',
        common: {
            "name":     "Humidity",
            "type":     "number",
            "unit":     "%",
            "min":      0,
            "max":      100,
            "read":     true,
            "write":    false,
            "role":     "value.humidity",
            "desc":     "Humidity"
        },
        native: {}
    });
    adapter.setObjectNotExists('HMS100TF_' + id + '.lowBatt', {
        type: 'state',
        common: {
            "name":     "Battery Low",
            "type":     "boolean",
            "role":     "value.lowBatt",
        },
        native: {}
    });
    adapter.setObjectNotExists('HMS100TF_' + id + '.abshumid', {
        type: 'state',
        common: {
            "name":     "abs Humidity",
            "type":     "number",
            "unit":     "g/m3",
            "min":      0,
            "max":      100,
            "read":     true,
            "write":    false,
            "role":     "value.humidity",
        },
        native: {}
    });
    adapter.setObjectNotExists('HMS100TF_' + id + '.dewpoint', {
        type: 'state',
        common: {
            "name":     "Dewpoint",
            "type":     "number",
            "unit":     "°C",
            "min":      -50,
            "max":      50,
            "read":     true,
            "write":    false,
            "role":     "value.temperature",
        },
        native: {}
    });
}


function logHMS100TF(data){
    var tmp = data.split('');
    if(tmp[0]==='H'){                      // Wenn ein Datensatz sauber gelesen wurde
        // somit werden alle SenderIDs bearbeitet
        var buf = new Buffer(tmp);
        var eid = buf.readIntLE(3)*10 + buf.readIntLE(4); //empfangene ID
        var array=getConfigObjects(adapter.config.sensors, 'sid', eid);
        if (array.length === 0 || array.length !== 1) {
            adapter.log.debug('received ID :' + eid + ' is not defined in the adapter or not unique received address');
        }
        else if (array[0].stype !==  'HMS100TF'){
            adapter.log.debug('received ID :' + eid + ' is not defined in the adapter as HMS100TF');
        }
        else if (array[0].usid != 'nodef'){
            adapter.log.debug('Sensor ID    : '+ eid );
            adapter.log.debug('Type         : '+ (buf.readIntLE(6)) ); //should be 0 otherwise it is only temperature
            adapter.log.debug('Temperatur   : '+ ( (buf.readIntLE(10)*10) + (buf.readIntLE(7))+(buf.readIntLE(8)/10) )); // Vorzeichen fehlt noch
            adapter.log.debug('Humidty      : '+ ( (buf.readIntLE(11)*10) + (buf.readIntLE(12))+(buf.readIntLE(9)/10) ));
            adapter.log.debug('LowBattery   : '+ ( (buf.readIntLE(5) & 0x02) >> 1));      //irgendwie wird xA nicht ausgewertet 
            // Werte schreiben
            // aus gesendeter ID die unique ID bestimmen
            adapter.setState('HMS100TF_'+ array[0].usid +'.lowBatt', {val: ((buf.readIntLE(5) & 0x02) >> 1), ack: true});
            adapter.setState('HMS100TF_'+ array[0].usid +'.temp',    {val: ( (buf.readIntLE(10)*10) + (buf.readIntLE(7))+(buf.readIntLE(8)/10) ), ack: true});
            adapter.setState('HMS100TF_'+ array[0].usid +'.humid',   {val: ( (buf.readIntLE(11)*10) + (buf.readIntLE(12))+(buf.readIntLE(9)/10) ), ack: true});
                //absolute Feuchte und Taupunkt
            var temp = ( (buf.readIntLE(10)*10) + (buf.readIntLE(7))+(buf.readIntLE(8)/10) );
            var rel = ( (buf.readIntLE(11)*10) + (buf.readIntLE(12))+(buf.readIntLE(9)/10) );
            var vappress =rel/100 * 6.1078 * Math.exp(((7.5*temp)/(237.3+temp))/Math.LOG10E);
            var v = Math.log(vappress/6.1078) * Math.LOG10E;
            var dewp = (237.3 * v) / (7.5 - v);
            var habs = 1000 * 18.016 / 8314.3 * 100*vappress/(273.15 + temp );
            adapter.setState('HMS100TF_'+ array[0].usid +'.abshumid',   {val: round(habs, 1), ack: true});
            adapter.setState('HMS100TF_'+ array[0].usid +'.dewpoint',   {val: round(dewp, 1), ack: true});
        }
    }
}

// EMT7110 FHEM
// Format
// 
// OK  EMT7110  84 81  8  237 0  13  0  2   1  6  1  -> ID 5451   228,5V   13mA   2W   2,62kWh
// OK  EMT7110  84 162 8  207 0  76  0  7   0  0  1
// OK  EMT7110  ID ID  VV VV  AA AA  WW WW  KW KW Flags
//     |        |  |   |  |   |  |   |  |   |  |
//     |        |  |   |  |   |  |   |  |   |   `--- AccumulatedPower * 100 LSB
//     |        |  |   |  |   |  |   |  |    `------ AccumulatedPower * 100 MSB
//     |        |  |   |  |   |  |   |   `--- Power (W) LSB
//     |        |  |   |  |   |  |    `------ Power (W) MSB
//     |        |  |   |  |   |   `--- Current (mA) LSB
//     |        |  |   |  |    `------ Current (mA) MSB
//     |        |  |   |  `--- Voltage (V) * 10 LSB
//     |        |  |    `----- Voltage (V) * 10 MSB
//     |        |    `--- ID
//     |         `------- ID
//      `--- fix "EMT7110"



// LevelSender FHEM
// Format
// 
// OK LS 1  0   5   100 4   191 60      =  38,0cm    21,5°C   6,0V
// OK LS 1  0   8   167 4   251 57      = 121,5cm    27,5°C   5,7V   
// OK LS ID X   XXX XXX XXX XXX XXX
// |   | |  |    |   |   |   |   |
// |   | |  |    |   |   |   |   `--- Voltage * 10
// |   | |  |    |   |   |   `------- Temp. * 10 + 1000 LSB
// |   | |  |    |   |   `----------- Temp. * 10 + 1000 MSB
// |   | |  |    |   `--------------- Level * 10 + 1000 MSB
// |   | |  |    `------------------- Level * 10 + 1000 LSB
// |   | |  `------------------------ Sensor type fix 0 at the moment
// |   | `--------------------------- Sensor ID ( 0 .. 15)
// |   `----------------------------- fix "11"
// `--------------------------------- fix "LS"


/*
WS 1080  17.241 kbps  868.3 MHz
-------------------------------

A8 C0 58 5E 00 00 00 86 0A D8
ID: 8C, T=  8.8`C, relH= 94%, Wvel=  0.0m/s, Wmax=  0.0m/s, Wdir=SW , Rain=  40.2mm

A8 C0 55 5E 00 00 00 86 04 06
ID: 8C, T=  8.5`C, relH= 94%, Wvel=  0.0m/s, Wmax=  0.0m/s, Wdir=E  , Rain=  40.2mm

A8 C0 50 60 00 00 00 86 04 BF
ID: 8C, T=  8.0`C, relH= 96%, Wvel=  0.0m/s, Wmax=  0.0m/s, Wdir=E  , Rain=  40.2mm
*/

// A8 C0 50 60 00 00 00 86 04 BF
// |  |  |  |  |  |  |  |  |  |---[9] CRC? 
// |  |  |  |  |  |  |  |  |------[8] Wind Direction Steps of 22,5° WindDirection = 22.5 * (bytes[8] & 0x0F)
// |  |  |  |  |  |  |  |---------[7] Rain (0.5 mm steps)
// |  |  |  |  |  |  |------------[6] Rain Rain = (((bytes[6] & 0x0F) << 8) | bytes[7]) * 0.6
// |  |  |  |  |  |-------------- [5] Wind gust *0,34
// |  |  |  |  |----------------- [4] Wind Speed *0,34
// |  |  |  |-------------------- [3] Humidity
// |  |  |----------------------- [2] Temp * 0.1 temp = ((bytes[1] & 0x07) << 8) | bytes[2] inkl. vorzeichen sign = (bytes[1] >> 3) & 1
// |  |---------------------------[1] Sensor ID ((bytes[0] & 0xF) << 4) | ((bytes[1] & 0xF0) >> 4)
// |------------------------------[0] fix "A"

// LaCrosse und Derivate
// OK 9 56 1   4   156 37   ID = 56 T: 18.0 H: 37 no NewBatt
// OK 9 49 1   4   182 54   ID = 49 T: 20.6 H: 54 no NewBatt
// OK 9 55 129 4   192 56   ID = 55 T: 21.6 H: 56 WITH NewBatt
// OK 9 ID XXX XXX XXX XXX
// |  | |  |   |   |   |
// |  | |  |   |   |   |-- [6]Humidity incl. WeakBatteryFlag
// |  | |  |   |   |------ [5]Temp * 10 + 1000 LSB
// |  | |  |   |---------- [4]Temp * 10 + 1000 MSB
// |  | |  |-------------- [3]Sensor type (1 or 2) +128 if NewBatteryFlag
// |  | |----------------- [2]Sensor ID
// |  |------------------- [1]fix "9"
// |---------------------- [0]fix "OK"



function defineLaCrosseDTH(id, name){
    adapter.setObjectNotExists('LaCrosse_' + id, {
        type: 'channel',
        common: {
            name: name,
            role: 'sensor'
        },
        native: {
            "addr": id
        }
    });
    adapter.log.info('RFM12B setting up object = LaCrosse ' + id);

    adapter.setObjectNotExists('LaCrosse_' + id + '.temp', {
        type: 'state',
        common: {
            "name":     "Temperature",
            "type":     "number",
            "unit":     "°C",
            "min":      -50,
            "max":      50,
            "read":     true,
            "write":    false,
            "role":     "value.temperature",
            "desc":     "Temperature"
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosse_' + id + '.humid', {
        type: 'state',
        common: {
            "name":     "Humidity",
            "type":     "number",
            "unit":     "%",
            "min":      0,
            "max":      100,
            "read":     true,
            "write":    false,
            "role":     "value.humidity",
            "desc":     "Humidity"
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosse_' + id + '.lowBatt', {
        type: 'state',
        common: {
            "name":     "Battery Low",
            "type":     "boolean",
            "role":     "value.lowBatt",
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosse_' + id + '.newBatt', {
        type: 'state',
        common: {
            "name":     "Battery New",
            "type":     "boolean",
            "role":     "value.newBatt",
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosse_' + id + '.abshumid', {
        type: 'state',
        common: {
            "name":     "abs Humidity",
            "type":     "number",
            "unit":     "g/m3",
            "min":      0,
            "max":      100,
            "read":     true,
            "write":    false,
            "role":     "value.humidity",
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosse_' + id + '.dewpoint', {
        type: 'state',
        common: {
            "name":     "Dewpoint",
            "type":     "number",
            "unit":     "°C",
            "min":      -50,
            "max":      50,
            "read":     true,
            "write":    false,
            "role":     "value.temperature",
        },
        native: {}
    });
}


function logLaCrosseDTH(data){
    var tmp = data.split(' ');
    if(tmp[0]==='OK'){                      // Wenn ein Datensatz sauber gelesen wurde
        if(tmp[1]=='9'){                    // Für jeden Datensatz mit dem fixen Eintrag 9
            // somit werden alle SenderIDs bearbeitet
            var tmpp=tmp.splice(2,6);       // es werden die vorderen Blöcke (0,1,2) entfernt
            adapter.log.debug('splice       : '+ tmpp);
            var buf = new Buffer(tmpp);
            var array=getConfigObjects(adapter.config.sensors, 'sid', buf.readIntLE(0));
            if (array.length === 0 || array.length !== 1) {
                adapter.log.debug('received ID :' + buf.readIntLE(0) + ' is not defined in the adapter or not unique received address');
                
                /** new sensor -> config (not nice, because auf adapter restart, but works)
                adapter.getForeignObject('system.adapter.' + adapter.namespace, function(err,obj){
                    if (err){
                        adapter.log.error(err);
                    }
                    else {
                        adapter.log.debug("native object : " + JSON.stringify(obj.native.sensors));
                        obj.native.sensors.push({"sid": buf.readIntLE(0) , "usid":"nodef" , "stype":"LaCrosse???" , "name":"room???"});
                        adapter.setForeignObject('system.adapter.' + adapter.namespace, obj, function(err){
                           if(err) {adapter.log.error(err);}
                           else{
                               adapter.log.info("new sensor ID = "+ buf.readIntLE(0) + "added to config, please see admin page of adapter for further configuration");
                           }
                        });
                    }
                });
                **/
            }
            else if (array[0].stype !==  'LaCrosseDTH'){
                adapter.log.debug('received ID :' + buf.readIntLE(0) + ' is not defined in the adapter as LaCrosseDTH');
            }
            else if (array[0].usid != 'nodef'){
                adapter.log.debug('Sensor ID    : '+ (buf.readIntLE(0)));
                adapter.log.debug('Type         : '+ ((buf.readIntLE(1) & 0x70) >> 4));
                adapter.log.debug('NewBattery   : '+ ((buf.readIntLE(1) & 0x80) >> 7));       // wenn "100000xx" dann NewBatt # xx = SensorType 1 oder 2
                adapter.log.debug('Temperatur   : '+ ((((buf.readIntLE(2))*256)+(buf.readIntLE(3))-1000)/10));
                adapter.log.debug('Humidty      : '+ (buf.readIntLE(4) & 0x7f));
                adapter.log.debug('LowBattery   : '+ ((buf.readIntLE(4) & 0x80) >> 7));       // Hier muss noch "incl. WeakBatteryFlag" ausgewertet werden
                // Werte schreiben
                // aus gesendeter ID die unique ID bestimmen
                adapter.setState('LaCrosse_'+ array[0].usid +'.lowBatt', {val: ((buf.readIntLE(4) & 0x80) >> 7), ack: true});
                adapter.setState('LaCrosse_'+ array[0].usid +'.newBatt', {val: ((buf.readIntLE(1) & 0x80) >> 7), ack: true});
                adapter.setState('LaCrosse_'+ array[0].usid +'.temp',    {val: ((((buf.readIntLE(2))*256)+(buf.readIntLE(3))-1000)/10), ack: true});
                adapter.setState('LaCrosse_'+ array[0].usid +'.humid',   {val: (buf.readIntLE(4) & 0x7f), ack: true});
                 //absolute Feuchte und Taupunkt
                var temp = ((((buf.readIntLE(2))*256)+(buf.readIntLE(3))-1000)/10);
                var rel = (buf.readIntLE(4) & 0x7f);
                var vappress =rel/100 * 6.1078 * Math.exp(((7.5*temp)/(237.3+temp))/Math.LOG10E);
                var v = Math.log(vappress/6.1078) * Math.LOG10E;
                var dewp = (237.3 * v) / (7.5 - v);
                var habs = 1000 * 18.016 / 8314.3 * 100*vappress/(273.15 + temp );
                adapter.setState('LaCrosse_'+ array[0].usid +'.abshumid',   {val: round(habs, 1), ack: true});
                adapter.setState('LaCrosse_'+ array[0].usid +'.dewpoint',   {val: round(dewp, 1), ack: true});
                
            }
        }
    }
}

// Weather Station
//OK WS 60  1   4   193 52    2 88  4   101 15  20          ID=60  21.7°C  52%rH  600mm  Dir.: 112.5°  Wind:15m/s  Gust:20m/s
//OK WS ID  XXX TTT TTT HHH RRR RRR DDD DDD SSS SSS GGG GGG FFF PPP PPP
//|  |  |   |   |   |   |   |   |   |   |   |   |   |   |   |-- Flags *
//|  |  |   |   |   |   |   |   |   |   |   |   |   |   |------ WindGust * 10 LSB (0.0 ... 50.0 m/s)           FF/FF = none
//|  |  |   |   |   |   |   |   |   |   |   |   |   |---------- WindGust * 10 MSB
//|  |  |   |   |   |   |   |   |   |   |   |   |-------------- WindSpeed  * 10 LSB(0.0 ... 50.0 m/s)          FF/FF = none
//|  |  |   |   |   |   |   |   |   |   |   |------------------ WindSpeed  * 10 MSB
//|  |  |   |   |   |   |   |   |   |   |---------------------- WindDirection * 10 LSB (0.0 ... 365.0 Degrees) FF/FF = none
//|  |  |   |   |   |   |   |   |   |-------------------------- WindDirection * 10 MSB
//|  |  |   |   |   |   |   |   |------------------------------ Rain LSB (0 ... 9999 mm)                       FF/FF = none
//|  |  |   |   |   |   |   |---------------------------------- Rain MSB
//|  |  |   |   |   |   |-------------------------------------- Humidity (1 ... 99 %rH)                        FF = none
//|  |  |   |   |   |------------------------------------------ Temp * 10 + 1000 LSB (-40 ... +60 ∞C)          FF/FF = none
//|  |  |   |   |---------------------------------------------- Temp * 10 + 1000 MSB
//|  |  |   |-------------------------------------------------- Sensor type (1=TX22IT, 2=NodeSensor, 3=WS1080)
//|  |  |------------------------------------------------------ Sensor ID (1 ... 63)
//|  |--------------------------------------------------------- fix "WS"
//|------------------------------------------------------------ fix "OK"
//* Flags: 128  64  32  16  8   4   2   1
//                              |   |   |
//                              |   |   |-- New battery
//                              |   |------ ERROR
//                              |---------- Low battery

function defineLaCrosseWS(id, name){
    adapter.setObjectNotExists('LaCrosseWS_' + id, {
        type: 'channel',
        common: {
            name: name,
            role: 'sensor'
        },
        native: {
            "addr": id
        }
    });
    adapter.log.info('RFM12B setting up object = LaCrosseWS ' + id);

    adapter.setObjectNotExists('LaCrosseWS_' + id + '.temp', {
        type: 'state',
        common: {
            "name":     "Temperature",
            "type":     "number",
            "unit":     "°C",
            "min":      -50,
            "max":      50,
            "read":     true,
            "write":    false,
            "role":     "value.temperature",
            "desc":     "Temperature"
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosseWS_' + id + '.humid', {
        type: 'state',
        common: {
            "name":     "Humidity",
            "type":     "number",
            "unit":     "%",
            "min":      0,
            "max":      100,
            "read":     true,
            "write":    false,
            "role":     "value.humidity",
            "desc":     "Humidity"
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosseWS_' + id + '.rain', {
        type: 'state',
        common: {
            "name":     "Rain",
            "type":     "number",
            "unit":     "mm",
            "min":      0,
            "max":      9999,
            "read":     true,
            "write":    false,
            "role":     "value",
            "desc":     "Rain"
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosseWS_' + id + '.wspeed', {
        type: 'state',
        common: {
            "name":     "Wind Speed",
            "type":     "number",
            "unit":     "m/s",
            "min":      0,
            "max":      50,
            "read":     true,
            "write":    false,
            "role":     "value",
            "desc":     "Wind Speed"
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosseWS_' + id + '.wdir', {
        type: 'state',
        common: {
            "name":     "Wind Direction",
            "type":     "number",
            "unit":     "°",
            "min":      0,
            "max":      365,
            "read":     true,
            "write":    false,
            "role":     "value",
            "desc":     "Wind Direction"
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosseWS_' + id + '.wgust', {
        type: 'state',
        common: {
            "name":     "Wind Gust",
            "type":     "number",
            "unit":     "m/s",
            "min":      0,
            "max":      50,
            "read":     true,
            "write":    false,
            "role":     "value",
            "desc":     "Wind Gust"
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosseWS_' + id + '.abshumid', {
        type: 'state',
        common: {
            "name":     "abs Humidity",
            "type":     "number",
            "unit":     "g/m3",
            "min":      0,
            "max":      100,
            "read":     true,
            "write":    false,
            "role":     "value.humidity",
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosseWS_' + id + '.dewpoint', {
        type: 'state',
        common: {
            "name":     "Dewpoint",
            "type":     "number",
            "unit":     "°C",
            "min":      -50,
            "max":      50,
            "read":     true,
            "write":    false,
            "role":     "value.temperature",
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosseWS_' + id + '.lowBatt', {
        type: 'state',
        common: {
            "name":     "Battery Low",
            "type":     "boolean",
            "role":     "value.lowBatt",
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosseWS_' + id + '.newBatt', {
        type: 'state',
        common: {
            "name":     "Battery New",
            "type":     "boolean",
            "role":     "value.newBatt",
        },
        native: {}
    });
}


function logLaCrosseWS(data){
    var tmp = data.split(' ');
    if(tmp[0]==='OK'){                      // Wenn ein Datensatz sauber gelesen wurde
        if(tmp[1]=='WS'){                    // Für jeden Datensatz mit dem fixen Eintrag WS
            // somit werden alle SenderIDs bearbeitet
            var tmpp=tmp.splice(2,18);       // es werden die vorderen Blöcke (0,1,2) entfernt
            adapter.log.debug('splice       : '+ tmpp);
            var buf = new Buffer(tmpp);
            var array=getConfigObjects(adapter.config.sensors, 'sid', buf.readIntLE(0));
            if (array.length === 0 || array.length !== 1) {
                adapter.log.debug('received ID :' + buf.readIntLE(0) + ' is not defined in the adapter or not unique received address');
            }
            else if (array[0].stype !==  'LaCrosseWS'){
                adapter.log.debug('received ID :' + buf.readIntLE(0) + ' is not defined in the adapter as LaCrosseWS');
            }
            else if (array[0].usid != 'nodef'){
                adapter.log.debug('Station ID    : '+ (buf.readIntLE(0)) );
                adapter.log.debug('Type         : '+ (buf.readIntLE(1)) ); //should be 3 otherwise it is only temperature
                adapter.log.debug('Temperatur   : '+ ((((buf.readIntLE(2))*256)+(buf.readIntLE(3))-1000)/10) ) ; // Vorzeichen fehlt noch
                adapter.log.debug('Humidty      : '+ ((buf.readIntLE(4))*256) );
                adapter.log.debug('Rain         : '+ ((((buf.readIntLE(5))*256)+(buf.readIntLE(6)))/10) );
                adapter.log.debug('WindSpeed    : '+ ((((buf.readIntLE(9))*256)+(buf.readIntLE(10)))/10) );
                adapter.log.debug('WindDirection: '+ ((((buf.readIntLE(7))*256)+(buf.readIntLE(8)))/10) );
                adapter.log.debug('WindGust     : '+ ((((buf.readIntLE(11))*256)+(buf.readIntLE(12)))/10) );
                adapter.log.debug('NewBattery   : '+ (buf.readIntLE(13) & 0x01) );
                adapter.log.debug('LowBattery   : '+ ((buf.readIntLE(13) & 0x04) >> 2) ); 
                // Werte schreiben
                // aus gesendeter ID die unique ID bestimmen
                adapter.setState('LaCrosseWS_'+ array[0].usid +'.temp',    {val: ((((buf.readIntLE(2))*256)+(buf.readIntLE(3))-1000)/10), ack: true});
                adapter.setState('LaCrosseWS_'+ array[0].usid +'.humid',   {val: ((buf.readIntLE(4)*256)), ack: true});
                adapter.setState('LaCrosseWS_'+ array[0].usid +'.rain',    {val: ((((buf.readIntLE(5))*256)+(buf.readIntLE(6)))/10), ack: true});
                adapter.setState('LaCrosseWS_'+ array[0].usid +'.wspeed',  {val: ((((buf.readIntLE(9))*256)+(buf.readIntLE(10)))/10), ack: true});
                adapter.setState('LaCrosseWS_'+ array[0].usid +'.wdir',    {val: ((((buf.readIntLE(7))*256)+(buf.readIntLE(8)))/10), ack: true});
                adapter.setState('LaCrosseWS_'+ array[0].usid +'.wgust',   {val: ((((buf.readIntLE(11))*256)+(buf.readIntLE(12)))/10), ack: true});
                adapter.setState('LaCrosseWS_'+ array[0].usid +'.lowBatt', {val: ((buf.readIntLE(13) & 0x04) >> 2), ack: true});
                adapter.setState('LaCrosseWS_'+ array[0].usid +'.newBatt', {val: ((buf.readIntLE(13) & 0x01) ), ack: true});
                    //absolute Feuchte und Taupunkt
                var temp = ((((buf.readIntLE(2))*256)+(buf.readIntLE(3))-1000)/10);
                var rel = ((buf.readIntLE(4))*256) ;
                var vappress =rel/100 * 6.1078 * Math.exp(((7.5*temp)/(237.3+temp))/Math.LOG10E);
                var v = Math.log(vappress/6.1078) * Math.LOG10E;
                var dewp = (237.3 * v) / (7.5 - v);
                var habs = 1000 * 18.016 / 8314.3 * 100*vappress/(273.15 + temp );
                adapter.setState('LaCrosseWS_'+ array[0].usid +'.abshumid',   {val: round(habs, 1), ack: true});
                adapter.setState('LaCrosseWS_'+ array[0].usid +'.dewpoint',   {val: round(dewp, 1), ack: true});
            }
        }
    }
}
// superjee LaCrosse mit BMP180
// OK WS 0 2    4  212 255 255 255 255 255 255 255 255 255 0   3   241  ID=0 T:23,6 Druck 1009 hPa
// OK WS 0 XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX
// |  |  |  |   |   |   |   |   |   |   |   |   |   |   |   |   |   | --- [18] Druck LSB
// |  |  |  |   |   |   |   |   |   |   |   |   |   |   |   |   |-------- [17] Druck MSB
// |  |  |  |   |   |   |   |   |   |   |   |   |   |   |   |------------ [16] Flags ?
// |  |  |  |   |   |   |   |   |   |   |   |   |   |   | --------------- [15]
// |  |  |  |   |   |   |   |   |   |   |   |   |   |-------------------- [14]
// |  |  |  |   |   |   |   |   |   |   |   |   |   |-------------------- [13]
// |  |  |  |   |   |   |   |   |   |   |   |   |------------------------ [12]
// |  |  |  |   |   |   |   |   |   |   |   |---------------------------- [11]
// |  |  |  |   |   |   |   |   |   |   |-------------------------------- [10]
// |  |  |  |   |   |   |   |   |   |------------------------------------ [9]
// |  |  |  |   |   |   |   |   |---------------------------------------- [8]
// |  |  |  |   |   |   |   |-------------------------------------------- [7]
// |  |  |  |   |   |   |------------------------------------------------ [6]
// |  |  |  |   |   |---------------------------------------------------- [5]Temp * 10 + 1000 LSB
// |  |  |  |   |-------------------------------------------------------- [4]Temp * 10 + 1000 MSB
// |  |  |  |------------------------------------------------------------ [3]Sensor type 2 fix
// |  |  |--------------------------------------------------------------- [2]Sensor ID=0 fix
// |  |------------------------------------------------------------------ [1]fix "WS"
// |--------------------------------------------------------------------- [0]fix "OK"

function defineLaCrosseBMP180(id, name){    
    adapter.setObjectNotExists('LaCrosse_' + id, {
        type: 'channel',
        common: {
            name: name,
            role: 'sensor'
        },
        native: {
            "addr": id
        }
    });
    adapter.log.info('RFM12B setting up object = LaCrosse ' + id);

    adapter.setObjectNotExists('LaCrosse_' + id + '.temp', {
        type: 'state',
        common: {
            "name":     "Temperature",
            "type":     "number",
            "unit":     "°C",
            "min":      -50,
            "max":      50,
            "read":     true,
            "write":    false,
            "role":     "value.temperature",
            "desc":     "Temperature"
        },
        native: {}
    });
    adapter.setObjectNotExists('LaCrosse_' + id + '.pressure', {
        type: 'state',
        common: {
            "name":     "air pressure",
            "type":     "number",
            "unit":     "hPa",
            "min":      0,
            "max":      1200,
            "read":     true,
            "write":    false,
            "role":     "value",
            "desc":     "air pressure"
        },
        native: {}
    });
}

function logLaCrosseBMP180(data){
    var tmp = data.split(' ');
    if(tmp[0]==='OK'){                      // Wenn ein Datensatz sauber gelesen wurde
        if(tmp[1]=='WS'){                    // Für jeden Datensatz mit dem fixen Eintrag WS
            // somit werden alle SenderIDs bearbeitet
            var tmpp=tmp.splice(2,18);       // es werden die vorderen Blöcke (0,1,2) entfernt
            adapter.log.debug('splice       : '+ tmpp);
            var buf = new Buffer(tmpp);
            var array=getConfigObjects(adapter.config.sensors, 'sid', buf.readIntLE(0));
            if (array.length === 0 || array.length !== 1) {
                adapter.log.debug('received ID :' + buf.readIntLE(0) + ' is not defined in the adapter or not unique received address');
            }
            else if (array[0].stype !==  'LaCrosseBMP180'){
                adapter.log.debug('received ID :' + buf.readIntLE(0) + ' is not defined in the adapter as LaCrosseDTH');
            }
            else if (array[0].usid != 'nodef'){
                adapter.log.debug('Sensor ID    : '+ (buf.readIntLE(0)) );
                adapter.log.debug('Type         : '+ (buf.readIntLE(1)) );
                adapter.log.debug('Temperatur   : '+ ((((buf.readIntLE(2))*256)+(buf.readIntLE(3))-1000)/10) );
                adapter.log.debug('Pressure      : '+ (((buf.readIntLE(14))*256)+(buf.readIntLE(15))) );
                // Werte schreiben
                // aus gesendeter ID die unique ID bestimmen
                adapter.setState('LaCrosse_'+ array[0].usid +'.temp',    {val: ((((buf.readIntLE(2))*256)+(buf.readIntLE(3))-1000)/10), ack: true});
                adapter.setState('LaCrosse_'+ array[0].usid +'.pressure',   {val: (((buf.readIntLE(14))*256)+(buf.readIntLE(15))), ack: true});                
            }
        }
    }
}


function write_cmd(command){

            sp.write(command, function(err) {
                if (err) {
                    return adapter.log.debug('Error on write: ', err.message);
                    }
                adapter.log.debug('message to USB-stick written : ' + command);
            });
        }

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
	adapter.log.debug('start of main');
    var obj = adapter.config.sensors;
    for (var anz in obj){
        if(obj[anz].stype=="emonTH") {
            defineemonTH(obj[anz].usid, obj[anz].name );
        }else
        if(obj[anz].stype=="emonWater"){
            defineemonWater(obj[anz].usid, obj[anz].name);
        }else
        if(obj[anz].stype=="LaCrosseDTH"){
            defineLaCrosseDTH(obj[anz].usid, obj[anz].name);
        }else 
        if(obj[anz].stype=="LaCrosseBMP180"){
            defineLaCrosseBMP180(obj[anz].usid, obj[anz].name);
        }
        if(obj[anz].stype=="HMS100TF"){
            defineHMS100TF(obj[anz].usid, obj[anz].name);
        }
        if(obj[anz].stype=="LaCrosseWS"){
            defineLaCrosseWS(obj[anz].usid, obj[anz].name);
        }
    }

    var options = {
        baudRate:   parseInt(adapter.config.baudrate)   || parseInt(57600)
    };
	adapter.log.debug('configured port : ' + adapter.config.serialport );
	adapter.log.debug('configured baudrate : ' + adapter.config.baudrate );
	adapter.log.debug('options : ' + JSON.stringify(options) );	
    	const sp = new SerialPort(adapter.config.serialport || '/dev/ttyUSB0', options, function (error) {
        if ( error ) {
            adapter.log.info('failed to open: '+error);
        } else {
            adapter.log.info('open');
	    const parser = sp.pipe(new Readline({ delimiter: '\r\n' }));
		//const parser = new Readline({ delimiter: '\r\n' });
		//sp.pipe(parser);
            parser.on('data', function(data) {

                adapter.log.info('data received: ' + data);
                if ( data.startsWith('H0')){
                    logHMS100TF(data);
                }
                else {
                    var tmp = data.split(' ');
                    if(tmp[0]==='OK'){
                        if (tmp[1]=== '9'){ // 9 ist fix für LaCrosse
                           logLaCrosseDTH(data);
                        }
                    else if (tmp[1]=== 'WS'){ //derzeitig fix für superjee, noch auf beide geschickt :-(
                           logLaCrosseBMP180(data);
                           logLaCrosseWS(data);
                        }
                        else {  // es wird auf beide log der Datenstrom geschickt und dann ausgewertet
                                logemonTH(data);
                                logemonWater(data);
                        }
                    }
                }


            });
	    if (adapter.config.command_en) {
                setTimeout(write_cmd(adapter.config.command) , 1500); //1,5s Verzögerung
            }
        }
    });


    // in this template all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');


}
