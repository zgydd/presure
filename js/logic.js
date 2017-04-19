'use strict';
//worker call back
var _bufferDataWorkerCallback_ = function(event) {
	//alert(event.data);
	//return;
	innerData = JSON.parse(event.data);
	setHeatMap(innerData);
};
var _resetMainHeight = function() {
	var height = $(window).height() - ($('footer').outerHeight() * 2.7) - $('nav').outerHeight();
	if ($('#countdown') && $('#countdown').length &&
		$('#countdown').children() && $('#countdown').children().length &&
		!$('#countdown').is(':hidden')) height -= $('#countdown').outerHeight();
	if (!height) height = 0;
	$('main').height(height);
};
var _autoCalibration = function() {
	if (!_statData.portOpened) return;
	if (!innerData || !innerData.length || !innerData[0].length) return;
	if (!_statData.calibrationData.length ||
		_statData.calibrationData.length !== commConfig.productionSize.height ||
		_statData.calibrationData[0].length !== commConfig.productionSize.width) {
		_getCalibrationData();
		return;
	}
	var variance = 0;
	var cntData = commConfig.productionSize.width * commConfig.productionSize.height;
	var baseDataList = [];
	var innerDataList = [];
	for (var i = 0; i < _statData.calibrationData.length; i++) {
		for (var j = 0; j < _statData.calibrationData[i].length; j++) {
			variance += Math.pow((innerData[i][j] - _statData.calibrationData[i][j]), 2);
			if (Math.abs(innerData[i][j] - _statData.calibrationData[i][j]) != 0) {
				baseDataList.push(_statData.calibrationData[i][j]);
				innerDataList.push(innerData[i][j]);
			}
		}
	}
	var avgCalibration = eval(baseDataList.join('+')) / cntData;
	var avgInner = eval(innerDataList.join('+')) / cntData;
	if (Math.floor(avgInner) < Math.ceil(avgCalibration)) {
		_getCalibrationData();
		return;
	}
	variance = variance / cntData;
	if (variance < 350) _getCalibrationData();
	//alert('variance=' + variance + ' : avgCalibration=' + avgCalibration + ' : avgInner=' + avgInner);
	/*
	if (_statData.maxPresureList.length < commConfig.productionSize.width * commConfig.productionSize.height) return;
	var max = 0;

	max = _statData.maxPresureList[_statData.maxPresureList.length - 1];
	var aHasValue = [];
	for (var i = 0; i < _statData.maxPresureList.length; i++) {
	    max = Math.max(max, _statData.maxPresureList[i]);
	    if (_statData.maxPresureList[i] === 0) continue;
	    aHasValue.push(_statData.maxPresureList[i]);
	}

	aHasValue = aHasValue.sort().slice(Math.floor(aHasValue.length / 4), Math.floor(aHasValue.length * 3 / 4));

	var avg = eval(aHasValue.join('+')) / aHasValue.length;

	if (commConfig.noiseLimit.min < 10) {
	    commConfig.noiseLimit.min = max + 10;
	    _statData.preAvgPresure = avg;
	    if (heatmapInstance) heatmapInstance.repaint();
	} else {
	    if (avg <= Math.ceil(_statData.preAvgPresure * 1.2) && avg >= Math.floor(_statData.preAvgPresure * 0.8)) {
	        commConfig.noiseLimit.min = max + 10;
	        _statData.preAvgPresure = avg;
	        if (heatmapInstance) heatmapInstance.repaint();
	    }
	}
	_statData.maxPresureList.length = 0;
	//alert(commConfig.noiseLimit.min);
	*/
};
var _countDownCallBack = function(hours, minutes, seconds, cd) {
	//console.log(hours + ':' + minutes + ':' + seconds);
	if (cd <= 60) {
		$('#countdown').removeClass('alert-success');
		$('#countdown').addClass('alert-danger');
	} else {
		$('#countdown').removeClass('alert-danger');
		$('#countdown').addClass('alert-success');
	}
	if (cd === 0) {
		_setCountDownZero();
		return;
	}
	_recalcScale(cd);
};
var _recalcScale = function(cd) {
	if (serialport && !serialport.isOpen()) {
		try {
			serialport.open(function(error) {
				if (!error) {
					_statData.portOpened = true;
					serialport.on('data', function(data) {
						getDataFromBuffer(data);
					});
				}
			});
			$('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnClosePort', 'Deconnection'));
		} catch (e) {}
	}
	//_statData.realMax = 600;
	//if (cd % 10 !== 0) return;
	//##########Algorithms about times and presure################
	if (!_statData || !_statData.constantScale || !_statData.scaleData ||
		!_statData.scaleData.presureRange || !_statData.scaleData.presureRange.ranges ||
		!_statData.scaleData.presureRange.ranges.length || !_statData.scaleData.threshold ||
		!_statData.scaleData.threshold.length ||
		!innerData || !innerData.length || !innerData[0].length ||
		!_statData.calibrationData || !_statData.calibrationData.length ||
		!_statData.calibrationData[0].length || innerData.length !== _statData.calibrationData.length ||
		innerData[0].length !== _statData.calibrationData[0].length) return;
	var newScale = _statData.constantScale;

	var cntHasValue = 0;
	var sumDeviation = 0;
	for (var i = 0; i < innerData.length; i++) {
		for (var j = 0; j < innerData[i].length; j++) {
			if (innerData[i][j] === 0 || innerData[i][j] < _statData.calibrationData[i][j]) continue;
			sumDeviation += Math.abs(innerData[i][j] - _statData.calibrationData[i][j]);
			cntHasValue++;
		}
	}

	var idxPresureRange = 0;
	for (idxPresureRange = 0; idxPresureRange < _statData.scaleData.presureRange.ranges.length; idxPresureRange++) {
		if (Math.ceil(sumDeviation / cntHasValue) > _statData.scaleData.presureRange.ranges[idxPresureRange].critical) {
			newScale += _statData.scaleData.presureRange.ranges[idxPresureRange].scale;
			break;
		}
	}
	if (idxPresureRange >= _statData.scaleData.presureRange.ranges.length)
		newScale += _statData.scaleData.presureRange.ranges[_statData.scaleData.presureRange.ranges.length - 1].scale;
	var newCountDownRange = 0;
	for (var i = 0; i < _statData.scaleData.threshold.length; i++) {
		if (_statData.scaleData.threshold[i].min <= newScale && _statData.scaleData.threshold[i].max >= newScale) {
			newCountDownRange = _statData.scaleData.threshold[i].rangeTime;
			break;
		}
	}

	//-----------delay recalc
	if (_statData.delayScaleList.length < 31) {
		_statData.delayScaleList.push(newCountDownRange);
		return;
	}
	_statData.delayScaleList.sort();

	var tmpIdx = [];
	for (var i = 0; i < _statData.delayScaleList.length - 1; i++) {
		if (_statData.delayScaleList[i] !== _statData.delayScaleList[i + 1]) {
			if (!tmpIdx.length) tmpIdx.push({
				cnt: i + 1,
				value: _statData.delayScaleList[i]
			});
			else tmpIdx.push({
				cnt: i + 1 - tmpIdx[tmpIdx.length - 1].cnt,
				value: _statData.delayScaleList[i]
			});
		}
	}
	if (!tmpIdx.length) tmpIdx.push({
		cnt: _statData.delayScaleList.length,
		value: _statData.delayScaleList[_statData.delayScaleList.length - 1]
	});
	else tmpIdx.push({
		cnt: _statData.delayScaleList.length - tmpIdx[tmpIdx.length - 1],
		value: _statData.delayScaleList[_statData.delayScaleList.length - 1]
	});
	if (tmpIdx.length <= 1) newCountDownRange = _statData.delayScaleList[0];
	else {
		var max = 0;
		var maxRange = 0;
		for (var i = 0; i < tmpIdx.length; i++) {
			if (tmpIdx[i].cnt > max) {
				maxRange = tmpIdx[i].value;
				max = tmpIdx[i].cnt;
			}
		}
		if (maxRange !== 0) newCountDownRange = maxRange;
	}
	_statData.delayScaleList.length = 0;
	//----------------------

	if (newCountDownRange === 0) {
		_setCountDownZero();
		return;
	}
	if ((newCountDownRange * 60) === _statData.preCountDownRange) return;
	$('#countdown').stop();
	var tmpDist = (_statData.restDistance - ((_statData.preCountDown - cd) / (_statData.preCountDownRange * 60)));
	var newTime = parseInt(tmpDist * newCountDownRange * 60);
	if (newTime <= 0) {
		_setCountDownZero();
		return;
	}
	$('#countdown').reset(newTime);
	_statData.restDistance = tmpDist;
	_statData.preCountDown = newTime;
	_statData.preCountDownRange = newCountDownRange * 60;
};

var _setCountDownZero = function() {
	$('#countdown').setFinished();
	var num = _statData.constantScale;
	if (_statData.scaleData.presureRange && _statData.scaleData.presureRange.ranges && _statData.scaleData.presureRange.ranges.length) {
		var max = 0;
		for (var i = 0; i < _statData.scaleData.presureRange.ranges.length; i++) {
			if (!_statData.scaleData.presureRange.ranges[i].scale || isNaN(parseInt(_statData.scaleData.presureRange.ranges[i].scale)))
				continue;
			max = Math.max(max, _statData.scaleData.presureRange.ranges[i].scale);
		}
		num += max;
	}
	if (!_statData.scaleData.threshold || !_statData.scaleData.threshold.length) return;
	var rangeTime = 0;
	for (var i = 0; i < _statData.scaleData.threshold.length; i++) {
		if (_statData.scaleData.threshold[i].min <= num && _statData.scaleData.threshold[i].max >= num) {
			rangeTime = _statData.scaleData.threshold[i].rangeTime;
			break;
		}
	}
	if (rangeTime > 0) _statData.countDownTime = rangeTime * 60;
	else _statData.countDownTime = 0;
	_statData.preCountDown = _statData.preCountDownRange = _statData.countDownTime;
	_statData.restDistance = 1;
	_callAlert();
};
var _doAlert = function() {
	var audio = document.getElementById('main-audio-alert');
	audio.play();
	setTimeout(function() {
		audio.pause();
	}, 3000);
	$('#alert-log-container').prepend('<div class="item-group alert-record"><label>' + (new Date()).Format("yyyy-MM-dd hh:mm:ss") + '</label><br /><span z-lang="langMainMsgCountDownFinished">' + _getLocalesValue('langMainMsgCountDownFinished', 'Move') + '</span></div>');
	_statData.alertHandle = setTimeout(_doAlert, 120000);
};
var _parseScaleStream = function(stream) {
	var tmpFile = stream.toString().replace('\r', '').split('\n');
	var formatedData = {};
	formatedData.descriptionItem = [];
	formatedData.threshold = [];
	formatedData.constantScales = [];
	for (var i = 0; i < tmpFile.length; i++) {
		var record = {};
		var tmpData = tmpFile[i].substring(1).split(':');
		switch (true) {
			case (tmpFile[i].indexOf('#') === 0):
				formatedData.title = tmpData[0];
				break;
			case (tmpFile[i].indexOf('*') === 0):
				if (tmpData.length !== 2) break;
				record.title = tmpData[0];
				record.items = [];
				tmpData = tmpData[1].split(',');
				for (var j = 0; j < tmpData.length; j++) {
					var tmp = tmpData[j].split('-');
					if (tmp.length !== 2) continue;
					record.items.push({
						description: tmp[0],
						value: tmp[1]
					});
				}
				formatedData.descriptionItem.push(record);
				break;
			case (tmpFile[i].indexOf('!') === 0):
				if (tmpData.length !== 2) break;
				var range = tmpData[0].split('~');
				var items = tmpData[1].split('-');
				if (range.length !== 2 || items.length !== 2) break;
				record.min = parseInt(range[0]);
				record.max = parseInt(range[1]);
				if (isNaN(record.min) || isNaN(record.max) || record.max < record.min) break;
				record.description = items[0];
				record.rangeTime = parseInt(items[1]);
				if (isNaN(record.rangeTime)) break;
				formatedData.threshold.push(record);
				break;
			case (tmpFile[i].indexOf('@') === 0):
				if (tmpData.length !== 2) break;
				record.description = tmpData[0];
				/*
				tmpData = tmpData[1].split(',');
				record.ranges = [];
				for (var j = 0; j < tmpData.length; j++) {
					var tmp = tmpData[j].split('-');
					if (tmp.length !== 2) continue;
					var tmp2 = {
						critical: parseInt(tmp[0]),
						scale: parseInt(tmp[1])
					};
					if (isNaN(tmp2.critical) || isNaN(tmp2.scale)) break;
					record.ranges.push(tmp2);
				}
				record.ranges.sort(function(a, b) {
					if (!a.critical || !b.critical) return -1;
					return (b.critical - a.critical);
				});
				*/
				record.ranges = [];
				var tmpLength = isNaN(parseInt(tmpData[1].trim())) ? 4 : parseInt(tmpData[1].trim());
				for (var j = tmpLength - 1; j >= 0; j--) {
					record.ranges.push({
						scale: j + 1,
						critical: Math.floor((j + 1) / (tmpLength + 1) * 1023)
					});
				}
				formatedData.presureRange = record;
				break;
			case (tmpFile[i].indexOf('$') === 0):
				if (tmpData.length !== 2) break;
				if (isNaN(parseInt(tmpData[1]))) break;
				formatedData.constantScales.push({
					item: tmpData[0],
					scale: parseInt(tmpData[1])
				});
				break;
			default:
				break;
		}
	}
	return formatedData;
};
var _calcScale = function() {
	if (!_statData.scaleData) {
		$('#scales-control-count').html('--');
		$('#scales-control-time').html('---');
		return;
	}
	if (!_statData.scaleData.constantScales || !_statData.scaleData.constantScales.length) {
		$('#scales-control-count').html('--');
		return;
	}
	var num = 0;
	for (var i = 0; i < _statData.scaleData.constantScales.length; i++) {
		num += _statData.scaleData.constantScales[i].scale;
	}
	_statData.constantScale = num;
	if (_statData.scaleData.presureRange && _statData.scaleData.presureRange.ranges && _statData.scaleData.presureRange.ranges.length) {
		var max = 0;
		for (var i = 0; i < _statData.scaleData.presureRange.ranges.length; i++) {
			if (!_statData.scaleData.presureRange.ranges[i].scale || isNaN(parseInt(_statData.scaleData.presureRange.ranges[i].scale)))
				continue;
			max = Math.max(max, _statData.scaleData.presureRange.ranges[i].scale);
		}
		num += max;
	}
	$('#scales-control-count').html(num);
	if (!_statData.scaleData.threshold || !_statData.scaleData.threshold.length) {
		$('#scales-control-time').html('---');
		return;
	}
	var rangeTime = 0;
	for (var i = 0; i < _statData.scaleData.threshold.length; i++) {
		if (_statData.scaleData.threshold[i].min <= num && _statData.scaleData.threshold[i].max >= num) {
			rangeTime = _statData.scaleData.threshold[i].rangeTime;
			break;
		}
	}
	if (rangeTime > 0) {
		$('#scales-control-time').html(rangeTime);
		_statData.countDownTime = rangeTime * 60;
	} else {
		$('#scales-control-time').html('---');
		_statData.countDownTime = 0;
	}
};
var _getActivedScale = function(scaleName) {
	try {
		var scale = _readFile(_commonConstant.path + scaleName.trim().toLowerCase() + _commonConstant.scale, 'utf8', 'txt');
		if (!scale) {
			_statData.scaleData = _parseScaleStream('#Braden Scale Table\n' +
				'*Sensory:Completely Limited-1,Very Limited-2,Slight Limited-3,No Impairment-4\n' +
				'*Moisture:Constantly Moist-1,Very Moist-2,Occasionally Moist-3,Rarely Moist-4\n' +
				'*Activity:Bedfast-1,Chairfast-2,Walks Occasionally-3,Walks Frequently-4\n' +
				'*Mobility:Completely Immobile-1,Very Limited-2,Slightly Limited-3,No Limitation-4\n' +
				'*Nutrition:Very Poor-1,Probaly Inadequate-2,Adequate-3,Excellent-4\n' +
				'!06~12:High risk-30\n' +
				'!13~14:Moderate risk-60\n' +
				'!15~18:Low risk-120\n' +
				'!19~24:No risk-180\n' +
				'@Presure Subparagraph:4\n' +
				'$Sensory:4\n' +
				'$Moisture:4\n' +
				'$Activity:4\n' +
				'$Mobility:4\n' +
				'$Nutrition:4');
		} else {
			_statData.scaleData = _parseScaleStream(scale);
		}
	} catch (e) {
		alert(e);
	}
};
var _traverseLocales = function(childElements) {
	childElements.each(function(i, n) {
		var ele = $(n);
		var attr = ele.attr('z-lang');
		if (attr && _statData.langData.hasOwnProperty(attr)) {
			ele.html(_statData.langData[attr]);
			return;
		}
		if (ele.children().length) {
			_traverseLocales(ele.children());
		}
	});
};
var _getLocalesValue = function(node, defaultValue) {
	if (_statData && _statData.langData && _statData.langData.hasOwnProperty(node))
		return _statData.langData[node];
	return defaultValue;
};
var _fixRadius = function() {
	//var canvas = document.getElementById('heatmap-canvasAbs');
	//if (!canvas) return;
	if (_statData.activedPage !== 'heatmap') return;
	var w = $(window).get(0).innerWidth - 120;
	var h = $(window).get(0).innerHeight - 120;
	commConfig.radius = Math.floor((w > h ? h : w) * (commConfig.productionSize.width === 16 ? 4 : 2.5) / 100);

	if (commConfig.productionSize.width === 16) $('#heatmap-content').css('margin-left', 'auto').css('margin-right', 'auto');
	else $('#heatmap-content').css('margin-left', '0.1em');

	var radius = (commConfig && commConfig.radius) ? commConfig.radius : 40;
	var width = innerData.length * radius + radius;
	var height = innerData[0].length * radius + radius;

	//canvas.width = width;
	//canvas.height = height;

	$('.heatmap').width(width);
	$('.heatmap').height(height);
	$('.heatmap').empty();
	resetHeatmap();
};
var _getCalibrationData = function() {
	_statData.calibrationData.length = 0;
	for (var i = 0; i < innerData.length; i++) {
		var record = [];
		for (var j = 0; j < innerData[i].length; j++) {
			record.push(innerData[i][j]);
		}
		_statData.calibrationData.push(record);
	}
};
//event
var _changeScaleEvent = function() {
	var iSelected = parseInt($(this).children('option:selected').val());
	if (isNaN(iSelected)) return;
	$(this).parent().children('span').html(iSelected);
	for (var i = 0; i < _statData.scaleData.constantScales.length; i++) {
		if (_statData.scaleData.constantScales[i].item === $(this).parent().children('label').get(0).innerText) {
			_statData.scaleData.constantScales[i].scale = iSelected;
			break;
		}
	}
	_calcScale();
};
//DOM
var _createScaleDOM = function() {
	_calcScale();
	_clearSubDomEvent($('#scale-content-main'), 'change', _changeScaleEvent);
	$('#scale-content-main').empty();
	var itemDom = null;
	var tmpDom = null;
	var frag = document.createDocumentFragment();

	for (var i = 0; i < _statData.scaleData.descriptionItem.length; i++) {
		itemDom = document.createElement('div');
		itemDom.className = "item-group";
		tmpDom = document.createElement('label');
		tmpDom.innerText = _statData.scaleData.descriptionItem[i].title;
		itemDom.appendChild(tmpDom);
		var selectedRecord = null;
		for (var k = 0; k < _statData.scaleData.constantScales.length; k++) {
			if (_statData.scaleData.constantScales[k].item === _statData.scaleData.descriptionItem[i].title) {
				selectedRecord = _statData.scaleData.constantScales[k];
				break;
			}
		}
		tmpDom = document.createElement('select');
		tmpDom.className = "form-control";
		for (var j = 0; j < _statData.scaleData.descriptionItem[i].items.length; j++) {
			var tmp = document.createElement('option');
			tmp.setAttribute('value', _statData.scaleData.descriptionItem[i].items[j].value);
			if (selectedRecord && selectedRecord.scale == _statData.scaleData.descriptionItem[i].items[j].value)
				tmp.setAttribute('selected', 'selected');
			tmp.appendChild(document.createTextNode(_statData.scaleData.descriptionItem[i].items[j].description));
			tmpDom.appendChild(tmp);
		}
		$(tmpDom).on('change', _changeScaleEvent);
		itemDom.appendChild(tmpDom);
		tmpDom = document.createElement('span');
		if (selectedRecord) tmpDom.appendChild(document.createTextNode(selectedRecord.scale));
		itemDom.appendChild(tmpDom);
		frag.appendChild(itemDom);
	}
	$('#scale-content-main').append(frag);

	$('#scale-submit').removeClass('disabled');
};
var _appendPlus = function(itemFlg, eventListener, id) {
	var dom = document.createElement('a');
	var ico = document.createElement('i');
	if (id) dom.id = id;
	switch (itemFlg) {
		case 'plus':
			dom.className = 'btn btn-success';
			ico.className = 'icon-plus';
			break;
		case 'minus':
			dom.className = 'btn btn-danger';
			ico.className = 'icon-minus';
			break;
		default:
			break;
	}
	$(dom).on('click', eventListener);
	dom.appendChild(ico);
	return dom;
};
var _createSetInsideDOM = function(flg, data, idx) {
	var itemDom = document.createElement('div');
	var tmpDom = null;
	itemDom.className = 'item-group';
	itemDom.id = flg + '_' + idx;
	switch (flg) {
		case 'feature':
			tmpDom = document.createElement('label');
			tmpDom.innerText = data.title;
			itemDom.appendChild(tmpDom);
			itemDom.appendChild(_appendPlus('plus', null));
			for (var i = 0; i < data.items.length; i++) {
				var featureItem = document.createElement('div');
				featureItem.className = 'set-item-group';
				tmpDom = document.createElement('label');
				tmpDom.innerText = data.items[i].description;
				featureItem.appendChild(tmpDom);
				tmpDom = document.createElement('input');
				tmpDom.className = 'form-control number-input';
				tmpDom.maxLength = 3;
				tmpDom.value = data.items[i].value;
				featureItem.appendChild(tmpDom);
				featureItem.appendChild(_appendPlus('minus', null));
				itemDom.appendChild(featureItem);
			}
			break;
		case 'threshold':
			var thresholdItem = document.createElement('div');
			thresholdItem.className = 'set-item-group';
			tmpDom = document.createElement('span');
			tmpDom.innerText = data.min;
			thresholdItem.appendChild(tmpDom);
			tmpDom = document.createElement('span');
			tmpDom.innerText = '~';
			thresholdItem.appendChild(tmpDom);
			tmpDom = document.createElement('span');
			tmpDom.innerText = data.max;
			thresholdItem.appendChild(tmpDom);
			tmpDom = document.createElement('span');
			tmpDom.innerText = ':';
			thresholdItem.appendChild(tmpDom);
			tmpDom = document.createElement('input');
			tmpDom.className = 'form-control number-input';
			tmpDom.maxLength = 3;
			tmpDom.value = data.rangeTime;
			thresholdItem.appendChild(tmpDom);
			itemDom.appendChild(thresholdItem);
			break;
		default:
			break;
	}
	return itemDom;
};
var _createSetContainerDOM = function() {
	//Don't forget clear the DOM if need to empty the set-main-container use _clearSubDomEvent()
	$('#set-main-container').empty();
	if (!_statData) return;
	var itemDom = null;
	var tmpDom = null;
	var frag = document.createDocumentFragment();
	if (!_statData.scaleData || !_statData.scaleData.title) {
		$('#set-inputTitle').val('');
	} else {
		$('#set-inputTitle').val(_statData.scaleData.title);
	}

	itemDom = document.createElement('div');
	itemDom.className = "item-group block";

	tmpDom = document.createElement('label');
	tmpDom.setAttribute('z-lang', 'langSetScaleFeature');
	tmpDom.innerText = _getLocalesValue('langSetScaleFeature', 'Feature');
	itemDom.appendChild(tmpDom);
	itemDom.appendChild(_appendPlus('plus', _addItemEvent, 'addFeture'));
	itemDom.appendChild(document.createElement('hr'));
	if (_statData.scaleData && _statData.scaleData.descriptionItem && _statData.scaleData.descriptionItem.length) {
		for (var i = 0; i < _statData.scaleData.descriptionItem.length; i++) {
			itemDom.appendChild(_createSetInsideDOM('feature', _statData.scaleData.descriptionItem[i], i));
		}
		itemDom.appendChild(document.createElement('hr'));
	}
	tmpDom = document.createElement('label');
	tmpDom.setAttribute('z-lang', 'langSetScaleThreshold');
	tmpDom.innerText = _getLocalesValue('langSetScaleThreshold', 'Threshold');
	itemDom.appendChild(tmpDom);
	itemDom.appendChild(_appendPlus('plus', _addItemEvent, 'addThreshold'));
	itemDom.appendChild(document.createElement('hr'));
	if (_statData.scaleData && _statData.scaleData.threshold && _statData.scaleData.threshold.length) {
		for (var i = 0; i < _statData.scaleData.threshold.length; i++) {
			itemDom.appendChild(_createSetInsideDOM('threshold', _statData.scaleData.threshold[i], i));
		}
		itemDom.appendChild(_appendPlus('minus', null));
		itemDom.appendChild(document.createElement('hr'));
	}
	tmpDom = document.createElement('label');
	tmpDom.setAttribute('z-lang', 'langSetScalePresureRange');
	tmpDom.innerText = _getLocalesValue('langSetScalePresureRange', 'Presure Range');
	itemDom.appendChild(tmpDom);
	tmpDom = document.createElement('input');
	tmpDom.className = 'form-control number-input';
	tmpDom.maxLength = 2;
	if (_statData.scaleData && _statData.scaleData.presureRange &&
		_statData.scaleData.presureRange.ranges && _statData.scaleData.presureRange.ranges.length) {
		tmpDom.value = _statData.scaleData.presureRange.ranges[0].scale;
	}
	itemDom.appendChild(tmpDom);
	frag.appendChild(itemDom);
	$('#set-main-container').append(frag);
};
var _createEditModual = function(typeFlg) {
	var itemDom = document.createElement('div');
	itemDom.className = 'item-group block';
	itemDom.id = 'modal_' + typeFlg;
	var tmpDom = null;
	switch (typeFlg) {
		case 'addFeture':
			tmpDom = document.createElement('label');
			tmpDom.innerText = _getLocalesValue('langSetScaleModalEditFeature', 'Feature name');
			itemDom.appendChild(tmpDom);
			tmpDom = document.createElement('input');
			tmpDom.className = 'form-control';
			itemDom.appendChild(tmpDom);
			break;
		case 'addThreshold':
			break;
		default:
			break;
	}
	return itemDom;
};
var _addItemEvent = function() {
	$('#set-modalEdit .modal-body').append(_createEditModual(this.id));
	$('#set-modalEdit').modal({
		keyboard: false
	});
};