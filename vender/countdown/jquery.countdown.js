/**
 * @name		jQuery Countdown Plugin
 * @author		Martin Angelov
 * @version 	1.1
 * @modify		BartonJoe fix using:Delete day;Add reset etc.
 * @url			http://tutorialzine.com/2011/12/countdown-jquery/
 * @license		MIT License
 */

(function($) {

	// Number of seconds in every time division
	var hours = 60 * 60,
		minutes = 60;

	var options = null;
	var positions = null;
	var lockTick = 0;
	// Creating the plugin
	$.fn.countdown = function(prop) {

		options = $.extend({
			callback: function() {},
			timestamp: 0
		}, prop);

		// Initialize the plugin
		init(this, options);

		positions = this.find('.position');
		tick();

		return this;
	};

	$.fn.reset = function(prop) {
		if (lockTick) {
			clearTimeout(lockTick);
			lockTick = 0;
		}
		options.timestamp = prop;
		if (options.timestamp > 0) lockTick = setTimeout(tick, 1000);
	};
	$.fn.stop = function() {
		if (lockTick) {
			clearTimeout(lockTick);
			lockTick = 0;
		}
	};
	$.fn.stoped = function() {
		if (!options || !options.timestamp) return false;
		return (options.timestamp > 0 && lockTick === 0);
	};
	$.fn.setFinished = function() {
		options.timestamp = 0;
		updateDuo(0, 1, 0);
		updateDuo(2, 3, 0);
		updateDuo(4, 5, 0);
	};
	$.fn.destory = function() {
		if (lockTick) {
			clearTimeout(lockTick);
			lockTick = 0;
		}
		hours = null;
		minutes = null;
		options = null;
		positions = null;
		lockTick = null;
		this.empty();
	};

	function init(elem, options) {
		elem.addClass('countdownHolder');
		/*
				// Creating the markup inside the container
				$.each(['Hours', 'Minutes', 'Seconds'], function(i) {
					$('<span class="count' + this + '">').html(
						'<span class="position">\
							<span class="digit static">0</span>\
						</span>\
						<span class="position">\
							<span class="digit static">0</span>\
						</span>'
					).appendTo(elem);

					if (this != "Seconds") {
						elem.append('<span class="countDiv countDiv' + i + '"></span>');
					}
				});
		*/
		elem.append('<span class="countDownMark"><i class="icon-double-angle-down"></i></span><span id="countDownValue"></span>');
	}

	// Creates an animated transition between the two numbers
	function switchDigit(position, number) {

		var digit = position.find('.digit')

		if (digit.is(':animated')) {
			return false;
		}

		if (position.data('digit') == number) {
			// We are already showing this number
			return false;
		}

		position.data('digit', number);

		var replacement = $('<span>', {
			'class': 'digit',
			css: {
				top: '-2.1em',
				opacity: 0
			},
			html: number
		});

		// The .static class is added when the animation
		// completes. This makes it run smoother.

		digit
			.before(replacement)
			.removeClass('static')
			.animate({
				top: '2.5em',
				opacity: 0
			}, 'fast', function() {
				digit.remove();
			})

		replacement
			.delay(100)
			.animate({
				top: 0,
				opacity: 1
			}, 'fast', function() {
				replacement.addClass('static');
			});
	}

	function tick() {
		if (lockTick) {
			clearTimeout(lockTick);
			lockTick = 0;
		}
		var left, h, m, s;
		// Time left
		left = --options.timestamp;
		if (left < 0) {
			left = 0;
		}
		//console.log('#############');
		//console.log(left);
		// Number of hours left
		h = Math.floor(left / hours);
		updateDuo(0, 1, h);
		left -= h * hours;
		//console.log('h='+left);
		// Number of minutes left
		m = Math.floor(left / minutes);
		updateDuo(2, 3, m);
		left -= m * minutes;
		//console.log('m='+left);		
		// Number of seconds left
		s = left;
		updateDuo(4, 5, s);

		var cd = h * 3600 + m * 60 + s;
		// Calling an optional user supplied callback
		$('#countDownValue').html(pandLeft(h) + ' : ' + pandLeft(m) + ' : ' + pandLeft(s));
		options.callback(h, m, s, cd);

		// Scheduling another call of this function in 1s
		if (cd > 0) lockTick = setTimeout(tick, 1000);
	}

	function pandLeft(value) {
		if (value < 10) return '0' + value;
		return value;
	}
	// This function updates two digit positions at once
	function updateDuo(minor, major, value) {
		//switchDigit(positions.eq(minor), Math.floor(value / 10) % 10);
		//switchDigit(positions.eq(major), value % 10);
	}
})(jQuery);