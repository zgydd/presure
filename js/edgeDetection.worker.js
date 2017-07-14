'use strict';
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
	var sourceData = JSON.parse(event.data);
	var imgData = (sourceData.imgData && sourceData.imgData.length && sourceData.imgData[0].length) ? sourceData.imgData : null;
	var filterTimes = sourceData.filterTimes ? sourceData.filterTimes : 3;
	if (!imgData) return;
	//Edge detection
	if (imgData) {
		for (var i = 0; i < filterTimes; i++) imgData = _medianFilter(imgData);
		imgData = _sobelConvolution(imgData);
		/*
		if (imgData.matrix) {
			imgData.skeleton = {
				S00: _convolutionBase(imgData.matrix, 'S00'),
				S45: _convolutionBase(imgData.matrix, 'S45'),
				S90: _convolutionBase(imgData.matrix, 'S90'),
				S135: _convolutionBase(imgData.matrix, 'S135')
			};			
		}
		*/
	}
	postMessage(JSON.stringify(imgData));
};