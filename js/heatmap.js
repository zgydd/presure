'use strict';

$(document).ready(function() {
    callLocales(_statData.defaultLanguage);
    if (!serialport || !serialport.isOpen || !serialport.isOpen())
        resetSerialPort();
    _statData.dirtyCheck = commConfig.flushRange;
    var radius = (commConfig && commConfig.radius) ? commConfig.radius : 40;
    var width = innerData.length * radius + radius;
    var height = innerData[0].length * radius + radius;

    var canvas = document.getElementById('heatmap-canvasAbs');
    canvas.width = width;
    canvas.height = height;

    $('.heatmap').width(width);
    $('.heatmap').height(height);

    resetHeatmap();
});

$('#heatmap-btnCalibration').on('click', function() {
    commConfig.noiseLimit.min = _statData.realMax + 10;
    if (commConfig.noiseLimit.max <= _statData.realMax) commConfig.noiseLimit.max += _statData.realMax;
    heatmapInstance.repaint();
});

$('#heatmap-btnOpenPort').on('click', function() {
    try {
        serialport.open(function(error) {
            if (error) {
                alert(error);
            } else {
                serialport.on('data', function(data) {
                    if (_statData.inDrawProcessing) return;
                    getDataFromBuffer(data);
                });
            }
        });
    } catch (e) {
        alert(e);
    }
});

$('#heatmap-btnClosePort').on('click', function() {
    setTimeout(function() {
        serialport.close();
    }, 0);
});

$('#heatmap-infoPanelBadge').on('click', function() {
    //$('.common-info-panel .panel-heading').fadeToggle(1000);
    //$('.common-info-panel .panel-body').fadeToggle(1000);
    if ($('.panel-heading').is(':hidden')) {
        $('.common-info-panel .icon-double-angle-left')
            .removeClass('icon-double-angle-left')
            .addClass('icon-double-angle-right');
        $('.panel-heading').fadeIn(666);
        $('.panel-body').fadeIn(666);
    } else {
        $('.panel-heading').fadeOut(666, function() {
            $('.common-info-panel .icon-double-angle-right')
                .removeClass('icon-double-angle-right')
                .addClass('icon-double-angle-left');
        });
        $('.panel-body').fadeOut(666);
    }
});