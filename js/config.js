'use strict';
$(document).ready(function() {
	callLocales(_statData.defaultLanguage);
	if (commConfig) {
		if (commConfig.hasOwnProperty('port')) $('#config_inputPort').val(commConfig.port);
		if (commConfig.hasOwnProperty('baudRange')) $('#config-inputBaudRate').val(commConfig.baudRange);
		if (commConfig.hasOwnProperty('radius')) $('#config-inputRadius').val(commConfig.radius);
		if (commConfig.hasOwnProperty('flushRange')) $('#config-inputFlushRange').val(commConfig.flushRange);

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
});

$('#config-selectPort').on('change', function() {
	commConfig.port = $('#config-selectPort').val().trim();
	resetSerialPort();
	_showMessage('ok', _getLocalesValue('langConfigMsgPortSetted', 'Serial port setted'));
});

$('#config-selectProduction').on('change', function() {
	switch ($('#config-selectProduction').prop('selectedIndex')) {
		case 1:
			commConfig.productionSize.width = 32;
			commConfig.productionSize.height = 80;
			if (commConfig.radius === 40) {
				commConfig.radius = 10;
				$('#config-inputRadius').val(10);
			}
			$('#config-labProductionDesc').html(commConfig.productionSize.width + '*' + commConfig.productionSize.height);
			break;
		default:
			commConfig.productionSize.width = 16;
			commConfig.productionSize.height = 16;
			if (commConfig.radius === 10) {
				commConfig.radius = 40;
				$('#config-inputRadius').val(40);
			}
			$('#config-labProductionDesc').html(commConfig.productionSize.width + '*' + commConfig.productionSize.height);
			break;
	}
	innerData = initInnerData(false);
	_showMessage('ok', _getLocalesValue('langConfigMsgProductionSetted', 'Production changed'));
});

$('#config-aAdvanceCfg').on('click', function() {
	if ($('#config-advanceConfigFrame').is(':hidden')) $('#config-advanceConfigFrame').fadeIn(888);
	else $('#config-advanceConfigFrame').fadeOut(888);
});
$('#config-inputBaudRate').on('blur', function() {
	if (_chkEqual(commConfig.baudRange, $('#config-inputBaudRate').val())) return;
	if (!/^\d{1,8}$/.test($('#config-inputBaudRate').val().trim())) {
		_showMessage('warn', _getLocalesValue('langConfigWrnBaudRate', 'Illegal baud rate'));
		$('#config-inputBaudRate').parent().addClass('alert-danger');
		$('#config-inputBaudRate').val(commConfig.baudRange);
		$('#config-inputBaudRate').focus();
		setTimeout(function() {
			$('#config-inputBaudRate').parent().removeClass('alert-danger');
		}, 666);
		return;
	}
	commConfig.baudRange = _toInt($('#config-inputBaudRate').val());
	resetSerialPort();
	_showMessage('ok', _getLocalesValue('langConfigMsgBaudRate', 'Baud range setted'));
});
$('#config-inputRadius').on('blur', function() {
	if (_chkEqual(commConfig.radius, $('#config-inputRadius').val())) return;
	if (!/^\d{1,3}$/.test($('#config-inputRadius').val().trim())) {
		_showMessage('warn', _getLocalesValue('langConfigWrnRadius', 'Illegal radius'));
		$('#config-inputRadius').parent().addClass('alert-danger');
		$('#config-inputRadius').val(commConfig.radius);
		$('#config-inputRadius').focus();
		setTimeout(function() {
			$('#config-inputRadius').parent().removeClass('alert-danger');
		}, 666);
		return;
	}
	commConfig.radius = _toInt($('#config-inputRadius').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgRadius', 'Radius setted'));
});
$('#config-inputFlushRange').on('blur', function() {
	if (_chkEqual(commConfig.flushRange, $('#config-inputFlushRange').val())) return;
	if (!/^\d{1,3}$/.test($('#config-inputFlushRange').val().trim())) {
		_showMessage('warn', _getLocalesValue('langConfigWrnFlushRange', 'Illegal flush range'));
		$('#config-inputFlushRange').parent().addClass('alert-danger');
		$('#config-inputFlushRange').val(commConfig.flushRange);
		$('#config-inputFlushRange').focus();
		setTimeout(function() {
			$('#config-inputFlushRange').parent().removeClass('alert-danger');
		}, 666);
		return;
	}
	commConfig.flushRange = _toInt($('#config-inputFlushRange').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgFlushRange', 'Flush range setted'));
});
$('#config-inputMinNoise').on('blur', function() {
	if (_chkEqual(commConfig.noiseLimit.min, $('#config-inputMinNoise').val())) return;
	if (!/^\d{1,3}$/.test($('#config-inputMinNoise').val().trim())) {
		_showMessage('warn', _getLocalesValue('langConfigWrnMinNoise', 'Illegal min noise'));
		$('#config-inputMinNoise').parent().addClass('alert-danger');
		$('#config-inputMinNoise').val(commConfig.noiseLimit.min);
		$('#config-inputMinNoise').focus();
		setTimeout(function() {
			$('#config-inputMinNoise').parent().removeClass('alert-danger');
		}, 666);
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
		}, 666);
		return;
	}
	commConfig.noiseLimit.min = minData;
	_showMessage('ok', _getLocalesValue('langConfigMsgMinNoise', 'Min moise setted'));
});
$('#config-inputMaxNoise').on('blur', function() {
	if (_chkEqual(commConfig.noiseLimit.max, $('#config-inputMaxNoise').val())) return;
	if (!/^\d{1,5}$/.test($('#config-inputMaxNoise').val().trim())) {
		_showMessage('warn', _getLocalesValue('langConfigWrnMaxNoise', 'Illegal max noise'));
		$('#config-inputMaxNoise').parent().addClass('alert-danger');
		$('#config-inputMaxNoise').val(commConfig.noiseLimit.max);
		$('#config-inputMaxNoise').focus();
		setTimeout(function() {
			$('#config-inputMaxNoise').parent().removeClass('alert-danger');
		}, 666);
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
		}, 666);
		return;
	}
	commConfig.noiseLimit.max = maxData;
	_showMessage('ok', _getLocalesValue('langConfigMsgMaxNoise', 'Max moise setted'));
});