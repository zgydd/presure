'use strict';
//Scope data
//serialPort
var SerialPort = null;
var serialport = null;

//config data
var commConfig = {
    port: 'COM15',
    baudRange: 500000,
    radius: 40,
    heatmapRadius: 30,
    flushRange: 10,
    productionSize: {
        width: 16,
        height: 16
    },
    noiseLimit: {
        max: 9999,
        min: 0
    },
    portList: []
};

var _statData = {
    defaultLanguage: 'en',
    langData: {},
    activedPage: 'home',
    dirtyCheck: 0,
    inDrawProcessing: false,
    realMax: 0
};

//heatmap data
var heatmapInstance = null;

var initInnerData = function(isDebug) {
    var innerData = [];
    if (isDebug) {
        /*
        innerData = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 300, 600, 600, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 800, 0],
            [0, 200, 700, 600, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 200, 600, 400, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 100, 0, 0, 0, 0, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 200, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 200, 100, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 100, 50, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 100, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 600, 650, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 600, 700, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 100, 500, 800, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 100, 200, 200, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 100, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ];
        */
        for (var i = 0; i < commConfig.productionSize.width; i++) {
            var inLine = [];
            for (var j = 0; j < commConfig.productionSize.height; j++) {
                var tmpRad = Math.round(Math.random() * 1000);
                if (tmpRad < 600) tmpRad = 0;
                if (tmpRad > 700) tmpRad = 0;
                inLine.push(tmpRad);
            }
            innerData.push(inLine);
        }
    } else {
        for (var i = 0; i < commConfig.productionSize.width; i++) {
            var inLine = [];
            for (var j = 0; j < commConfig.productionSize.height; j++) {
                inLine.push(0);
            }
            innerData.push(inLine);
        }
    }
    return innerData;
};
var innerData = initInnerData(false);

//Page behavor
$(document).ready(function() {
    $('#common-message').hide();
    $('#index-language > li').each(function() {
        $(this).hide();
    });
    callLocales(_statData.defaultLanguage);
    try {
        SerialPort = require('serialport');
        commConfig.portList.length = 0;
        SerialPort.list(function(err, ports) {
            ports.forEach(function(port) {
                commConfig.portList.push({
                    comName: port.comName,
                    pnpId: port.pnpId,
                    manufacturer: port.manufacturer
                });
            });
        });
    } catch (e) {
        alert(e);
    }
});
$(window).unload(function() {
    _destoryMe();
});

var _destoryMe = function() {
    if (serialport.isOpen()) {
        serialport.close();
    }
    serialport = null;
    SerialPort = null;
    commConfig = null;
    _statData = null;
    heatmapInstance = null;
    innerData = null;
};
var _traverseLocales = function(childElements) {
    childElements.each(function(i, n) {
        var ele = $(n);
        var attr = ele.attr('z-lang');
        if (attr && _statData.langData.hasOwnProperty(attr)) {
            ele.html(_statData.langData[attr]);
        }
        if (ele.children().length) {
            _traverseLocales(ele.children(), _statData.langData);
        }
    });
};
var _showMessage = function(type, message) {
    var msgType = '';
    switch (type) {
        case 'warn':
            msgType = 'common-base-warn';
            break;
        case 'ok':
            msgType = 'common-base-ok';
            break;
        default:
            break;
    }
    if (!msgType || !message) return;
    $('#common-message').html(message);
    $('#common-message').addClass(msgType);
    $('#common-message').fadeIn(66);
    setTimeout(function() {
        $('#common-message').removeClass(msgType);
        $('#common-message').fadeOut(666);
    }, 888);
};
var _getLocalesValue = function(node, defaultValue) {
    if (_statData && _statData.langData && _statData.langData.hasOwnProperty(node))
        return _statData.langData[node];
    return defaultValue;
};
var _chkEqual = function(a, b) {
    try {
        return (a.toString().trim() === b.toString().trim());
    } catch (e) {
        return false;
    }
}

var callHeatmap = function() {
    if (_statData.activedPage === 'heatmap') return;
    _statData.activedPage = 'heatmap';
    heatmapInstance = null;
    //innerData = initInnerData(true);
    $("#main-content").hide();
    $("#main-content").load('pages/heatmap.html');
    $("#main-content").fadeIn(666);
};
var callConfig = function() {
    if (_statData.activedPage === 'config') return;
    _statData.activedPage = 'config';
    heatmapInstance = null;
    $("#main-content").hide();
    $("#main-content").load('pages/config.html');
    $("#main-content").fadeIn(666);
};

var callLocales = function(lang) {
    _statData.defaultLanguage = lang;
    $.getJSON('asset/locales.json', function(result) {
        if (result.hasOwnProperty(_statData.defaultLanguage)) {
            _statData.langData = result[_statData.defaultLanguage];
            _traverseLocales($('body').children());
        }
    });
};
var hideLanguageChose = function() {
    $('#index-language > li').each(function() {
        $(this).fadeOut(666);
    });
};
var showLanguageChose = function() {
    if ($('#index-language > li').is(':hidden')) {
        $('#index-language > li').each(function() {
            $(this).fadeIn(666);
        });
    } else {
        hideLanguageChose();
    }
};
var changeLocales = function(lang, event) {
    callLocales(lang);
    $('#index-language > li').each(function() {
        $(this).fadeOut(666);
    });
    event.stopPropagation();
};

//Common function
var setConfig = function(data) {
    if (data.hasOwnProperty('port')) commConfig.port = data.port;
    if (data.hasOwnProperty('baudRange')) commConfig.baudRange = _toInt(data.baudRange);
    if (data.hasOwnProperty('radius')) commConfig.radius = _toInt(data.radius);
    if (data.hasOwnProperty('flushRange')) _statData.dirtyCheck = commConfig.flushRange = _toInt(data.flushRange);

    if (data.hasOwnProperty('productionWidth')) commConfig.productionSize.width = _toInt(data.productionWidth);
    if (data.hasOwnProperty('productionHeight')) commConfig.productionSize.height = _toInt(data.productionHeight);

    if (data.hasOwnProperty('minNoise')) commConfig.noiseLimit.min = _toInt(data.minNoise);
    if (data.hasOwnProperty('maxNoise')) commConfig.noiseLimit.max = _toInt(data.maxNoise);
};

var _toInt = function(data) {
    try {
        return parseInt(data);
    } catch (e) {
        return 0;
    }
};
var _hex2char = function(data) {
    var a = data;
    switch (a.length) {
        case 1:
            a = '%u000' + a;
            break;
        case 2:
            a = '%u00' + a;
            break;
        case 3:
            a = '%u0' + a;
            break;
        case 4:
            a = '%u' + a;
            break;
        default:
            break;
    }
    return unescape(a);
};

var _formatABufferData = function(startIdx, endIdx, bufferData) {
    if (endIdx - startIdx != 5) return;
    var x = parseInt(bufferData[startIdx]);
    var y = parseInt(bufferData[startIdx + 1]);
    if (x >= innerData.length || y >= innerData[0].length) return;

    var recordData = [];
    for (var i = startIdx + 2; i < endIdx; i++) {
        recordData.push(_hex2char(bufferData[i].toString(16)));
    }
    var numData = parseInt(new String(recordData[0] + recordData[1] + recordData[2]), 16);
    if (innerData[x][y] != numData) {
        innerData[x][y] = numData;
        _statData.dirtyCheck++;
    }
    //$('#testData').html($('#testData').html() + '<br/>x=' + x + ':y=' + y + '#' + recordData.toString() + '#data=' + numData);
};

var resetSerialPort = function() {
    try {
        if (serialport && serialport.isOpen()) serialport.close();
    } catch (e) {
        alert(_getLocalesValue('langErrClosePort', 'Fail to close old serial port'));
        alert(e);
    } finally {
        serialport = null;
    }
    try {
        serialport = new SerialPort(commConfig.port, {
            autoOpen: false,
            baudrate: commConfig.baudRange,
            dataBits: 8,
            stopBits: 1,
            parity: 'none'
                //,bufferSize: 20
        }, function(err) {
            if (err) {
                alert(_getLocalesValue('langErrOpenPort', 'Can not open the port'));
                callConfig();
            } else {
                //alert('open the port');
            }
        });
        resetHeatmap();
    } catch (e) {
        alert(e);
    }
};
var resetHeatmap = function() {
    if (heatmapInstance) heatmapInstance = null;
    setTimeout(function() {
        // heatmap instance configuration
        heatmapInstance = heatmap.create({
            // only container is required, the rest can be defaults
            backgroundColor: 'rgba(0,0,255,0.8)',
            minOpacity: 0.85,
            minOpacity: 0.4,
            radius: commConfig.radius + commConfig.heatmapRadius,
            container: document.querySelector('.heatmap')
        });
        setHeatMap(innerData);
    }, 0);
};

var setHeatMap = function(innerData) {
    if (_statData.dirtyCheck < commConfig.flushRange) return;
    var radius = (commConfig && commConfig.radius) ? commConfig.radius : 40;
    var points = [];
    var maxPoint = {
        x: 0,
        y: 0
    };
    var max = 0;
    var realMax = 0;
    for (var i = 0; i < innerData.length; i++) {
        for (var j = 0; j < innerData[i].length; j++) {
            if (innerData[i][j] === 0)
                continue;
            var numData = _toInt(innerData[i][j]);
            if (realMax < numData) {
                maxPoint.x = (i >= 10) ? i : '0' + i;
                maxPoint.y = (j >= 10) ? j : '0' + j;
                realMax = numData;
            };
            numData = (numData < commConfig.noiseLimit.min) ? 0 : numData;
            numData = (numData > commConfig.noiseLimit.max) ? commConfig.noiseLimit.max : numData;
            max = Math.max(max, numData);
            var point = {
                x: i * radius + radius,
                y: j * radius + radius,
                value: numData
            };
            points.push(point);
        }
    }

    // heatmap data format
    var data = {
        max: max,
        data: points
    };
    _statData.realMax = realMax;
    $('#heatmap-labMaxRecord').html(realMax);
    $('#heatmap-labMaxRecordPoint').html(maxPoint.x + ' - ' + maxPoint.y);
    // if you have a set of datapoints always use setData instead of addData
    // for data initialization
    heatmapInstance.setData(data);
    _statData.dirtyCheck = 0;
    _statData.inDrawProcessing = false;
};
var getDataFromBuffer = function(data) {
    _statData.inDrawProcessing = true;
    var startPos = 0;
    var buffer = new Buffer(data, 'hex');
    for (startPos = 0; startPos < buffer.length; startPos++) {
        if (buffer[startPos] === 255) break;
    }
    if (startPos >= buffer.length) return;
    var startIdx = startPos + 1;
    for (var i = startPos + 1; i < buffer.length; i++) {
        if (buffer[i] === 255) {
            _formatABufferData(startIdx, i, buffer);
            startIdx = i + 1;
        }
    }
    setHeatMap(innerData);
};