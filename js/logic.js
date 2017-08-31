'use strict';
//worker call back
var _bufferDataWorkerCallback_ = function(event) {
	//alert(event.data);
	//return;
	innerData = JSON.parse(event.data);
	if (commConfig.firmware !== '0' && typeof(commConfig.firmware) === 'object') {
		for (var i = 0; i < innerData.length; i++) {
			for (var j = 0; j < innerData[i].length; j++) {
				var tmp = Math.ceil(innerData[i][j] * commConfig.firmware[i][j]);
				innerData[i][j] = (tmp >= 1023) ? 1023 : tmp;
			}
		}
	}
	setHeatMap(innerData);
};
var _dataAnaylysisWorkerCallback_ = function(event) {
	var dataResult = JSON.parse(event.data);
	//alert(JSON.stringify(dataResult));
	//console.log(dataResult.edgeImg);
	//return;
	if (_statData.envHost.indexOf('DeBuG') >= 0) {
		$('.heatmap-datainfo').empty();
		for (var e in dataResult.middData) {
			$('.heatmap-datainfo').append('<span>' + e + ':' + JSON.stringify(dataResult.middData[e]) + '</span><br />');
		}
	}
	if (dataResult.test) return;

	if ($('#heatmap-labNewScale').length)
		$('#heatmap-labNewScale').html(dataResult.middData.newScale);

	if (dataResult.leave && _statData.activedPage === 'heatmap') {
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
	if ($('#countdown').stoped()) return;
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
var _edgeDetectionWorkerCallback_ = function(event) {
	var dataResult = JSON.parse(event.data);
	if (dataResult.matrix && $('#edgeCav').length) {
		var cntEdg = 0;
		var cav = $('#edgeCav').get(0);
		cav.width = dataResult.matrix.length + 1;
		cav.height = dataResult.matrix[0].length + 1;
		var context = cav.getContext('2d');
		context.clearRect(0, 0, cav.width, cav.height);
		context.fillStyle = 'rgba(255, 255, 255, 0.1)';
		for (var i = 0; i < dataResult.matrix.length; i++) {
			for (var j = 0; j < dataResult.matrix[i].length; j++) {
				if (dataResult.matrix[i][j] > dataResult.maxValue * (commConfig.sobelThreshold / 100)) {
					context.fillRect(i, j, 1, 1);
					cntEdg++;
				}
			}
		}
		var chkBack = 5 * 2 * Math.PI * commConfig.radius * (commConfig.productionSize.width === 16 ? 1.4 : 2.1);
		if (cntEdg > chkBack && $('#countdown').length && $('#countdown').stoped()) {
			$('#countdown').reset(_statData.countDownTime);
			_statData.me.backCounter++;
			if ($('#heatmap-labBack').length) $('#heatmap-labBack').html(_statData.me.backCounter);
		}
	}
	_statData.inEdgeDetectionRange = false;
};
var _skeletonExtractionWorkerCallback_ = function(event) {
	var dataResult = JSON.parse(event.data);
	if (!dataResult.skeleton) return;
	try {
		switch (true) {
			case ($('#skeletonCav').length):
				var cav = $('#skeletonCav').get(0);
				cav.width = dataResult.skeleton.length;
				cav.height = dataResult.skeleton[0].length;
				var context = cav.getContext('2d');
				context.clearRect(0, 0, cav.width, cav.height);
				context.fillStyle = 'rgba(175, 175, 175, 0.3)';
				for (var i = 0; i < dataResult.skeleton.length; i++) {
					for (var j = 0; j < dataResult.skeleton[i].length; j++) {
						if (dataResult.skeleton[i][j] > 0) context.fillRect(i, j, 1, 1);
						//context.fillRect(((i - 1 < 0) ? 0 : (i - 1)), ((j - 1 < 0) ? 0 : (j - 1)), 3, 3);
					}
				}
				break;
			case (_statData.workingScope !== null && _statData.workingScope.id !== undefined && $('#stepRecord_' + _statData.workingScope.id + ' > canvas').length > 0):
				_statData.workingScope.deviation = dataResult.skeletonTimes;

				var cav = $('#stepRecord_' + _statData.workingScope.id + ' > canvas').get(0);
				var ctx = cav.getContext('2d');
				ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
				for (var i = 0; i < dataResult.skeleton.length; i++) {
					for (var j = 0; j < dataResult.skeleton[i].length; j++) {
						if (dataResult.skeleton[i][j] > 0) ctx.fillRect(i, j, 1, 1);
					}
				}
				var stepSkeletonFlg = _collectStep_(dataResult.skeleton, _statData.workingScope.toRight, _statData.workingScope.ranges);
				ctx.strokeStyle = "rgba(255,255,0,0.8)";
				ctx.beginPath();
				var minXPoint = {
					x: cav.width,
					y: cav.height
				};
				var maxXPoint = {
					x: 0,
					y: 0
				};
				for (var i = 0; i < stepSkeletonFlg.minPathRange.length - 1; i += 2) {
					ctx.moveTo(stepSkeletonFlg.minPathRange[i].x, stepSkeletonFlg.minPathRange[i].y);
					ctx.lineTo(stepSkeletonFlg.minPathRange[i + 1].x, stepSkeletonFlg.minPathRange[i + 1].y);
					if (minXPoint.x > stepSkeletonFlg.minPathRange[i].x) {
						minXPoint.x = stepSkeletonFlg.minPathRange[i].x;
						minXPoint.y = stepSkeletonFlg.minPathRange[i].y;
					}
					if (maxXPoint.x < stepSkeletonFlg.minPathRange[i].x) {
						maxXPoint.x = stepSkeletonFlg.minPathRange[i].x;
						maxXPoint.y = stepSkeletonFlg.minPathRange[i].y;
					}
				}
				for (var i = 0; i < stepSkeletonFlg.maxPathRange.length - 1; i += 2) {
					ctx.moveTo(stepSkeletonFlg.maxPathRange[i].x, stepSkeletonFlg.maxPathRange[i].y);
					ctx.lineTo(stepSkeletonFlg.maxPathRange[i + 1].x, stepSkeletonFlg.maxPathRange[i + 1].y);
					if (minXPoint.x > stepSkeletonFlg.maxPathRange[i].x) {
						minXPoint.x = stepSkeletonFlg.maxPathRange[i].x;
						minXPoint.y = stepSkeletonFlg.maxPathRange[i].y;
					}
					if (maxXPoint.x < stepSkeletonFlg.maxPathRange[i].x) {
						maxXPoint.x = stepSkeletonFlg.maxPathRange[i].x;
						maxXPoint.y = stepSkeletonFlg.maxPathRange[i].y;
					}
				}
				ctx.stroke();
				ctx.closePath();
				ctx.save();
				if (stepSkeletonFlg.minPathRange.length > 0 && minXPoint.x > stepSkeletonFlg.minPathRange[stepSkeletonFlg.minPathRange.length - 1].x) {
					minXPoint.x = stepSkeletonFlg.minPathRange[stepSkeletonFlg.minPathRange.length - 1].x;
					minXPoint.y = stepSkeletonFlg.minPathRange[stepSkeletonFlg.minPathRange.length - 1].y;
				}
				if (stepSkeletonFlg.minPathRange.length > 0 && maxXPoint.x < stepSkeletonFlg.minPathRange[stepSkeletonFlg.minPathRange.length - 1].x) {
					maxXPoint.x = stepSkeletonFlg.minPathRange[stepSkeletonFlg.minPathRange.length - 1].x;
					maxXPoint.y = stepSkeletonFlg.minPathRange[stepSkeletonFlg.minPathRange.length - 1].y;
				}
				if (stepSkeletonFlg.maxPathRange.length > 0 && minXPoint.x > stepSkeletonFlg.maxPathRange[stepSkeletonFlg.maxPathRange.length - 1].x) {
					minXPoint.x = stepSkeletonFlg.maxPathRange[stepSkeletonFlg.maxPathRange.length - 1].x;
					minXPoint.y = stepSkeletonFlg.maxPathRange[stepSkeletonFlg.maxPathRange.length - 1].y;
				}
				if (stepSkeletonFlg.maxPathRange.length > 0 && maxXPoint.x < stepSkeletonFlg.maxPathRange[stepSkeletonFlg.maxPathRange.length - 1].x) {
					maxXPoint.x = stepSkeletonFlg.maxPathRange[stepSkeletonFlg.maxPathRange.length - 1].x;
					maxXPoint.y = stepSkeletonFlg.maxPathRange[stepSkeletonFlg.maxPathRange.length - 1].y;
				}
				var analysisReport = _getAnalysisReport_(cav, _statData.workingScope.pathRange, _statData.workingScope.minMiddleLine, _statData.workingScope.maxMiddleLine, stepSkeletonFlg, minXPoint, maxXPoint, _statData.workingScope.toRight);
				ctx.strokeStyle = "rgba(0,255,0,0.8)";
				for (var i = 0; i < analysisReport.stepProcess.length; i++) {
					//var context = 'Step: ' + (i + 1) + '; Length: ' + analysisReport.stepProcess[i].stepLength + '; Angle: ' + analysisReport.stepProcess[i].angle;
					var context = 'Length: ' + analysisReport.stepProcess[i].stepLength + '; Angle: ' + analysisReport.stepProcess[i].angle.toFixed(2);
					if (_statData.workingScope.toRight)
						ctx.strokeText(context, analysisReport.stepProcess[i].from.x, analysisReport.stepProcess[i].from.y);
					else
						ctx.strokeText(context, analysisReport.stepProcess[i].to.x, analysisReport.stepProcess[i].to.y);
				}
				ctx.save();
				$('#stepRecord_' + _statData.workingScope.id).append(_formatReport(analysisReport, _statData.workingScope.keepTimes));
				_statData.workingScope = null;
				break;
			default:
				break;
		}
	} catch (e) {
		switch (true) {
			case (_statData.workingScope && _statData.workingScope.id && $('#stepRecord_' + _statData.workingScope.id + ' > canvas').length):
				var err = (e && e.number) ? (e.number & x0FFFF) : '0000000';
				_showMessage('warn', _getLocalesValue('langLogicWrnSkeleton', 'Skeleton Exception: ') + err);
				_statData.workingScope = null;
				break;
			case ($('#skeletonCav').length):
			default:
				break;
		}
	} finally {
		_statData.inSkeletonDetectionRange = false;
	}
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
				_bindSerialportEmitter();
			}
		});
	} catch (e) {
		_statData.reOpenDelayCnt++;
		$('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnOpenPort', 'Connection'));
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
};
var _recalcScale = function(cd) {
	if (serialport && !serialport.isOpen()) {
		try {
			serialport.open(function(error) {
				if (!error) {
					_statData.portOpened = true;
					if (_statData.portListener) clearInterval(_statData.portListener);
					_statData.portListener = setInterval(_chkPortListener, 500);
					_bindSerialportEmitter();
				}
			});
			$('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnClosePort', 'Deconnection'));
		} catch (e) {
			$('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnOpenPort', 'Connection'));
		}
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
	postData.leaveJudge = commConfig.leaveJudge;
	postData.turnJudge = commConfig.turnJudge;
	if ($('#edgeCav').length) {
		var canvas = $('#edgeCav').get(0);
		var ctx = canvas.getContext("2d");
		var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
		var edgList = [];
		for (var i = 0; i < imgData.length; i += 4) {
			if (imgData[i + 3] > 0) edgList.push(i);
		}
		postData.edgeList = edgList;
	}
	if ($('#skeletonCav').length) {
		var canvas = $('#skeletonCav').get(0);
		var ctx = canvas.getContext("2d");
		var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
		var skeList = [];
		for (var i = 0; i < imgData.length; i += 4) {
			if (imgData[i + 3] > 0) skeList.push(i);
		}
		postData.skeletonList = skeList;
	}
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
		'<label z-lang="langHeatmapLabCountTime">' + _getLocalesValue('langHeatmapLabCountTime', 'Count time: ') + '</label>';
	var dateDiff = (new Date()).getDiff(_statData.me.actioned);
	if (dateDiff) {
		htmRecord += '<span>';
		switch (true) {
			case (dateDiff.d !== undefined):
				htmRecord += dateDiff.d + ' day; ' + dateDiff.h + ' hour; ' + dateDiff.m + ' min; ' + dateDiff.s + ' sec';
				break;
			case (dateDiff.h !== undefined):
				htmRecord += dateDiff.h + ' hour; ' + dateDiff.m + ' min; ' + dateDiff.s + ' sec';
				break;
			case (dateDiff.m !== undefined):
				htmRecord += dateDiff.m + ' min; ' + dateDiff.s + ' sec';
				break;
			default:
				htmRecord += dateDiff.s + ' sec';
				break;
		}
		htmRecord += '</span><br />';
	}
	htmRecord += '<label z-lang="langHeatmapLabLeave">' + _getLocalesValue('langHeatmapLabLeave', 'Leave times: ') + '</label>' +
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
			/*
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
			*/
			_statData.scaleData = JSON.parse('{"descriptionItem":[{"title":"Sensory","items":[{"description":"Completely Limited","value":"1"},{"description":"Very Limited","value":"2"},{"description":"Slight Limited","value":"3"},{"description":"No Impairment","value":"4"}]},{"title":"Moisture","items":[{"description":"Constantly Moist","value":"1"},{"description":"Very Moist","value":"2"},{"description":"Occasionally Moist","value":"3"},{"description":"Rarely Moist","value":"4"}]},{"title":"Activity","items":[{"description":"Bedfast","value":"1"},{"description":"Chairfast","value":"2"},{"description":"Walks Occasionally","value":"3"},{"description":"Walks Frequently","value":"4"}]},{"title":"Mobility","items":[{"description":"Completely Immobile","value":"1"},{"description":"Very Limited","value":"2"},{"description":"Slightly Limited","value":"3"},{"description":"No Limitation","value":"4"}]},{"title":"Nutrition","items":[{"description":"Very Poor","value":"1"},{"description":"Probaly Inadequate","value":"2"},{"description":"Adequate","value":"3"},{"description":"Excellent","value":"4"}]}],"threshold":[{"min":6,"max":12,"description":"High risk","rangeTime":30},{"min":13,"max":14,"description":"Moderate risk","rangeTime":60},{"min":15,"max":18,"description":"Low risk","rangeTime":120},{"min":19,"max":24,"description":"No risk","rangeTime":1}],"constantScales":[{"item":"Sensory","scale":4},{"item":"Moisture","scale":4},{"item":"Activity","scale":4},{"item":"Mobility","scale":4},{"item":"Nutrition","scale":4}],"title":"Braden Scale Table","presureRange":{"description":"Presure Subparagraph","ranges":[{"scale":4,"critical":819},{"scale":3,"critical":614},{"scale":2,"critical":409},{"scale":1,"critical":204}]}}');
		} else {
			//_statData.scaleData = _parseScaleStream(scale);
			_statData.scaleData = JSON.parse(scale);
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
			if (ele.attr('title')) ele.attr('title', _statData.langData[attr]);
			return;
		}
		if (ele.children().length) {
			_traverseLocales(ele.children());
		}
	});
};
var _traverseHideInI = function(childElements, my) {
	childElements.each(function(i, n) {
		var ele = $(n);
		var attr = ele.attr('hide-in');
		if (attr && typeof(attr) === 'string' && typeof(my) === 'string') {
			switch (true) {
				case (my.indexOf('#') > 0):
					var tmpMy = my.split('#');
					for (var i = 0; i < tmpMy.length; i++) {
						if (attr.toUpperCase().indexOf(tmpMy[i].trim().toUpperCase() >= 0)) {
							ele.addClass('invisiabled');
							break;
						}
					}
					return;
				case (attr.toUpperCase().indexOf(my.trim().toUpperCase()) >= 0):
					ele.addClass('invisiabled');
					return;
				default:
					break;
			}
		}
		if (ele.children().length) _traverseHideInI(ele.children(), my);
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
	dataAnalysisWorker.postMessage(JSON.stringify({
		resetEdge: true,
		resetSkeleton: true
	}));

	$('#edgeCav').width(width);
	$('#edgeCav').height(height);
	$('#skeletonCav').width(width);
	$('#skeletonCav').height(height);

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
var _showDisConnection_ = function() {
	innerData = initInnerData();
	setHeatMap(innerData);
	$('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnOpenPort', 'Connection'));
};
var _bindSerialportEmitter = function() {
	serialport.on('open', function() {
		$('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnClosePort', 'Deconnection'));
	});
	serialport.on('data', function(data) {
		getDataFromBuffer(data);
	});
	serialport.on('disconnect', _showDisConnection_);
	serialport.on('close', _showDisConnection_);
	serialport.on('error', _showDisConnection_);
};
var _productCombination = function(myType) {
	$('#config-selectProductionFirmware').empty();
	var baseHtml = "<option value='0' z-lang='langConfigOptNoFirmware'";
	if (commConfig.firmware === '0') baseHtml += ' selected';
	baseHtml += ">" + _getLocalesValue('langConfigOptNoFirmware', 'Unknown') + "</option>";
	$('#config-selectProductionFirmware').prepend(baseHtml);

	var tmpVersion = (commConfig.firmware === '0') ? 0 : commConfig.firmwareVersion.split('#');
	for (var ele in _commonConstant.firmwares[myType]) {
		baseHtml = "<option value='" + ele + "'";
		if (tmpVersion !== 0 && tmpVersion.length === 2)
			if (tmpVersion[0] === 'v' + commConfig.productionSize.width && tmpVersion[1] === ele)
				baseHtml += ' selected';
		baseHtml += ">" + ele + "</option>";
		$('#config-selectProductionFirmware').append(baseHtml);
	}
};
var _resetAndReportCollection = function() {
	var stepRecord = {};
	stepRecord.startTimestamp = _collectedSrcData.startTimestamp;
	stepRecord.finishedTimestamp = _collectedSrcData.finishedTimestamp;
	stepRecord.canvasData = [];
	//console.log('_resetAndReportCollection:' + _collectedSrcData.canvasData.length);

	for (var i = 0; i < _collectedSrcData.canvasData.length; i++) {
		var recordImg = {};
		recordImg.timestamp = _collectedSrcData.canvasData[i].timestamp;
		recordImg.image = _collectedSrcData.canvasData[i].image;
		recordImg.imgData = _collectedSrcData.canvasData[i].imgData;
		stepRecord.canvasData.push(recordImg);
		$('.heatmap-container').append(_collectedSrcData.canvasData[i].image);
	}
	setTimeout(function() {
		_stepRemove();
	}, 1000);
	_collectedStepList.push(stepRecord);
	//console.log(_collectedSrcData);
	_collectedSrcData.startTimestamp = 0;
	_collectedSrcData.finishedTimestamp = 0;
	_collectedSrcData.canvasData.length = 0;
	//console.log(_collectedStepList);
};
var _stepRemove = function() {
	var cntRcd = $('.heatmap-container .part-step').length;
	if (cntRcd > 0)
		$('.heatmap-container').get(0).removeChild($('.heatmap-container').get(0).lastChild);
	if (cntRcd > 1) {
		setTimeout(function() {
			_stepRemove();
		}, 500);
	}
};
//Step analysis
var _playRecord = function(cavList, idx, playground) {
	var thisCav = cavList[idx].image;
	var ctxThis = thisCav.getContext("2d");
	var ctx = playground.getContext("2d");
	ctx.clearRect(0, 0, playground.width, playground.height);
	ctx.putImageData(ctxThis.getImageData(0, 0, thisCav.width, thisCav.height), 0, 0);
	if (idx >= cavList.length - 1) return;
	var timeot = cavList[idx + 1].timestamp - cavList[idx].timestamp;
	_statData.playHandle = setTimeout(function() {
		_playRecord(cavList, idx + 1, playground);
	}, timeot);
};
var _showBinaryImage = function(cavList, playground) {
	var ctx = playground.getContext("2d");
	ctx.clearRect(0, 0, playground.width, playground.height);
	var ctxData = ctx.getImageData(0, 0, playground.width, playground.height);
	for (var j = 0; j < cavList.length; j++) {
		var tmpCtx = cavList[j].image.getContext("2d");
		var tmpCtxData = tmpCtx.getImageData(0, 0, cavList[j].image.width, cavList[j].image.height);
		for (var i = 0; i < tmpCtxData.data.length; i += 4) {
			if ((i + 3) < ctxData.data.length && tmpCtxData.data[i + 3] > commConfig.binaryImageFilter && ctxData.data[i + 3] <= 0) {
				ctxData.data[i] = 0;
				ctxData.data[i + 1] = 0;
				ctxData.data[i + 2] = 0;
				ctxData.data[i + 3] = 175;
			}
		}
	}
	ctx.putImageData(ctxData, 0, 0);
	return ctxData;
};
var _getWalkingPath = function(playground, cavList) {
	var ctx = playground.getContext("2d");
	var imgData = ctx.getImageData(0, 0, playground.width, playground.height).data;
	var inner = [];
	var row = [];
	for (var i = 0; i < imgData.length; i += 4) {
		if (imgData[i + 3] > 0) {
			row.push(1);
		} else {
			row.push(0);
		}
		if (row.length === playground.width) {
			inner.push(row.slice(0));
			row.length = 0;
		}
	}
	var pathRange = {
		min: playground.height,
		max: 0
	};
	for (var i = 0; i < inner.length; i++) {
		for (var j = 0; j < inner[i].length; j++) {
			if (inner[i][j] > 0) {
				pathRange.min = Math.min(pathRange.min, i);
				pathRange.max = Math.max(pathRange.max, i);
			}
		}
	}
	/*
	var innerMatrix = [];
	for (var i = 0; i < inner[0].length; i++) {
		var row = [];
		for (var j = 0; j < inner.length; j++) {
			row.push(inner[j][i]);
		}
		innerMatrix.push(row);
	}
	*/
	ctx.strokeStyle = "rgba(0,0,255,0.8)";
	ctx.beginPath();
	ctx.moveTo(0, pathRange.min);
	ctx.lineTo(playground.width, pathRange.min);
	ctx.moveTo(0, pathRange.max);
	ctx.lineTo(playground.width, pathRange.max);

	var middleLine = pathRange.min + Math.floor((pathRange.max - pathRange.min) / 2);
	var minMiddleLine = Math.floor(middleLine);
	var maxMiddleLine = Math.ceil(middleLine);
	var checked = false;
	for (var idx = middleLine; idx > pathRange.min; idx--) {
		if (checked) break;
		for (var tmp = 0; tmp < inner[idx].length; tmp++) {
			if (inner[idx][tmp] > 0) {
				minMiddleLine = idx;
				checked = true;
				break;
			}
		}
	}
	checked = false;
	for (var idx = middleLine; idx < pathRange.max; idx++) {
		if (checked) break;
		for (var tmp = 0; tmp < inner[idx].length; tmp++) {
			if (inner[idx][tmp] > 0) {
				maxMiddleLine = idx;
				checked = true;
				break;
			}
		}
	}
	if (minMiddleLine + 2 < maxMiddleLine) {
		minMiddleLine++;
		maxMiddleLine--;
	}
	ctx.moveTo(0, minMiddleLine);
	ctx.lineTo(playground.width, minMiddleLine);
	ctx.moveTo(0, maxMiddleLine);
	ctx.lineTo(playground.width, maxMiddleLine);
	ctx.stroke();
	ctx.closePath();
	ctx.save();
	var toRight = _drawArrow_(ctx, cavList, playground.width);

	_statData.workingScope.toRight = toRight;
	_statData.workingScope.ranges = {
		minRange: {
			min: pathRange.min,
			max: minMiddleLine
		},
		maxRange: {
			min: maxMiddleLine,
			max: pathRange.max
		}
	};
	_statData.workingScope.pathRange = pathRange;
	_statData.workingScope.minMiddleLine = minMiddleLine;
	_statData.workingScope.maxMiddleLine = maxMiddleLine;

	if (!_statData.inSkeletonDetectionRange) {
		_statData.inSkeletonDetectionRange = true;
		var postData = {};
		postData.binaryImg = inner;
		postData.skeletonLimit = commConfig.skeletonLimit;
		skeletonExtractionWorker.postMessage(JSON.stringify(postData));
	}
	//return analysisReport;
};
var _formatReport = function(analysisReport, keepTimes) {
	var resultContainer = document.createElement('article');

	var divTitle = document.createElement('div');
	divTitle.innerHTML = '<span z-lang="langRecordDistance">' +
		_getLocalesValue('langRecordDistance', 'Test Distance: ') + '</span>' +
		analysisReport.samplingDist.toFixed(2) +
		'(cm); <span z-lang="langRecordCntStep">' +
		_getLocalesValue('langRecordCntStep', 'Count Step: ') + '</span>' +
		analysisReport.stepCount;
	$(divTitle).addClass('panel-heading');
	resultContainer.appendChild(divTitle);

	var divBody = document.createElement('div');
	var objReference = {
		amplitude: {
			min: 100,
			max: 160
		},
		deviation: {
			min: 0,
			max: 5
		},
		speed: {
			min: 110,
			max: 160
		},
		frequency: {
			min: 95,
			max: 125
		},
		length: {
			min: 50,
			max: 80
		}
	}

	var innerHtml = '<table class="table table-striped table-condensed">';

	innerHtml += '<tr>';
	innerHtml += '<th></th>';
	innerHtml += '<th z-lang="langRecordReportActiveValue">' + _getLocalesValue('langRecordReportActiveValue', 'VALUE') + '</th>';
	innerHtml += '<th z-lang="langRecordReportReference">' + _getLocalesValue('langRecordReportReference', 'REFERENCE') + '</th>';
	innerHtml += '<th></th>';
	innerHtml += '<th z-lang="langRecordReportLeft">' + _getLocalesValue('langRecordReportLeft', 'LEFT') + '</th>';
	innerHtml += '<th z-lang="langRecordReportRight">' + _getLocalesValue('langRecordReportRight', 'RIGHT') + '</th>';
	innerHtml += '<th z-lang="langRecordReportReference">' + _getLocalesValue('langRecordReportReference', 'REFERENCE') + '</th>';
	innerHtml += '</tr>';

	innerHtml += '<tr>';
	innerHtml += '<td><span z-lang="langRecordReportFrequency">' + _getLocalesValue('langRecordReportFrequency', 'Cadence') + '</span>(steps/min)</td>';
	var avgStepFrequency = analysisReport.stepCount / (keepTimes / 60000);
	if (objReference.frequency.min <= avgStepFrequency && objReference.frequency.max >= avgStepFrequency)
		innerHtml += '<td class="success">' + avgStepFrequency.toFixed(2) + '</td>';
	else innerHtml += '<td class="danger">' + avgStepFrequency.toFixed(2) + '</td>';
	innerHtml += '<td>' + objReference.frequency.min + '~' + objReference.frequency.max + '</td>';
	innerHtml += '<td><span z-lang="langRecordReportLength">' + _getLocalesValue('langRecordReportLength', 'Step Length') + '</span>(cm)</td>';
	if (objReference.length.min <= analysisReport.avgLeftStepLength && objReference.length.max >= analysisReport.avgLeftStepLength)
		innerHtml += '<td class="success">' + analysisReport.avgLeftStepLength.toFixed(2) + '</td>';
	else innerHtml += '<td class="danger">' + analysisReport.avgLeftStepLength.toFixed(2) + '</td>';
	if (objReference.length.min <= analysisReport.avgRightStepLength && objReference.length.max >= analysisReport.avgRightStepLength)
		innerHtml += '<td class="success">' + analysisReport.avgRightStepLength.toFixed(2) + '</td>';
	else innerHtml += '<td class="danger">' + analysisReport.avgRightStepLength.toFixed(2) + '</td>';
	innerHtml += '<td>' + objReference.length.min + '~' + objReference.length.max + '</td>';
	innerHtml += '</tr>';

	innerHtml += '<tr>';
	innerHtml += '<td><span z-lang="langRecordReportAmplitude">' + _getLocalesValue('langRecordReportAmplitude', 'Stride Length') + '</span>(cm)</td>';
	if (objReference.amplitude.min <= analysisReport.avgStepLength && objReference.amplitude.max >= analysisReport.avgStepLength)
		innerHtml += '<td class="success">' + analysisReport.avgStepLength.toFixed(2) + '</td>';
	else innerHtml += '<td class="danger">' + analysisReport.avgStepLength.toFixed(2) + '</td>';
	innerHtml += '<td>' + objReference.amplitude.min + '~' + objReference.amplitude.max + '</td>';
	innerHtml += '<td><span z-lang="langRecordReportAngle">' + _getLocalesValue('langRecordReportAngle', 'Toe Out Angle') + '</span>(&deg;)</td>';
	innerHtml += '<td>' + analysisReport.avgLeftAngle.toFixed(2) + '</td>';
	innerHtml += '<td>' + analysisReport.avgRightAngle.toFixed(2) + '</td>';
	innerHtml += '<td></td>';
	innerHtml += '</tr>';

	innerHtml += '<tr>';
	innerHtml += '<td><span z-lang="langRecordReportSpeed">' + _getLocalesValue('langRecordReportSpeed', 'Velocity') + '</span>(cm/s)</td>';
	var avgStepSpeed = analysisReport.samplingDist / (keepTimes / 1000);
	if (objReference.speed.min <= avgStepSpeed && objReference.speed.max >= avgStepSpeed)
		innerHtml += '<td class="success">' + avgStepSpeed.toFixed(2) + '</td>';
	else innerHtml += '<td class="danger">' + avgStepSpeed.toFixed(2) + '</td>';
	innerHtml += '<td>' + objReference.speed.min + '~' + objReference.speed.max + '</td>';
	innerHtml += '<td><span z-lang="langRecordReportMinAngle">' + _getLocalesValue('langRecordReportMinAngle', 'Min Toe Out Angle') + '</span>(&deg;)</td>';
	innerHtml += '<td>' + analysisReport.minLeftAngle.toFixed(2) + '</td>';
	innerHtml += '<td>' + analysisReport.minRightAngle.toFixed(2) + '</td>';
	innerHtml += '<td></td>';
	innerHtml += '</tr>';

	innerHtml += '<tr>';
	innerHtml += '<td><span z-lang="langRecordReportDeviation">' + _getLocalesValue('langRecordReportDeviation', 'Step Length Deviation') + '</span>(cm)</td>';
	if (objReference.deviation.min <= analysisReport.stepLengthDeviation && objReference.deviation.max >= analysisReport.stepLengthDeviation)
		innerHtml += '<td class="success">' + analysisReport.stepLengthDeviation.toFixed(2) + '</td>';
	else innerHtml += '<td class="danger">' + analysisReport.stepLengthDeviation.toFixed(2) + '</td>';
	innerHtml += '<td>' + objReference.deviation.min + '~' + objReference.deviation.max + '</td>';
	innerHtml += '<td><span z-lang="langRecordReportMaxAngle">' + _getLocalesValue('langRecordReportMaxAngle', 'Max Toe Out Angle') + '</span>(&deg;)</td>';
	innerHtml += '<td>' + analysisReport.maxLeftAngle.toFixed(2) + '</td>';
	innerHtml += '<td>' + analysisReport.maxRightAngle.toFixed(2) + '</td>';
	innerHtml += '<td></td>';
	innerHtml += '</tr>';

	innerHtml += '<tr>';
	innerHtml += '<td><span z-lang="langRecordReportWidth">' + _getLocalesValue('langRecordReportWidth', 'Walking Base') + '</span>(cm)</td>';
	innerHtml += '<td>' + analysisReport.stepWidth.toFixed(2) + '</td>';
	innerHtml += '<td></td>';
	innerHtml += '<td><span z-lang="langRecordReportVarianceAngle">' + _getLocalesValue('langRecordReportVarianceAngle', 'Variance Toe Out Angle') + '</span></td>';
	innerHtml += '<td>' + analysisReport.varianceLeftAngle.toFixed(2) + '</td>';
	innerHtml += '<td>' + analysisReport.varianceRightAngle.toFixed(2) + '</td>';
	innerHtml += '<td></td>';
	innerHtml += '</tr>';

	innerHtml += '</table>';
	divBody.innerHTML = innerHtml;
	$(divBody).addClass('panel-body');
	resultContainer.appendChild(divBody);

	$(resultContainer).addClass('panel panel-info');
	return resultContainer;
};

var _drawArrow_ = function(ctx, cavList, width) {
	var qrtLength = Math.ceil(cavList.length / 4);
	var left = 0;
	var right = 0;
	for (var k = 0; k < qrtLength; k++) {
		var thisStepData = cavList[k].imgData;
		var thisInner = [];
		var row = [];
		for (var i = 0; i < thisStepData.length; i += 4) {
			if (thisStepData[i + 3] > 128) {
				row.push(1);
			} else {
				row.push(0);
			}
			if (row.length === width) {
				thisInner.push(row.slice(0));
				row.length = 0;
			}
		}
		for (var i = 0; i < thisInner.length; i++) {
			for (var j = 0; j < thisInner[i].length; j++) {
				if (thisInner[i][j] > 0) {
					if (j <= (width / 2)) left++;
					else right++;
				}
			}
		}
	}
	var toRight = (left > right);
	var arrowLeftX = Math.floor(width / 2) - 10;
	var arrowRightX = Math.floor(width / 2) + 10;
	var arrowY = Math.floor(8 * Math.tan(30 * Math.PI / 180));
	var arrowLineY = arrowY + 10;

	ctx.strokeStyle = "rgba(255,0,0,0.8)";
	ctx.beginPath();
	ctx.moveTo(arrowLeftX, arrowLineY);
	ctx.lineTo(arrowRightX, arrowLineY);
	if (toRight) {
		ctx.moveTo(arrowRightX, arrowLineY);
		ctx.lineTo(arrowRightX - 8, arrowLineY - arrowY);
		ctx.moveTo(arrowRightX, arrowLineY);
		ctx.lineTo(arrowRightX - 8, arrowLineY + arrowY);
	} else {
		ctx.moveTo(arrowLeftX, arrowLineY);
		ctx.lineTo(arrowLeftX + 8, arrowLineY - arrowY);
		ctx.moveTo(arrowLeftX, arrowLineY);
		ctx.lineTo(arrowLeftX + 8, arrowLineY + arrowY);
	}
	ctx.stroke();
	ctx.closePath();
	ctx.save();
	return toRight;
};
//  p9 p2 p3  
//  p8 p1 p4  
//  p7 p6 p5 
var _collectStep_ = function(martixBinaryImage, toRight, pathRange) {
	var width = martixBinaryImage.length;
	var height = martixBinaryImage[0].length;
	var minPathRangeS = [];
	var minPathRangeE = [];
	var maxPathRangeS = [];
	var maxPathRangeE = [];
	//move to skeletonWorker's call back
	for (var i = 0; i < width; i++) {
		for (var j = pathRange.minRange.min; j < pathRange.minRange.max; j++) {
			if (martixBinaryImage[i][j] === 0) continue;
			var p4 = (i === width - 1) ? 0 : martixBinaryImage[i + 1][j];
			var p8 = (i === 0) ? 0 : martixBinaryImage[i - 1][j];
			var p2 = (j === 0) ? 0 : martixBinaryImage[i][j - 1];
			var p3 = (i === width - 1 || j === 0) ? 0 : martixBinaryImage[i + 1][j - 1];
			var p9 = (i === 0 || j === 0) ? 0 : martixBinaryImage[i - 1][j - 1];
			var p6 = (j === height - 1) ? 0 : martixBinaryImage[i][j + 1];
			var p5 = (i === width - 1 || j === height - 1) ? 0 : martixBinaryImage[i + 1][j + 1];
			var p7 = (i === 0 || j === height - 1) ? 0 : martixBinaryImage[i - 1][j + 1];
			if (p9 === 0 && p8 === 0 && p7 === 0 && (p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 === 1)) {
				if (minPathRangeS.length <= 0 || (minPathRangeS.length > 0 && !minPathRangeS[minPathRangeS.length - 1].isFirst)) {
					minPathRangeS.push({
						x: i,
						y: j,
						isFirst: true
					});
				}
			}
			if (p3 === 0 && p4 === 0 && p5 === 0 && (p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 === 1)) {
				if (minPathRangeS.length > 0 && minPathRangeS[minPathRangeS.length - 1].isFirst) {
					minPathRangeS.push({
						x: i,
						y: j,
						isFirst: false
					});
				}
			}
		}
		for (var j = pathRange.maxRange.min; j < pathRange.maxRange.max; j++) {
			if (martixBinaryImage[i][j] === 0) continue;
			var p4 = (i === width - 1) ? 0 : martixBinaryImage[i + 1][j];
			var p8 = (i === 0) ? 0 : martixBinaryImage[i - 1][j];
			var p2 = (j === 0) ? 0 : martixBinaryImage[i][j - 1];
			var p3 = (i === width - 1 || j === 0) ? 0 : martixBinaryImage[i + 1][j - 1];
			var p9 = (i === 0 || j === 0) ? 0 : martixBinaryImage[i - 1][j - 1];
			var p6 = (j === height - 1) ? 0 : martixBinaryImage[i][j + 1];
			var p5 = (i === width - 1 || j === height - 1) ? 0 : martixBinaryImage[i + 1][j + 1];
			var p7 = (i === 0 || j === height - 1) ? 0 : martixBinaryImage[i - 1][j + 1];
			if (p9 === 0 && p8 === 0 && p7 === 0 && (p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 === 1)) {
				if (maxPathRangeS.length <= 0 || (maxPathRangeS.length > 0 && !maxPathRangeS[maxPathRangeS.length - 1].isFirst)) {
					maxPathRangeS.push({
						x: i,
						y: j,
						isFirst: true
					});
				}
			}
			if (p3 === 0 && p4 === 0 && p5 === 0 && (p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 === 1)) {
				if (maxPathRangeS.length > 0 && maxPathRangeS[maxPathRangeS.length - 1].isFirst) {
					maxPathRangeS.push({
						x: i,
						y: j,
						isFirst: false
					});
				}
			}
		}
	}
	for (var i = width - 1; i >= 0; i--) {
		for (var j = pathRange.minRange.min; j < pathRange.minRange.max; j++) {
			if (martixBinaryImage[i][j] === 0) continue;
			var p4 = (i === width - 1) ? 0 : martixBinaryImage[i + 1][j];
			var p8 = (i === 0) ? 0 : martixBinaryImage[i - 1][j];
			var p2 = (j === 0) ? 0 : martixBinaryImage[i][j - 1];
			var p3 = (i === width - 1 || j === 0) ? 0 : martixBinaryImage[i + 1][j - 1];
			var p9 = (i === 0 || j === 0) ? 0 : martixBinaryImage[i - 1][j - 1];
			var p6 = (j === height - 1) ? 0 : martixBinaryImage[i][j + 1];
			var p5 = (i === width - 1 || j === height - 1) ? 0 : martixBinaryImage[i + 1][j + 1];
			var p7 = (i === 0 || j === height - 1) ? 0 : martixBinaryImage[i - 1][j + 1];
			if (p3 === 0 && p4 === 0 && p5 === 0 && (p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 === 1)) {
				if (minPathRangeE.length <= 0 || (minPathRangeE.length > 0 && !minPathRangeE[minPathRangeE.length - 1].isFirst)) {
					minPathRangeE.push({
						x: i,
						y: j,
						isFirst: true
					});
				}
			}
			if (p9 === 0 && p8 === 0 && p7 === 0 && (p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 === 1)) {
				if (minPathRangeE.length > 0 && minPathRangeE[minPathRangeE.length - 1].isFirst) {
					minPathRangeE.push({
						x: i,
						y: j,
						isFirst: false
					});
				}
			}
		}
		for (var j = pathRange.maxRange.min; j < pathRange.maxRange.max; j++) {
			if (martixBinaryImage[i][j] === 0) continue;
			var p4 = (i === width - 1) ? 0 : martixBinaryImage[i + 1][j];
			var p8 = (i === 0) ? 0 : martixBinaryImage[i - 1][j];
			var p2 = (j === 0) ? 0 : martixBinaryImage[i][j - 1];
			var p3 = (i === width - 1 || j === 0) ? 0 : martixBinaryImage[i + 1][j - 1];
			var p9 = (i === 0 || j === 0) ? 0 : martixBinaryImage[i - 1][j - 1];
			var p6 = (j === height - 1) ? 0 : martixBinaryImage[i][j + 1];
			var p5 = (i === width - 1 || j === height - 1) ? 0 : martixBinaryImage[i + 1][j + 1];
			var p7 = (i === 0 || j === height - 1) ? 0 : martixBinaryImage[i - 1][j + 1];
			if (p3 === 0 && p4 === 0 && p5 === 0 && (p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 === 1)) {
				if (maxPathRangeE.length <= 0 || (maxPathRangeE.length > 0 && !maxPathRangeE[maxPathRangeE.length - 1].isFirst)) {
					maxPathRangeE.push({
						x: i,
						y: j,
						isFirst: true
					});
				}
			}
			if (p9 === 0 && p8 === 0 && p7 === 0 && (p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 === 1)) {
				if (maxPathRangeE.length > 0 && maxPathRangeE[maxPathRangeE.length - 1].isFirst) {
					maxPathRangeE.push({
						x: i,
						y: j,
						isFirst: false
					});
				}
			}
		}
	}
	var minPathRange = [];
	var maxPathRange = [];
	if (toRight) {
		minPathRangeS.sort(function(a, b) {
			return (b.x - a.x);
		});
		minPathRangeE.sort(function(a, b) {
			return (b.x - a.x);
		});
		maxPathRangeS.sort(function(a, b) {
			return (b.x - a.x);
		});
		maxPathRangeE.sort(function(a, b) {
			return (b.x - a.x);
		});
		var tmpArray = [];
		for (var i = minPathRangeS.length - 1; i >= 0; i--) {
			if (minPathRangeS[i].isFirst)
				tmpArray.push(minPathRangeS[i]);
		}
		minPathRangeS = tmpArray.clone();
		tmpArray.length = 0;
		for (var i = minPathRangeE.length - 1; i >= 0; i--) {
			if (minPathRangeE[i].isFirst)
				tmpArray.push(minPathRangeE[i]);
		}
		minPathRangeE = tmpArray.clone();
		tmpArray.length = 0;
		for (var i = maxPathRangeS.length - 1; i >= 0; i--) {
			if (maxPathRangeS[i].isFirst)
				tmpArray.push(maxPathRangeS[i]);
		}
		maxPathRangeS = tmpArray.clone();
		tmpArray.length = 0;
		for (var i = maxPathRangeE.length - 1; i >= 0; i--) {
			if (maxPathRangeE[i].isFirst)
				tmpArray.push(maxPathRangeE[i]);
		}
		maxPathRangeE = tmpArray.clone();
	} else {
		minPathRangeS.sort(function(a, b) {
			return (a.x - b.x);
		});
		minPathRangeE.sort(function(a, b) {
			return (a.x - b.x);
		});
		maxPathRangeS.sort(function(a, b) {
			return (a.x - b.x);
		});
		maxPathRangeE.sort(function(a, b) {
			return (a.x - b.x);
		});
		var tmpArray = [];
		for (var i = minPathRangeS.length - 1; i >= 0; i--) {
			if (minPathRangeS[i].isFirst)
				tmpArray.push(minPathRangeS[i]);
		}
		minPathRangeS = tmpArray.clone();
		tmpArray.length = 0;
		for (var i = minPathRangeE.length - 1; i >= 0; i--) {
			if (minPathRangeE[i].isFirst)
				tmpArray.push(minPathRangeE[i]);
		}
		minPathRangeE = tmpArray.clone();
		tmpArray.length = 0;
		for (var i = maxPathRangeS.length - 1; i >= 0; i--) {
			if (maxPathRangeS[i].isFirst)
				tmpArray.push(maxPathRangeS[i]);
		}
		maxPathRangeS = tmpArray.clone();
		tmpArray.length = 0;
		for (var i = maxPathRangeE.length - 1; i >= 0; i--) {
			if (maxPathRangeE[i].isFirst)
				tmpArray.push(maxPathRangeE[i]);
		}
		maxPathRangeE = tmpArray.clone();
	}
	var length = Math.min(minPathRangeS.length, minPathRangeE.length);
	for (var i = 0; i < length; i++) {
		minPathRange.push(minPathRangeS[i]);
		minPathRange.push(minPathRangeE[i]);
	}
	length = Math.min(maxPathRangeS.length, maxPathRangeE.length);
	for (var i = 0; i < length; i++) {
		maxPathRange.push(maxPathRangeS[i]);
		maxPathRange.push(maxPathRangeE[i]);
	}
	if (toRight) {
		minPathRange.sort(function(a, b) {
			return (a.x - b.x);
		});
		maxPathRange.sort(function(a, b) {
			return (a.x - b.x);
		});
	} else {
		minPathRange.sort(function(a, b) {
			return (b.x - a.x);
		});
		maxPathRange.sort(function(a, b) {
			return (b.x - a.x);
		});
	}
	/*
	for (var i = minPathRange.length - 1; i > 0; i--) {
		if (minPathRange[i - 1].x === minPathRange[i].x && minPathRange[i - 1].y === minPathRange[i].y)
			minPathRange.splice(i, 1);
	}
	for (var i = maxPathRange.length - 1; i > 0; i--) {
		if (maxPathRange[i - 1].x === maxPathRange[i].x && maxPathRange[i - 1].y === maxPathRange[i].y)
			maxPathRange.splice(i, 1);
	}
	*/
	return {
		minPathRange: minPathRange,
		maxPathRange: maxPathRange
	};
};
var _getAnalysisReport_ = function(playground, pathRange, minMiddleLine, maxMiddleLine, stepSkeletonFlg, minXPoint, maxXPoint, toRight) {
	var ratio = {
		x: commConfig.productionSize.height / playground.width,
		y: commConfig.productionSize.width / playground.height
	};
	var resultReport = {
		outerWidth: ((pathRange.max - pathRange.min) * ratio.y).toFixed(2),
		innerWidth: ((maxMiddleLine - minMiddleLine) * ratio.y).toFixed(2)
	};
	if (toRight) {
		if (minXPoint.y > pathRange.min && minXPoint.y < minMiddleLine)
			resultReport.inStep = 'left';
		else resultReport.inStep = 'right';

		if (maxXPoint.y > maxMiddleLine && maxXPoint.y < pathRange.max)
			resultReport.outStep = 'right';
		else resultReport.outStep = 'left';
	} else {
		if (maxXPoint.y > maxMiddleLine && maxXPoint.y < pathRange.max)
			resultReport.inStep = 'right';
		else resultReport.inStep = 'left';

		if (minXPoint.y > pathRange.min && minXPoint.y < minMiddleLine)
			resultReport.outStep = 'left';
		else resultReport.outStep = 'right';
	}
	resultReport.stepProcess = [];
	var countStepLength = 0;
	var objLeft = {
		length: 0,
		cnt: 0,
		angle: 0,
		cntAngle: 0,
		maxAngle: -90,
		minAngle: 90,
		angleList: []
	};
	var objRight = {
		length: 0,
		cnt: 0,
		angle: 0,
		cntAngle: 0,
		maxAngle: -90,
		minAngle: 90,
		angleList: []
	};
	if (resultReport.inStep === 'left') {
		var cycIdx = 0;
		for (cycIdx = 0; cycIdx < Math.min(stepSkeletonFlg.minPathRange.length, stepSkeletonFlg.maxPathRange.length) - 1; cycIdx += 2) {
			var thisStep = {};
			thisStep.from = {
				x: stepSkeletonFlg.minPathRange[cycIdx].x,
				y: stepSkeletonFlg.minPathRange[cycIdx].y
			};
			thisStep.to = {
				x: stepSkeletonFlg.minPathRange[cycIdx + 1].x,
				y: stepSkeletonFlg.minPathRange[cycIdx + 1].y
			};
			if (thisStep.from.x !== thisStep.to.x) {
				if (!resultReport.stepProcess.length) thisStep.stepLength = 0;
				else {
					var currentStepLength = Math.abs((thisStep.from.x - resultReport.stepProcess[resultReport.stepProcess.length - 1].from.x) * ratio.x); // - (_statData.workingScope.deviation * ratio.x);
					countStepLength += currentStepLength;
					thisStep.stepLength = currentStepLength.toFixed(2);
					objLeft.length += currentStepLength;
					objLeft.cnt++;
				}
				thisStep.angle = Math.atan(Math.abs(thisStep.to.y - thisStep.from.y) / Math.abs(thisStep.to.x - thisStep.from.x)) * 180 / Math.PI;
				if (thisStep.to.y > thisStep.from.y) thisStep.angle = -thisStep.angle;
				objLeft.angle += thisStep.angle;
				objLeft.angleList.push(thisStep.angle);
				objLeft.cntAngle++;
				objLeft.maxAngle = Math.max(objLeft.maxAngle, thisStep.angle);
				objLeft.minAngle = Math.min(objLeft.minAngle, thisStep.angle);
				resultReport.stepProcess.push(thisStep);
			}
			var nextStep = {};
			nextStep.from = {
				x: stepSkeletonFlg.maxPathRange[cycIdx].x,
				y: stepSkeletonFlg.maxPathRange[cycIdx].y
			};
			nextStep.to = {
				x: stepSkeletonFlg.maxPathRange[cycIdx + 1].x,
				y: stepSkeletonFlg.maxPathRange[cycIdx + 1].y
			};
			if (nextStep.from.x !== nextStep.to.x) {
				var currentStepLength2 = Math.abs((nextStep.from.x - resultReport.stepProcess[resultReport.stepProcess.length - 1].from.x) * ratio.x); // - (_statData.workingScope.deviation * ratio.x);
				countStepLength += currentStepLength2;
				nextStep.stepLength = currentStepLength2.toFixed(2);
				objRight.length += currentStepLength2;
				objRight.cnt++;
				nextStep.angle = Math.atan(Math.abs(nextStep.to.y - nextStep.from.y) / Math.abs(nextStep.to.x - nextStep.from.x)) * 180 / Math.PI;
				if (nextStep.to.y < nextStep.from.y) nextStep.angle = -nextStep.angle;
				objRight.angle += nextStep.angle;
				objRight.angleList.push(nextStep.angle);
				objRight.cntAngle++;
				objRight.maxAngle = Math.max(objRight.maxAngle, nextStep.angle);
				objRight.minAngle = Math.min(objRight.minAngle, nextStep.angle);
				resultReport.stepProcess.push(nextStep);
			}
		}
		if (resultReport.inStep === resultReport.outStep && stepSkeletonFlg.minPathRange.length > (cycIdx + 1)) {
			var finalStep = {};
			finalStep.from = {
				x: stepSkeletonFlg.minPathRange[cycIdx].x,
				y: stepSkeletonFlg.minPathRange[cycIdx].y
			};
			finalStep.to = {
				x: stepSkeletonFlg.minPathRange[cycIdx + 1].x,
				y: stepSkeletonFlg.minPathRange[cycIdx + 1].y
			};
			if (finalStep.from.x !== finalStep.to.x) {
				if (!resultReport.stepProcess.length) finalStep.stepLength = 0;
				else {
					var currentStepLength = Math.abs((finalStep.from.x - resultReport.stepProcess[resultReport.stepProcess.length - 1].from.x) * ratio.x); // - (_statData.workingScope.deviation * ratio.x);
					countStepLength += currentStepLength;
					finalStep.stepLength = currentStepLength.toFixed(2);
					objLeft.length += currentStepLength;
					objLeft.cnt++;
				}
				finalStep.angle = Math.atan(Math.abs(finalStep.to.y - finalStep.from.y) / Math.abs(finalStep.to.x - finalStep.from.x)) * 180 / Math.PI;
				if (finalStep.to.y > finalStep.from.y) finalStep.angle = -finalStep.angle;
				objLeft.angle += finalStep.angle;
				objLeft.angleList.push(finalStep.angle);
				objLeft.cntAngle++;
				objLeft.maxAngle = Math.max(objLeft.maxAngle, finalStep.angle);
				objLeft.minAngle = Math.min(objLeft.minAngle, finalStep.angle);
				resultReport.stepProcess.push(finalStep);
			}
		}
	} else {
		var cycIdx = 0;
		for (cycIdx = 0; cycIdx < Math.min(stepSkeletonFlg.minPathRange.length, stepSkeletonFlg.maxPathRange.length) - 1; cycIdx += 2) {
			var thisStep = {};
			thisStep.from = {
				x: stepSkeletonFlg.maxPathRange[cycIdx].x,
				y: stepSkeletonFlg.maxPathRange[cycIdx].y
			};
			thisStep.to = {
				x: stepSkeletonFlg.maxPathRange[cycIdx + 1].x,
				y: stepSkeletonFlg.maxPathRange[cycIdx + 1].y
			};
			if (thisStep.from.x !== thisStep.to.x) {
				if (!resultReport.stepProcess.length) thisStep.stepLength = 0;
				else {
					var currentStepLength = Math.abs((thisStep.from.x - resultReport.stepProcess[resultReport.stepProcess.length - 1].from.x) * ratio.x); // - (_statData.workingScope.deviation * ratio.x);
					countStepLength += currentStepLength;
					thisStep.stepLength = currentStepLength.toFixed(2);
					objRight.length += currentStepLength;
					objRight.cnt++;
				}
				thisStep.angle = Math.atan(Math.abs(thisStep.to.y - thisStep.from.y) / Math.abs(thisStep.to.x - thisStep.from.x)) * 180 / Math.PI;
				if (thisStep.to.y < thisStep.from.y) thisStep.angle = -thisStep.angle;
				objRight.angle += thisStep.angle;
				objRight.angleList.push(thisStep.angle);
				objRight.cntAngle++;
				objRight.maxAngle = Math.max(objRight.maxAngle, thisStep.angle);
				objRight.minAngle = Math.min(objRight.minAngle, thisStep.angle);
				resultReport.stepProcess.push(thisStep);
			}
			var nextStep = {};
			nextStep.from = {
				x: stepSkeletonFlg.minPathRange[cycIdx].x,
				y: stepSkeletonFlg.minPathRange[cycIdx].y
			};
			nextStep.to = {
				x: stepSkeletonFlg.minPathRange[cycIdx + 1].x,
				y: stepSkeletonFlg.minPathRange[cycIdx + 1].y
			};
			if (nextStep.from.x !== nextStep.to.x) {
				var currentStepLength2 = Math.abs((nextStep.from.x - resultReport.stepProcess[resultReport.stepProcess.length - 1].from.x) * ratio.x); // - (_statData.workingScope.deviation * ratio.x);
				countStepLength += currentStepLength2;
				nextStep.stepLength = currentStepLength2.toFixed(2);
				objLeft.length += currentStepLength2;
				objLeft.cnt++;
				nextStep.angle = Math.atan(Math.abs(nextStep.to.y - nextStep.from.y) / Math.abs(nextStep.to.x - nextStep.from.x)) * 180 / Math.PI;
				if (nextStep.to.y > nextStep.from.y) nextStep.angle = -nextStep.angle;
				objLeft.angle += nextStep.angle;
				objLeft.angleList.push(nextStep.angle);
				objLeft.cntAngle++;
				objLeft.maxAngle = Math.max(objLeft.maxAngle, nextStep.angle);
				objLeft.minAngle = Math.min(objLeft.minAngle, nextStep.angle);
				resultReport.stepProcess.push(nextStep);
			}
		}
		if (resultReport.inStep === resultReport.outStep && stepSkeletonFlg.maxPathRange.length > (cycIdx + 1)) {
			var finalStep = {};
			finalStep.from = {
				x: stepSkeletonFlg.maxPathRange[cycIdx].x,
				y: stepSkeletonFlg.maxPathRange[cycIdx].y
			};
			finalStep.to = {
				x: stepSkeletonFlg.maxPathRange[cycIdx + 1].x,
				y: stepSkeletonFlg.maxPathRange[cycIdx + 1].y
			};
			if (finalStep.from.x !== finalStep.to.x) {
				if (!resultReport.stepProcess.length) finalStep.stepLength = 0;
				else {
					var currentStepLength = Math.abs((finalStep.from.x - resultReport.stepProcess[resultReport.stepProcess.length - 1].from.x) * ratio.x); // - (_statData.workingScope.deviation * ratio.x);
					countStepLength += currentStepLength;
					finalStep.stepLength = currentStepLength.toFixed(2);
					objRight.length += currentStepLength;
					objRight.cnt++;
				}
				finalStep.angle = Math.atan(Math.abs(finalStep.to.y - finalStep.from.y) / Math.abs(finalStep.to.x - finalStep.from.x)) * 180 / Math.PI;
				if (finalStep.to.y < finalStep.from.y) finalStep.angle = -finalStep.angle;
				objRight.angle += finalStep.angle;
				objRight.angleList.push(finalStep.angle);
				objRight.cntAngle++;
				objRight.maxAngle = Math.max(objRight.maxAngle, finalStep.angle);
				objRight.minAngle = Math.min(objRight.minAngle, finalStep.angle);
				resultReport.stepProcess.push(finalStep);
			}
		}
	}
	resultReport.stepCount = resultReport.stepProcess.length;
	resultReport.samplingDist = Math.abs((maxXPoint.x - minXPoint.x) * ratio.x);
	//resultReport.avgStepLength = (countStepLength / (resultReport.stepCount - 1));
	resultReport.avgLeftStepLength = objLeft.length / objLeft.cnt;
	resultReport.avgLeftAngle = objLeft.angle / objLeft.cntAngle;
	resultReport.minLeftAngle = objLeft.minAngle;
	resultReport.maxLeftAngle = objLeft.maxAngle;
	var tmp = 0;
	if (objLeft.angleList.length) {
		for (var i = 0; i < objLeft.angleList.length; i++) {
			tmp += Math.pow((objLeft.angleList[i] - resultReport.avgLeftAngle), 2);
		}
		resultReport.varianceLeftAngle = tmp / objLeft.angleList.length;
	} else resultReport.varianceLeftAngle = -1;
	resultReport.avgRightStepLength = objRight.length / objRight.cnt;
	resultReport.avgRightAngle = objRight.angle / objRight.cntAngle;
	resultReport.minRightAngle = objRight.minAngle;
	resultReport.maxRightAngle = objRight.maxAngle;
	tmp = 0;
	if (objRight.angleList.length) {
		for (var i = 0; i < objRight.angleList.length; i++) {
			tmp += Math.pow((objRight.angleList[i] - resultReport.avgRightAngle), 2);
		}
		resultReport.varianceRightAngle = tmp / objRight.angleList.length;
	} else resultReport.varianceRightAngle = -1;
	resultReport.avgStepLength = (objLeft.length / objLeft.cnt) + (objRight.length / objRight.cnt);
	resultReport.stepLengthDeviation = Math.abs((objLeft.length / objLeft.cnt) - (objRight.length / objRight.cnt));

	resultReport.stepWidth = ((minMiddleLine - pathRange.min) / 2 + (pathRange.max - maxMiddleLine) / 2 + (maxMiddleLine - minMiddleLine)) * ratio.y;

	return resultReport;
};