'use strict';
var delayScaleList = [];
var preInnerData = null;

onmessage = function(event) {
	//postMessage(event.data);
	var sourceData = JSON.parse(event.data);

	var newScale = sourceData.baseScale;
	var innerData = sourceData.innerData;
	var calibrationData = sourceData.calibrationData;
	var presureRanges = sourceData.presureRanges;
	var threshold = sourceData.threshold;
	var cd = sourceData.cd ? sourceData.cd : 0;

	if (!preInnerData) preInnerData = innerData;

	//##########Algorithms about times and presure################
	var maxPrecent = 0;
	for (var i = 0; i < innerData.length; i++) {
		for (var j = 0; j < innerData[i].length; j++) {
			if (innerData[i][j] === 0 || innerData[i][j] <= calibrationData[i][j]) continue;
			maxPrecent = Math.max(maxPrecent, (innerData[i][j] - calibrationData[i][j]) / (1024 - calibrationData[i][j]));
		}
	}
	var idxPresureRange = 0;
	for (idxPresureRange = presureRanges.length; idxPresureRange > 0; idxPresureRange--) {
		if (maxPrecent > ((1024 / presureRanges.length * idxPresureRange) / 1024)) {
			newScale += idxPresureRange;
			break;
		}
	}
	if (idxPresureRange === 0) newScale += presureRanges.length;
	var newCountDownRange = 0;
	for (var i = 0; i < threshold.length; i++) {
		if (threshold[i].min <= newScale && threshold[i].max >= newScale) {
			newCountDownRange = threshold[i].rangeTime;
			break;
		}
	}

	///*-----------delay recalc
	if (delayScaleList.length < 31) {
		delayScaleList.push(newCountDownRange);
		return;
	}
	delayScaleList.sort();

	var tmpIdx = [];
	for (var i = 0; i < delayScaleList.length - 1; i++) {
		if (delayScaleList[i] !== delayScaleList[i + 1]) {
			if (!tmpIdx.length) tmpIdx.push({
				cnt: i + 1,
				value: delayScaleList[i]
			});
			else tmpIdx.push({
				cnt: i + 1 - tmpIdx[tmpIdx.length - 1].cnt,
				value: delayScaleList[i]
			});
		}
	}
	if (!tmpIdx.length) tmpIdx.push({
		cnt: delayScaleList.length,
		value: delayScaleList[delayScaleList.length - 1]
	});
	else tmpIdx.push({
		cnt: delayScaleList.length - tmpIdx[tmpIdx.length - 1],
		value: delayScaleList[delayScaleList.length - 1]
	});
	if (tmpIdx.length <= 1) newCountDownRange = delayScaleList[0];
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
	delayScaleList.length = 0;
	postMessage(JSON.stringify({
		cd: cd,
		data: newCountDownRange
	}));
};