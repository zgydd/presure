'use strict';
var delayScaleList = [];
var preInnerData = null;
var turnPosChkList = [];

var _setPoint = function(target, base) {
	target.x = base.x;
	target.y = base.y;
};
//ÖÐÖµÂË²¨
var _medianFilter = function(matrix) {
	var tmpInner = [];
	for (var i = 0; i < matrix.length; i++) {
		var row = [];
		for (var j = 0; j < matrix[i].length; j++) {
			var tmpNum = matrix[i][j];
			switch (true) {
				case (i === 0 && j === 0):
					tmpNum += 25 / 9 * matrix[i][j];
					tmpNum += matrix[i + 1][j];
					tmpNum += matrix[i][j + 1];
					tmpNum += matrix[i + 1][j + 1];
					break;
				case (i === (matrix.length - 1) && j === (matrix[i].length - 1)):
					tmpNum += 25 / 9 * matrix[i][j];
					tmpNum += matrix[i - 1][j];
					tmpNum += matrix[i][j - 1];
					tmpNum += matrix[i - 1][j - 1];
					break;
				case (i === (matrix.length - 1) && j === 0):
					tmpNum += 25 / 9 * matrix[i][j];
					tmpNum += matrix[i - 1][j];
					tmpNum += matrix[i - 1][j + 1];
					tmpNum += matrix[i][j + 1];
					break;
				case (i === 0 && j === (matrix[i].length - 1)):
					tmpNum += 25 / 9 * matrix[i][j];
					tmpNum += matrix[i][j - 1];
					tmpNum += matrix[i + 1][j - 1];
					tmpNum += matrix[i + 1][j];
					break;
				case (i === 0 && j <= (matrix[i].length - 1)):
					tmpNum += 5 / 3 * matrix[i][j];
					tmpNum += matrix[i][j - 1];
					tmpNum += matrix[i + 1][j - 1];
					tmpNum += matrix[i + 1][j];
					tmpNum += matrix[i][j + 1];
					tmpNum += matrix[i + 1][j + 1];
					break;
				case (j === 0 && i < (matrix.length - 1)):
					tmpNum += 5 / 3 * matrix[i][j];
					tmpNum += matrix[i - 1][j];
					tmpNum += matrix[i - 1][j + 1];
					tmpNum += matrix[i + 1][j];
					tmpNum += matrix[i][j + 1];
					tmpNum += matrix[i + 1][j + 1];
					break;
				case (i === (matrix.length - 1)):
					tmpNum += 5 / 3 * matrix[i][j];
					tmpNum += matrix[i][j + 1];
					tmpNum += matrix[i - 1][j + 1];
					tmpNum += matrix[i - 1][j];
					tmpNum += matrix[i][j - 1];
					tmpNum += matrix[i - 1][j - 1];
					break;
				case (j === (matrix[i].length - 1)):
					tmpNum += 5 / 3 * matrix[i][j];
					tmpNum += matrix[i + 1][j];
					tmpNum += matrix[i + 1][j - 1];
					tmpNum += matrix[i - 1][j];
					tmpNum += matrix[i][j - 1];
					tmpNum += matrix[i - 1][j - 1];
					break;
				default:
					tmpNum += matrix[i - 1][j - 1];
					tmpNum += matrix[i - 1][j];
					tmpNum += matrix[i - 1][j + 1];
					tmpNum += matrix[i][j + 1];
					tmpNum += matrix[i + 1][j + 1];
					tmpNum += matrix[i + 1][j];
					tmpNum += matrix[i + 1][j - 1];
					tmpNum += matrix[i][j - 1];
					break;
			}
			tmpNum /= 9;
			row.push(tmpNum);
		}
		tmpInner.push(row);
	}
	return tmpInner;
};
//sobel¾í»ý
var _sobelConvolution = function(matrix) {
	var tmpInner = [];
	for (var i = 1; i < matrix.length - 1; i++) {
		var row = [];
		for (var j = 1; j < matrix[i].length; j++) {
			var Gx = (matrix[i + 1][j - 1] + 2 * matrix[i + 1][j] + matrix[i + 1][j + 1]) - (matrix[i - 1][j - 1] + 2 * matrix[i - 1][j] + matrix[i - 1][j + 1]);
			var Gy = (matrix[i - 1][j - 1] + 2 * matrix[i][j - 1] + matrix[i + 1][j - 1]) - (matrix[i - 1][j + 1] + 2 * matrix[i][j + 1] + matrix[i + 1][j + 1]);
			row.push(Math.abs(Gx) + Math.abs(Gy));
		}
		tmpInner.push(row);
	}

	var innerMatrix = [];
	var maxValue = 0;
	for (var i = 0; i < tmpInner[0].length; i++) {
		var row = [];
		for (var j = 0; j < tmpInner.length; j++) {
			row.push(tmpInner[j][i]);
			if (tmpInner[j][i] > maxValue) maxValue = tmpInner[j][i];
		}
		innerMatrix.push(row);
	}
	return {
		matrix: innerMatrix,
		maxValue: maxValue
	};
};

onmessage = function(event) {
	//postMessage(event.data);
	var sourceData = JSON.parse(event.data);
	var innerData = sourceData.innerData;
	var calibrationData = sourceData.calibrationData;
	var presureRanges = sourceData.presureRanges;
	var newScale = sourceData.baseScale + presureRanges.length;
	var threshold = sourceData.threshold;
	var cd = sourceData.cd ? sourceData.cd : 0;
	var delayedSampling = sourceData.delayedSampling ? sourceData.delayedSampling : 31;
	//var edgeCheckDelay = sourceData.edgeCheckDelay ? sourceData.edgeCheckDelay : 5;
	var collapseRateWeight = sourceData.collapseRateWeight ? sourceData.collapseRateWeight : 6;
	var edgeConfidence = sourceData.edgeConfidence ? sourceData.edgeConfidence : 2;
	var edgeSensitivity = sourceData.edgeSensitivity ? sourceData.edgeSensitivity : 5;
	var middData = {};

	var innerEdges = {
		samplingPoint: []
	};

	if (preInnerData === null) preInnerData = innerData;

	//Edge detection
	var matrixHeatMap = sourceData.matrixHeatMap ? sourceData.matrixHeatMap : null;
	if (matrixHeatMap) {
		for (var i = 0; i < 3; i++) matrixHeatMap = _medianFilter(matrixHeatMap);
		matrixHeatMap = _sobelConvolution(matrixHeatMap);
	}

	//##########Algorithms about times and presure################
	var maxPrecent = 0;
	//var cntChangedPoint = 0;
	for (var i = 0; i < innerData.length; i++) {
		for (var j = 0; j < innerData[i].length; j++) {
			//if (Math.abs(preInnerData[i][j] - innerData[i][j]) > 20) cntChangedPoint++;
			if (innerData[i][j] === 0 || innerData[i][j] <= calibrationData[i][j]) continue;
			var mePrecent = (innerData[i][j] - calibrationData[i][j]) / (1024 - calibrationData[i][j]);
			maxPrecent = Math.max(maxPrecent, mePrecent);
			if (i === 0 || i === innerData.length - 1 || j === 0 || j === innerData[i].length - 1) continue;
			var upWeight = (innerData[i][j - 1] - calibrationData[i][j - 1]) / (1024 - calibrationData[i][j - 1]);
			upWeight = mePrecent / ((upWeight === 0) ? 0.001 : upWeight);
			var rightWeight = (innerData[i + 1][j] - calibrationData[i + 1][j]) / (1024 - calibrationData[i + 1][j]);
			rightWeight = mePrecent / ((rightWeight === 0) ? 0.001 : rightWeight);
			var bottomWeight = (innerData[i][j + 1] - calibrationData[i][j + 1]) / (1024 - calibrationData[i][j + 1]);
			bottomWeight = mePrecent / ((bottomWeight === 0) ? 0.001 : bottomWeight);
			var leftWeight = (innerData[i - 1][j] - calibrationData[i - 1][j]) / (1024 - calibrationData[i - 1][j]);
			leftWeight = mePrecent / ((leftWeight === 0) ? 0.001 : leftWeight);
			var check = 0;
			if (upWeight > collapseRateWeight) check++;
			if (rightWeight > collapseRateWeight) check++;
			if (bottomWeight > collapseRateWeight) check++;
			if (leftWeight > collapseRateWeight) check++;
			if (check > 0 && check <= edgeConfidence)
				innerEdges.samplingPoint.push({
					x: i,
					y: j
				});
		}
	}
	/*
		var edge8 = {
			topLeft: null,
			topRight: null,
			rightTop: null,
			rightBottom: null,
			bottomRight: null,
			bottomLeft: null,
			leftBottom: null,
			leftTop: null
		};
		var minX = innerData.length;
		var maxX = 0;
		var minY = innerData[0].length;
		var maxY = 0;
		for (var i = 0; i < innerEdges.samplingPoint.length; i++) {
			minX = Math.min(minX, innerEdges.samplingPoint[i].x);
			maxX = Math.max(maxX, innerEdges.samplingPoint[i].x);
			minY = Math.min(minY, innerEdges.samplingPoint[i].y);
			maxY = Math.max(maxY, innerEdges.samplingPoint[i].y);
		}
		var tmpLineTop = [];
		var tmpLineRight = [];
		var tmpLineBottom = [];
		var tmpLineLeft = [];
		for (var i = 0; i < innerEdges.samplingPoint.length; i++) {
			if (innerEdges.samplingPoint[i].y === minY) tmpLineTop.push(innerEdges.samplingPoint[i]);
			if (innerEdges.samplingPoint[i].x === maxX) tmpLineRight.push(innerEdges.samplingPoint[i]);
			if (innerEdges.samplingPoint[i].y === maxY) tmpLineBottom.push(innerEdges.samplingPoint[i]);
			if (innerEdges.samplingPoint[i].x === minX) tmpLineLeft.push(innerEdges.samplingPoint[i]);
		}
		tmpLineTop.sort(function(a, b) {
			return a.x - b.x;
		});
		tmpLineRight.sort(function(a, b) {
			return a.y - b.y;
		});
		tmpLineBottom.sort(function(a, b) {
			return b.x - a.x;
		});
		tmpLineLeft.sort(function(a, b) {
			return b.y - a.y;
		});
		if (tmpLineTop.length) {
			edge8.topLeft = tmpLineTop[0];
			edge8.topRight = tmpLineTop[tmpLineTop.length - 1];
		}
		if (tmpLineRight.length) {
			edge8.rightTop = tmpLineRight[0];
			edge8.rightBottom = tmpLineRight[tmpLineRight.length - 1];
		}
		if (tmpLineBottom.length) {
			edge8.bottomRight = tmpLineBottom[0];
			edge8.bottomLeft = tmpLineBottom[tmpLineBottom.length - 1];
		}
		if (tmpLineLeft.length) {
			edge8.leftBottom = tmpLineLeft[0];
			edge8.leftTop = tmpLineLeft[tmpLineLeft.length - 1];
		}
	*/
	if (maxPrecent <= 0) {
		preInnerData = innerData;
		return;
	}

	middData.maxPrecent = maxPrecent;
	middData.maxPrecentBase = ((1024 / (presureRanges.length + 1) * 1) / 1024);
	//middData.cntChangedPoint = cntChangedPoint;
	//middData.cntChangedPointPrec = cntChangedPoint / (innerData.length * innerData[0].length);
	middData.innerEdges = innerEdges;

	/*
	middData.innerPos = edge8;
	if (edge8.topLeft && edge8.topRight && edge8.rightTop && edge8.rightBottom &&
		edge8.bottomRight && edge8.bottomLeft && edge8.leftBottom && edge8.leftTop)
		turnPosChkList.push(edge8);
	*/
	var forceback = false;
	/*
	middData.turnPosChkListLength = turnPosChkList.length;
	middData.edgeCheckDelay = edgeCheckDelay;
	if (turnPosChkList.length > edgeCheckDelay) {
		//checkEdge
		var displaceCount = 0;
		for (var i = 1; i < turnPosChkList.length; i++) {
			if (Math.abs(turnPosChkList[i - 1].topLeft.x - turnPosChkList[i].topLeft.x) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].topLeft.y - turnPosChkList[i].topLeft.y) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].topRight.x - turnPosChkList[i].topRight.x) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].topRight.y - turnPosChkList[i].topRight.y) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].rightTop.x - turnPosChkList[i].rightTop.x) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].rightTop.y - turnPosChkList[i].rightTop.y) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].rightBottom.x - turnPosChkList[i].rightBottom.x) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].rightBottom.y - turnPosChkList[i].rightBottom.y) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].bottomRight.x - turnPosChkList[i].bottomRight.x) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].bottomRight.y - turnPosChkList[i].bottomRight.y) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].bottomLeft.x - turnPosChkList[i].bottomLeft.x) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].bottomLeft.y - turnPosChkList[i].bottomLeft.y) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].leftBottom.x - turnPosChkList[i].leftBottom.x) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].leftBottom.y - turnPosChkList[i].leftBottom.y) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].leftTop.x - turnPosChkList[i].leftTop.x) > 2) displaceCount++;
			if (Math.abs(turnPosChkList[i - 1].leftTop.y - turnPosChkList[i].leftTop.y) > 2) displaceCount++;
		}
		if (displaceCount > edgeSensitivity) forceback = true;
		middData.displaceCount = displaceCount;
		turnPosChkList.length = 0;
	}
	*/
	if (!forceback) {
		var idxPresureRange = 0;
		for (idxPresureRange = 1; idxPresureRange <= presureRanges.length; idxPresureRange++) {
			if (maxPrecent <= ((1024 / (presureRanges.length + 1) * idxPresureRange) / 1024)) {
				newScale -= idxPresureRange;
				break;
			}
		}
		if (idxPresureRange > presureRanges.length) newScale -= presureRanges.length;
		newScale++;
	}
	/*
	if (cntChangedPoint / (innerData.length * innerData[0].length) <= 0.3) {
		var idxPresureRange = 0;
		for (idxPresureRange = 1; idxPresureRange <= presureRanges.length; idxPresureRange++) {
			if (maxPrecent <= ((1024 / (presureRanges.length + 1) * idxPresureRange) / 1024)) {
				newScale -= idxPresureRange;
				break;
			}
		}
		if (idxPresureRange > presureRanges.length) newScale -= presureRanges.length;
		newScale++;
	} else forceback = true;
	*/
	middData.newScale = newScale;
	var newCountDownRange = 0;
	for (var i = 0; i < threshold.length; i++) {
		if (threshold[i].min <= newScale && threshold[i].max >= newScale) {
			newCountDownRange = threshold[i].rangeTime;
			break;
		}
	}
	middData.newCountDownRange = newCountDownRange;
	/*
		if (innerEdges.samplingPoint.length < 10) {
			delayScaleList.length = 0;
			turnPosChkList.length = 0;
			postMessage(JSON.stringify({
				cd: cd,
				data: newCountDownRange,
				middData: middData,
				leave: true
			}));
		}
		if (forceback) {
			delayScaleList.length = 0;
			postMessage(JSON.stringify({
				cd: cd,
				data: newCountDownRange,
				middData: middData,
				forceback: true
			}));
		}
	*/
	///*-----------delay recalc
	if (delayScaleList.length < delayedSampling) {
		delayScaleList.push(newCountDownRange);
		preInnerData = innerData;
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
		cnt: delayScaleList.length - tmpIdx[tmpIdx.length - 1].cnt,
		value: delayScaleList[delayScaleList.length - 1]
	});
	middData.tmpIdx = tmpIdx;
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
	middData.dualCountDownRange = newCountDownRange;
	delayScaleList.length = 0;
	//---------------------------------------*/
	preInnerData = innerData;
	postMessage(JSON.stringify({
		cd: cd,
		data: newCountDownRange,
		matrixHeatMap: matrixHeatMap,
		middData: middData
	}));
};