'use strict';

$(document).ready(function() {
    callLocales(_statData.defaultLanguage);
    whoAmI(_statData.envHost);
    if (!serialport || !serialport.isOpen()) resetSerialPort();
    if (serialport && serialport.isOpen()) $('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnClosePort', 'Deconnection'));
    else $('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnOpenPort', 'Connection'));
    $('#heatmap-labBack').html(_statData.me.backCounter);
    $('#heatmap-labLeave').html(_statData.me.leaveCounter);
    $('#heatmap-labSelfTurn').html(_statData.me.selfTurnCounter);
    $('#heatmap-labNewScale').html(_statData.me.preScale);
    _fixRadius();
    _resetMainHeight();
    if (serialport && serialport.isOpen()) {
        $('.common-info-panel .icon-double-angle-right').removeClass('icon-double-angle-right').addClass('icon-double-angle-left');
        $('.panel-heading').hide();
        $('.panel-body').hide();
    }
});

$('#heatmap-btnCalibration').on('click', function() {
    //commConfig.noiseLimit.min = _statData.realMax + 10;
    //if (commConfig.noiseLimit.max <= _statData.realMax) commConfig.noiseLimit.max += _statData.realMax;
    _getCalibrationData();
    heatmapInstance.repaint();
});
$('#heatmap-btnReset').on('click', function() {
    //commConfig.noiseLimit.min = 0;
    //commConfig.noiseLimit.max = 1023;
    _statData.calibrationData.length = 0;
    heatmapInstance.repaint();
});

$('#heatmap-btnDoPort').on('click', function() {
    if (window.MyApp) {
        try {
            window.MyApp.callData();
            $('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnClosePort', 'Deconnection'));
            return;
        } catch (e) {}
    }
    if (serialport && serialport.isOpen()) {
        setTimeout(function() {
            serialport.close();
            _statData.portOpened = false;
            if (_statData.portListener) clearInterval(_statData.portListener);
            _statData.portListener = 0;
        }, 0);
        $('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnOpenPort', 'Connection'));
    } else {
        try {
            serialport.open(function(error) {
                if (error) {
                    alert(error);
                } else {
                    _statData.portOpened = true;
                    _statData.portListener = setInterval(_chkPortListener, 500);
                    _bindSerialportEmitter();
                }
            });
            $('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnClosePort', 'Deconnection'));
        } catch (e) {
            $('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnOpenPort', 'Connection'));
            alert(e);
        }
    }
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

$('.legend-container .number-input').on('blur', function(event) {
    var oldValue = parseFloat($(event.target).attr('old-value'));
    var newValue = parseFloat($(event.target).val().trim());
    if (oldValue === newValue) return;
    if (isNaN(newValue) || newValue <= 0 || newValue >= 1) {
        _showMessage('warn', _getLocalesValue('langHeatmapWrnTitleLegend', 'Please input a number between 0 and 1(not include)'));
        $(event.target).val(oldValue);
        return;
    }
    var newCfg = {};
    var gradient = {};
    $('.heatmap-datainfo .legend-container .number-input').each(function() {
        gradient[$(this).val()] = $(this).css('background-color');
    });
    newCfg.gradient = gradient;
    heatmapInstance.configure(newCfg);
});
$('.legend-container .number-input').on('keydown', _setEnterCommit);