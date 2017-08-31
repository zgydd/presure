'use strict';
//  p9 p2 p3  
//  p8 p1 p4  
//  p7 p6 p5  
var _thinImage = function(matrix, skeletonLimit) {
	if (!matrix || !matrix.length || !matrix[0].length) return matrix;
	var ite = (!skeletonLimit || isNaN(parseInt(skeletonLimit))) ? 0 : parseInt(skeletonLimit);
	var width = matrix[0].length;
	var height = matrix.length;
	var count = 0;
	while (true) {
		count++;
		if (ite && count > ite) break;
		var delMark = [];
		for (var i = 0; i < height; i++) {
			for (var j = 0; j < width; j++) {
				var p1 = matrix[i][j];
				if (p1 !== 1) continue;
				var p4 = (j === width - 1) ? 0 : matrix[i][j + 1];
				var p8 = (j === 0) ? 0 : matrix[i][j - 1];
				var p2 = (i === 0) ? 0 : matrix[i - 1][j];
				var p3 = (i === 0 || j === width - 1) ? 0 : matrix[i - 1][j + 1];
				var p9 = (i === 0 || j === 0) ? 0 : matrix[i - 1][j - 1];
				var p6 = (i === height - 1) ? 0 : matrix[i + 1][j];
				var p5 = (i === height - 1 || j === width - 1) ? 0 : matrix[i + 1][j + 1];
				var p7 = (i === height - 1 || j === 0) ? 0 : matrix[i + 1][j - 1];
				if ((p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9) >= 2 && (p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9) <= 6) {
					var ap = 0;
					if (p2 === 0 && p3 === 1) ++ap;
					if (p3 === 0 && p4 === 1) ++ap;
					if (p4 === 0 && p5 === 1) ++ap;
					if (p5 === 0 && p6 === 1) ++ap;
					if (p6 === 0 && p7 === 1) ++ap;
					if (p7 === 0 && p8 === 1) ++ap;
					if (p8 === 0 && p9 === 1) ++ap;
					if (p9 === 0 && p2 === 1) ++ap;

					if (ap === 1 && p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0)
						delMark.push({
							x: i,
							y: j
						});
				}
			}
		}
		if (delMark.length <= 0) break;
		else {
			for (var i = 0; i < delMark.length; i++) {
				matrix[delMark[i].x][delMark[i].y] = 0;
			}
		}
		delMark.length = 0;
		for (var i = 0; i < height; i++) {
			for (var j = 0; j < width; j++) {
				var p1 = matrix[i][j];
				if (p1 !== 1) continue;
				var p4 = (j === width - 1) ? 0 : matrix[i][j + 1];
				var p8 = (j === 0) ? 0 : matrix[i][j - 1];
				var p2 = (i === 0) ? 0 : matrix[i - 1][j];
				var p3 = (i === 0 || j === width - 1) ? 0 : matrix[i - 1][j + 1];
				var p9 = (i === 0 || j === 0) ? 0 : matrix[i - 1][j - 1];
				var p6 = (i === height - 1) ? 0 : matrix[i + 1][j];
				var p5 = (i === height - 1 || j === width - 1) ? 0 : matrix[i + 1][j + 1];
				var p7 = (i === height - 1 || j === 0) ? 0 : matrix[i + 1][j - 1];
				if ((p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9) >= 2 && (p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9) <= 6) {
					var ap = 0;
					if (p2 === 0 && p3 === 1) ++ap;
					if (p3 === 0 && p4 === 1) ++ap;
					if (p4 === 0 && p5 === 1) ++ap;
					if (p5 === 0 && p6 === 1) ++ap;
					if (p6 === 0 && p7 === 1) ++ap;
					if (p7 === 0 && p8 === 1) ++ap;
					if (p8 === 0 && p9 === 1) ++ap;
					if (p9 === 0 && p2 === 1) ++ap;

					if (ap === 1 && p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0)
						delMark.push({
							x: i,
							y: j
						});
				}
			}
		}
		if (delMark.length <= 0) break;
		else {
			for (var i = 0; i < delMark.length; i++) {
				matrix[delMark[i].x][delMark[i].y] = 0;
			}
		}
		delMark.length = 0;
	}
	return count;
};
onmessage = function(event) {
	//postMessage(event.data);
	//return;
	var sourceData = JSON.parse(event.data);
	var binaryImgData = (sourceData.binaryImg && sourceData.binaryImg.length && sourceData.binaryImg[0].length) ? sourceData.binaryImg : null;
	var skeletonLimit = sourceData.skeletonLimit ? sourceData.skeletonLimit : 0;
	var skeleton = null;
	var skeletonTimes = -1;
	if (binaryImgData) {
		var innerMatrix = [];
		//var maxValue = 0;
		for (var i = 0; i < binaryImgData[0].length; i++) {
			var row = [];
			for (var j = 0; j < binaryImgData.length; j++) {
				row.push(binaryImgData[j][i]);
				//if (binaryImgData[j][i] > maxValue) maxValue = binaryImgData[j][i];
			}
			innerMatrix.push(row);
		}
		skeletonTimes = _thinImage(innerMatrix, skeletonLimit);
	}
	postMessage(JSON.stringify({
		skeletonTimes: skeletonTimes,
		skeleton: innerMatrix
	}));
};