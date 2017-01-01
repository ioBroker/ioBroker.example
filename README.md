![Logo](admin/jeelab_logo.png)
# ioBroker.jeelink
=================

This is an adapter for ioBroker to integrate RFM12B/RFM69 via Jeelink.
The jeelink can be used with the preloaded software (rfmdemo).

##Installation:

npm install https://github.com/foxthefox/ioBroker.jeelink/tarball/master --production

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


## License
The MIT License (MIT)

Copyright (c) 2015 @@Author@@<@@email@@>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
