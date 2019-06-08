/* jshint -W097 */// jshint strict:false
/*jslint node: true */
var expect = require('chai').expect;
var setup  = require(__dirname + '/lib/setup')

const SerialPort = require('@serialport/stream')
const MockBinding = require('@serialport/binding-mock')

SerialPort.Binding = MockBinding

// Create a port and enable the echo and recording.
MockBinding.createPort('/dev/ttyUSB0', { echo: true, record: true })
const port = new SerialPort('/dev/ttyUSB0')


// create reader with serialport stub
//const SerialPort = proxyquire('../jeelink.js', { 'serialport': EventEmitter })

var objects = null;
var states  = null;
var onStateChanged = null;
var onObjectChanged = null;
var sendToID = 1;

var adapterShortName = setup.adapterName.substring(setup.adapterName.indexOf('.')+1);

function checkConnectionOfAdapter(cb, counter) {
    counter = counter || 0;
    console.log('Try check #' + counter);
    if (counter > 30) {
        if (cb) cb('Cannot check connection');
        return;
    }

    states.getState('system.adapter.' + adapterShortName + '.0.alive', function (err, state) {
        if (err) console.error(err);
        if (state && state.val) {
            if (cb) cb();
        } else {
            setTimeout(function () {
                checkConnectionOfAdapter(cb, counter + 1);
            }, 1000);
        }
    });
}

function checkValueOfState(id, value, cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        if (cb) cb('Cannot check value Of State ' + id);
        return;
    }

    states.getState(id, function (err, state) {
        if (err) console.error(err);
        if (value === null && !state) {
            if (cb) cb();
        } else
        if (state && (value === undefined || state.val === value)) {
            if (cb) cb();
        } else {
            setTimeout(function () {
                checkValueOfState(id, value, cb, counter + 1);
            }, 500);
        }
    });
}

function sendTo(target, command, message, callback) {
    onStateChanged = function (id, state) {
        if (id === 'messagebox.system.adapter.test.0') {
            callback(state.message);
        }
    };

    states.pushMessage('system.adapter.' + target, {
        command:    command,
        message:    message,
        from:       'system.adapter.test.0',
        callback: {
            message: message,
            id:      sendToID++,
            ack:     false,
            time:    (new Date()).getTime()
        }
    });
}

describe('Test ' + adapterShortName + ' adapter', function() {
    before('Test ' + adapterShortName + ' adapter: Start js-controller', function (_done) {
        this.timeout(600000); // because of first install from npm

        setup.setupController(function () {
            var config = setup.getAdapterConfig();
            // enable adapter
            config.common.enabled  = true;
            config.common.loglevel = 'debug';

            config.native.serialport = '/dev/ttyUSB0';
            
            config.native.sensors = [
                {
                    "sid": "18",
                    "usid": "1",
                    "stype": "emonTH",
                    "name": "example emonTH"
                },
                {
                    "sid": "0",
                    "usid": "2",
                    "stype": "LaCrosseBMP180",
                    "name": "example superjee"
                },
                {
                    "sid": "56",
                    "usid": "3",
                    "stype": "LaCrosseDTH",
                    "name": "example LaCrosseDTH"
                },
                {
                    "sid": "22",
                    "usid": "4",
                    "stype": "LaCrosseDTH",
                    "name": "example LaCrosseDTH"
                },
                {
                    "sid": "60",
                    "usid": "5",
                    "stype": "LaCrosseWS",
                    "name": "example LaCrosseWS"
                },
                {
                    "sid": "188",
                    "usid": "6",
                    "stype": "EC3000",
                    "name": "example EC3000"
                },
                {
                    "sid": "5451",
                    "usid": "7",
                    "stype": "EMT7110",
                    "name": "example EMT7110"
                },
                {
                    "sid": "1",
                    "usid": "8",
                    "stype": "level",
                    "name": "example level"
                }
    ]


            setup.setAdapterConfig(config.common, config.native);

            setup.startController(true, function(id, obj) {}, function (id, state) {
                    if (onStateChanged) onStateChanged(id, state);
                },
                function (_objects, _states) {
                    objects = _objects;
                    states  = _states;
                    _done();
                });
                port.emit('data', '\n[LaCrosseITPlusReader.10.1q (RFM69 f:868300 r:17241)]\r\nOK 9 22 129 4 220 52\r\n')
        });
    });

/*
    ENABLE THIS WHEN ADAPTER RUNS IN DEAMON MODE TO CHECK THAT IT HAS STARTED SUCCESSFULLY
*/
    it('Test ' + adapterShortName + ' adapter: Check if adapter started', function (done) {
        this.timeout(60000);
        checkConnectionOfAdapter(function (res) {
            if (res) console.log(res);
            expect(res).not.to.be.equal('Cannot check connection');
            objects.setObject('system.adapter.test.0', {
                    common: {

                    },
                    type: 'instance'
                },
                function () {
                    states.subscribeMessage('system.adapter.test.0');
                    done();
                });
        });
    });
/**/

/*
    PUT YOUR OWN TESTS HERE USING
    it('Testname', function ( done) {
        ...
    });

    You can also use "sendTo" method to send messages to the started adapter
*/
    it('Test ' + adapterShortName + ' adapter: Objects must exist for avg', done => {
        setTimeout(function(){
            objects.getObject(adapterShortName + '.0.LaCrosse_4.temp', (err, obj) => {
                if (err) console.error('avg dayMin '+err);
                expect(obj).to.exist;
                expect(obj).to.be.ok;
                    objects.getObject(adapterShortName + '.0.LaCrosse_4.humid', (err, obj) => {
                        if (err) console.error('avg dayMax ' + err);
                        expect(obj).to.exist;    
                        expect(obj).to.be.ok;
                        done();
                    });
                    });
                }, 1000);
        }).timeout(5000);
    
    
   it('Test ' + adapterShortName + ' adapter: Check existence of LaCrosseDTH', function (done) {
        this.timeout(90000);
        setTimeout(function () {
            states.getState(adapterShortName+'.0.LaCrosse_4.temp', function (err, state) {
                if (err) console.error(err);
                expect(state).to.exist;
                if (!state) {
                    console.error('state "jeelink.0.LaCrosse_4.temp" not set');
                }
                else {
                    console.log('jeelink.0.LaCrosse_4.temp          ... ' + state.val);
                    expect(state.val).to.exist;
                    //expect(state.val).to.be.equal(17.5);
                    done();
                }
            });
        }, 70000);
    });
    it('Test ' + adapterShortName + ' adapter: Check existence of LaCrosseDMP180', function (done) {
        this.timeout(90000);
        setTimeout(function () {
            states.getState(adapterShortName+'.0.LaCrosse_2.temp', function (err, state) {
                if (err) console.error(err);
                expect(state).to.exist;
                if (!state) {
                    console.error('state "jeelink.0.LaCrosse_2.temp" not set');
                }
                else {
                    console.log('jeelink.0.LaCrosse_2.temp          ... ' + state.val);
                    expect(state.val).to.exist;
                    //expect(state.val).to.be.equal(17.5);
                    done();
                }
            });
        }, 70000);
    });

    after('Test ' + adapterShortName + ' adapter: Stop js-controller', function (done) {
        this.timeout(10000);

        setup.stopController(function (normalTerminated) {
            console.log('Adapter normal terminated: ' + normalTerminated);
            done();
        });
    });
});
