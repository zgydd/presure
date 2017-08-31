'use strict';
$(document).ready(function() {
	callLocales(_statData.defaultLanguage);
	whoAmI(_statData.envHost);
	$('.record-part').hide();
	for (var i = 0; i < _collectedStepList.length; i++) {
		var btnRecord = document.createElement('button');
		btnRecord.id = i;
		$(btnRecord).html((new Date(_collectedStepList[i].startTimestamp)).Format("yyyy-MM-dd hh:mm:ss"));
		$(btnRecord).addClass('btn btn-default btn-in-record');
		$('.record-list-container').append(btnRecord);
	}
	$('.btn-in-record').on('click', function() {
		var currentId = $(this).get(0).id;
		var record = document.createElement('div');
		record.id = 'stepRecord_' + currentId;
		var timeRange = document.createElement('label');
		var html = '<span z-lang="langRecordStart">' + _getLocalesValue('langRecordStart', 'Start at:') + '</span>' + (new Date(_collectedStepList[currentId].startTimestamp)).Format("yyyy-MM-dd hh:mm:ss");
		html += '&nbsp;&nbsp;&nbsp;<span z-lang="langRecordFinished">' + _getLocalesValue('langRecordFinished', 'Finished at:') + '</span>' + (new Date(_collectedStepList[currentId].finishedTimestamp)).Format("yyyy-MM-dd hh:mm:ss");
		html += '&nbsp;&nbsp;&nbsp;<span z-lang="langRecordTestTime">' + _getLocalesValue('langRecordTestTime', 'Times:') + '</span>' + Math.abs(_collectedStepList[currentId].finishedTimestamp - _collectedStepList[currentId].startTimestamp) / 1000 + 's';
		$(timeRange).html(html);
		$(timeRange).addClass('record-title');
		record.appendChild(timeRange);
		var vidCanvas = document.createElement('canvas');
		if (_collectedStepList[currentId].canvasData && _collectedStepList[currentId].canvasData.length) {
			var oneCollect = _collectedStepList[currentId].canvasData[0].image;
			var ctxOneCollect = oneCollect.getContext("2d");
			vidCanvas.width = oneCollect.width;
			vidCanvas.height = oneCollect.height;
			var ctxInStep = vidCanvas.getContext("2d");
			ctxInStep.putImageData(ctxOneCollect.getImageData(0, 0, oneCollect.width, oneCollect.height), 0, 0);
		}
		record.appendChild(vidCanvas);

		var ctrlGroup = document.createElement('div');
		$(ctrlGroup).addClass('btn-group');

		var btnPlay = document.createElement('button');
		btnPlay.id = currentId;
		$(btnPlay).attr('z-lang', 'langRecordPlay')
		$(btnPlay).html(_getLocalesValue('langRecordPlay', 'Play'));
		$(btnPlay).addClass('btn-play-record btn btn-primary');
		ctrlGroup.appendChild(btnPlay);

		var btnShowBinaryImage = document.createElement('button');
		btnShowBinaryImage.id = currentId;
		$(btnShowBinaryImage).attr('z-lang', 'langRecordBinaryImage')
		$(btnShowBinaryImage).html(_getLocalesValue('langRecordBinaryImage', 'Binary Image'));
		$(btnShowBinaryImage).addClass('btn-show-binary btn btn-primary');
		ctrlGroup.appendChild(btnShowBinaryImage);

		var btnShowAnalysis = document.createElement('button');
		btnShowAnalysis.id = currentId;
		$(btnShowAnalysis).attr('z-lang', 'langRecordAnalysis')
		$(btnShowAnalysis).html(_getLocalesValue('langRecordAnalysis', 'Analysis'));
		$(btnShowAnalysis).addClass('btn-show-analysis btn btn-primary');
		ctrlGroup.appendChild(btnShowAnalysis);

		record.appendChild(ctrlGroup);
		//$(record).addClass('recorder-container');
		$('.record-container').append(record);
		$('.btn-play-record').on('click', function() {
			var id = $(this).get(0).id;
			var record = _collectedStepList[id];
			var playground = $('#stepRecord_' + id + ' > canvas').get(0);
			_playRecord(record.canvasData, 0, playground);
		});
		$('.btn-show-binary').on('click', function() {
			var id = $(this).get(0).id;
			var record = _collectedStepList[id];
			var playground = $('#stepRecord_' + id + ' > canvas').get(0);
			if (_statData.playHandle) {
				clearTimeout(_statData.playHandle);
				_statData.playHandle = 0;
			}
			if (!record.binaryImageData || record.binaryFilter !== commConfig.binaryImageFilter) {
				record.binaryImageData = _showBinaryImage(record.canvasData, playground);
				record.binaryFilter = commConfig.binaryImageFilter;
			} else {
				var ctx = playground.getContext("2d");
				ctx.clearRect(0, 0, playground.width, playground.height);
				ctx.putImageData(record.binaryImageData, 0, 0);
			}
		});
		$('.btn-show-analysis').on('click', function() {
			if (_statData.workingScope)
				_showMessage('warn', _getLocalesValue('langRecordWrnInProcess', 'Please wait a moment, programs is in process!'));
			var id = $(this).get(0).id;
			var record = _collectedStepList[id];
			_statData.workingScope = {
				id: id,
				keepTimes: (record.finishedTimestamp - record.startTimestamp)
			};
			var isDlg = $($('#stepRecord_' + id).get(0).lastChild);
			if (isDlg.hasClass('panel'))
				$('#stepRecord_' + id).get(0).removeChild($('#stepRecord_' + id).get(0).lastChild);
			var playground = $('#stepRecord_' + id + ' > canvas').get(0);
			if (_statData.playHandle) {
				clearTimeout(_statData.playHandle);
				_statData.playHandle = 0;
			}
			if (!record.binaryImageData || record.binaryFilter !== commConfig.binaryImageFilter) {
				record.binaryImageData = _showBinaryImage(record.canvasData, playground);
				record.binaryFilter = commConfig.binaryImageFilter;
			} else {
				var ctx = playground.getContext("2d");
				ctx.clearRect(0, 0, playground.width, playground.height);
				ctx.putImageData(record.binaryImageData, 0, 0);
			}
			_getWalkingPath(playground, record.canvasData);
		});
		$('.record-list-container').fadeOut(666);
		$('.record-part').fadeIn(666);
	});
});
$('.btn-close-record').on('click', function() {
	$('.record-container .btn-play-record').off('click');
	$('.record-container .btn-show-binary').off('click');
	$('.record-container .btn-show-analysis').off('click');
	$('.record-container').empty();
	$('.record-part').fadeOut(666);
	$('.record-list-container').fadeIn(666);
});