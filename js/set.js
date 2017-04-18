'use strict';
//Page behavior
$(document).ready(function() {
	callLocales(_statData.defaultLanguage);
	for (var i = commConfig.scaleTables.length - 1; i >= 0; i--) {
		$('#set-content ul').prepend('<li><i class="icon-user-md"></i>' + commConfig.scaleTables[i] + '</li>');
	}
	_resetMainHeight();
	$('#set-content > article').css('padding-left', (Math.ceil($('#set-content ul').width()) + 5));
});
$('#set-content ul > li').on('click', function(event) {
	$('#set-content article').hide();

	$('#set-content ul > li').each(function() {
		$(this).removeClass('selected');
	});
	$(this).addClass('selected');

	var my = $(this).get(0).innerText;
	if (my && my.toString().trim().length) _getActivedScale(my);
	else _statData.scaleData = {};
	_createSetContainerDOM();
	$('#set-content article').fadeIn(666);
	_resetMainHeight();
});
$('#set-modalSubmit').on('click', function() {
	var theBehavior = $('#set-modalEdit .modal-body > div').get(0).id;
	switch (theBehavior) {
		case 'modal_addFeture':
			var value = $('#set-modalEdit .modal-body input').val();
			if (value.trim() === '') {
				_showMessage('warn', _getLocalesValue('langConfigWrnRadius', 'Illegal radius'));
				$('#' + theBehavior).addClass('alert-danger');
				$('#set-modalEdit .modal-body input').focus();
				setTimeout(function() {
					$('#' + theBehavior).removeClass('alert-danger');
				}, 888);
				return;
			}
			break;
		case 'modal_addThreshold':
			break;
		default:
			break;
	}

	$('#set-modalEdit').modal('hide');
});

$('#set-modalEdit').on('hidden.bs.modal', function() {
	$('#set-modalEdit .modal-body').empty();
});