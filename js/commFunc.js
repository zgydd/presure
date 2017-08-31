'use strict';
//Common function
var _readFile = function(uri, encode, type) {
	try {
		var fs = require('fs');
		var path = require('path');
		switch (type) {
			case 'json':
				return JSON.parse(fs.readFileSync(path.normalize(uri), encode));
			case 'txt':
				return fs.readFileSync(path.normalize(uri), encode);
			default:
				return null;
		}
	} catch (e) {
		return null;
	}
};
var _saveFile = function(uri, bufferData, rewrite) {
	try {
		if (rewrite) {
			var fs = require('fs');
			var path = require('path');
			fs.writeFile(path.normalize(uri), bufferData, function(err) {
				if (err) throw err;
			});
			fs.open(path.normalize(uri), 'wx', function(err, fd) {
				if (err) {
					fs.mkdir(path.dirname(uri), function(err) {
						if (!err) {
							fs.writeFile(path.normalize(uri), bufferData, function(err) {
								if (err) throw err;
							});
						}
					});
				}
				fs.close(fd);
			});
		} else {
			//Append
		}
	} catch (e) {}
};
var _showMessage = function(type, message) {
	var msgType = '';
	switch (type) {
		case 'warn':
			msgType = 'alert-danger'; //'common-base-warn';
			break;
		case 'ok':
			msgType = 'alert-success'; //'common-base-ok';
			break;
		default:
			break;
	}
	if (!msgType || !message) return;
	$('#common-message').html(message);
	$('#common-message').addClass(msgType);
	$('#common-message').fadeIn(66);
	setTimeout(function() {
		$('#common-message').removeClass(msgType);
		$('#common-message').fadeOut(888);
	}, 888);
};
var _chkEqual = function(a, b) {
	try {
		return (a.toString().trim() === b.toString().trim());
	} catch (e) {
		return false;
	}
};
var _toInt = function(data) {
	try {
		return parseInt(data);
	} catch (e) {
		return 0;
	}
};
var _toFloat = function(data) {
	try {
		return parseFloat(data);
	} catch (e) {
		return 0;
	}
};
var _hex2char = function(data) {
	var a = data;
	switch (a.length) {
		case 1:
			a = '%u000' + a;
			break;
		case 2:
			a = '%u00' + a;
			break;
		case 3:
			a = '%u0' + a;
			break;
		case 4:
			a = '%u' + a;
			break;
		default:
			break;
	}
	return unescape(a);
};
var _getDefaultMultiples = function(proudctSize) {
	switch (proudctSize) {
		case "16-16":
			if (window.screen.height / window.screen.width === 9 / 16) return 5.63;
			else return 5.45;
		case "32-80":
			if (window.screen.height / window.screen.width === 9 / 16) return 2.35;
			else return 2.15;
		default:
			return 1;
	}
};
var _setEnterCommit = function(e) {
	var ev = document.all ? window.event : e;
	if (ev.keyCode == 13) $(ev.target).trigger('blur');
};
var _clearSubDomEvent = function(baseNode, eveType, func) {
	baseNode.each(function(i, n) {
		var ele = $(n);
		ele.off(eveType, func);
		if (ele.children().length) {
			_clearSubDomEvent(ele.children());
		}
	});
};
Date.prototype.Format = function(fmt) {
	var o = {
		"M+": this.getMonth() + 1,
		"d+": this.getDate(),
		"h+": this.getHours(),
		"m+": this.getMinutes(),
		"s+": this.getSeconds(),
		"q+": Math.floor((this.getMonth() + 3) / 3),
		"S": this.getMilliseconds()
	};
	if (/(y+)/.test(fmt))
		fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for (var k in o)
		if (new RegExp("(" + k + ")").test(fmt))
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
	return fmt;
};
Date.prototype.getDiff = function(oldTimeStamp) {
	var timeStampDiff = this.getTime() - oldTimeStamp;

	var days = Math.floor(timeStampDiff / (24 * 3600 * 1000));
	var leave1 = timeStampDiff % (24 * 3600 * 1000);
	var hours = Math.floor(leave1 / (3600 * 1000));
	var leave2 = leave1 % (3600 * 1000);
	var minutes = Math.floor(leave2 / (60 * 1000));
	var leave3 = leave2 % (60 * 1000);
	var seconds = Math.round(leave3 / 1000);

	var result = {};
	switch (true) {
		case (days > 0):
			result.d = days;
			result.h = hours;
			result.m = minutes;
			result.s = seconds;
			break;
		case (days <= 0 && hours > 0):
			result.h = hours;
			result.m = minutes;
			result.s = seconds;
			break;
		case (days <= 0 && hours <= 0 && minutes > 0):
			result.m = minutes;
			result.s = seconds;
			break;
		case (days <= 0 && hours <= 0 && minutes <= 0 && seconds > 0):
			result.s = seconds;
			break;
		default:
			result = null;
			break;
	}
	return result;
};
Array.prototype.clone = function() {
	var result = [];
	for (var i = 0; i < this.length; i++) {
		result.push(this[i]);
	}
	return result;
};

//No used
/*
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
				/-*
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
				*-/
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
*/
var _convolutionBase = function(matrix, type) {
	if (!matrix || matrix.length < 5 || matrix[0].length < 5) return null;
	var result = [];
	var tpEdge = [];
	for (var tpi = 0; tpi < matrix[0].length; tpi++) {
		tpEdge.push(0);
	}
	result.push(tpEdge.slice(0), tpEdge.slice(0));
	for (var i = 2; i < matrix.length - 2; i++) {
		var row = [0, 0];
		for (var j = 2; j < matrix[i].length - 2; j++) {
			switch (type) {
				case 'S00':
					row.push(_convolutionS00(matrix, i, j));
					break;
				case 'S45':
					row.push(_convolutionS45(matrix, i, j));
					break;
				case 'S90':
					row.push(_convolutionS90(matrix, i, j));
					break;
				case 'S135':
					row.push(_convolutionS135(matrix, i, j));
					break;
				default:
					break;
			}
		}
		row.push(0, 0);
		result.push(row);
	}
	result.push(tpEdge.slice(0), tpEdge.slice(0));
	tpEdge = null;
	return result;
};
var _convolutionS00 = function(matrix, row, col) {
	return (2 * (matrix[row][col - 2] + matrix[row][col - 1] + matrix[row][col] + matrix[row][col + 1] + matrix[row][col] + 2) - (matrix[row - 2][col - 2] + matrix[row - 2][col - 1] + matrix[row - 2][col] + matrix[row - 2][col + 1] + matrix[row - 2][col + 2] + matrix[row + 2][col - 2] + matrix[row + 2][col - 1] + matrix[row + 2][col] + matrix[row + 2][col + 1] + matrix[row + 2][col + 2]));
};
var _convolutionS45 = function(matrix, row, col) {
	return (2 * (matrix[row - 2][col + 2] + matrix[row - 1][col + 1] + matrix[row][col] + matrix[row + 1][col - 1] + matrix[row + 2][col - 2]) - (matrix[row - 2][col - 1] + matrix[row - 2][col] + matrix[row - 1][col - 2] + matrix[row - 1][col - 1] + matrix[row][col - 2] + matrix[row][col + 2] + matrix[row + 1][col + 1] + matrix[row + 1][col + 2] + matrix[row + 2][col] + matrix[row + 2][col + 1]));
};
var _convolutionS90 = function(matrix, row, col) {
	return (2 * (matrix[row - 2][col] + matrix[row - 1][col] + matrix[row][col] + matrix[row + 1][col] + matrix[row + 2][col]) - (matrix[row - 2][col - 2] + matrix[row - 1][col - 2] + matrix[row][col - 2] + matrix[row + 1][col - 2] + matrix[row + 2][col - 2] + matrix[row - 2][col + 2] + matrix[row - 1][col + 2] + matrix[row][col + 2] + matrix[row + 1][col + 2] + matrix[row + 2][col + 2]));
};
var _convolutionS135 = function(matrix, row, col) {
	return (2 * (matrix[row - 2][col - 2] + matrix[row - 1][col - 1] + matrix[row][col] + matrix[row + 1][col + 1] + matrix[row + 2][col + 2]) - (matrix[row - 2][col] + matrix[row - 2][col + 1] + matrix[row - 1][col + 1] + matrix[row - 1][col + 2] + matrix[row][col - 2] + matrix[row][col + 2] + matrix[row + 1][col - 2] + matrix[row + 1][col - 1] + matrix[row + 2][col - 1] + matrix[row + 2][col]));
};