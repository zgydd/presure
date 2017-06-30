'use strict';

$(document).ready(function() {
	callLocales(_statData.defaultLanguage);
	whoAmI(_statData.envHost);
	if (!$('#alert-log-container').children() || !$('#alert-log-container').children().length)
		_appendAlertRecord();
	_resetMainHeight();
});

$('#alert-submit').on('click', function() {
	clearTimeout(_statData.alertHandle);
	_statData.alertHandle = 0;
	_statData.preCountDown = _statData.preCountDownRange = _statData.countDownTime;
	if (_statData.countDownTime <= 0) {
		$('#countdown').stop();
		$('#countdown').hide();
		return;
	}
	_statData.restDistance = 1;
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
	$(".overlay").hide();
	$(".overlay > section").empty();
	_resetMy();
});
$('#alert-reset').on('click', function() {
	clearTimeout(_statData.alertHandle);
	_statData.alertHandle = 0;
	$('#countdown').stop();
	$('#countdown').empty();
	$('#countdown').hide();
	$(".overlay").hide();
	$(".overlay > section").empty();
	_resetMy();
});