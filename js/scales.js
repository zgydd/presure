'use strict';
//Logic
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
				for (var j = 0; j < tmpLength; j++) {
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
		var scale = _readFile(_commonConstant.path + scaleName.trim().toLowerCase() + '_' + _commonConstant.scale, 'utf8', 'txt');
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
	} catch (e) {
		alert(e);
	}
};
//Page behavior
$('#test').on('click', function() {
	_recalcScale(6);
});
$(document).ready(function() {
	callLocales(_statData.defaultLanguage);
	if (commConfig.scaleTables && commConfig.scaleTables.length) {
		for (var i = 0; i < commConfig.scaleTables.length; i++) {
			$('#scale-table-list').append('<li role="presentation"><a href="#">' + commConfig.scaleTables[i] + '</a></li>');
		}
	}
});
$('#scale-submit').on('click', function() {
	if ($(this).hasClass('disabled')) return;
	_statData.preCountDown = _statData.preCountDownRange = _statData.countDownTime;
	if (_statData.countDownTime <= 0) {
		$('#countdown').stop();
		$('#countdown').hide();
		return;
	}
	_statData.restDistance = 1;
	if ($('#countdown') && $('#countdown').length) {
		//$('#countdown').addClass('alert-success');
		if (!$('#countdown').children() || !$('#countdown').children().length) {
			$('#countdown').countdown({
				timestamp: _statData.countDownTime,
				callback: _countDownCallBack
			});
		} else $('#countdown').reset(_statData.countDownTime);
	}
	callHeatmap();
});
$('.nav-pills li').on('click', function() {
	var activedPage = $(this).get(0).innerText;
	if (!activedPage) return;
	$('.nav-pills li').each(function() {
		if (activedPage === $(this).get(0).innerText) $(this).addClass('active');
		else $(this).removeClass('active');
	});
	_getActivedScale(activedPage);
});