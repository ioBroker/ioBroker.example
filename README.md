![Logo](admin/template.png)
# ioBroker.template
=================

This adapter is a template for the creation of an ioBroker adapter. You do not need it at least that you plan developing your own adapter.

It includes both code running within iobroker and as vis widget. If you only plan to create a vis widget then you should use the [iobroker.vis-template](https://github.com/ioBroker/ioBroker.vis-template) instead.

##Steps 
1. download and unpack this packet from github ```https://github.com/ioBroker/ioBroker.template/archive/master.zip```
  or clone git repository ```git clone https://github.com/ioBroker/ioBroker.template.git```

2. download required npm packets. Write in ioBroker.template directory:

  ```npm install```
  
3. set name of this template. Call
  
  ```grunt rename --name=mynewname --email=email@mail.com --author="Author Name"```
  
  *mynewname* must be **lower** case and with no spaces.

  If grunt is not availible, install grunt globally:
  
  ```npm install -g grunt-cli```
 
4. rename directory from *ioBroker.template* (can be *ioBroker.template-master*) to *iobroker.mynewname*

5. to use this template you should copy it into *.../iobroker/node_modules* directory

6. create your adapter:

  * you might want to start with main.js (code running within iobroker) and admin/index.html (the adapter settings page).

  * [Adapter-Development-Documentation](https://github.com/ioBroker/ioBroker/wiki/Adapter-Development-Documentation),
  
  * [Installation, setup and first steps with an ioBroker Development Environment](https://github.com/ioBroker/ioBroker/wiki/Installation,-setup-and-first-steps-with-an-ioBroker-Development-Environment)
  
  * [Write and debug vis widgets](https://github.com/ioBroker/ioBroker/wiki/How-to-debug-vis-and-to-write-own-widget-set)
  
  * files under the www folders are made available under http://&lt;iobrokerIP&gt;:8082/&lt;adapter-name&gt;/
    * for this to work the iobroker.vis adapter has to be installed
    * delete this folder if you do not plan to export any files this way
    * call ```iobroker upload <adapter-name>``` after you change files in the www folder to get the new files uploaded to vis
  * the widget folder contains an example of a vis widget
    * you might want to start with *widget/<adapter-name>.html* and *widget/js/<adapter-name>.js*
    * call ```iobroker visdebug <adapter-name>``` to enable debugging and upload widget to "vis". (This works only from V0.7.15 of js-controller)
    * If you do not plan to export any widget then delete the whole widget folder and remove the ```"restartAdapters": ["vis"]``` statement from *io-package.json*

7. change version: edit package.json and then call ```grunt p``` in your adapter directory.
  
8. share it with the community

## Changelog

### 0.5.0
  (vegetto) include vis widget

#### 0.4.0
* (bluefox) fix errors with grunt

#### 0.2.0
* (bluefox) initial release

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
