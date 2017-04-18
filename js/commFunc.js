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
			fs.open(path.normalize(uri), 'wx', (err, fd) => {
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