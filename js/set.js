'use strict';
$(document).ready(function() {
	callLocales(_statData.defaultLanguage);
	for (var i = commConfig.scaleTables.length - 1; i >= 0; i--) {
		$('#set-content ul').prepend('<li><i class="icon-user-md"></i>' + commConfig.scaleTables[i] + '</li>');
	}
	_resetMainHeight();
	$('#set-content > div').css('padding-left', (Math.ceil($('#set-content ul').width()) + 5));
});
$('#set-content ul > li').on('click', function(event) {
	$('#set-content ul > li').each(function() {
		$(this).removeClass('selected');
	});
	$(this).addClass('selected');

	var my = $(this).get(0).innerText;
	$('#set-main-container').empty();
	if (!my || !my.toString().trim().length) {
		$('#set-main-container').append('<label>New Scale</label>');
	} else {
		$('#set-main-container').append('<label>' + my + '</label>');
	}
	for (var i = 0; i < 30; i++) {
		$('#set-main-container').append('<br /><label>###################################</label>');
	}
	$('#set-main-container').append('<br /><label>-------------------------</label>');

	
	_resetMainHeight();
});