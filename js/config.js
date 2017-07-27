'use strict';
$(document).ready(function() {
	callLocales(_statData.defaultLanguage);
	whoAmI(_statData.envHost);
	if (commConfig) {
		if (commConfig.hasOwnProperty('port')) $('#config_inputPort').val(commConfig.port);
		if (commConfig.hasOwnProperty('alertFreque')) $('#config-inputAlertFreque').val(commConfig.alertFreque);
		if (commConfig.hasOwnProperty('alertTime')) $('#config-inputAlertTime').val(commConfig.alertTime);
		if (commConfig.hasOwnProperty('baudRange')) $('#config-inputBaudRate').val(commConfig.baudRange);
		if (commConfig.hasOwnProperty('showMultiple')) $('#config-inputMultiple').val(commConfig.showMultiple);
		if (commConfig.hasOwnProperty('radius')) $('#config-inputRadius').val(commConfig.radius);
		if (commConfig.hasOwnProperty('islandPoint')) $('#config-inputIslandPoint').val(commConfig.islandPoint);
		if (commConfig.hasOwnProperty('autoCalibration')) $('#config-inputAutoCalibration').val(commConfig.autoCalibration);
		if (commConfig.hasOwnProperty('delayedSampling')) $('#config-inputDelayedSampling').val(commConfig.delayedSampling);

		if (commConfig.hasOwnProperty('filterTimes')) $('#config-inputFilterTimes').val(commConfig.filterTimes);
		if (commConfig.hasOwnProperty('sobelThreshold')) $('#config-inputSobelThreshold').val(commConfig.sobelThreshold);
		if (commConfig.hasOwnProperty('leaveJudge')) $('#config-inputLeaveJudge').val(commConfig.leaveJudge);
		if (commConfig.hasOwnProperty('turnJudge')) $('#config-inputTurnJudge').val(commConfig.turnJudge);

		if (commConfig.hasOwnProperty('skeletonLimit')) $('#config-inputSkeletonLimit').val(commConfig.skeletonLimit);

		if (commConfig.hasOwnProperty('noiseLimit') && commConfig.noiseLimit.hasOwnProperty('min'))
			$('#config-inputMinNoise').val(commConfig.noiseLimit.min);
		if (commConfig.hasOwnProperty('noiseLimit') && commConfig.noiseLimit.hasOwnProperty('max'))
			$('#config-inputMaxNoise').val(commConfig.noiseLimit.max);

		if (commConfig.hasOwnProperty('productionSize')) {
			switch (commConfig.productionSize.width) {
				case 32:
					$('#config-selectProduction').get(0).selectedIndex = 1;
					_productCombination('v32');
					break;
				case 16:
				default:
					$('#config-selectProduction').get(0).selectedIndex = 0;
					_productCombination('v16');
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
			_productCombination('v32');
			$('#config-labProductionDesc').html(commConfig.productionSize.width + '*' + commConfig.productionSize.height);
			break;
		default:
			commConfig.productionSize.width = 16;
			commConfig.productionSize.height = 16;
			//if (commConfig.radius === 10) {
			//	commConfig.radius = 40;
			//	$('#config-inputRadius').val(40);
			//}
			_productCombination('v16');
			$('#config-labProductionDesc').html(commConfig.productionSize.width + '*' + commConfig.productionSize.height);
			break;
	}
	commConfig.showMultiple = _getDefaultMultiples(commConfig.productionSize.width + '-' + commConfig.productionSize.height);
	$('#config-inputRadius').val(commConfig.radius);
	$('#config-inputMultiple').val(commConfig.showMultiple);
	innerData = initInnerData();
	if (window.MyApp) {
		try {
			window.MyApp.postComConfig(JSON.stringify(commConfig));
		} catch (e) {}
	}
	_showMessage('ok', _getLocalesValue('langConfigMsgProductionSetted', 'Production changed'));
});
$('#config-selectProductionFirmware').on('change', function() {
	var myVer = $('#config-selectProductionFirmware').val();
	if (myVer === '0') commConfig.firmware = myVer;
	else commConfig.firmware = _commonConstant.firmwares['v' + commConfig.productionSize.width][myVer];
	commConfig.firmwareVersion = 'v' + commConfig.productionSize.width + '#' + myVer;
	_showMessage('ok', _getLocalesValue('langConfigMsgFirmwareSetted', 'Production firmware setted'));
});
$('#config-inputMultiple').on('blur', function() {
	if (_chkEqual(commConfig.showMultiple, $('#config-inputMultiple').val())) return;
	if (!/^([1-9]+(\.[0-9]{2})?|0\.[1-9][0-9]|0\.0[1-9])$/.test($('#config-inputMultiple').val().trim()) ||
		parseFloat($('#config-inputMultiple').val().trim()) > 9) {
		_showMessage('warn', _getLocalesValue('langConfigWrnShowMultiple', 'Illegal heat map multiple'));
		$('#config-inputMultiple').parent().addClass('alert-danger');
		$('#config-inputMultiple').val(commConfig.showMultiple);
		$('#config-inputMultiple').focus();
		setTimeout(function() {
			$('#config-inputMultiple').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.showMultiple = _toFloat($('#config-inputMultiple').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgShowMultiple', 'Heat Map Multiple setted'));
});
$('#config-inputMultiple').on('keydown', _setEnterCommit);
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
$('#config-inputAlertFreque').on('keydown', _setEnterCommit);
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
$('#config-inputAlertTime').on('keydown', _setEnterCommit);

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
$('#config-inputBaudRate').on('keydown', _setEnterCommit);
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
$('#config-inputRadius').on('keydown', _setEnterCommit);
$('#config-inputIslandPoint').on('blur', function() {
	if (_chkEqual(commConfig.islandPoint, $('#config-inputIslandPoint').val())) return;
	if (!/^\d{1}$/.test($('#config-inputIslandPoint').val().trim()) ||
		parseInt($('#config-inputIslandPoint').val().trim()) > 3) {
		_showMessage('warn', _getLocalesValue('langConfigWrnIslandPoint', 'Illegal island point'));
		$('#config-inputIslandPoint').parent().addClass('alert-danger');
		$('#config-inputIslandPoint').val(commConfig.islandPoint);
		$('#config-inputIslandPoint').focus();
		setTimeout(function() {
			$('#config-inputIslandPoint').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.islandPoint = _toInt($('#config-inputIslandPoint').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgIslandPoint', 'Island point setted'));
});
$('#config-inputIslandPoint').on('keydown', _setEnterCommit);
$('#config-inputMinNoise').on('blur', function() {
	if (_chkEqual(commConfig.noiseLimit.min, $('#config-inputMinNoise').val())) return;
	if (!/^\d{1,2}$/.test($('#config-inputMinNoise').val().trim()) ||
		parseInt($('#config-inputMinNoise').val().trim()) < 0) {
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
$('#config-inputMinNoise').on('keydown', _setEnterCommit);
$('#config-inputMaxNoise').on('blur', function() {
	if (_chkEqual(commConfig.noiseLimit.max, $('#config-inputMaxNoise').val())) return;
	if (!/^\d{1,3}$/.test($('#config-inputMaxNoise').val().trim()) ||
		parseInt($('#config-inputMaxNoise').val().trim()) <= 0 ||
		parseInt($('#config-inputMaxNoise').val().trim()) > 100) {
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
$('#config-inputMaxNoise').on('keydown', _setEnterCommit);
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
$('#config-inputAutoCalibration').on('keydown', _setEnterCommit);
$('#config-inputDelayedSampling').on('blur', function() {
	if (_chkEqual(commConfig.delayedSampling, $('#config-inputDelayedSampling').val())) return;
	if (!/^\d{1,3}$/.test($('#config-inputDelayedSampling').val().trim()) ||
		parseInt($('#config-inputDelayedSampling').val().trim()) < 7) {
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
$('#config-inputDelayedSampling').on('keydown', _setEnterCommit);
$('#config-inputFilterTimes').on('blur', function() {
	if (_chkEqual(commConfig.filterTimes, $('#config-inputFilterTimes').val())) return;
	if (!/^\d{1,2}$/.test($('#config-inputFilterTimes').val().trim()) ||
		parseInt($('#config-inputFilterTimes').val().trim()) < 0) {
		_showMessage('warn', _getLocalesValue('langConfigWrnFilterTimes', 'Illegal filter times'));
		$('#config-inputFilterTimes').parent().addClass('alert-danger');
		$('#config-inputFilterTimes').val(commConfig.filterTimes);
		$('#config-inputFilterTimes').focus();
		setTimeout(function() {
			$('#config-inputFilterTimes').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.filterTimes = _toInt($('#config-inputFilterTimes').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgFilterTimes', 'Filter Times setted'));
});
$('#config-inputFilterTimes').on('keydown', _setEnterCommit);
$('#config-inputSobelThreshold').on('blur', function() {
	if (_chkEqual(commConfig.sobelThreshold, $('#config-inputSobelThreshold').val())) return;
	if (!/^\d{1,2}$/.test($('#config-inputSobelThreshold').val().trim()) ||
		parseInt($('#config-inputSobelThreshold').val().trim()) < 1) {
		_showMessage('warn', _getLocalesValue('langConfigWrnSobelThreshold', 'Illegal sobel threshold'));
		$('#config-inputSobelThreshold').parent().addClass('alert-danger');
		$('#config-inputSobelThreshold').val(commConfig.sobelThreshold);
		$('#config-inputSobelThreshold').focus();
		setTimeout(function() {
			$('#config-inputSobelThreshold').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.sobelThreshold = _toInt($('#config-inputSobelThreshold').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgSobelThreshold', 'Sobel Threshold setted'));
});
$('#config-inputSobelThreshold').on('keydown', _setEnterCommit);
$('#config-inputLeaveJudge').on('blur', function() {
	if (_chkEqual(commConfig.leaveJudge, $('#config-inputLeaveJudge').val())) return;
	if (!/^\d{1,2}$/.test($('#config-inputLeaveJudge').val().trim()) ||
		parseInt($('#config-inputLeaveJudge').val().trim()) < 1) {
		_showMessage('warn', _getLocalesValue('langConfigWrnLeaveJudge', 'Illegal leave judge'));
		$('#config-inputLeaveJudge').parent().addClass('alert-danger');
		$('#config-inputLeaveJudge').val(commConfig.leaveJudge);
		$('#config-inputLeaveJudge').focus();
		setTimeout(function() {
			$('#config-inputLeaveJudge').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.leaveJudge = _toInt($('#config-inputLeaveJudge').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgLeaveJudge', 'Leave Judge setted'));
});
$('#config-inputLeaveJudge').on('keydown', _setEnterCommit);
$('#config-inputTurnJudge').on('blur', function() {
	if (_chkEqual(commConfig.turnJudge, $('#config-inputTurnJudge').val())) return;
	if (!/^\d{1,2}$/.test($('#config-inputTurnJudge').val().trim()) ||
		parseInt($('#config-inputTurnJudge').val().trim()) < 1) {
		_showMessage('warn', _getLocalesValue('langConfigWrnTurnJudge', 'Illegal turn judge'));
		$('#config-inputTurnJudge').parent().addClass('alert-danger');
		$('#config-inputTurnJudge').val(commConfig.turnJudge);
		$('#config-inputTurnJudge').focus();
		setTimeout(function() {
			$('#config-inputTurnJudge').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.turnJudge = _toInt($('#config-inputTurnJudge').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgTurnJudge', 'Turn Judge setted'));
});
$('#config-inputTurnJudge').on('keydown', _setEnterCommit);
$('#config-inputSkeletonLimit').on('blur', function() {
	if (_chkEqual(commConfig.skeletonLimit, $('#config-inputSkeletonLimit').val())) return;
	if (!/^\d{1,5}$/.test($('#config-inputSkeletonLimit').val().trim()) ||
		parseInt($('#config-inputSkeletonLimit').val().trim()) < 0) {
		_showMessage('warn', _getLocalesValue('langConfigWrnSkeletonLimit', 'Illegal skeleton limit'));
		$('#config-inputSkeletonLimit').parent().addClass('alert-danger');
		$('#config-inputSkeletonLimit').val(commConfig.skeletonLimit);
		$('#config-inputSkeletonLimit').focus();
		setTimeout(function() {
			$('#config-inputSkeletonLimit').parent().removeClass('alert-danger');
		}, 888);
		return;
	}
	commConfig.skeletonLimit = _toInt($('#config-inputSkeletonLimit').val());
	_showMessage('ok', _getLocalesValue('langConfigMsgSkeletonLimit', 'Skeleton Limit setted'));
});
$('#config-inputSkeletonLimit').on('keydown', _setEnterCommit);