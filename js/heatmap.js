'use strict';

$(document).ready(function() {
    callLocales(_statData.defaultLanguage);
    hideLanguageChose();
    resetSerialPort();
    _statData.dirtyCheck = commConfig.flushRange;
    var radius = (commConfig && commConfig.radius) ? commConfig.radius : 40;
    var width = innerData.length * radius + radius;
    var height = innerData[0].length * radius + radius;

    $('.heatmap').width(width);
    $('.heatmap').height(height);
    resetHeatmap();
});

$('#heatmap-aCalibration').on('click', function() {
    commConfig.noiseLimit.min = _statData.realMax + 10;
    if (commConfig.noiseLimit.max <= _statData.realMax) commConfig.noiseLimit.max += _statData.realMax;
    heatmapInstance.repaint();
});

$('#heatmap-aOpenPort').on('click', function() {
    try {
        serialport.open(function(error) {
            if (error) {
                alert(error);
            } else {
                serialport.on('data', function(data) {
                    //if (_statData.inDrawProcessing) return;
                    getDataFromBuffer(data);
                });
            }
        });
    } catch (e) {
        alert(e);
    }
});

$('#heatmap-aClosePort').on('click', function() {
    setTimeout(function() {
        serialport.close();
    }, 0);
});