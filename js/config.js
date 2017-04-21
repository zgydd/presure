'use strict';
$(document).ready(function() {
	callLocales(_statData.defaultLanguage);
	if (commConfig) {
		if (commConfig.hasOwnProperty('port')) $('#config_inputPort').val(commConfig.port);
		if (commConfig.hasOwnProperty('alertFreque')) $('#config-inputAlertFreque').val(commConfig.alertFreque);
		if (commConfig.hasOwnProperty('alertTime')) $('#config-inputAlertTime').val(commConfig.alertTime);
		if (commConfig.hasOwnProperty('baudRange')) $('#config-inputBaudRate').val(commConfig.baudRange);
		if (commConfig.hasOwnProperty('radius')) $('#config-inputRadius').val(commConfig.radius);
		//if (commConfig.hasOwnProperty('flushRange')) $('#config-inputFlushRange').val(commConfig.flushRange);
		if (commConfig.hasOwnProperty('autoCalibration')) $('#config-inputAutoCalibration').val(commConfig.autoCalibration);
		if (commConfig.hasOwnProperty('delayedSampling')) $('#config-inputDelayedSampling').val(commConfig.delayedSampling);

		if (commConfig.hasOwnProperty('noiseLimit') && commConfig.noiseLimit.hasOwnProperty('min'))
			$('#config-inputMinNoise').val(commConfig.noiseLimit.min);
		if (commConfig.hasOwnProperty('noiseLimit') && commConfig.noiseLimit.hasOwnProperty('max'))
			$('#config-inputMaxNoise').val(commConfig.noiseLimit.max);

		if (commConfig.hasOwnProperty('productionSize')) {
			switch (commConfig.productionSize.width) {
				case 32:
					$('#config-selectProduction').get(0).selectedIndex = 1;
					break;
				case 16:
				default:
					$('#config-selectProduction').get(0).selectedIndex = 0;
					break;
			}
			$('#config-labProductionDesc').html(commConfig.productionSize.width + '*' + commConfig.productionSize.height);
		}

		$('#config-selectPort').empty();
		//Prot list
		if (commConfig.hasOwnProperty('portList') && commConfig.portList.length > 0) {
			for (var i = 0; i < commConfig.portList.length; i++) {
				var strOption = '<option value="' + commConfig.portList[i].comName + '"';
				if (commConfig.portList[i].comName.trim() === commConfig.port) {
					strOption += ' selected';
				}
				strOption += ' >' + commConfig.portList[i].comName + '</option>';
				$('#config-selectPort').append(strOption);
			}
		} else {
			$('#config-selectPort').prepend("<option value='0' z-lang='langConfigOptNoPort'>" +
				_getLocalesValue('langConfigOptNoPort', 'No port') + "</option>");
		}
	}
	$('#config-advanceConfigFrame').hide();
	_resetMainHeight();
});

$('#config-selectPort').on('change', function() {
	commConfig.port = $('#config-selectPort').val().trim();
	resetSerialPort();
	_showMessage('ok', _getLocalesValue('langConfigMsgPortSetted', 'Serial port setted'));
});

$('#config-selectProduction').on('change', function() {
	var w = $(window).get(0).innerWidth;
	var h = $(window).get(0).innerHeight;
	commConfig.radius = Math.floor((w > h ? h : w) * 4 / 100);
	switch ($('#config-selectProduction').prop('selectedIndex')) {
		case 1:
			commConfig.productionSize.width = 32;
			commConfig.productionSize.height = 80;
			//if (commConfig.radius === 40) {
			//	commConfig.radius = 10;
			//	$('#config-inputRadius').val(10);
			//}
			$('#config-labProductionDesc').html(commConfig.productionSize.width + '*' + commConfig.productionSize.height);
			break;
		default:
			commConfig.productionSize.width = 16;
			commConfig.productionSize.height = 16;
			//if (commConfig.radius === 10) {
			//	commConfig.radius = 40;
			//	$('#config-inputRadius').val(40);
			//}
			$('#config-labProductionDesc').html(commConfig.productionSize.width + '*' + commConfig.productionSize.height);
			break;
	}
	$('#config-inputRadius').val(commConfig.radius);
	innerData = initInnerData();
	_showMessage('ok', _getLocalesValue('langConfigMsgProductionSetted', 'Production changed'));
});
$('#config-inputAlertFreque').on('blur', function() {
	if (_chkEqual(commConfig.alertFreque, $('#config-inputAlertFreque').val())) return;
	if (!/^\d{1,3}$/.test($('#config-inputAlertFreque').val().trim()) ||
		parseInt($('#config-inputAlertFreque').val().trim()) < 10) {
		_showMessage('warn', _getLocalesValue('langConfigWrnAlertFreque', 'Illegal alert frequency'));
		$('#config-inputAlertFreque').parent().addClass('alert-danger');
		$('#config-inputAlertFreque').val(commConfig.alertFreque);
		$('#config-inputAlertFreque').focus();
		setTimeout(function() {
			$('#config-inputAlertFreque').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.alertFreque = _toInt($('#config-inputAlertFreque').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgAlertFreque', 'Alert Frequency setted'));
});
$('#config-inputAlertTime').on('blur', function() {
	if (_chkEqual(commConfig.alertTime, $('#config-inputAlertTime').val())) return;
	if (!/^\d{1}$/.test($('#config-inputAlertTime').val().trim()) ||
		parseInt($('#config-inputAlertTime').val().trim()) < 3) {
		_showMessage('warn', _getLocalesValue('langConfigWrnAlertTime', 'Illegal alert time'));
		$('#config-inputAlertTime').parent().addClass('alert-danger');
		$('#config-inputAlertTime').val(commConfig.alertTime);
		$('#config-inputAlertTime').focus();
		setTimeout(function() {
			$('#config-inputAlertTime').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.alertTime = _toInt($('#config-inputAlertTime').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgAlertTime', 'Alert Time setted'));
});

$('#config-aAdvanceCfg').on('click', function() {
	if ($('#config-advanceConfigFrame').is(':hidden')) $('#config-advanceConfigFrame').fadeIn(888);
	else $('#config-advanceConfigFrame').fadeOut(888);
	setTimeout(function() {
		_resetMainHeight();
	}, 1000);
});
$('#config-inputBaudRate').on('blur', function() {
	if (_chkEqual(commConfig.baudRange, $('#config-inputBaudRate').val())) return;
	if (!/^\d{1,8}$/.test($('#config-inputBaudRate').val().trim()) ||
		parseInt($('#config-inputBaudRate').val().trim()) <= 0) {
		_showMessage('warn', _getLocalesValue('langConfigWrnBaudRate', 'Illegal baud rate'));
		$('#config-inputBaudRate').parent().addClass('alert-danger');
		$('#config-inputBaudRate').val(commConfig.baudRange);
		$('#config-inputBaudRate').focus();
		setTimeout(function() {
			$('#config-inputBaudRate').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.baudRange = _toInt($('#config-inputBaudRate').val());
	resetSerialPort();
	_showMessage('ok', _getLocalesValue('langConfigMsgBaudRate', 'Baud range setted'));
});
$('#config-inputRadius').on('blur', function() {
	if (_chkEqual(commConfig.radius, $('#config-inputRadius').val())) return;
	if (!/^\d{1,3}$/.test($('#config-inputRadius').val().trim()) ||
		parseInt($('#config-inputRadius').val().trim()) <= 0) {
		_showMessage('warn', _getLocalesValue('langConfigWrnRadius', 'Illegal radius'));
		$('#config-inputRadius').parent().addClass('alert-danger');
		$('#config-inputRadius').val(commConfig.radius);
		$('#config-inputRadius').focus();
		setTimeout(function() {
			$('#config-inputRadius').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.radius = _toInt($('#config-inputRadius').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgRadius', 'Radius setted'));
});
/*
$('#config-inputFlushRange').on('blur', function() {
	if (_chkEqual(commConfig.flushRange, $('#config-inputFlushRange').val())) return;
	if (!/^\d{1,3}$/.test($('#config-inputFlushRange').val().trim())) {
		_showMessage('warn', _getLocalesValue('langConfigWrnFlushRange', 'Illegal flush range'));
		$('#config-inputFlushRange').parent().addClass('alert-danger');
		$('#config-inputFlushRange').val(commConfig.flushRange);
		$('#config-inputFlushRange').focus();
		setTimeout(function() {
			$('#config-inputFlushRange').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.flushRange = _toInt($('#config-inputFlushRange').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgFlushRange', 'Flush range setted'));
});
*/
$('#config-inputMinNoise').on('blur', function() {
	if (_chkEqual(commConfig.noiseLimit.min, $('#config-inputMinNoise').val())) return;
	if (!/^\d{1,3}$/.test($('#config-inputMinNoise').val().trim()) ||
		parseInt($('#config-inputMinNoise').val().trim()) <= 0) {
		_showMessage('warn', _getLocalesValue('langConfigWrnMinNoise', 'Illegal min noise'));
		$('#config-inputMinNoise').parent().addClass('alert-danger');
		$('#config-inputMinNoise').val(commConfig.noiseLimit.min);
		$('#config-inputMinNoise').focus();
		setTimeout(function() {
			$('#config-inputMinNoise').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	var minData = _toInt($('#config-inputMinNoise').val());
	if (minData >= _toInt($('#config-inputMaxNoise').val())) {
		_showMessage('warn', _getLocalesValue('langConfigWrnMinNoiseLogical', 'Min noise is grater than max'));
		$('#config-inputMinNoise').parent().addClass('alert-danger');
		$('#config-inputMinNoise').val(commConfig.noiseLimit.min);
		$('#config-inputMinNoise').focus();
		setTimeout(function() {
			$('#config-inputMinNoise').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.noiseLimit.min = minData;
	_showMessage('ok', _getLocalesValue('langConfigMsgMinNoise', 'Min moise setted'));
});
$('#config-inputMaxNoise').on('blur', function() {
	if (_chkEqual(commConfig.noiseLimit.max, $('#config-inputMaxNoise').val())) return;
	if (!/^\d{1,5}$/.test($('#config-inputMaxNoise').val().trim()) ||
		parseInt($('#config-inputMaxNoise').val().trim()) <= 0) {
		_showMessage('warn', _getLocalesValue('langConfigWrnMaxNoise', 'Illegal max noise'));
		$('#config-inputMaxNoise').parent().addClass('alert-danger');
		$('#config-inputMaxNoise').val(commConfig.noiseLimit.max);
		$('#config-inputMaxNoise').focus();
		setTimeout(function() {
			$('#config-inputMaxNoise').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	var maxData = _toInt($('#config-inputMaxNoise').val());
	if (maxData <= _toInt($('#config-inputMinNoise').val())) {
		_showMessage('warn', _getLocalesValue('langConfigWrnMaxNoiseLogical', 'Max noise is less than min'));
		$('#config-inputMaxNoise').parent().addClass('alert-danger');
		$('#config-inputMaxNoise').val(commConfig.noiseLimit.max);
		$('#config-inputMaxNoise').focus();
		setTimeout(function() {
			$('#config-inputMaxNoise').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.noiseLimit.max = maxData;
	_showMessage('ok', _getLocalesValue('langConfigMsgMaxNoise', 'Max moise setted'));
});
$('#config-inputAutoCalibration').on('blur', function() {
	if (_chkEqual(commConfig.autoCalibration, $('#config-inputAutoCalibration').val())) return;
	if (!/^\d{1,3}$/.test($('#config-inputAutoCalibration').val().trim()) ||
		parseInt($('#config-inputAutoCalibration').val().trim()) < 5) {
		_showMessage('warn', _getLocalesValue('langConfigWrnCalibration', 'Illegal calibration frequency'));
		$('#config-inputAutoCalibration').parent().addClass('alert-danger');
		$('#config-inputAutoCalibration').val(commConfig.autoCalibration);
		$('#config-inputAutoCalibration').focus();
		setTimeout(function() {
			$('#config-inputAutoCalibration').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.autoCalibration = _toInt($('#config-inputAutoCalibration').val());
	if (_statData.autoCalibrationHandle) {
		clearInterval(_statData.autoCalibrationHandle);
		_statData.autoCalibrationHandle = setInterval(_autoCalibration, (commConfig.autoCalibration * 1000));
	}
	_showMessage('ok', _getLocalesValue('langConfigMsgAutoCalibration', 'Calibration Frequency setted'));
});
$('#config-inputDelayedSampling').on('blur', function() {
	if (_chkEqual(commConfig.delayedSampling, $('#config-inputDelayedSampling').val())) return;
	if (!/^\d{1,3}$/.test($('#config-inputDelayedSampling').val().trim()) ||
		parseInt($('#config-inputAutoCalibration').val().trim()) < 7) {
		_showMessage('warn', _getLocalesValue('langConfigWrnDelayedSampling', 'Illegal delayed sampling'));
		$('#config-inputDelayedSampling').parent().addClass('alert-danger');
		$('#config-inputDelayedSampling').val(commConfig.delayedSampling);
		$('#config-inputDelayedSampling').focus();
		setTimeout(function() {
			$('#config-inputDelayedSampling').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.delayedSampling = _toInt($('#config-inputDelayedSampling').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgDelayedSampling', 'Delayed Sampling setted'));
});