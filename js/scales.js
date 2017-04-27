'use strict';
//Page behavior
$(document).ready(function() {
	callLocales(_statData.defaultLanguage);
	if (commConfig.scaleTables && commConfig.scaleTables.length) {
		for (var i = 0; i < commConfig.scaleTables.length; i++) {
			$('#scale-table-list').append('<li role="presentation"><a href="#">' + commConfig.scaleTables[i] + '</a></li>');
		}
	}
	_resetMainHeight();
});
$('#scale-submit').on('click', function() {
	if ($(this).hasClass('disabled')) return;
	_resetMy();
	_statData.me.preScale = _statData.constantScale + _statData.scaleData.presureRange.ranges.length;
	_statData.preCountDown = _statData.preCountDownRange = _statData.countDownTime;
	if (_statData.countDownTime <= 0) {
		$('#countdown').stop();
		$('#countdown').hide();
		return;
	}
	_statData.restDistance = 1;
	//_statData.delayScaleList.length = 0;	
	if ($('#countdown') && $('#countdown').length) {
		$('#countdown').addClass('alert-success');
		if (!$('#countdown').children() || !$('#countdown').children().length) {
			$('#countdown').countdown({
				timestamp: _statData.countDownTime,
				callback: _countDownCallBack
			});
		} else $('#countdown').reset(_statData.countDownTime);
	}
	_statData.me.actioned = (new Date()).getTime();
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
	_createScaleDOM();
});