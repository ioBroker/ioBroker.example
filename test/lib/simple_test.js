function round(value, digits) //digits 1 for 1 digit after comma
{
	var factor = Math.pow(10, digits);
	value = Math.round(value*factor);
	return value/factor;
}


function logEC3000(data){
    var tmp = data.split(' ');
    if(tmp[0]==='OK'){                      // Wenn ein Datensatz sauber gelesen wurde
        if(tmp[1]=='22'){                    // Für jeden Datensatz mit dem fixen Eintrag WS
            // somit werden alle SenderIDs bearbeitet
            var tmpp=tmp.splice(2,21);       // es werden die vorderen Blöcke (0,1,2) entfernt
            console.log('splice       : '+ tmpp);
            var buf = new Buffer(tmpp);
            var id = ((buf.readIntLE(0)*256) + (buf.readIntLE(1))).toString(16);

                console.log('Station ID   : '+ id );
                console.log('total time   : '+ ( (buf.readIntLE(2) *16777216 ) + (buf.readIntLE(3) *65536)+ (buf.readIntLE(4) *256) + (buf.readIntLE(5))  ) );
                console.log('on time      : '+ ( (buf.readIntLE(6) *16777216  ) + (buf.readIntLE(7) *65536)+ (buf.readIntLE(8) *256) + (buf.readIntLE(9))  ) );
                console.log('energy       : '+ ( (buf.readIntLE(10) *16777216  ) + (buf.readIntLE(11) *65536)+ (buf.readIntLE(12)  *256) + (buf.readIntLE(13))  ) );
                console.log('power        : '+ ( (buf.readIntLE(14) *256 ) + (buf.readIntLE(15))  ) );
                console.log('max power    : '+ ( (buf.readIntLE(16) *256 ) + (buf.readIntLE(17))  ) );
                console.log('resets       : '+ ( buf.readIntLE(18))  );


        }
    }
}

logEC3000('OK 22 188 129 0 209 209 102 0 174 89 187 0 1 123 102 0 0 10 117 2 0');


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


function logLaCrosseWS(data){
    var tmp = data.split(' ');
    if(tmp[0]==='OK'){                      // Wenn ein Datensatz sauber gelesen wurde
        if(tmp[1]=='WS'){                    // Für jeden Datensatz mit dem fixen Eintrag WS
            // somit werden alle SenderIDs bearbeitet
            var tmpp=tmp.splice(2,18);       // es werden die vorderen Blöcke (0,1,2) entfernt
            console.log('splice       : '+ tmpp);
            var buf = new Buffer(tmpp);
                console.log('Station ID    : '+ (buf.readIntLE(0)) );
                console.log('Type         : '+ (buf.readIntLE(1)) ); //should be 3 otherwise it is only temperature
		if ((buf.readIntLE(2)) === 254){
		    console.log('Temperature   : no data (255)');
		    } 
		else {
					console.log('Temperature   : '+ ((((buf.readIntLE(2))*256)+(buf.readIntLE(3))-1000)/10) ) ; // Vorzeichen fehlt noch
					console.log('Temperature2   : '+ ((((buf.readIntLE(2))*256)+(buf.readIntLE(3))-1000)/10) ) ; // Vorzeichen fehlt noch
	    	}
		if  ((buf.readIntLE(4)) === 254){
		    console.log('Humidty   : no data (255)');
		    } 
		else {
               		console.log('Humidty      : '+ ((buf.readIntLE(4))*1) ); 
		}
		if  ((buf.readIntLE(5)) === 254){
		    console.log('Rain   : no data (255)');
		    }
		else {
					console.log('Rain         : '+ ((((buf.readIntLE(5))*256)+(buf.readIntLE(6)))/10 ) );
                	console.log('Rain         : '+ ((((buf.readIntLE(5))*256)+(buf.readIntLE(6)))/2 ) );
		    }
		if  ((buf.readIntLE(9)) === 254){
		    console.log('Wind Speed   : no data (255)');
		    }
		else {		    
					console.log('WindSpeed    : '+ ((((buf.readIntLE(9))*256)+(buf.readIntLE(10)))/10) + 'm/s');
					console.log('WindSpeed    : '+ round( ((((buf.readIntLE(9))*256)+(buf.readIntLE(10)))/10)*3.6 , 3) + 'km/h');
		}
		if  ((buf.readIntLE(7)) === 254){
		    console.log('WindDirection   : no data (255)');
		    }
		else {				    
                	console.log('WindDirection: '+ ((((buf.readIntLE(7))*256)+(buf.readIntLE(8)))/10) );
		}
		if  ((buf.readIntLE(11)) === 254){
		    console.log('WindGust   : no data (255)');
		    }
		else {			    
                	console.log('WindGust     : '+ ((((buf.readIntLE(11))*256)+(buf.readIntLE(12)))/10) );
		}
                console.log('NewBattery   : '+ (buf.readIntLE(13) & 0x01) );
                console.log('LowBattery   : '+ ((buf.readIntLE(13) & 0x04) >> 2) ); 
            
        }
    }
}

logLaCrosseWS('OK WS 60 1 4 193 52 2 88 4 101 15 20 255 255');
console.log('ID=60  21.7°C  52%rH  600mm  Dir.: 112.5°  Wind:15m/s  Gust:20m/s');
logLaCrosseWS('OK WS 34 1 4 199 65 0 29 7 8 0 0 255 255');
console.log('ID=34  21.8°C  66%rH  600mm  Dir.: 180°  Wind:0m/s  Gust:--m/s');
logLaCrosseWS('OK WS 34 1 4 199 65 0 129 2 163 0 9 0 19');
console.log('ID=34  21.8°C  66%rH  600mm  Dir.: 67,5°  Wind:0,9m/s  Gust:1,9m/s');
logLaCrosseWS('OK WS 34 1 5 21 43 0 168 3 132 0 9 0 19');
console.log('ID=34  30,1°C  43%rH  600mm  Dir.: 90°  Wind:0,9m/s  Gust:1,9m/s');


function logEMT7110(data){
    var tmp = data.split(' ');
    if(tmp[0]==='OK'){                      // Wenn ein Datensatz sauber gelesen wurde
        if(tmp[1]=='EMT7110'){                    // Für jeden Datensatz mit dem fixen Eintrag WS
            // somit werden alle SenderIDs bearbeitet
            var tmpp=tmp.splice(2,13);       // es werden die vorderen Blöcke (0,1,2) entfernt
            console.log('splice       : '+ tmpp);
            var buf = new Buffer(tmpp);
            var id = (buf.readIntLE(0)*256 + buf.readIntLE(1)).toString(16);

                console.log('Station ID   : '+ id );
                console.log('voltage   : '+ ( (buf.readIntLE(2) *256) + (buf.readIntLE(3))  )/10 );
                console.log('current      : '+ ( (buf.readIntLE(4) *256) + (buf.readIntLE(5))  ) );
                console.log('power       : '+ ( (buf.readIntLE(6)  *256) + (buf.readIntLE(7))  ) );
                console.log('energy        : '+ ( (buf.readIntLE(8) *256 ) + (buf.readIntLE(9))  )/100 );
        }
    }
}
logEMT7110('OK EMT7110 84 81 8 237 0 13 0 2 1 6 1');
console.log('ID 5451   228,5V   13mA   2W   2,62kWh')
logEMT7110('OK EMT7110 84 162 8 207 0 76 0 7 0 0 1');
console.log('ID 5451   228,5V   13mA   2W   2,62kWh')

function logLevel(data){
    var tmp = data.split(' ');
    if(tmp[0]==='OK'){                      // Wenn ein Datensatz sauber gelesen wurde
        if(tmp[1]=='LS'){                    // Für jeden Datensatz mit dem fixen Eintrag WS
            // somit werden alle SenderIDs bearbeitet
            var tmpp=tmp.splice(2,8);       // es werden die vorderen Blöcke (0,1,2) entfernt
            console.log('splice       : '+ tmpp);
            var buf = new Buffer(tmpp);
                console.log('Sensor ID    : '+ (buf.readIntLE(0)) );
                console.log('Type         : '+ (buf.readIntLE(1)) );
                console.log('Level        : '+ ((((buf.readIntLE(2))*256)+(buf.readIntLE(3))-1000)/10) );
                console.log('Temperatur   : '+ ((((buf.readIntLE(4))*256)+(buf.readIntLE(5))-1000)/10) );
                console.log('Voltage      : '+ ((buf.readIntLE(6))/10 ) );           

        }
    }
}

logLevel('OK LS 1 0 5 100 4 191 60');
console.log('  38,0cm    21,5°C   6,0V ');
logLevel('OK LS 1 0 8 167 4 251 57');
console.log('   121,5cm    27,5°C   5,7V '); 
