![Logo](admin/jeelab_logo.png)
# ioBroker.jeelink
=================

This is an adapter for ioBroker to integrate RFM12B/RFM69 via Jeelink.
The jeelink can be used with the preloaded software (rfmdemo).

##Installation:
released version
* npm install iobroker.jeelink

or the actual version from github
* npm install https://github.com/foxthefox/ioBroker.jeelink/tarball/master --production

##Settings:
- USB port of JeelinkAdapter usually /dev/ttyACME
- Serial Speed usually 57600 Baud

##Configuration:
to be done in io-package.json
- define sensor address
- define the room
- define the type of sensor

##TODO:
other sensor types

##Changelog:
###0.0.1
working with 3 sensors
