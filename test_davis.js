// OK VALUES DAVIS 0 20=0,22=-64,21=ok,4=0.00,5=93,8=108,15.1=233,
// OK VALUES DAVIS 0 20=1,22=-64,21=ok,4=0.00,5=93,9=-1,
// OK VALUES DAVIS 0 20=2,22=-63,21=ok,4=0.00,5=93,6=0.00,7=-1,
// OK VALUES DAVIS 0 20=3,22=-64,21=ok,4=0.00,5=93,1=-3.94,

/**
 * @param {string} data - data
 */
function logDavisVantage(data) {
    var tmp = data.split(' ');
    if (tmp[0] === 'OK') {
        // Wenn ein Datensatz sauber gelesen wurde
        if (tmp[2] == 'DAVIS') {
            // Für jeden Datensatz mit dem fixen Eintrag WS
            // somit werden alle SenderIDs bearbeitet

            console.log(`received ID :${tmp[3]} is not defined in the adapter or not unique received address`);

            var tmpp = tmp.splice(4, 18); // es werden die vorderen Blöcke (0,1) entfernt
            console.log(`splice       : ${tmpp}`);

            if (tmpp.length > 1) {
                console.log('something wrong in stream');
            }
            console.log(`tmpp       : ${tmpp}`);
            var tmppp = tmpp[0].split(',');
            console.log(`tmppp       : ${tmppp[0]}`);
            tmppp.forEach(value => {
                var val = value.split('=');
                var sel = val[0];
                console.log(`${val[0]}==== ${val[1]}`);
                if (String(val[0]).length > 10) {
                    sel = parseInt(parseFloat(val[0]) * 10);
                    console.log(sel);
                }
                switch (sel) {
                    case '1':
                        console.log(`1=${val[1]}`);
                        break;
                    case '4':
                        console.log(`4=${val[1]}`);
                        break;
                    case '5':
                        console.log(`5=${val[1]}`);
                        break;
                    case '21':
                        console.log(`21=${val[1]}`);
                        break;
                    case '15.1':
                        console.log(`151=${val[1]}`);
                        break;
                    default:
                        console.log(`not inside ${val[0]}`);
                }
            });

            /**
                var array = this.getConfigObjects(this.config.sensors, 'sid', parseInt(tmpp[0]));
				//var array = this.getConfigObjects(this.config.sensors, 'sid', parseInt(tmpp[0]));
				if (array.length === 0 || array.length !== 1) {
					console.log(
						'received ID :' +
							parseInt(tmpp[0]) +
							' is not defined in the adapter or not unique received address'
					);
				} else if (array[0].stype !== 'LaCrosseBMP180') {
					console.log(
						'received ID :' + parseInt(tmpp[0]) + ' is not defined in the adapter as LaCrosseBMP180'
					);
				} else if (array[0].usid != 'nodef') {
					console.log('Sensor ID    : ' + parseInt(tmpp[0]));
					console.log('Type         : ' + parseInt(tmpp[1]));
					console.log('Temperatur   : ' + (parseInt(tmpp[2]) * 256 + parseInt(tmpp[3]) - 1000) / 10);
					console.log('Pressure      : ' + (parseInt(tmpp[14]) * 256 + parseInt(tmpp[15])));
					// Werte schreiben
					// aus gesendeter ID die unique ID bestimmen
				}
             */
        }
    }
}

logDavisVantage('OK VALUES DAVIS 0 20=0,22=-64,21=ok,4=0.00,5=93,8=108,15.1=233');
