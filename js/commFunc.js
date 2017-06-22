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

	return days + " : " + hours + " : " + minutes + " : " + seconds;
};