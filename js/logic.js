'use strict';
//worker call back
var _bufferDataWorkerCallback_ = function(event) {
	//alert(event.data);
	//return;
	innerData = JSON.parse(event.data);
	setHeatMap(innerData);
};
var _dataAnaylysisWorkerCallback_ = function(event) {
	//alert(event.data);
	//return;
	var dataResult = JSON.parse(event.data);
	//alert(JSON.stringify(dataResult));
	$('.heatmap-datainfo').empty();
	for (var e in dataResult.middData) {
		$('.heatmap-datainfo').append('<span>' + e + ':' + JSON.stringify(dataResult.middData[e]) + '</span><br />');
	}
	if (dataResult.test) return;

	if ($('#heatmap-labNewScale').length)
		$('#heatmap-labNewScale').html(dataResult.middData.newScale);

	if (dataResult.middData.innerPos && $('#edgeCav').length) {
		var cav = document.getElementById('edgeCav');
		var context = cav.getContext('2d');
		var widthBase = cav.width / (commConfig.productionSize.height - 1);
		var heightBase = cav.height / (commConfig.productionSize.width - 1);
		context.save();
		context.clearRect(0, 0, cav.width, cav.height);
		context.lineWidth = 1;
		context.strokeStyle = 'rgba(255, 0, 0, 0.6)';
		context.beginPath();
		context.moveTo((dataResult.middData.innerPos.topLeft.x * widthBase - 0.5), (dataResult.middData.innerPos.topLeft.y * heightBase - 0.5));
		context.lineTo((dataResult.middData.innerPos.topRight.x * widthBase - 0.5), (dataResult.middData.innerPos.topRight.y * heightBase - 0.5));
		context.lineTo((dataResult.middData.innerPos.rightTop.x * widthBase - 0.5), (dataResult.middData.innerPos.rightTop.y * heightBase - 0.5));
		context.lineTo((dataResult.middData.innerPos.rightBottom.x * widthBase - 0.5), (dataResult.middData.innerPos.rightBottom.y * heightBase - 0.5));
		context.lineTo((dataResult.middData.innerPos.bottomRight.x * widthBase - 0.5), (dataResult.middData.innerPos.bottomRight.y * heightBase - 0.5));
		context.lineTo((dataResult.middData.innerPos.bottomLeft.x * widthBase - 0.5), (dataResult.middData.innerPos.bottomLeft.y * heightBase - 0.5));
		context.lineTo((dataResult.middData.innerPos.leftBottom.x * widthBase - 0.5), (dataResult.middData.innerPos.leftBottom.y * heightBase - 0.5));
		context.lineTo((dataResult.middData.innerPos.leftTop.x * widthBase - 0.5), (dataResult.middData.innerPos.leftTop.y * heightBase - 0.5));
		context.lineTo((dataResult.middData.innerPos.topLeft.x * widthBase - 0.5), (dataResult.middData.innerPos.topLeft.y * heightBase - 0.5));
		context.stroke();
	}

	if (dataResult.leave) {
		if ($('#countdown').length) $('#countdown').stop();
		if ($('#edgeCav').length) {
			var cav = document.getElementById('edgeCav');
			var context = cav.getContext('2d');
			context.clearRect(0, 0, cav.width, cav.height);
		}
		_statData.me.leaveCounter++;
		if ($('#heatmap-labLeave').length) $('#heatmap-labLeave').html(_statData.me.leaveCounter);
	}
	if (dataResult.forceback) {
		_statData.me.selfTurnCounter++;
		$('#heatmap-labSelfTurn').html(_statData.me.selfTurnCounter);
	}
	if (dataResult.data === 0) {
		_setCountDownZero();
		return;
	}
	if (!dataResult.forceback && ((dataResult.data * 60) === _statData.preCountDownRange)) return;
	_statData.me.preScale = dataResult.middData.newScale;
	$('#countdown').stop();
	var tmpDist = (_statData.restDistance - ((_statData.preCountDown - dataResult.cd) / (_statData.preCountDownRange * 60)));
	var newTime = parseInt(tmpDist * dataResult.data * 60);
	if (newTime <= 0) {
		_setCountDownZero();
		return;
	}
	$('#countdown').reset(newTime);
	_statData.restDistance = tmpDist;
	_statData.preCountDown = newTime;
	_statData.preCountDownRange = dataResult.data * 60;
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
//commomn logic
var _chkPortListener = function() {
	if (!_statData.portOpened || !serialport) return;
	if (serialport.isOpen()) {
		_statData.reOpenDelayCnt = 0;
		return;
	}
	if (_statData.reOpenDelayCnt > 3) {
		_statData.portOpened = false;
		if (_statData.portListener) clearInterval(_statData.portListener);
		_statData.portListener = 0;
		_statData.reOpenDelayCnt = 0;
		if ($('#heatmap-btnDoPort').length) $('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnOpenPort', 'Connection'));
	}
	try {
		serialport.open(function(error) {
			if (error) {
				_statData.reOpenDelayCnt++;
			} else {
				_statData.reOpenDelayCnt = 0;
				serialport.on('data', function(data) {
					getDataFromBuffer(data);
				});
			}
		});
	} catch (e) {
		_statData.reOpenDelayCnt++;
	}
};
var _resetMainHeight = function() {
	var height = $(window).height() - ($('footer').outerHeight() * 2.7) - $('nav').outerHeight();
	/*if ($('#countdown') && $('#countdown').length &&
		$('#countdown').children() && $('#countdown').children().length &&
		!$('#countdown').is(':hidden')) height -= $('#countdown').outerHeight();
	if (!height) height = 0;*/
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
	if (variance < (commConfig.productionSize.width === 16 ? 500 : 1500)) {
		_getCalibrationData();
		return;
	}
	if ($('#countdown').length && $('#countdown').stoped()) {
		$('#countdown').reset(_statData.countDownTime);
		_statData.me.backCounter++;
		if ($('#heatmap-labBack').length) $('#heatmap-labBack').html(_statData.me.backCounter);
	}
};
var _recalcScale = function(cd) {
	if (serialport && !serialport.isOpen()) {
		try {
			serialport.open(function(error) {
				if (!error) {
					_statData.portOpened = true;
					_statData.portListener = setInterval(_chkPortListener, 500);
					serialport.on('data', function(data) {
						getDataFromBuffer(data);
					});
				}
			});
			$('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnClosePort', 'Deconnection'));
		} catch (e) {}
	}

	if (!_statData || !_statData.constantScale || !_statData.scaleData ||
		!_statData.scaleData.presureRange || !_statData.scaleData.presureRange.ranges ||
		!_statData.scaleData.presureRange.ranges.length || !_statData.scaleData.threshold ||
		!_statData.scaleData.threshold.length ||
		!innerData || !innerData.length || !innerData[0].length ||
		!_statData.calibrationData || !_statData.calibrationData.length ||
		!_statData.calibrationData[0].length || innerData.length !== _statData.calibrationData.length ||
		innerData[0].length !== _statData.calibrationData[0].length) return;

	var postData = {};
	postData.calibrationData = _statData.calibrationData;
	postData.innerData = innerData;
	postData.baseScale = _statData.constantScale;
	postData.presureRanges = _statData.scaleData.presureRange.ranges;
	postData.threshold = _statData.scaleData.threshold;
	postData.cd = cd;
	postData.delayedSampling = commConfig.delayedSampling;
	postData.edgeCheckDelay = commConfig.edgeCheckDelay;
	postData.collapseRateWeight = commConfig.collapseRateWeight;
	postData.edgeConfidence = commConfig.edgeConfidence;
	postData.edgeSensitivity = commConfig.edgeSensitivity;
	dataAnalysisWorker.postMessage(JSON.stringify(postData));
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
var _appendAlertRecord = function() {
	var htmRecord = '<div class="item-group alert-record">' +
		'<label>' + (new Date()).Format("yyyy-MM-dd hh:mm:ss") + '</label><br />' +
		'<label z-lang="langHeatmapLabCountTime">' + _getLocalesValue('langHeatmapLabCountTime', 'Count time: ') + '</label>' +
		'<span>' + (new Date()).getDiff(_statData.me.actioned) + '</span><br />' +
		'<label z-lang="langHeatmapLabLeave">' + _getLocalesValue('langHeatmapLabLeave', 'Leave times: ') + '</label>' +
		'<span>' + _statData.me.leaveCounter + '</span><br />' +
		'<label z-lang="langHeatmapLabBack">' + _getLocalesValue('langHeatmapLabBack', 'Back times: ') + '</label>' +
		'<span>' + _statData.me.backCounter + '</span><br />' +
		'<label z-lang="langHeatmapLabSelfTurn">' + _getLocalesValue('langHeatmapLabSelfTurn', 'Self Turn: ') + '</label>' +
		'<span>' + _statData.me.selfTurnCounter + '</span><br />' +
		'<span z-lang="langMainMsgCountDownFinished">' + _getLocalesValue('langMainMsgCountDownFinished', 'Move') + '</span>' +
		'</div>';
	$('#alert-log-container').prepend(htmRecord);
};
var _doAlert = function() {
	var audio = document.getElementById('main-audio-alert');
	audio.play();
	setTimeout(function() {
		audio.pause();
	}, (commConfig.alertTime * 1000));
	_appendAlertRecord();
	_statData.alertHandle = setTimeout(_doAlert, (commConfig.alertFreque * 1000));
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
						critical: Math.floor((j + 1) / (tmpLength + 1) * 1024)
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
				'!19~24:No risk-1\n' +
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
	commConfig.radius = Math.floor((w > h ? h : w) * commConfig.showMultiple / 100);

	if (commConfig.productionSize.width === 16) $('#heatmap-content').css('margin-left', 'auto').css('margin-right', 'auto');
	else $('#heatmap-content').css('margin-left', '0.1em');

	var radius = (commConfig && commConfig.radius) ? commConfig.radius : 40;
	var width = innerData.length * radius + radius;
	var height = innerData[0].length * radius + radius;

	//canvas.width = width;
	//canvas.height = height;

	$('#edgeCav').width(width);
	$('#edgeCav').height(height);

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
var _triggerCountDown = function() {
	if (parseInt($('#countdown').css('bottom')) >= 0) {
		$('#countdown').css('bottom', (0 - $('#countDownValue').height() - 5) + 'px');
		setTimeout(function() {
			$('#countdown .countDownMark > i').removeClass('icon-double-angle-down').addClass('icon-double-angle-up');
		}, 666);
	} else {
		$('#countdown').css('bottom', '0px');
		setTimeout(function() {
			$('#countdown .countDownMark > i').removeClass('icon-double-angle-up').addClass('icon-double-angle-down');
		}, 666);
	}
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
var _resetMy = function() {
	_statData.me.leaveCounter = 0;
	if ($('#heatmap-labLeave').length) $('#heatmap-labLeave').html(_statData.me.leaveCounter);
	_statData.me.backCounter = 0;
	if ($('#heatmap-labBack').length) $('#heatmap-labBack').html(_statData.me.backCounter);
	_statData.me.selfTurnCounter = 0;
	if ($('#heatmap-labSelfTurn').length) $('#heatmap-labSelfTurn').html(_statData.me.selfTurnCounter);
	_statData.me.selfTurnDelay = 0;
	_statData.me.preScale = 0;
};