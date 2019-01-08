/**
 *
 * template adapter
 *
 *
 *  file io-package.json comments:
 *
 *  {
 *      "common": {
 *          "name":         "template",                  // name has to be set and has to be equal to adapters folder name and main file name excluding extension
 *          "version":      "0.0.0",                    // use "Semantic Versioning"! see http://semver.org/
 *          "title":        "Node.js template Adapter",  // Adapter title shown in User Interfaces
 *          "authors":  [                               // Array of authord
 *              "name <mail@template.com>"
 *          ]
 *          "desc":         "template adapter",          // Adapter description shown in User Interfaces. Can be a language object {de:"...",ru:"..."} or a string
 *          "platform":     "Javascript/Node.js",       // possible values "javascript", "javascript/Node.js" - more coming
 *          "mode":         "daemon",                   // possible values "daemon", "schedule", "subscribe"
 *          "materialize":  true,                       // support of admin3
 *          "schedule":     "0 0 * * *"                 // cron-style schedule. Only needed if mode=schedule
 *          "loglevel":     "info"                      // Adapters Log Level
 *      },
 *      "native": {                                     // the native object is available via adapter.config in your adapters code - use it for configuration
 *          "test1": true,
 *          "test2": 42,
 *          "mySelect": "auto"
 *      }
 *  }
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

// you have to require the utils module and call adapter function
const utils = require('@iobroker/adapter-core'); // Get common adapter utils

// read the adapter name from package.json
const adapterName = require('./package.json').name.split('.').pop();

/*Variable declaration, since ES6 there are let to declare variables. Let has a more clearer definition where 
it is available then var.The variable is available inside a block and it's childs, but not outside. 
You can define the same variable name inside a child without produce a conflict with the variable of the parent block.*/
let variable = 1234;

// define adapter class wich will be used for communication with controller
class MyAdapter extends utils.Adapter {
    constructor(options) {
        super(options);

        // is called when adapter shuts down - callback has to be called under any circumstances!
        on('unload', this._unload);

        // is called if a subscribed object changes
        on('objectChange', this._objectChange);

        // is called if a subscribed state changes
        on('stateChange', this._stateChange);

        // Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
        on('message', this._message);

        // is called when databases are connected and adapter received configuration.
        // start here!
        on('ready', this._main);
    }

    // name has to be set and has to be equal to adapters folder name and main file name excluding extension
    get name() { return adapterName; }

    _unload(callback) {
        try {
            adapter.log.info('cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }

    _objectChange(id, obj) {
        // Warning, obj can be null if it was deleted
        adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
    }

    _stateChange(id, state) {
        // Warning, state can be null if it was deleted
        adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

        // you can use the ack flag to detect if it is status (true) or command (false)
        if (state && !state.ack) {
            adapter.log.info('ack is not set!');
        }
    }

    _message(obj) {
        if (typeof obj === 'object' && obj.message) {
            if (obj.command === 'send') {
                // e.g. send email or pushover or whatever
                console.log('send command');

                // Send response in callback if required
                if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
            }
        }
    }

    _main() {
        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // adapter.config:
        this.log.info('config test1: ' + this.config.test1);
        this.log.info('config test1: ' + this.config.test2);
        this.log.info('config mySelect: ' + this.config.mySelect);


		/**
		 *
		 *      For every state in the system there has to be also an object of type state
		 *
		 *      Here a simple template for a boolean variable named "testVariable"
		 *
		 *      Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		 *
		 */

        this.setObject('testVariable', {
            type: 'state',
            common: {
                name: 'testVariable',
                type: 'boolean',
                role: 'indicator'
            },
            native: {}
        });

        // in this template all states changes inside the adapters namespace are subscribed
        this.subscribeStates('*');


		/**
		 *   setState examples
		 *
		 *   you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		 *
		 */

        // the variable testVariable is set to true as command (ack=false)
        this.setState('testVariable', true);

        // same thing, but the value is flagged "ack"
        // ack should be always set to true if the value is received from or acknowledged from the target system
        this.setState('testVariable', { val: true, ack: true });

        // same thing, but the state is deleted after 30s (getState will return null afterwards)
        this.setState('testVariable', { val: true, ack: true, expire: 30 });


        // examples for the checkPassword/checkGroup functions
        this.checkPassword('admin', 'iobroker', function (res) {
            console.log('check user admin pw ioboker: ' + res);
        });

        this.checkGroup('admin', 'admin', function (res) {
            console.log('check group user admin group admin: ' + res);
        });
    }
};

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = () => new MyAdapter;
} else {
    // or start the instance directly
    new MyAdapter();
} 