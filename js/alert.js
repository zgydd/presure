'use strict';

$(document).ready(function() {
	callLocales(_statData.defaultLanguage);
	if (!$('#alert-log-container').children() || !$('#alert-log-container').children().length)
		$('#alert-log-container').append('<div class="item-group alert-record"><label>' + (new Date()).Format("yyyy-MM-dd hh:mm:ss") + '</label><br /><span z-lang="langMainMsgCountDownFinished">' + _getLocalesValue('langMainMsgCountDownFinished', 'Move move move') + '</span></div>');
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
		//$('#countdown').addClass('alert-success');
		if (!$('#countdown').children() || !$('#countdown').children().length) {
			$('#countdown').countdown({
				timestamp: _statData.countDownTime,
				callback: _countDownCallBack
			});
		} else $('#countdown').reset(_statData.countDownTime);
	}
});