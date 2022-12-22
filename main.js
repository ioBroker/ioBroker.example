'use strict';

/*
 * Created with @iobroker/create-adapter v2.0.2
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require("fs");

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

let timeout;
class Jeelink extends utils.Adapter {
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'jeelink'
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here
		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		this.log.info('start of main');
		var obj = this.config.sensors;
		for (var anz in obj) {
			if (obj[anz].stype == 'emonTH') {
				await this.defineemonTH(obj[anz].usid, obj[anz].name);
			} else if (obj[anz].stype == 'emonWater') {
				await this.defineemonWater(obj[anz].usid, obj[anz].name);
			} else if (obj[anz].stype.indexOf('LaCrosseDT') == 0) {
				await this.defineLaCrosseDTH(obj[anz].usid, obj[anz].name, obj[anz].stype);
			} else if (obj[anz].stype == 'LaCrosseBMP180') {
				await this.defineLaCrosseBMP180(obj[anz].usid, obj[anz].name);
			}
			if (obj[anz].stype == 'HMS100TF') {
				await this.defineHMS100TF(obj[anz].usid, obj[anz].name);
			}
			if (obj[anz].stype == 'LaCrosseWS') {
				await this.defineLaCrosseWS(obj[anz].usid, obj[anz].name);
			}
			if (obj[anz].stype == 'DavisVantage') {
				await this.defineDavisVantage(obj[anz].usid, obj[anz].name);
			}
			if (obj[anz].stype == 'EC3000') {
				await this.defineEC3000(obj[anz].usid, obj[anz].name);
			}
			if (obj[anz].stype == 'EMT7110') {
				await this.defineEMT7110(obj[anz].usid, obj[anz].name);
			}
			if (obj[anz].stype == 'level') {
				await this.defineLevel(obj[anz].usid, obj[anz].name);
			}
		}
		let path = this.config.serialport || '/dev/ttyUSB0';
		let baudrate = parseInt(this.config.baudrate || 57600);

		this.log.info('configured port : ' + this.config.serialport);
		this.log.info('configured baudrate : ' + this.config.baudrate);
		this.log.info('instantiating SerialPort path: ' + path + ' baudrate : ' + baudrate);

		const sp = new SerialPort({ path: path, baudRate: baudrate }, async (error) => {
			if (error) {
				this.log.error('failed to open Serialport: ' + error);
				//console.log('usb open error' + error);
			} else {
				this.log.info('adapter opened the SerialPort');
				const parser = sp.pipe(new ReadlineParser({ delimiter: '\r\n' }));
				//const parser = new Readline({ delimiter: '\r\n' });
				//sp.pipe(parser);
				parser.on('data', async (data) => {
					this.log.debug('data received: ' + data);
					if (data.startsWith('H0')) {
						await this.logHMS100TF(data);
					} else {
						var tmp = data.split(' ');
						if (tmp[0] === 'OK') {
							if (tmp[1] === '9') {
								// 9 ist fix für LaCrosse
								await this.logLaCrosseDTH(data);
							} else if (tmp[1] === '22') {
								//22 ist fix für EC3000
								await this.logEC3000(data);
							} else if (tmp[1] === 'EMT7110') {
								// EMT7110 ist fix für EMT7110
								await this.logEMT7110(data);
							} else if (tmp[1] === 'LS') {
								// LS fix für level
								await this.logLevel(data);
							} else if (tmp[2] === 'DAVIS') {
								// DAVIS fix für Davis Vantage
								await this.logDavisVantage(data);
							} else if (tmp[1] === 'WS') {
								//derzeitig fix für superjee, noch auf beide geschickt :-(
								await this.logLaCrosseBMP180(data);
								await this.logLaCrosseWS(data);
							} else {
								// es wird auf beide log der Datenstrom geschickt und dann ausgewertet
								await this.logemonTH(data);
								await this.logemonWater(data);
							}
						}
					}
				});
				if (this.config.command_en) {
					timeout = setTimeout(() => {
						sp.write(this.config.command, (err) => {
							if (err) {
								return this.log.debug('Error on write: ' + err.message);
							}
							this.log.debug('message to USB-stick written : ' + this.config.command);
						});
					}, 1500);
				}
			}
		});
		this.subscribeStates('*');
	}
	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	async onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			clearTimeout(timeout);
			// clearTimeout(timeout2);
			// ...
			//clearInterval(interval1);
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.debug(`state ${id} deleted`);
		}
	}

	getConfigObjects(Obj, where, what) {
		var foundObjects = [];
		for (var prop in Obj) {
			if (Obj[prop][where] == what) {
				foundObjects.push(Obj[prop]);
			}
		}
		return foundObjects;
	}
	round(value, digits) {
		var factor = Math.pow(10, digits);
		value = Math.round(value * factor);
		return value / factor;
	} //digits 1 for 1 digit after comma

	// OK 21 XXX XXX XXX XXX XXX
	// |  |  |   |   |   |   |
	// |  |  |   |   |   |   |- [11]Battery Volatge
	// |  |  |   |   |   |----- [9]warm Water
	// |  |  |   |   |--------- [7]warm Water
	// |  |  |   |------------- [5]cold Water
	// |  |  |----------------- [3]cold Water
	// |  |-------------------- [2]Sensor ID
	// |----------------------- [0]fix "OK"

	async defineemonWater(id, name) {
		await this.setObjectNotExistsAsync('emonWater_' + id, {
			type: 'channel',
			common: {
				name: 'emonWater ' + id,
				role: 'sensor'
			},
			native: {
				addr: id
			}
		});
		this.log.info('RFM12B setting up object = emonWater' + id);

		await this.setObjectNotExistsAsync('emonWater_' + id + '.cw_mom', {
			type: 'state',
			common: {
				name: 'Cold Water',
				type: 'number',
				unit: 'l',
				min: 0,
				max: 100,
				read: true,
				write: false,
				role: 'value',
				desc: 'Cold Water'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('emonWater_' + id + '.cw_cum', {
			type: 'state',
			common: {
				name: 'Cold Water',
				type: 'number',
				unit: 'm3',
				min: 0,
				max: 10000,
				read: true,
				write: false,
				role: 'value',
				desc: 'Cold Water counter'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('emonWater_' + id + '.ww_mom', {
			type: 'state',
			common: {
				name: 'Warm Water',
				type: 'number',
				unit: 'l',
				min: 0,
				max: 100,
				read: true,
				write: false,
				role: 'value',
				desc: 'Warm Water'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('emonWater_' + id + '.ww_cum', {
			type: 'state',
			common: {
				name: 'Warm Water',
				type: 'number',
				unit: 'm3',
				min: 0,
				max: 10000,
				read: true,
				write: false,
				role: 'value',
				desc: 'Warm Water counter'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('emonWater_' + id + '.batt', {
			type: 'state',
			common: {
				name: 'Battery',
				type: 'number',
				unit: 'V',
				min: 0,
				max: 5,
				read: true,
				write: false,
				role: 'value.battery',
				desc: 'Battery'
			},
			native: {}
		});
	}

	async logemonWater(data) {
		var tmp = data.split(' ');
		//we are expecting data in form \"OK nodeid data1 data2 etc
		if (tmp[0] === 'OK') {
			var tmpp = tmp.splice(3, 12);
			this.log.debug('splice:' + tmpp);

			var array = this.getConfigObjects(this.config.sensors, 'sid', tmp[2]);
			if (array.length === 0 || array.length !== 1) {
				this.log.debug(
					'received ID :' + tmp[2] + ' is not defined in the adapter or not unique received address'
				);

				/** new sensor -> config (not nice, because auf adapter restart, but works)
                this.getForeignObject('system.this.' + this.namespace, function(err,obj){
                    if (err){
                        this.log.error(err);
                    }
                    else {
                        this.log.debug("native object : " + JSON.stringify(obj.native.sensors));
                        obj.native.sensors.push({"sid":tmp[2] , "usid":"nodef" , "stype":"emon???" , "name":"room???"});
                        this.setForeignObject('system.this.' + this.namespace, obj, function(err){
                           if(err) {this.log.error(err);}
                           else{
                               this.log.info("new sensor ID = " + tmp[2] + " added to config, please see admin page of adapter for further configuration");
                           }
                        });
                    }
                });
                **/
				/** new sensor -> array in objects (push to state works but admin does not show the table) 
                this.getState('foundDevices.state', function(err,state){
                    if (err){
                        this.log.error(err);
                    }
                    else {
                        this.log.debug("found devices : " + JSON.stringify(state));
                        var found = []; //alte Wert erstmal nicht übernehmen, damit nur ein neuer Sensor erscheint
                        found.push({"sid":tmp[2],"usid":"nodef","stype":"emon???","name":"room???"});
                        this.log.debug("found push = " + JSON.stringify(found));
                        this.setStateAsync('foundDevices.state', {val: found, ack: true}, function(err){
                           if(err) {this.log.error(err);}
                           else{
                               this.log.info("new sensor ID = "+ tmp[2] + " added to foundDevices, please see admin page of adapter for further configuratiuon");
                           }
                        });
                    }
                });
                **/
			} else if (array[0].stype !== 'emonWater') {
				this.log.debug('received ID :' + tmp[2] + ' is not defined in the adapter as emonWater');
			} else if (array[0].usid != 'nodef') {
				this.log.debug('cw_mom:' + parseInt(tmpp[0]) / 10);
				this.log.debug('cw counter: ' + parseInt(tmpp[2]) / 10);
				this.log.debug('ww_mom:' + parseInt(tmpp[4]) / 10);
				this.log.debug('ww counter: ' + parseInt(tmpp[6]) / 10);
				this.log.debug('Voltage: ' + parseInt(tmpp[8]) / 10);
				await this.setStateAsync('emonWater_' + array[0].usid + '.cw_mom', {
					val: parseInt(tmpp[0]) / 10,
					ack: true
				});
				await this.setStateAsync('emonWater_' + array[0].usid + '.cw_cum', {
					val: parseInt(tmpp[2]) / 10,
					ack: true
				});
				await this.setStateAsync('emonWater_' + array[0].usid + '.ww_mom', {
					val: parseInt(tmpp[4]) / 10,
					ack: true
				});
				await this.setStateAsync('emonWater_' + array[0].usid + '.ww_cum', {
					val: parseInt(tmpp[6]) / 10,
					ack: true
				});
				await this.setStateAsync('emonWater_' + array[0].usid + '.batt', {
					val: parseInt(tmpp[8]) / 10,
					ack: true
				});
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

	async defineemonTH(id, name) {
		await this.setObjectNotExistsAsync('emonTH_' + id, {
			type: 'channel',
			common: {
				name: name,
				role: 'sensor'
			},
			native: {
				addr: id
			}
		});
		this.log.info('RFM12B setting up object = emonTH' + id);

		await this.setObjectNotExistsAsync('emonTH_' + id + '.temp', {
			type: 'state',
			common: {
				name: 'Temperature',
				type: 'number',
				unit: '°C',
				min: -50,
				max: 70,
				read: true,
				write: false,
				role: 'value.temperature',
				desc: 'Temperature'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('emonTH_' + id + '.humid', {
			type: 'state',
			common: {
				name: 'Humidity',
				type: 'number',
				unit: '%',
				min: 0,
				max: 100,
				read: true,
				write: false,
				role: 'value.humidity',
				desc: 'Humidity'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('emonTH_' + id + '.batt', {
			type: 'state',
			common: {
				name: 'Battery',
				type: 'number',
				unit: 'V',
				min: 0,
				max: 5,
				read: true,
				write: false,
				role: 'value.battery',
				desc: 'Battery'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('emonTH_' + id + '.abshumid', {
			type: 'state',
			common: {
				name: 'abs Humidity',
				type: 'number',
				unit: 'g/m3',
				min: 0,
				max: 100,
				read: true,
				write: false,
				role: 'value.humidity'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('emonTH_' + id + '.dewpoint', {
			type: 'state',
			common: {
				name: 'Dewpoint',
				type: 'number',
				unit: '°C',
				min: -50,
				max: 70,
				read: true,
				write: false,
				role: 'value.temperature'
			},
			native: {}
		});
	}

	async logemonTH(data) {
		var tmp = data.split(' ');
		//we are expecting data in form \"OK nodeid data1 data2 etc
		if (tmp[0] === 'OK') {
			var tmpp = tmp.splice(3, 8);
			this.log.debug('splice:' + tmpp);

			var array = this.getConfigObjects(this.config.sensors, 'sid', tmp[2]);
			if (array.length === 0 || array.length !== 1) {
				this.log.debug(
					'received ID :' + tmp[2] + ' is not defined in the adapter or not unique received address'
				);

				/** new sensor -> config (not nice, because auf adapter restart, but works)
                this.getForeignObject('system.this.' + this.namespace, function(err,obj){
                    if (err){
                        this.log.error(err);
                    }
                    else {
                        this.log.debug("native object : " + JSON.stringify(obj.native.sensors));
                        obj.native.sensors.push({"sid":tmp[2] , "usid":"nodef" , "stype":"emon???" , "name":"room???"});
                        this.setForeignObject('system.this.' + this.namespace, obj, function(err){
                           if(err) {this.log.error(err);}
                           else{
                               this.log.info("new sensor ID = " + tmp[2] + " added to config, please see admin page of adapter for further configuration");
                           }
                        });
                    }
                });
                **/
			} else if (array[0].stype !== 'emonTH') {
				this.log.debug('received ID :' + tmp[2] + ' is not defined in the adapter as emonTH');
			} else if (array[0].usid != 'nodef') {
				this.log.debug('Temperature:' + parseInt(tmpp[0]) / 10);
				this.log.debug('Humidty: ' + parseInt(tmpp[4]) / 10);
				this.log.debug('Voltage: ' + parseInt(tmpp[6]) / 10);
				await this.setStateAsync('emonTH_' + array[0].usid + '.temp', {
					val: parseInt(tmpp[0]) / 10,
					ack: true
				});
				await this.setStateAsync('emonTH_' + array[0].usid + '.humid', {
					val: parseInt(tmpp[4]) / 10,
					ack: true
				});
				await this.setStateAsync('emonTH_' + array[0].usid + '.batt', {
					val: parseInt(tmpp[6]) / 10,
					ack: true
				});
				//absolute Feuchte und Taupunkt
				var temp = parseInt(tmpp[0]) / 10;
				var rel = parseInt(tmpp[4]) / 10;
				var vappress = rel / 100 * 6.1078 * Math.exp(7.5 * temp / (237.3 + temp) / Math.LOG10E);
				var v = Math.log(vappress / 6.1078) * Math.LOG10E;
				var dewp = 237.3 * v / (7.5 - v);
				var habs = 1000 * 18.016 / 8314.3 * 100 * vappress / (273.15 + temp);
				await this.setStateAsync('emonTH_' + array[0].usid + '.abshumid', {
					val: this.round(habs, 1),
					ack: true
				});
				await this.setStateAsync('emonTH_' + array[0].usid + '.dewpoint', {
					val: this.round(dewp, 1),
					ack: true
				});
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

	async defineHMS100TF(id, name) {
		await this.setObjectNotExistsAsync('HMS100TF_' + id, {
			type: 'channel',
			common: {
				name: name,
				role: 'sensor'
			},
			native: {
				addr: id
			}
		});
		this.log.info('RFM12B setting up object = HMS100TF ' + id);

		await this.setObjectNotExistsAsync('HMS100TF_' + id + '.temp', {
			type: 'state',
			common: {
				name: 'Temperature',
				type: 'number',
				unit: '°C',
				min: -50,
				max: 70,
				read: true,
				write: false,
				role: 'value.temperature',
				desc: 'Temperature'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('HMS100TF_' + id + '.humid', {
			type: 'state',
			common: {
				name: 'Humidity',
				type: 'number',
				unit: '%',
				min: 0,
				max: 100,
				read: true,
				write: false,
				role: 'value.humidity',
				desc: 'Humidity'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('HMS100TF_' + id + '.lowBatt', {
			type: 'state',
			common: {
				name: 'Battery Low',
				type: 'boolean',
				role: 'indicator.lowbat',
				read: true,
				write: false
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('HMS100TF_' + id + '.abshumid', {
			type: 'state',
			common: {
				name: 'abs Humidity',
				type: 'number',
				unit: 'g/m3',
				min: 0,
				max: 100,
				read: true,
				write: false,
				role: 'value.humidity'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('HMS100TF_' + id + '.dewpoint', {
			type: 'state',
			common: {
				name: 'Dewpoint',
				type: 'number',
				unit: '°C',
				min: -50,
				max: 70,
				read: true,
				write: false,
				role: 'value.temperature'
			},
			native: {}
		});
	}

	async logHMS100TF(data) {
		var tmp = data.split('');
		if (tmp[0] === 'H') {
			// Wenn ein Datensatz sauber gelesen wurde
			// somit werden alle SenderIDs bearbeitet
			//var buf = new Buffer(tmp);
			//passt hier der code?
			//in1.0.0 von tmpp auf tmp geändert
			var eid = parseInt(tmp[3]) * 10 + parseInt(tmp[4]); //empfangene ID
			var array = this.getConfigObjects(this.config.sensors, 'sid', eid);
			if (array.length === 0 || array.length !== 1) {
				this.log.debug('received ID :' + eid + ' is not defined in the adapter or not unique received address');
			} else if (array[0].stype !== 'HMS100TF') {
				this.log.debug('received ID :' + eid + ' is not defined in the adapter as HMS100TF');
			} else if (array[0].usid != 'nodef') {
				this.log.debug('Sensor ID    : ' + eid);
				this.log.debug('Type         : ' + parseInt(tmp[6])); //should be 0 otherwise it is only temperature
				this.log.debug('Temperatur   : ' + (parseInt(tmp[10]) * 10 + parseInt(tmp[7]) + parseInt(tmp[8]) / 10)); // Vorzeichen fehlt noch
				this.log.debug(
					'Humidty      : ' + (parseInt(tmp[11]) * 10 + parseInt(tmp[12]) + parseInt(tmp[9]) / 10)
				);
				this.log.debug('LowBattery   : ' + ((parseInt(tmp[5]) & 0x02) >> 1)); //irgendwie wird xA nicht ausgewertet
				// Werte schreiben
				// aus gesendeter ID die unique ID bestimmen
				await this.setStateAsync('HMS100TF_' + array[0].usid + '.lowBatt', {
					val: (parseInt(tmp[5]) & 0x02) >> 1,
					ack: true
				});
				await this.setStateAsync('HMS100TF_' + array[0].usid + '.temp', {
					val: parseInt(tmp[10]) * 10 + parseInt(tmp[7]) + parseInt(tmp[8]) / 10,
					ack: true
				});
				await this.setStateAsync('HMS100TF_' + array[0].usid + '.humid', {
					val: parseInt(tmp[11]) * 10 + parseInt(tmp[12]) + parseInt(tmp[9]) / 10,
					ack: true
				});
				//absolute Feuchte und Taupunkt
				var temp = parseInt(tmp[10]) * 10 + parseInt(tmp[7]) + parseInt(tmp[8]) / 10;
				var rel = parseInt(tmp[11]) * 10 + parseInt(tmp[12]) + parseInt(tmp[9]) / 10;
				var vappress = rel / 100 * 6.1078 * Math.exp(7.5 * temp / (237.3 + temp) / Math.LOG10E);
				var v = Math.log(vappress / 6.1078) * Math.LOG10E;
				var dewp = 237.3 * v / (7.5 - v);
				var habs = 1000 * 18.016 / 8314.3 * 100 * vappress / (273.15 + temp);
				await this.setStateAsync('HMS100TF_' + array[0].usid + '.abshumid', {
					val: this.round(habs, 1),
					ack: true
				});
				await this.setStateAsync('HMS100TF_' + array[0].usid + '.dewpoint', {
					val: this.round(dewp, 1),
					ack: true
				});
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

	async defineEMT7110(id, name) {
		await this.setObjectNotExistsAsync('EMT7110_' + id, {
			type: 'channel',
			common: {
				name: name,
				role: 'sensor'
			},
			native: {
				addr: id
			}
		});
		this.log.info('RFM12B setting up object = EMT7110 ' + id);

		await this.setObjectNotExistsAsync('EMT7110_' + id + '.voltage', {
			type: 'state',
			common: {
				name: 'Voltage',
				type: 'number',
				unit: 'V',
				min: 0,
				read: true,
				write: false,
				role: 'value',
				desc: 'Voltage'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('EC3000_' + id + '.current', {
			type: 'state',
			common: {
				name: 'Current',
				type: 'number',
				unit: 'mA',
				min: 0,
				read: true,
				write: false,
				role: 'value',
				desc: 'Current'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('EMT7110_' + id + '.energy', {
			type: 'state',
			common: {
				name: 'energy',
				type: 'number',
				unit: 'kWh',
				min: 0,
				read: true,
				write: false,
				role: 'value'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('EMT7110_' + id + '.power', {
			type: 'state',
			common: {
				name: 'actual power',
				type: 'number',
				unit: 'W',
				min: 0,
				read: true,
				write: false,
				role: 'value'
			},
			native: {}
		});
	}

	async logEMT7110(data) {
		var tmp = data.split(' ');
		if (tmp[0] === 'OK') {
			// Wenn ein Datensatz sauber gelesen wurde
			if (tmp[1] == 'EMT7110') {
				// Für jeden Datensatz mit dem fixen Eintrag EMT7110
				// somit werden alle SenderIDs bearbeitet
				var tmpp = tmp.splice(2, 13); // es werden die vorderen Blöcke (0,1,2) entfernt
				this.log.debug('splice       : ' + tmpp);

				var id = parseInt(tmpp[0]) * 256 + parseInt(tmpp[1]);
				var array = this.getConfigObjects(this.config.sensors, 'sid', id);
				if (array.length === 0 || array.length !== 1) {
					this.log.debug(
						'received ID :' + id + ' is not defined in the adapter or not unique received address'
					);
				} else if (array[0].stype !== 'EMT7110') {
					this.log.debug('received ID :' + id + ' is not defined in the adapter as LaCrosseWS');
				} else if (array[0].usid != 'nodef') {
					this.log.debug('Station ID   : ' + id);
					this.log.debug('voltage      : ' + (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3])) / 10);
					this.log.debug('current      : ' + (parseInt(tmpp[4]) * 256 + parseInt(tmpp[5])));
					this.log.debug('power        : ' + (parseInt(tmpp[6]) * 256 + parseInt(tmpp[7])));
					this.log.debug('energy       : ' + (parseInt(tmpp[8]) * 256 + parseInt(tmpp[9])) / 100);
					// Werte schreiben
					// aus gesendeter ID die unique ID bestimmen
					await this.setStateAsync('EMT7110_' + array[0].usid + '.voltage', {
						val: (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3])) / 10,
						ack: true
					});
					await this.setStateAsync('EMT7110_' + array[0].usid + '.current', {
						val: parseInt(tmpp[4]) * 256 + parseInt(tmpp[5]),
						ack: true
					});
					await this.setStateAsync('EMT7110_' + array[0].usid + '.power', {
						val: parseInt(tmpp[6]) * 256 + parseInt(tmpp[7]),
						ack: true
					});
					await this.setStateAsync('EMT7110_' + array[0].usid + '.energy', {
						val: (parseInt(tmpp[8]) * 256 + parseInt(tmpp[9])) / 100,
						ack: true
					});
				}
			}
		}
	}
	// EC3000 openhab
	// OK 22 188 129 0   209 209 102 0   174 89  187 0   1   123 102 0   0   10  117 2   0 (ID = BC81)
	//
	// OK 22 ID  ID  XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX XXX
	// |  |  |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |----[20] ??
	// |  |  |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |--------[19] resets
	// |  |  |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |------------[18] max power
	// |  |  |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |----------------[17] max power
	// |  |  |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |--------------------[16] power
	// |  |  |   |   |   |   |   |   |   |   |   |   |   |   |   |   |------------------------[15] power
	// |  |  |   |   |   |   |   |   |   |   |   |   |   |   |   |----------------------------[14] energy
	// |  |  |   |   |   |   |   |   |   |   |   |   |   |   |--------------------------------[13] energy
	// |  |  |   |   |   |   |   |   |   |   |   |   |   |------------------------------------[12] energy
	// |  |  |   |   |   |   |   |   |   |   |   |   |----------------------------------------[11] energy
	// |  |  |   |   |   |   |   |   |   |   |   |--------------------------------------------[10] on time
	// |  |  |   |   |   |   |   |   |   |   |------------------------------------------------[9] on time
	// |  |  |   |   |   |   |   |   |   |----------------------------------------------------[8] on time
	// |  |  |   |   |   |   |   |   |--------------------------------------------------------[7] on time
	// |  |  |   |   |   |   |   |------------------------------------------------------------[6] total time
	// |  |  |   |   |   |   |--------------------------------------------------------------- [5] total time
	// |  |  |   |   |   |------------------------------------------------------------------- [4] total time
	// |  |  |   |   |----------------------------------------------------------------------- [3] total time
	// |  |  |   |--------------------------------------------------------------------------- [2] Sensor ID
	// |  |  |------------------------------------------------------------------------------- [1] Sensor ID
	// |  |---------------------------------------------------------------------------------- [0] fix "22"
	// |------------------------------------------------------------------------------------- fix "OK"

	async defineEC3000(id, name) {
		await this.setObjectNotExistsAsync('EC3000_' + id, {
			type: 'channel',
			common: {
				name: name,
				role: 'sensor'
			},
			native: {
				addr: id
			}
		});
		this.log.info('RFM12B setting up object = EC3000 ' + id);

		await this.setObjectNotExistsAsync('EC3000_' + id + '.total', {
			type: 'state',
			common: {
				name: 'Time ON total',
				type: 'number',
				unit: 's',
				min: 0,
				read: true,
				write: false,
				role: 'value',
				desc: 'Time ON total'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('EC3000_' + id + '.ontime', {
			type: 'state',
			common: {
				name: 'Time ON',
				type: 'number',
				unit: 's',
				min: 0,
				read: true,
				write: false,
				role: 'value',
				desc: 'Time ON'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('EC3000_' + id + '.energy', {
			type: 'state',
			common: {
				name: 'energy',
				type: 'number',
				unit: 'Wh',
				min: 0,
				read: true,
				write: false,
				role: 'value'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('EC3000_' + id + '.power', {
			type: 'state',
			common: {
				name: 'actual power',
				type: 'number',
				unit: 'W',
				min: 0,
				read: true,
				write: false,
				role: 'value'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('EC3000_' + id + '.maxpower', {
			type: 'state',
			common: {
				name: 'maximum power',
				type: 'number',
				unit: 'W',
				min: 0,
				read: true,
				write: false,
				role: 'value'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('EC3000_' + id + '.resets', {
			type: 'state',
			common: {
				name: 'number of resets',
				type: 'number',
				min: 0,
				read: true,
				write: false,
				role: 'value'
			},
			native: {}
		});
	}

	async logEC3000(data) {
		var tmp = data.split(' ');
		if (tmp[0] === 'OK') {
			// Wenn ein Datensatz sauber gelesen wurde
			if (tmp[1] == '22') {
				// Für jeden Datensatz mit dem fixen Eintrag WS
				// somit werden alle SenderIDs bearbeitet
				var tmpp = tmp.splice(2, 21); // es werden die vorderen Blöcke (0,1,2) entfernt
				this.log.debug('splice       : ' + tmpp);

				var id = parseInt(tmpp[0]) * 256 + parseInt(tmpp[1]);
				var array = this.getConfigObjects(this.config.sensors, 'sid', id);
				if (array.length === 0 || array.length !== 1) {
					this.log.debug(
						'received ID :' + id + ' is not defined in the adapter or not unique received address'
					);
				} else if (array[0].stype !== 'EC3000') {
					this.log.debug('received ID :' + id + ' is not defined in the adapter as LaCrosseWS');
				} else if (array[0].usid != 'nodef') {
					this.log.debug('Station ID   : ' + id);
					this.log.debug(
						'total time   : ' +
							(parseInt(tmpp[2]) * 16777216 +
								parseInt(tmpp[3]) * 65536 +
								parseInt(tmpp[4]) * 256 +
								parseInt(tmpp[5]))
					);
					this.log.debug(
						'on time      : ' +
							(parseInt(tmpp[6]) * 16777216 +
								parseInt(tmpp[7]) * 65536 +
								parseInt(tmpp[8]) * 256 +
								parseInt(tmpp[9]))
					);
					this.log.debug(
						'energy       : ' +
							(parseInt(tmpp[10]) * 16777216 +
								parseInt(tmpp[11]) * 65536 +
								parseInt(tmpp[12]) * 256 +
								parseInt(tmpp[13]))
					);
					this.log.debug('power        : ' + (parseInt(tmpp[14]) * 256 + parseInt(tmpp[15])));
					this.log.debug('max power    : ' + (parseInt(tmpp[16]) * 256 + parseInt(tmpp[17])));
					this.log.debug('resets       : ' + parseInt(tmpp[18]));
					// Werte schreiben
					// aus gesendeter ID die unique ID bestimmen
					await this.setStateAsync('EC3000_' + array[0].usid + '.total', {
						val:
							parseInt(tmpp[2]) * 16777216 +
							parseInt(tmpp[3]) * 65536 +
							parseInt(tmpp[4]) * 256 +
							parseInt(tmpp[5]),
						ack: true
					});
					await this.setStateAsync('EC3000_' + array[0].usid + '.ontime', {
						val:
							parseInt(tmpp[6]) * 16777216 +
							parseInt(tmpp[7]) * 65536 +
							parseInt(tmpp[8]) * 256 +
							parseInt(tmpp[9]),
						ack: true
					});
					await this.setStateAsync('EC3000_' + array[0].usid + '.energy', {
						val:
							parseInt(tmpp[10]) * 16777216 +
							parseInt(tmpp[11]) * 65536 +
							parseInt(tmpp[12]) * 256 +
							parseInt(tmpp[13]),
						ack: true
					});
					await this.setStateAsync('EC3000_' + array[0].usid + '.power', {
						val: parseInt(tmpp[14]) * 256 + parseInt(tmpp[15]),
						ack: true
					});
					await this.setStateAsync('EC3000_' + array[0].usid + '.maxpower', {
						val: parseInt(tmpp[16]) * 256 + parseInt(tmpp[17]),
						ack: true
					});
					await this.setStateAsync('EC3000_' + array[0].usid + '.resets', {
						val: parseInt(tmpp[18]),
						ack: true
					});
				}
			}
		}
	}

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
	// |   `----------------------------- fix "LS"
	// `--------------------------------- fix "OK"

	async defineLevel(id, name) {
		await this.setObjectNotExistsAsync('Level_' + id, {
			type: 'channel',
			common: {
				name: name,
				role: 'sensor'
			},
			native: {
				addr: id
			}
		});
		this.log.info('RFM12B setting up object = Level ' + id);

		await this.setObjectNotExistsAsync('Level_' + id + '.temp', {
			type: 'state',
			common: {
				name: 'Temperature',
				type: 'number',
				unit: '°C',
				min: -50,
				max: 70,
				read: true,
				write: false,
				role: 'value.temperature',
				desc: 'Temperature'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('Level_' + id + '.level', {
			type: 'state',
			common: {
				name: 'level',
				type: 'number',
				unit: 'cm',
				min: 0,
				read: true,
				write: false,
				role: 'value',
				desc: 'level'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('Level_' + id + '.voltage', {
			type: 'state',
			common: {
				name: 'voltage',
				type: 'number',
				unit: 'V',
				min: 0,
				max: 6,
				read: true,
				write: false,
				role: 'value',
				desc: 'voltage'
			},
			native: {}
		});
	}

	async logLevel(data) {
		var tmp = data.split(' ');
		if (tmp[0] === 'OK') {
			// Wenn ein Datensatz sauber gelesen wurde
			if (tmp[1] == 'LS') {
				// Für jeden Datensatz mit dem fixen Eintrag WS
				// somit werden alle SenderIDs bearbeitet
				var tmpp = tmp.splice(2, 8); // es werden die vorderen Blöcke (0,1) entfernt
				this.log.debug('splice       : ' + tmpp);

				var array = this.getConfigObjects(this.config.sensors, 'sid', parseInt(tmpp[0]));
				if (array.length === 0 || array.length !== 1) {
					this.log.debug(
						'received ID :' +
							parseInt(tmpp[0]) +
							' is not defined in the adapter or not unique received address'
					);
				} else if (array[0].stype !== 'level') {
					this.log.debug('received ID :' + parseInt(tmpp[0]) + ' is not defined in the adapter as level');
				} else if (array[0].usid != 'nodef') {
					this.log.debug('Sensor ID    : ' + parseInt(tmpp[0]));
					this.log.debug('Type         : ' + parseInt(tmpp[1]));
					this.log.debug('Level        : ' + (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3]) - 1000) / 10);
					this.log.debug('Temperatur   : ' + (parseInt(tmpp[4]) * 256 + parseInt(tmpp[5]) - 1000) / 10);
					this.log.debug('Voltage      : ' + parseInt(tmpp[6]) / 10);
					// Werte schreiben
					// aus gesendeter ID die unique ID bestimmen
					await this.setStateAsync('Level_' + array[0].usid + '.level', {
						val: (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3]) - 1000) / 10,
						ack: true
					});
					await this.setStateAsync('Level_' + array[0].usid + '.temp', {
						val: (parseInt(tmpp[4]) * 256 + parseInt(tmpp[5]) - 1000) / 10,
						ack: true
					});
					await this.setStateAsync('Level_' + array[0].usid + '.voltage', {
						val: parseInt(tmpp[6]) / 10,
						ack: true
					});
				}
			}
		}
	}

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

	async defineLaCrosseDTH(id, name, stype) {
		await this.setObjectNotExistsAsync('LaCrosse_' + id, {
			type: 'channel',
			common: {
				name: name,
				role: 'sensor'
			},
			native: {
				addr: id
			}
		});
		this.log.info('RFM12B setting up object = LaCrosse ' + id);

		if (stype == 'LaCrosseDTH') {
			// define states for LaCrosse DTH sensors, like TX29DTH-IT
			await this.setObjectNotExistsAsync('LaCrosse_' + id + '.temp', {
				type: 'state',
				common: {
					name: 'Temperature',
					type: 'number',
					unit: '°C',
					min: -50,
					max: 70,
					read: true,
					write: false,
					role: 'value.temperature',
					desc: 'Temperature'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync('LaCrosse_' + id + '.humid', {
				type: 'state',
				common: {
					name: 'Humidity',
					type: 'number',
					unit: '%',
					min: 0,
					max: 100,
					read: true,
					write: false,
					role: 'value.humidity',
					desc: 'Humidity'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync('LaCrosse_' + id + '.abshumid', {
				type: 'state',
				common: {
					name: 'abs Humidity',
					type: 'number',
					unit: 'g/m3',
					min: 0,
					max: 100,
					read: true,
					write: false,
					role: 'value.humidity'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync('LaCrosse_' + id + '.dewpoint', {
				type: 'state',
				common: {
					name: 'Dewpoint',
					type: 'number',
					unit: '°C',
					min: -50,
					max: 70,
					read: true,
					write: false,
					role: 'value.temperature'
				},
				native: {}
			});
		} else if (stype == 'LaCrosseDTT') {
			// define states for LaCrosse DTT sensors, like TX25-IT (dual temperature)
			await this.setObjectNotExistsAsync('LaCrosse_' + id + '.temp_1', {
				type: 'state',
				common: {
					name: 'Temperature 1',
					type: 'number',
					unit: '°C',
					min: -50,
					max: 70,
					read: true,
					write: false,
					role: 'value.temperature',
					desc: 'Temperature (Channel 1)'
				},
				native: {}
			});
			await this.setObjectNotExistsAsync('LaCrosse_' + id + '.temp_2', {
				type: 'state',
				common: {
					name: 'Temperature 2',
					type: 'number',
					unit: '°C',
					min: -50,
					max: 70,
					read: true,
					write: false,
					role: 'value.temperature',
					desc: 'Temperature (Channel 2)'
				},
				native: {}
			});
		}
		await this.setObjectNotExistsAsync('LaCrosse_' + id + '.lowBatt', {
			type: 'state',
			common: {
				name: 'Battery Low',
				type: 'boolean',
				role: 'indicator.lowbat',
				read: true,
				write: false
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('LaCrosse_' + id + '.newBatt', {
			type: 'state',
			common: {
				name: 'Battery New',
				type: 'boolean',
				role: 'indicator.newbat',
				read: true,
				write: false
			},
			native: {}
		});
	}

	async logLaCrosseDTH(data) {
		var tmp = data.split(' ');
		if (tmp[0] === 'OK') {
			// Wenn ein Datensatz sauber gelesen wurde
			if (tmp[1] == '9') {
				// Für jeden Datensatz mit dem fixen Eintrag 9
				// somit werden alle SenderIDs bearbeitet
				var tmpp = tmp.splice(2, 6); // es werden die vorderen Blöcke (0,1,2) entfernt
				this.log.debug('splice       : ' + tmpp);

				var array = this.getConfigObjects(this.config.sensors, 'sid', parseInt(tmpp[0]));
				if (array.length === 0 || array.length !== 1) {
					this.log.debug(
						'received ID :' +
							parseInt(tmpp[0]) +
							' is not defined in the adapter or not unique received address'
					);

					/** new sensor -> config (not nice, because auf adapter restart, but works)
                    this.getForeignObject('system.this.' + this.namespace, function(err,obj){
                        if (err){
                            this.log.error(err);
                        }
                        else {
                            this.log.debug("native object : " + JSON.stringify(obj.native.sensors));
                            obj.native.sensors.push({"sid": parseInt(tmpp[0]) , "usid":"nodef" , "stype":"LaCrosse???" , "name":"room???"});
                            this.setForeignObject('system.this.' + this.namespace, obj, function(err){
                               if(err) {this.log.error(err);}
                               else{
                                   this.log.info("new sensor ID = "+ parseInt(tmpp[0]) + "added to config, please see admin page of adapter for further configuration");
                               }
                            });
                        }
                    });
                    **/
				} else if (array[0].stype !== 'LaCrosseDTH' && array[0].stype !== 'LaCrosseDTT') {
					this.log.debug(
						'received ID :' +
							parseInt(tmpp[0]) +
							' is not defined in the adapter as LaCrosseDTH or LaCrosseDTT'
					);
				} else if (array[0].usid != 'nodef') {
					var sensor_type = parseInt(tmpp[1]) & 0x3;
					this.log.debug('Sensor ID    : ' + parseInt(tmpp[0]));
					this.log.debug('Type         : ' + sensor_type);
					this.log.debug('NewBattery   : ' + Boolean((parseInt(tmpp[1]) & 0x80) >> 7)); // wenn "100000xx" dann NewBatt # xx = SensorType 1 oder 2
					this.log.debug('Temperatur   : ' + (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3]) - 1000) / 10);
					this.log.debug('Humidity     : ' + (parseInt(tmpp[4]) & 0x7f));
					this.log.debug('LowBattery   : ' + Boolean((parseInt(tmpp[4]) & 0x80) >> 7)); // Hier muss noch "incl. WeakBatteryFlag" ausgewertet werden
					// Werte schreiben
					// aus gesendeter ID die unique ID bestimmen

					// lowBatt and newBatt seems only valid if sensor_type == 1
					if (sensor_type == 1) {
						await this.setStateAsync('LaCrosse_' + array[0].usid + '.lowBatt', {
							val: Boolean((parseInt(tmpp[4]) & 0x80) >> 7),
							ack: true
						});
						await this.setStateAsync('LaCrosse_' + array[0].usid + '.newBatt', {
							val: Boolean((parseInt(tmpp[1]) & 0x80) >> 7),
							ack: true
						});
					}

					// write states based on stype of Sensor configuration (LaCrosseDTH/T)
					if (array[0].stype === 'LaCrosseDTH') {
						// calculate and write values for LaCrosseDTH sensors
						await this.setStateAsync('LaCrosse_' + array[0].usid + '.temp', {
							val: (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3]) - 1000) / 10,
							ack: true
						});
						await this.setStateAsync('LaCrosse_' + array[0].usid + '.humid', {
							val: parseInt(tmpp[4]) & 0x7f,
							ack: true
						});
						//absolute Feuchte und Taupunkt
						var temp = (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3]) - 1000) / 10;
						var rel = parseInt(tmpp[4]) & 0x7f;
						var vappress = rel / 100 * 6.1078 * Math.exp(7.5 * temp / (237.3 + temp) / Math.LOG10E);
						var v = Math.log(vappress / 6.1078) * Math.LOG10E;
						var dewp = 237.3 * v / (7.5 - v);
						var habs = 1000 * 18.016 / 8314.3 * 100 * vappress / (273.15 + temp);
						await this.setStateAsync('LaCrosse_' + array[0].usid + '.abshumid', {
							val: this.round(habs, 1),
							ack: true
						});
						await this.setStateAsync('LaCrosse_' + array[0].usid + '.dewpoint', {
							val: this.round(dewp, 1),
							ack: true
						});
					} else if (array[0].stype === 'LaCrosseDTT') {
						// write temperature values for LaCrosseDTT sensors
						await this.setStateAsync('LaCrosse_' + array[0].usid + '.temp_' + sensor_type, {
							val: (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3]) - 1000) / 10,
							ack: true
						});
					}
				}
			}
		}
	}

	// Weather Station TX22IT same as WS1600
	//OK WS 60  1   4   193 52    2 88  4   101 15  20          ID=60  21.7°C  52%rH  600mm  Dir.: 112.5°  Wind:15m/s  Gust:20m/s
	//OK WS ID  XXX TTT TTT HHH RRR RRR DDD DDD SSS SSS GGG GGG FFF PPP PPP
	//|  |  |   |   |   |   |   |   |   |   |   |   |   |   |   |    |   |-- Pressure LSB
	//|  |  |   |   |   |   |   |   |   |   |   |   |   |   |   |    |------ Pressure MSB
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

	async defineLaCrosseWS(id, name) {
		await this.setObjectNotExistsAsync('LaCrosseWS_' + id, {
			type: 'channel',
			common: {
				name: name,
				role: 'sensor'
			},
			native: {
				addr: id
			}
		});
		this.log.info('RFM12B setting up object = LaCrosseWS ' + id);

		await this.setObjectNotExistsAsync('LaCrosseWS_' + id + '.temp', {
			type: 'state',
			common: {
				name: 'Temperature',
				type: 'number',
				unit: '°C',
				min: -40,
				max: 70,
				read: true,
				write: false,
				role: 'value.temperature',
				desc: 'Temperature'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('LaCrosseWS_' + id + '.humid', {
			type: 'state',
			common: {
				name: 'Humidity',
				type: 'number',
				unit: '%',
				min: 0,
				max: 100,
				read: true,
				write: false,
				role: 'value.humidity',
				desc: 'Humidity'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('LaCrosseWS_' + id + '.rain', {
			type: 'state',
			common: {
				name: 'Rain',
				type: 'number',
				unit: 'mm',
				min: 0,
				max: 9999,
				read: true,
				write: false,
				role: 'value',
				desc: 'Rain'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('LaCrosseWS_' + id + '.wspeed', {
			type: 'state',
			common: {
				name: 'Wind Speed',
				type: 'number',
				unit: 'm/s',
				min: 0,
				max: 50,
				read: true,
				write: false,
				role: 'value',
				desc: 'Wind Speed'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('LaCrosseWS_' + id + '.wspeed2', {
			type: 'state',
			common: {
				name: 'Wind Speed km/h',
				type: 'number',
				unit: 'km/h',
				min: 0,
				max: 180,
				read: true,
				write: false,
				role: 'value',
				desc: 'Wind Speed km/h'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('LaCrosseWS_' + id + '.wdir', {
			type: 'state',
			common: {
				name: 'Wind Direction',
				type: 'number',
				unit: '°',
				min: 0,
				max: 365,
				read: true,
				write: false,
				role: 'value',
				desc: 'Wind Direction'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('LaCrosseWS_' + id + '.wgust', {
			type: 'state',
			common: {
				name: 'Wind Gust',
				type: 'number',
				unit: 'm/s',
				min: 0,
				max: 50,
				read: true,
				write: false,
				role: 'value',
				desc: 'Wind Gust'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('LaCrosseWS_' + id + '.abshumid', {
			type: 'state',
			common: {
				name: 'abs Humidity',
				type: 'number',
				unit: 'g/m3',
				min: 0,
				max: 100,
				read: true,
				write: false,
				role: 'value.humidity'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('LaCrosseWS_' + id + '.dewpoint', {
			type: 'state',
			common: {
				name: 'Dewpoint',
				type: 'number',
				unit: '°C',
				min: -50,
				max: 70,
				read: true,
				write: false,
				role: 'value.temperature'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('LaCrosseWS_' + id + '.lowBatt', {
			type: 'state',
			common: {
				name: 'Battery Low',
				type: 'boolean',
				role: 'indicator.lowbat',
				read: true,
				write: false
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('LaCrosseWS_' + id + '.newBatt', {
			type: 'state',
			common: {
				name: 'Battery New',
				type: 'boolean',
				role: 'indicator.newbat',
				read: true,
				write: false
			},
			native: {}
		});
	}

	async logLaCrosseWS(data) {
		var tmp = data.split(' ');
		if (tmp[0] === 'OK') {
			// Wenn ein Datensatz sauber gelesen wurde
			if (tmp[1] == 'WS') {
				// Für jeden Datensatz mit dem fixen Eintrag WS
				// somit werden alle SenderIDs bearbeitet
				var tmpp = tmp.splice(2, 18); // es werden die vorderen Blöcke (0,1,2) entfernt
				this.log.debug('splice       : ' + tmpp);

				var array = this.getConfigObjects(this.config.sensors, 'sid', parseInt(tmpp[0]));
				if (array.length === 0 || array.length !== 1) {
					this.log.debug(
						'received ID :' +
							parseInt(tmpp[0]) +
							' is not defined in the adapter or not unique received address'
					);
				} else if (array[0].stype !== 'LaCrosseWS') {
					this.log.debug(
						'received ID :' + parseInt(tmpp[0]) + ' is not defined in the adapter as LaCrosseWS'
					);
				} else if (array[0].usid != 'nodef') {
					this.log.debug('Station ID    : ' + parseInt(tmpp[0]));
					this.log.debug('Type         : ' + parseInt(tmpp[1])); //should be 3 otherwise it is only temperature
					if (parseInt(tmpp[2]) === 255) {
						this.log.debug('Temperature   : no data (255)');
					} else {
						this.log.debug('Temperature   : ' + (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3]) - 1000) / 10); // Vorzeichen fehlt noch
						await this.setStateAsync('LaCrosseWS_' + array[0].usid + '.temp', {
							val: (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3]) - 1000) / 10,
							ack: true
						});
					}
					if (parseInt(tmpp[4]) === 255) {
						this.log.debug('Humidty   : no data (255)');
					} else {
						this.log.debug('Humidty      : ' + parseInt(tmpp[4]) * 1);
						await this.setStateAsync('LaCrosseWS_' + array[0].usid + '.humid', {
							val: parseInt(tmpp[4]) * 1,
							ack: true
						});
					}
					if (parseInt(tmpp[5]) === 255) {
						this.log.debug('Rain   : no data (255)');
					} else {
						this.log.debug('Rain         : ' + (parseInt(tmpp[5]) * 256 + parseInt(tmpp[6])) / 2);
						await this.setStateAsync('LaCrosseWS_' + array[0].usid + '.rain', {
							val: (parseInt(tmpp[5]) * 256 + parseInt(tmpp[6])) / 2,
							ack: true
						});
					}
					if (parseInt(tmpp[9]) === 255) {
						this.log.debug('Wind Speed   : no data (255)');
					} else {
						this.log.debug('WindSpeed    : ' + (parseInt(tmpp[9]) * 256 + parseInt(tmpp[10])) / 10);
						await this.setStateAsync('LaCrosseWS_' + array[0].usid + '.wspeed', {
							val: (parseInt(tmpp[9]) * 256 + parseInt(tmpp[10])) / 10,
							ack: true
						});
						await this.setStateAsync('LaCrosseWS_' + array[0].usid + '.wspeed2', {
							val: this.round((parseInt(tmpp[9]) * 256 + parseInt(tmpp[10])) / 10 * 3.6, 2),
							ack: true
						});
					}
					if (parseInt(tmpp[7]) === 255) {
						this.log.debug('WindDirection   : no data (255)');
					} else {
						this.log.debug('WindDirection: ' + (parseInt(tmpp[7]) * 256 + parseInt(tmpp[8])) / 10);
						await this.setStateAsync('LaCrosseWS_' + array[0].usid + '.wdir', {
							val: (parseInt(tmpp[7]) * 256 + parseInt(tmpp[8])) / 10,
							ack: true
						});
					}
					if (parseInt(tmpp[11]) === 255) {
						this.log.debug('WindGust   : no data (255)');
					} else {
						this.log.debug('WindGust     : ' + (parseInt(tmpp[11]) * 256 + parseInt(tmpp[12])) / 10);
						await this.setStateAsync('LaCrosseWS_' + array[0].usid + '.wgust', {
							val: (parseInt(tmpp[11]) * 256 + parseInt(tmpp[12])) / 10,
							ack: true
						});
					}
					this.log.debug('NewBattery   : ' + (parseInt(tmpp[13]) & 0x01));
					this.log.debug('LowBattery   : ' + ((parseInt(tmpp[13]) & 0x04) >> 2));
					// Werte schreiben
					// aus gesendeter ID die unique ID bestimmen
					await this.setStateAsync('LaCrosseWS_' + array[0].usid + '.lowBatt', {
						val: Boolean((parseInt(tmpp[13]) & 0x04) >> 2),
						ack: true
					});
					await this.setStateAsync('LaCrosseWS_' + array[0].usid + '.newBatt', {
						val: Boolean(parseInt(tmpp[13]) & 0x01),
						ack: true
					});
					//absolute Feuchte und Taupunkt
					if (parseInt(tmpp[2]) !== 255 && parseInt(tmpp[4]) !== 255) {
						var temp = (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3]) - 1000) / 10;
						var rel = parseInt(tmpp[4]) * 1;
						var vappress = rel / 100 * 6.1078 * Math.exp(7.5 * temp / (237.3 + temp) / Math.LOG10E);
						var v = Math.log(vappress / 6.1078) * Math.LOG10E;
						var dewp = 237.3 * v / (7.5 - v);
						var habs = 1000 * 18.016 / 8314.3 * 100 * vappress / (273.15 + temp);
						await this.setStateAsync('LaCrosseWS_' + array[0].usid + '.abshumid', {
							val: this.round(habs, 1),
							ack: true
						});
						await this.setStateAsync('LaCrosseWS_' + array[0].usid + '.dewpoint', {
							val: this.round(dewp, 1),
							ack: true
						});
					} else {
						this.log.debug('WS no dewpoint calculation ');
					}
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

	async defineLaCrosseBMP180(id, name) {
		await this.setObjectNotExistsAsync('LaCrosse_' + id, {
			type: 'channel',
			common: {
				name: name,
				role: 'sensor'
			},
			native: {
				addr: id
			}
		});
		this.log.info('RFM12B setting up object = LaCrosse ' + id);

		await this.setObjectNotExistsAsync('LaCrosse_' + id + '.temp', {
			type: 'state',
			common: {
				name: 'Temperature',
				type: 'number',
				unit: '°C',
				min: -50,
				max: 70,
				read: true,
				write: false,
				role: 'value.temperature',
				desc: 'Temperature'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('LaCrosse_' + id + '.pressure', {
			type: 'state',
			common: {
				name: 'air pressure',
				type: 'number',
				unit: 'hPa',
				min: 0,
				max: 1200,
				read: true,
				write: false,
				role: 'value',
				desc: 'air pressure'
			},
			native: {}
		});
	}

	async logLaCrosseBMP180(data) {
		var tmp = data.split(' ');
		if (tmp[0] === 'OK') {
			// Wenn ein Datensatz sauber gelesen wurde
			if (tmp[1] == 'WS') {
				// Für jeden Datensatz mit dem fixen Eintrag WS
				// somit werden alle SenderIDs bearbeitet
				var tmpp = tmp.splice(2, 18); // es werden die vorderen Blöcke (0,1) entfernt
				this.log.debug('splice       : ' + tmpp);

				var array = this.getConfigObjects(this.config.sensors, 'sid', parseInt(tmpp[0]));
				if (array.length === 0 || array.length !== 1) {
					this.log.debug(
						'received ID :' +
							parseInt(tmpp[0]) +
							' is not defined in the adapter or not unique received address'
					);
				} else if (array[0].stype !== 'LaCrosseBMP180') {
					this.log.debug(
						'received ID :' + parseInt(tmpp[0]) + ' is not defined in the adapter as LaCrosseBMP180'
					);
				} else if (array[0].usid != 'nodef') {
					this.log.debug('Sensor ID    : ' + parseInt(tmpp[0]));
					this.log.debug('Type         : ' + parseInt(tmpp[1]));
					this.log.debug('Temperatur   : ' + (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3]) - 1000) / 10);
					this.log.debug('Pressure      : ' + (parseInt(tmpp[14]) * 256 + parseInt(tmpp[15])));
					// Werte schreiben
					// aus gesendeter ID die unique ID bestimmen
					await this.setStateAsync('LaCrosse_' + array[0].usid + '.temp', {
						val: (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3]) - 1000) / 10,
						ack: true
					});
					await this.setStateAsync('LaCrosse_' + array[0].usid + '.pressure', {
						val: parseInt(tmpp[14]) * 256 + parseInt(tmpp[15]),
						ack: true
					});
				}
			}
		}
	}
	// https://forum.iobroker.net/topic/52860/iobroker-jeelink-davis-geht-teilweise-hilfe-beim-rest?_=1671121143289
	// Davis Vantage Pro 2
	// Jeelink v3c mit RFM69CW Radiochip mit der Davis Firmware (Version 0.8e)
	// command 0,0s r
	// OK VALUES DAVIS 0 20=0,22=-64,21=ok,4=0.00,5=93,8=108,
	// OK VALUES DAVIS 0 20=1,22=-64,21=ok,4=0.00,5=93,9=-1,
	// OK VALUES DAVIS 0 20=2,22=-63,21=ok,4=0.00,5=93,6=0.00,7=-1,
	// OK VALUES DAVIS 0 20=3,22=-64,21=ok,4=0.00,5=93,1=-3.94,

	/** Mapping
		 1 => 'Temperature',
		2 => 'Pressure',
		3 => 'Humidity',
		4 => 'WindSpeed',
		5 => 'WindDirection',
		6 => 'WindGust',
		7 => 'WindGustRef',
		8 => 'RainTipCount',
		9 => 'RainSecs',
		 10 => 'Solar',
		 11 => 'VoltageSolar',
		 12 => 'VoltageCapacity',
		 13 => 'SoilLeaf',
		14 =>  'UV',
		15.1= SoilTemperature.1
		16.1= SoilMoisture.1
		17.1= LeafWetness.1
		15.2= SoilTemperature.2
		16.2= SoilMoisture.2
		17.2= LeafWetness.2
		15.3= SoilTemperature.3
		16.3= SoilMoisture.3
		15.4= SoilTemperature.4
		16.4= SoilMoisture.4
		20 => 'Channel'
		21 => 'Battery',
		22 => 'RSSI',
	**/
	async defineDavisVantage(id, name) {
		await this.setObjectNotExistsAsync('DavisVantage_' + id, {
			type: 'channel',
			common: {
				name: name,
				role: 'sensor'
			},
			native: {
				addr: id
			}
		});
		this.log.info('RFM12B setting up object = DavisVantage ' + id);

		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.temp', {
			type: 'state',
			common: {
				name: 'Temperature',
				type: 'number',
				unit: '°C',
				min: -50,
				max: 70,
				read: true,
				write: false,
				role: 'value.temperature',
				desc: 'Temperature'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.pressure', {
			type: 'state',
			common: {
				name: 'air pressure',
				type: 'number',
				unit: 'hPa',
				min: 0,
				max: 1200,
				read: true,
				write: false,
				role: 'value',
				desc: 'air pressure'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.humid', {
			type: 'state',
			common: {
				name: 'Humidity',
				type: 'number',
				unit: '%',
				min: 0,
				max: 100,
				read: true,
				write: false,
				role: 'value.humidity',
				desc: 'Humidity'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.rain', {
			type: 'state',
			common: {
				name: 'Rain',
				type: 'number',
				unit: 'mm',
				min: 0,
				max: 999,
				read: true,
				write: false,
				role: 'value',
				desc: 'Rain'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.raintipcount', {
			type: 'state',
			common: {
				name: 'RainTipCount',
				type: 'number',
				unit: '',
				min: 0,
				max: 999,
				read: true,
				write: false,
				role: 'value',
				desc: 'RainTipCount'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.rainsec', {
			type: 'state',
			common: {
				name: 'RainSec',
				type: 'number',
				unit: 's',
				min: 0,
				max: 99999,
				read: true,
				write: false,
				role: 'value',
				desc: 'RainSec'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.wspeed', {
			type: 'state',
			common: {
				name: 'Wind Speed',
				type: 'number',
				unit: 'm/s',
				min: 0,
				max: 50,
				read: true,
				write: false,
				role: 'value',
				desc: 'Wind Speed'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.wdir', {
			type: 'state',
			common: {
				name: 'Wind Direction',
				type: 'number',
				unit: '°',
				min: 0,
				max: 365,
				read: true,
				write: false,
				role: 'value',
				desc: 'Wind Direction'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.wgust', {
			type: 'state',
			common: {
				name: 'Wind Gust',
				type: 'number',
				unit: 'm/s',
				min: 0,
				max: 50,
				read: true,
				write: false,
				role: 'value',
				desc: 'Wind Gust'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.wgustref', {
			type: 'state',
			common: {
				name: 'Wind Gust ref',
				type: 'number',
				unit: 'm/s',
				min: 0,
				max: 50,
				read: true,
				write: false,
				role: 'value',
				desc: 'Wind Gust ref'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.solar', {
			type: 'state',
			common: {
				name: 'Solar',
				type: 'number',
				unit: 'W/m²',
				min: 0,
				max: 1800,
				read: true,
				write: false,
				role: 'value',
				desc: 'Solar'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.voltagesolar', {
			type: 'state',
			common: {
				name: 'Voltage Solar',
				type: 'number',
				unit: 'V',
				min: 0,
				max: 9999,
				read: true,
				write: false,
				role: 'value',
				desc: 'Voltage Solar'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.voltagcapacitor', {
			type: 'state',
			common: {
				name: 'Voltage capacitor',
				type: 'number',
				unit: '?',
				min: 0,
				max: 9999,
				read: true,
				write: false,
				role: 'value',
				desc: 'Voltage capacitor'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.soilleaf', {
			type: 'state',
			common: {
				name: 'Soil leaf',
				type: 'number',
				unit: '?',
				min: 0,
				max: 9999,
				read: true,
				write: false,
				role: 'value',
				desc: 'Soil leaf'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.uv', {
			type: 'state',
			common: {
				name: 'UV index',
				type: 'number',
				unit: '',
				min: 0,
				max: 16,
				read: true,
				write: false,
				role: 'value',
				desc: 'UV index'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.soiltemp_1', {
			type: 'state',
			common: {
				name: 'Soil Temperature #1',
				type: 'number',
				unit: '°C',
				min: -50,
				max: 70,
				read: true,
				write: false,
				role: 'value.temperature',
				desc: 'Soil Temperature #1'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.soilmoist_1', {
			type: 'state',
			common: {
				name: 'Soil Moisture #1',
				type: 'number',
				unit: 'cb',
				min: 0,
				max: 200,
				read: true,
				write: false,
				role: 'value',
				desc: 'Soil Moisture #1'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.leafwetness_1', {
			type: 'state',
			common: {
				name: 'Leaf Wetness #1',
				type: 'number',
				unit: '',
				min: 0,
				max: 15,
				read: true,
				write: false,
				role: 'value',
				desc: 'Leaf Wetness #1'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.soiltemp_2', {
			type: 'state',
			common: {
				name: 'Soil Temperature #2',
				type: 'number',
				unit: '°C',
				min: -50,
				max: 70,
				read: true,
				write: false,
				role: 'value.temperature',
				desc: 'Soil Temperature #2'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.soilmoist_2', {
			type: 'state',
			common: {
				name: 'Soil Moisture #2',
				type: 'number',
				unit: 'cb',
				min: 0,
				max: 200,
				read: true,
				write: false,
				role: 'value',
				desc: 'Soil Moisture #2'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.leafwetness_2', {
			type: 'state',
			common: {
				name: 'Leaf Wetness #2',
				type: 'number',
				unit: '',
				min: 0,
				max: 15,
				read: true,
				write: false,
				role: 'value',
				desc: 'Leaf Wetness #2'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.soiltemp_3', {
			type: 'state',
			common: {
				name: 'Soil Temperature #3',
				type: 'number',
				unit: '°C',
				min: -50,
				max: 70,
				read: true,
				write: false,
				role: 'value.temperature',
				desc: 'Soil Temperature #3'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.soilmoist_3', {
			type: 'state',
			common: {
				name: 'Soil Moisture #3',
				type: 'number',
				unit: 'cb',
				min: 0,
				max: 200,
				read: true,
				write: false,
				role: 'value',
				desc: 'Soil Moisture #3'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.leafwetness_3', {
			type: 'state',
			common: {
				name: 'Leaf Wetness #3',
				type: 'number',
				unit: '',
				min: 0,
				max: 15,
				read: true,
				write: false,
				role: 'value',
				desc: 'Leaf Wetness #3'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.soiltemp_4', {
			type: 'state',
			common: {
				name: 'Soil Temperature #4',
				type: 'number',
				unit: '°C',
				min: -50,
				max: 70,
				read: true,
				write: false,
				role: 'value.temperature',
				desc: 'Soil Temperature #4'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.soilmoist_4', {
			type: 'state',
			common: {
				name: 'Soil Moisture #4',
				type: 'number',
				unit: 'cb',
				min: 0,
				max: 200,
				read: true,
				write: false,
				role: 'value',
				desc: 'Soil Moisture #4'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.leafwetness_4', {
			type: 'state',
			common: {
				name: 'Leaf Wetness #4',
				type: 'number',
				unit: '',
				min: 0,
				max: 15,
				read: true,
				write: false,
				role: 'value',
				desc: 'Leaf Wetness #4'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.rssi', {
			type: 'state',
			common: {
				name: 'RSSI',
				type: 'number',
				unit: 'dBm',
				min: -100,
				max: 10,
				read: true,
				write: false,
				role: 'value',
				desc: 'RSSI'
			},
			native: {}
		});
		await this.setObjectNotExistsAsync('DavisVantage_' + id + '.battery', {
			type: 'state',
			common: {
				name: 'Battery',
				type: 'string',
				role: 'text',
				read: true,
				write: false,
				desc: 'Battery'
			},
			native: {}
		});
	}

	async logDavisVantage(data) {
		var tmp = data.split(' ');
		if (tmp[0] === 'OK') {
			// Wenn ein Datensatz sauber gelesen wurde
			if (tmp[2] == 'DAVIS') {
				// Für jeden Datensatz mit dem fixen Eintrag WS
				// somit werden alle SenderIDs bearbeitet

				var array = this.getConfigObjects(this.config.sensors, 'sid', parseInt(tmp[3]));
				if (array.length === 0 || array.length !== 1) {
					this.log.debug(
						'received ID :' +
							parseInt(tmp[3]) +
							' is not defined in the adapter or not unique received address'
					);
				} else if (array[0].stype !== 'DavisVantage') {
					this.log.debug(
						'received ID :' + parseInt(tmp[3]) + ' is not defined in the adapter as DavisVantage'
					);
				} else if (array[0].usid != 'nodef') {
					this.log.debug('Sensor ID    : ' + parseInt(tmp[3]));

					var tmpp = tmp.splice(4, 10); // es werden die vorderen Blöcke (0,1,2,3) entfernt
					this.log.debug('splice       : ' + tmpp);

					if (tmpp.length > 1) {
						this.log.debug('something is wrong in stream ' + tmpp[0] + ' strange part ->' + tmpp[1]);
					}

					var tmppp = tmpp[0].split(',');
					tmppp.forEach(async (value) => {
						var val = value.split('=');
						switch (val[0]) {
							case '1':
								this.log.debug('Temperatur   : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.temp', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '2':
								this.log.debug('Pressure    : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.pressure', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '3':
								this.log.debug('Humidity    : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.humid', {
									val: parseInt(val[1]),
									ack: true
								});
								break;
							case '4':
								this.log.debug('WindSpeed    : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.wspeed', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '5':
								this.log.debug('WindDirection: ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.wdir', {
									val: parseInt(val[1]),
									ack: true
								});
								break;
							case '6':
								this.log.debug('WindGust    : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.wgust', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '7':
								this.log.debug('WindGustRef : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.wgustref', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '8':
								this.log.debug('RainTipCount        : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.raintipcount', {
									val: parseInt(val[1]),
									ack: true
								});
								break;
							case '9':
								this.log.debug('RainSecs    : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.rainsec', {
									val: parseInt(val[1]),
									ack: true
								});
								break;
							case '10':
								this.log.debug('Solar       : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.solar', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '11':
								this.log.debug('VoltageSolar: ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.voltagesolar', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '12':
								this.log.debug('VoltageCapacitor: ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.voltagcapacitor', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '13':
								this.log.debug('SoilLeaf  : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.soilleaf', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '14':
								this.log.debug('UV      : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.uv', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '15.1':
								this.log.debug('SoilTemp1  : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.soiltemp_1', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '16.1':
								this.log.debug('SoilMoist1 : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.soilmoist_1', {
									val: parseInt(val[1]),
									ack: true
								});
								break;
							case '17.1':
								this.log.debug('LeafWet1  : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.leafwetness_1', {
									val: parseInt(val[1]),
									ack: true
								});
								break;
							case '15.2':
								this.log.debug('SoilTemp2 : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.soiltemp_2', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '16.2':
								this.log.debug('SoilMoist2 : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.soilmoist_2', {
									val: parseInt(val[1]),
									ack: true
								});
								break;
							case '17.2':
								this.log.debug('LeafWet2  : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.leafwetness_2', {
									val: parseInt(val[1]),
									ack: true
								});
								break;
							case '15.3':
								this.log.debug('SoilTemp3 : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.soiltemp_3', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '16.3':
								this.log.debug('SoilMoist3 : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.soilmoist_3', {
									val: parseInt(val[1]),
									ack: true
								});
								break;
							case '17.3':
								this.log.debug('LeafWet3  : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.leafwetness_3', {
									val: parseInt(val[1]),
									ack: true
								});
								break;
							case '15.4':
								this.log.debug('SoilTemp4 : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.soiltemp_4', {
									val: parseFloat(val[1]),
									ack: true
								});
								break;
							case '16.4':
								this.log.debug('SoilMoist4 : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.soilmoist_4', {
									val: parseInt(val[1]),
									ack: true
								});
								break;
							case '17.4':
								this.log.debug('LeafWet4  : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.leafwetness_4', {
									val: parseInt(val[1]),
									ack: true
								});
								break;
							case '20':
								this.log.debug('Channel   :   ' + val[1]);
								break;
							case '21':
								this.log.debug('Battery   : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.battery', {
									val: val[1],
									ack: true
								});
								break;
							case '22':
								this.log.debug('RSSI     : ' + val[1]);
								await this.setStateAsync('DavisVantage_' + array[0].usid + '.rssi', {
									val: parseInt(val[1]),
									ack: true
								});
								break;
							default:
								this.log.debug('submitted value pair is unknown ' + val[0] + '=' + val[1]);
						}
					});
				}
			}
		}
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Jeelink(options);
} else {
	// otherwise start the instance directly
	new Jeelink();
}
