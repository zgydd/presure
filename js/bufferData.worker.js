'use strict';
var splitPoint = null;
var innerData = null;
var callbackFlg = false;

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
var _formatABufferData = function(startIdx, endIdx, bufferData) {
	if (endIdx - startIdx != 5) return;
	var x = parseInt(bufferData[startIdx]);
	var y = parseInt(bufferData[startIdx + 1]);
	if (y >= innerData.length || x >= innerData[0].length) return;

	if (!splitPoint) splitPoint = {
		x: x,
		y: y
	};
	else if (splitPoint.x === x && splitPoint.y === y) callbackFlg = true;

	var recordData = [];
	for (var i = startIdx + 2; i < endIdx; i++) {
		recordData.push(_hex2char(bufferData[i].toString(16)));
	}
	var numData = parseInt(new String(recordData[0] + recordData[1] + recordData[2]), 16);
	if (innerData[y][x] != numData) {
		innerData[y][x] = numData;
	}
};

onmessage = function(event) {
	var message = JSON.parse(event.data);
	if (!innerData) innerData = message.innerData;
	var startPos = 0;
	var buffer = message.data.data;
	for (startPos = 0; startPos < buffer.length; startPos++) {
		if (buffer[startPos] === 255) break;
	}
	if (startPos >= buffer.length) return;
	var startIdx = startPos + 1;
	for (var i = startPos + 1; i < buffer.length; i++) {

		if (buffer[i] === 255) {
			_formatABufferData(startIdx, i, buffer);
			startIdx = i + 1;
		}
	}

	if (callbackFlg) {
		postMessage(JSON.stringify(innerData));
		splitPoint = null;
		innerData = null;
		callbackFlg = false;
	}
};