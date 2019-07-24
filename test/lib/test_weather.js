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


function logLaCrosseWS(data){
    var tmp = data.split(' ');
    if(tmp[0]==='OK'){                      // Wenn ein Datensatz sauber gelesen wurde
        if(tmp[1]=='WS'){                    // Für jeden Datensatz mit dem fixen Eintrag WS
            // somit werden alle SenderIDs bearbeitet
            var tmpp=tmp.splice(2,18);       // es werden die vorderen Blöcke (0,1,2) entfernt
            console.log('splice       : '+ tmpp);
            
            if ((parseInt(tmpp[2])) === 255){
                console.log('Temperature   : no data (255)');
                } 
            else {
                        console.log('Temperature   : '+ ((((parseInt(tmpp[2]))*256)+(parseInt(tmpp[3]))-1000)/10) ) ; // Vorzeichen fehlt noch
                }
            if  ((parseInt(tmpp[4])) === 255){
                console.log('Humidty   : no data (255)');
                } 
            else {
                console.log('Humidty      : '+ ((parseInt(tmpp[4]))*1) );
            }
            if  ((parseInt(tmpp[5])) === 255){
                console.log('Rain   : no data (255)');
                }
            else {
                console.log('Rain         : '+ ((((parseInt(tmpp[5]))*256)+(parseInt(tmpp[6])))/2) );
                }
            if  ((parseInt(tmpp[9])) === 255){
                console.log('Wind Speed   : no data (255)');
                }
            else {		    
                console.log('WindSpeed    : '+ ((((parseInt(tmpp[9]))*256)+(parseInt(tmpp[10])))/10) );
                console.log('wspeed2 : '+  ((((parseInt(tmpp[9]))*256)+(parseInt(tmpp[10])))/10)*3.6);

            }
            if  ((parseInt(tmpp[7])) === 255){
                console.log('WindDirection   : no data (255)');
                }
            else {				    
                console.log('WindDirection: '+ ((((parseInt(tmpp[7]))*256)+(parseInt(tmpp[8])))/10) );
            }
            if  ((parseInt(tmpp[11])) === 255){
                console.log('WindGust   : no data (255)');
                }
            else {			    
                console.log('WindGust     : '+ ((((parseInt(tmpp[11]))*256)+(parseInt(tmpp[12])))/10) );
            }
            console.log('NewBattery   : '+ (parseInt(tmpp[13]) & 0x01) );
            console.log('LowBattery   : '+ ((parseInt(tmpp[13]) & 0x04) >> 2) ); 

                    //absolute Feuchte und Taupunkt
            if ( ((parseInt(tmpp[2])) !== 255) && ((parseInt(tmpp[4])) !== 255) ) {
                    var temp = ((((parseInt(tmpp[2]))*256)+(parseInt(tmpp[3]))-1000)/10);
                    var rel = ((parseInt(tmpp[4]))*1) ;
                    var vappress =rel/100 * 6.1078 * Math.exp(((7.5*temp)/(237.3+temp))/Math.LOG10E);
                    var v = Math.log(vappress/6.1078) * Math.LOG10E;
                    var dewp = (237.3 * v) / (7.5 - v);
                    var habs = 1000 * 18.016 / 8314.3 * 100*vappress/(273.15 + temp );
                    console.log('abshumid'+ habs);
                    console.log('dewpoint'+ dewp);
            } else {console.log('WS no dewpoint calculation ');}
                
        }
    }
}


logLaCrosseWS('OK WS 60 1 4 193 52 2 88 4 101 15 20 255 255');
console.log('ID=60  21.7°C  52%rH  600mm  Dir.: 112.5°  Wind:15m/s  Gust:20m/s');
/*
logLaCrosseWS('OK WS 34 1 4 199 65 0 29 7 8 0 0 255 255');
console.log('ID=34  21.8°C  66%rH  600mm  Dir.: 180°  Wind:0m/s  Gust:--m/s');
logLaCrosseWS('OK WS 34 1 4 199 65 0 129 2 163 0 9 0 19');
console.log('ID=34  21.8°C  66%rH  600mm  Dir.: 67,5°  Wind:0,9m/s  Gust:1,9m/s');
*/
logLaCrosseWS('OK WS 34 1 5 21 43 0 168 3 132 0 9 0 19');
console.log('ID=34  30,1°C  43%rH  600mm  Dir.: 90°  Wind:0,9m/s  Gust:1,9m/s');

logLaCrosseWS('OK WS 5 1 255 255 255 0 9 255 255 255 255 255 255 0');
console.log('ID=5  15,4°C  83%rH  ansonsten nix ');
