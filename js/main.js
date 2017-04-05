'use strict';
//Scope data
var _commonConstant = {
    path: 'E://Work/cfgPresureMonitor/',
    config: 'config.json',
    scale: 'scale.txt'
};
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
    realMax: 0,
    scaleData: null, //_parseScaleStream
    constantScale: 0,
    countDownTime: 0,
    restDistance: 1,
    preCountDownRange: 0,
    preCountDown: 0
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
    setConfig(_readFile(_commonConstant.path + _commonConstant.config, 'utf8', 'json'));
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
$('#main-modal-submit').on('click', function() {
    //console.log(_statData);
    $('#main-modal-scale').modal('hide');
    _statData.preCountDown = _statData.preCountDownRange = _statData.countDownTime;
    if (_statData.countDownTime <= 0) {
        $('#countdown').clear();
        $('#main-alert-toggle').attr('checked', false);
        $('#countdown').addClass('hidded');
        return;
    }
    $('#main-alert-toggle').attr('checked', true);
    _statData.restDistance = 1;
    var ts = (new Date()).getTime() + _statData.countDownTime * 60 * 1000;
    if ($('#countdown') && $('#countdown').length) {
        $('#countdown').addClass('alert-success');
        if (!$('#countdown').children() || !$('#countdown').children().length) {
            $('#countdown').countdown({
                timestamp: ts,
                callback: _countDownCallBack
            });
        } else {
            $('#countdown').reset({
                timestamp: ts,
                callback: _countDownCallBack
            });
        }
    }
    if (!$('#main-alert-toggle').is(":checked")) $('#main-alert-toggle').trigger('click');
});
$('#main-alert-toggle').on('click', function() {
    if ($(this).is(":checked")) $('#countdown').removeClass('hidded');
    else $('#countdown').addClass('hidded');
});
var _countDownCallBack = function(hours, minutes, seconds, cd) {
    //console.log(hours + ':' + minutes + ':' + seconds);
    if (cd <= 60) {
        $('#countdown').removeClass('alert-success');
        $('#countdown').addClass('alert-danger');
    } else {
        $('#countdown').removeClass('alert-danger');
        $('#countdown').addClass('alert-success');
    }

    if (cd === 0) {
        setTimeout(function() {
            alert(_getLocalesValue('langMainMsgCountDownFinished', 'Move!!!'));
        }, 1000);
        return;
    }
    _recalcScale(cd);
};
var _recalcScale = function(cd) {
    if (serialport && !serialport.isOpen()) {
        try {
            serialport.open(function(error) {
                if (!error) {
                    serialport.on('data', function(data) {
                        if (_statData.inDrawProcessing) return;
                        getDataFromBuffer(data);
                    });
                }
            });
        } catch (e) {}
    }
    //if (cd % 10 !== 0) return;
    var thatCd = parseInt(cd / 60);
    setTimeout(function() {
        //##########Algorithms about times and presure################
        if (!_statData || !_statData.realMax || !_statData.constantScale ||
            !_statData.scaleData || !_statData.scaleData.presureRange ||
            !_statData.scaleData.presureRange.ranges || !_statData.scaleData.presureRange.ranges.length ||
            !_statData.scaleData.threshold || !_statData.scaleData.threshold.length) return;
        var newScale = _statData.constantScale;
        var idxPresureRange = 0;
        for (idxPresureRange = 0; idxPresureRange < _statData.scaleData.presureRange.ranges.length; idxPresureRange++) {
            if (_statData.realMax > _statData.scaleData.presureRange.ranges[idxPresureRange].critical) {
                newScale += _statData.scaleData.presureRange.ranges[idxPresureRange].scale;
                break;
            }
        }
        if (idxPresureRange >= _statData.scaleData.presureRange.ranges.length)
            newScale += _statData.scaleData.presureRange.ranges[_statData.scaleData.presureRange.ranges.length - 1].scale;
        var newCountDownRange = 0;
        for (var i = 0; i < _statData.scaleData.threshold.length; i++) {
            if (_statData.scaleData.threshold[i].min <= newScale && _statData.scaleData.threshold[i].max >= newScale) {
                newCountDownRange = _statData.scaleData.threshold[i].rangeTime;
                break;
            }
        }
        if (newCountDownRange === 0 || newCountDownRange === _statData.preCountDownRange) return;
        var tmpDist = (_statData.restDistance - (_statData.preCountDown - thatCd) / _statData.preCountDownRange);
        var newTime = tmpDist * newCountDownRange;
        var ts = (new Date()).getTime() + newTime * 60 * 1000;
        $('#countdown').reset({
            timestamp: ts,
            callback: _countDownCallBack
        });
        _statData.restDistance = tmpDist;
        _statData.preCountDown = newTime;
        _statData.preCountDownRange = newCountDownRange;
    }, 0);
};

//Common function
var _readFile = function(uri, encode, type) {
    try {
        var fs = require('fs');
        var path = require('path');
        switch (type) {
            case 'json':
                return JSON.parse(fs.readFileSync(path.normalize(uri), encode));
            case 'txt':
                return fs.readFileSync(path.normalize(uri), encode);
            default:
                return null;
        }
    } catch (e) {
        return null;
    }
};

var _destoryMe = function() {
    if (serialport && serialport.isOpen()) {
        serialport.close();
    }
    serialport = null;
    SerialPort = null;
    commConfig = null;
    _statData = null;
    heatmapInstance = null;
    innerData = null;
    _commonConstant = null;
};
var _traverseLocales = function(childElements) {
    childElements.each(function(i, n) {
        var ele = $(n);
        var attr = ele.attr('z-lang');
        if (attr && _statData.langData.hasOwnProperty(attr)) {
            ele.html(_statData.langData[attr]);
            return;
        }
        if (ele.children().length) {
            _traverseLocales(ele.children());
        }
    });
};
var _showMessage = function(type, message) {
    var msgType = '';
    switch (type) {
        case 'warn':
            msgType = 'alert-danger'; //'common-base-warn';
            break;
        case 'ok':
            msgType = 'alert-success'; //'common-base-ok';
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
        $('#common-message').fadeOut(888);
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
};
var callHome = function() {
    if (_statData.activedPage === 'home') return;
    _statData.activedPage = 'home';
    $("#main-content").hide();
    $("#main-content").empty();
    $("#main-content").fadeIn(666);

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
var changeLocales = function(lang) {
    if (_statData.defaultLanguage === lang) return;
    callLocales(lang);
};

var setConfig = function(data) {
    if (!data) return;
    if (data.hasOwnProperty('port')) commConfig.port = data.port;
    if (data.hasOwnProperty('baudRange')) commConfig.baudRange = _toInt(data.baudRange);
    if (data.hasOwnProperty('radius')) commConfig.radius = _toInt(data.radius);
    if (data.hasOwnProperty('flushRange')) _statData.dirtyCheck = commConfig.flushRange = _toInt(data.flushRange);

    if (data.hasOwnProperty('productionWidth')) commConfig.productionSize.width = _toInt(data.productionWidth);
    if (data.hasOwnProperty('productionHeight')) commConfig.productionSize.height = _toInt(data.productionHeight);

    if (data.hasOwnProperty('minNoise')) commConfig.noiseLimit.min = _toInt(data.minNoise);
    if (data.hasOwnProperty('maxNoise')) commConfig.noiseLimit.max = _toInt(data.maxNoise);

    if (data.hasOwnProperty('defaultLanguage')) _statData.defaultLanguage = data.defaultLanguage;
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
        //alert(e);
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
    if (_statData.dirtyCheck < commConfig.flushRange) {
        _statData.inDrawProcessing = false;
        return;
    }
    var radius = (commConfig && commConfig.radius) ? commConfig.radius : 40;
    var points = [];
    var maxPoint = {
        x: 0,
        y: 0
    };
    var max = 0;
    var min = 99999;
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
            min = Math.min(min, numData);
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
    _repaintAbsMap(innerData, realMax, min);
    _statData.dirtyCheck = 0;
    _statData.inDrawProcessing = false;
};

var _repaintAbsMap = function(innerData, max, min) {
    if (!_statData.scaleData || !_statData.scaleData.presureRange) return;
    var alphaRangeCritial = 256 / (_statData.scaleData.presureRange.ranges.length + 1);

    var radius = (commConfig && commConfig.radius) ? commConfig.radius : 40;
    var width = innerData.length * radius + radius;
    var height = innerData[0].length * radius + radius;
    var canvas = document.getElementById('heatmap-canvasAbs');
    var context = canvas.getContext('2d');
    context.clearRect(0, 0, width, height);
    for (var i = 0; i < innerData.length; i++) {
        for (var j = 0; j < innerData[i].length; j++) {
            if (innerData[i][j] === 0) continue;
            var critialIdx = 0;
            for (critialIdx = 0; critialIdx < _statData.scaleData.presureRange.ranges.length; critialIdx++) {
                if (innerData[i][j] >= _statData.scaleData.presureRange.ranges[critialIdx].critical) break;
            }
            for (var k = _statData.scaleData.presureRange.ranges.length - 1; k >= critialIdx; k--) {
                context.beginPath();
                context.arc(i * radius + radius, j * radius + radius, radius * (1 + k / _statData.scaleData.presureRange.ranges.length), 0, Math.PI * 2);
                context.closePath();

                //context.fillStyle = 'rgba(0,0,0,' + 1 / _statData.scaleData.presureRange.ranges.length + ')';
                var gradient = context.createRadialGradient(i * radius + radius,
                    j * radius + radius,
                    radius / 4,
                    i * radius + radius,
                    j * radius + radius,
                    radius * (1 + k / _statData.scaleData.presureRange.ranges.length));
                gradient.addColorStop(0, 'rgba(255,0,0,' + (1 - (1 / _statData.scaleData.presureRange.ranges.length)) + ')');
                gradient.addColorStop(1, 'rgba(255,0,0,0)');
                context.fillStyle = gradient;
                context.fill();
            }
        }
    }
    /*
    //principles of heatmap
    var denominator = max - min;
    //alert(_statData.scaleData);
    if (!_statData.scaleData || !_statData.scaleData.presureRange) return;
    var alphaRangeCritial = 256 / (_statData.scaleData.presureRange.ranges.length + 1);

    for (var i = 0; i < innerData.length; i++) {
        for (var j = 0; j < innerData[i].length; j++) {
            if (innerData[i][j] === 0)
                continue;
            var alp = (innerData[i][j] - min) / denominator;

            var gradientIdx = 0;
            for (gradientIdx = _statData.scaleData.presureRange.ranges.length + 1; gradientIdx > 0; gradientIdx--) {
                if (alp * 256 > gradientIdx * alphaRangeCritial)
                    break;
            }
            context.beginPath();
            context.arc(i * radius + radius, j * radius + radius, radius * (1 + gradientIdx / (_statData.scaleData.presureRange.ranges.length + 1)), 0, Math.PI * 2);
            context.closePath();

            var gradient = context.createRadialGradient(i * radius + radius,
                j * radius + radius,
                radius / 4,
                i * radius + radius,
                j * radius + radius,
                radius * (1 + gradientIdx / (_statData.scaleData.presureRange.ranges.length + 1)));
            for (var k = 0; k < gradientIdx; k++) {
                gradient.addColorStop((k / gradientIdx), 'rgba(0,0,0,' + (alp / (k + 1)) + ')');
            }
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            context.fillStyle = gradient;
            context.fill();
        }
    }
    var imgData = context.getImageData(0, 0, width, height);
    for (var i = 0; i < imgData.data.length; i += 4) {
        //  Relative color range
        switch (true) {
            case (imgData.data[i + 3] <= 85):
                imgData.data[i] = 0;
                imgData.data[i + 1] = imgData.data[i + 3] * 3;
                imgData.data[i + 2] = 256 - imgData.data[i + 3] * 3;
                break;
            case (imgData.data[i + 3] <= 170):
                imgData.data[i] = imgData.data[i + 3] * 3;
                imgData.data[i + 1] = 256;
                imgData.data[i + 2] = 0;
                break;
            default:
                imgData.data[i] = 256;
                imgData.data[i + 1] = 256 - imgData.data[i + 3] * 3;
                imgData.data[i + 2] = 0;
                break;
        }
    }
    context.putImageData(imgData, 0, 0);
    */
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

var _parseScaleStream = function(stream) {
    var tmpFile = stream.toString().replace('\r', '').split('\n');
    var formatedData = {};
    formatedData.descriptionItem = [];
    formatedData.threshold = [];
    formatedData.constantScales = [];
    for (var i = 0; i < tmpFile.length; i++) {
        var record = {};
        var tmpData = tmpFile[i].substring(1).split(':');
        switch (true) {
            case (tmpFile[i].indexOf('#') === 0):
                formatedData.title = tmpData[0];
                break;
            case (tmpFile[i].indexOf('*') === 0):
                if (tmpData.length !== 2) break;
                record.title = tmpData[0];
                record.items = [];
                tmpData = tmpData[1].split(',');
                for (var j = 0; j < tmpData.length; j++) {
                    var tmp = tmpData[j].split('-');
                    if (tmp.length !== 2) continue;
                    record.items.push({
                        description: tmp[0],
                        value: tmp[1]
                    });
                }
                formatedData.descriptionItem.push(record);
                break;
            case (tmpFile[i].indexOf('!') === 0):
                if (tmpData.length !== 2) break;
                var range = tmpData[0].split('~');
                var items = tmpData[1].split('-');
                if (range.length !== 2 || items.length !== 2) break;
                record.min = parseInt(range[0]);
                record.max = parseInt(range[1]);
                if (isNaN(record.min) || isNaN(record.max) || record.max < record.min) break;
                record.description = items[0];
                record.rangeTime = parseInt(items[1]);
                if (isNaN(record.rangeTime)) break;
                formatedData.threshold.push(record);
                break;
            case (tmpFile[i].indexOf('@') === 0):
                if (tmpData.length !== 2) break;
                record.description = tmpData[0];
                tmpData = tmpData[1].split(',');
                record.ranges = [];
                for (var j = 0; j < tmpData.length; j++) {
                    var tmp = tmpData[j].split('-');
                    if (tmp.length !== 2) continue;
                    var tmp2 = {
                        critical: parseInt(tmp[0]),
                        scale: parseInt(tmp[1])
                    };
                    if (isNaN(tmp2.critical) || isNaN(tmp2.scale)) break;
                    record.ranges.push(tmp2);
                }
                record.ranges.sort(function(a, b) {
                    if (!a.critical || !b.critical) return -1;
                    return (b.critical - a.critical);
                });
                formatedData.presureRange = record;
                break;
            case (tmpFile[i].indexOf('$') === 0):
                if (tmpData.length !== 2) break;
                if (isNaN(parseInt(tmpData[1]))) break;
                formatedData.constantScales.push({
                    item: tmpData[0],
                    scale: parseInt(tmpData[1])
                });
                break;
            default:
                break;
        }
    }
    return formatedData;
};

var _createDomFromScaleData = function() {
    try {
        var itemDom = null;
        var tmpDom = null;
        var frag = document.createDocumentFragment();

        for (var i = 0; i < _statData.scaleData.descriptionItem.length; i++) {
            itemDom = document.createElement('div');
            itemDom.className = "item-group";
            tmpDom = document.createElement('label');
            tmpDom.innerText = _statData.scaleData.descriptionItem[i].title;
            itemDom.appendChild(tmpDom);
            var selectedRecord = null;
            for (var k = 0; k < _statData.scaleData.constantScales.length; k++) {
                if (_statData.scaleData.constantScales[k].item === _statData.scaleData.descriptionItem[i].title) {
                    selectedRecord = _statData.scaleData.constantScales[k];
                    break;
                }
            }
            tmpDom = document.createElement('select');
            tmpDom.className = "form-control";
            for (var j = 0; j < _statData.scaleData.descriptionItem[i].items.length; j++) {
                var tmp = document.createElement('option');
                tmp.setAttribute('value', _statData.scaleData.descriptionItem[i].items[j].value);
                if (selectedRecord && selectedRecord.scale == _statData.scaleData.descriptionItem[i].items[j].value)
                    tmp.setAttribute('selected', 'selected');
                tmp.appendChild(document.createTextNode(_statData.scaleData.descriptionItem[i].items[j].description));
                tmpDom.appendChild(tmp);
            }
            $(tmpDom).on('change', _changeModalScaleEvent);
            itemDom.appendChild(tmpDom);
            tmpDom = document.createElement('span');
            if (selectedRecord) tmpDom.appendChild(document.createTextNode(selectedRecord.scale));
            itemDom.appendChild(tmpDom);
            frag.appendChild(itemDom);
        }
        frag.appendChild(document.createElement('hr'));

        for (var i = 0; i < _statData.scaleData.threshold.length; i++) {
            itemDom = document.createElement('div');
            itemDom.className = "item-group";
            tmpDom = document.createElement('label');
            tmpDom.innerText = _statData.scaleData.threshold[i].description;
            itemDom.appendChild(tmpDom);

            tmpDom = document.createElement('span');
            tmpDom.className = 'number-range';
            tmpDom.appendChild(document.createTextNode(
                _statData.scaleData.threshold[i].min + '~' + _statData.scaleData.threshold[i].max));
            itemDom.appendChild(tmpDom);

            tmpDom = document.createElement('input');
            tmpDom.className = "form-control number-input";
            tmpDom.maxLength = 3;
            tmpDom.value = _statData.scaleData.threshold[i].rangeTime;
            $(tmpDom).on('blur', _changeModalThresholdEvent);
            itemDom.appendChild(tmpDom);

            frag.appendChild(itemDom);
        }
        frag.appendChild(document.createElement('hr'));

        tmpDom = document.createElement('label');
        tmpDom.innerText = _statData.scaleData.presureRange.description;
        frag.appendChild(tmpDom);
        frag.appendChild(document.createElement('br'));

        for (var i = 0; i < _statData.scaleData.presureRange.ranges.length; i++) {
            itemDom = document.createElement('div');
            itemDom.className = "item-group";
            tmpDom = document.createElement('span');
            tmpDom.className = 'number-range';
            tmpDom.innerText = _statData.scaleData.presureRange.ranges[i].scale;
            itemDom.appendChild(tmpDom);

            tmpDom = document.createElement('input');
            tmpDom.className = "form-control number-input";
            tmpDom.maxLength = 6;
            tmpDom.value = _statData.scaleData.presureRange.ranges[i].critical;
            $(tmpDom).on('blur', _changeModalCriticalEvent);
            itemDom.appendChild(tmpDom);

            frag.appendChild(itemDom);
        }
        return frag;
    } catch (e) {
        alert(e);
    }
};

var callScale = function() {
    var scale = _readFile(_commonConstant.path + _commonConstant.scale, 'utf8', 'txt');
    if (!_statData.scaleData) {
        if (!scale) {
            _statData.scaleData = _parseScaleStream('#Braden Scale Table\n' +
                '*Sensory:Completely Limited-1,Very Limited-2,Slight Limited-3,No Impairment-4\n' +
                '*Moisture:Constantly Moist-1,Very Moist-2,Occasionally Moist-3,Rarely Moist-4\n' +
                '*Activity:Bedfast-1,Chairfast-2,Walks Occasionally-3,Walks Frequently-4\n' +
                '*Mobility:Completely Immobile-1,Very Limited-2,Slightly Limited-3,No Limitation-4\n' +
                '*Nutrition:Very Poor-1,Probaly Inadequate-2,Adequate-3,Excellent-4\n' +
                '!6~12:High risk-30\n' +
                '!13~14:Moderate risk-60\n' +
                '!15~18:Low risk-120\n' +
                '!19~24:No risk-0\n' +
                '@Presure Subparagraph:48-1,32-2,24-3,16-4\n' +
                '$Sensory:4\n' +
                '$Moisture:4\n' +
                '$Activity:4\n' +
                '$Mobility:4\n' +
                '$Nutrition:4');
        } else {
            _statData.scaleData = _parseScaleStream(scale);
        }
    }
    _calcScale();
    $('#modal-scale-title').html('<i class="icon-user-md icon-large"></i>&nbsp;&nbsp;<strong>' + _statData.scaleData.title + '</strong>');
    $('.modal-body').append(_createDomFromScaleData());
    $('#main-modal-scale').modal({
        keyboard: false
    });
};

var _changeModalScaleEvent = function() {
    var iSelected = parseInt($(this).children('option:selected').val());
    if (isNaN(iSelected)) return;
    $(this).parent().children('span').html(iSelected);
    for (var i = 0; i < _statData.scaleData.constantScales.length; i++) {
        if (_statData.scaleData.constantScales[i].item === $(this).parent().children('label').get(0).innerText) {
            _statData.scaleData.constantScales[i].scale = iSelected;
            break;
        }
    }
    _calcScale();
};

var _changeModalThresholdEvent = function() {
    var oldValue = 0;
    var idx = -1;
    for (var i = 0; i < _statData.scaleData.threshold.length; i++) {
        if (_statData.scaleData.threshold[i].description === $(this).parent().children('label').get(0).innerText) {
            oldValue = _statData.scaleData.threshold[i].rangeTime;
            idx = i;
            break;
        }
    }
    var newValue = $(this).val().trim();
    var that = this;
    if (!/^\d{1,3}$/.test(newValue)) {
        $(this).parent().addClass('alert-danger');
        $(this).val(oldValue);
        $(this).focus();
        setTimeout(function() {
            $(that).parent().removeClass('alert-danger');
        }, 666);
        return;
    }
    if (idx >= 0 && idx < _statData.scaleData.threshold.length)
        _statData.scaleData.threshold[idx].rangeTime = parseInt(newValue);
    _calcScale();
};

var _changeModalCriticalEvent = function() {
    var oldValue = 0;
    var idx = -1;
    for (var i = 0; i < _statData.scaleData.presureRange.ranges.length; i++) {
        if (_statData.scaleData.presureRange.ranges[i].scale == $(this).parent().children('span').get(0).innerText) {
            oldValue = _statData.scaleData.presureRange.ranges[i].critical;
            idx = i;
            break;
        }
    }
    var newValue = $(this).val().trim();
    var that = this;
    if (!/^\d{1,6}$/.test(newValue)) {
        $(this).parent().addClass('alert-danger');
        $(this).val(oldValue);
        $(this).focus();
        setTimeout(function() {
            $(that).parent().removeClass('alert-danger');
        }, 666);
        return;
    }
    if (idx >= 0 && idx < _statData.scaleData.presureRange.ranges.length)
        _statData.scaleData.presureRange.ranges[idx].critical = parseInt(newValue);
};

var _clearSubDomEvent = function(baseNode, eveType, func) {
    baseNode.each(function(i, n) {
        var ele = $(n);
        ele.off(eveType, func);
        if (ele.children().length) {
            _clearSubDomEvent(ele.children());
        }
    });
};

var _calcScale = function() {
    if (!_statData.scaleData) {
        $('#modal-scale-count').html('--');
        $('#modal-scale-time').html('---');
        return;
    }
    if (!_statData.scaleData.constantScales || !_statData.scaleData.constantScales.length) {
        $('#modal-scale-count').html('--');
        return;
    }
    var num = 0;
    for (var i = 0; i < _statData.scaleData.constantScales.length; i++) {
        num += _statData.scaleData.constantScales[i].scale;
    }
    _statData.constantScale = num;
    if (_statData.scaleData.presureRange && _statData.scaleData.presureRange.ranges && _statData.scaleData.presureRange.ranges.length) {
        var max = 0;
        for (var i = 0; i < _statData.scaleData.presureRange.ranges.length; i++) {
            if (!_statData.scaleData.presureRange.ranges[i].scale || isNaN(parseInt(_statData.scaleData.presureRange.ranges[i].scale)))
                continue;
            max = Math.max(max, _statData.scaleData.presureRange.ranges[i].scale);
        }
        num += max;
    }
    $('#modal-scale-count').html(num);
    if (!_statData.scaleData.threshold || !_statData.scaleData.threshold.length) {
        $('#modal-scale-time').html('---');
        return;
    }
    var rangeTime = 0;
    for (var i = 0; i < _statData.scaleData.threshold.length; i++) {
        if (_statData.scaleData.threshold[i].min <= num && _statData.scaleData.threshold[i].max >= num) {
            rangeTime = _statData.scaleData.threshold[i].rangeTime;
            break;
        }
    }
    if (rangeTime > 0) {
        $('#modal-scale-time').html(rangeTime);
        _statData.countDownTime = rangeTime;
    } else {
        $('#modal-scale-time').html('---');
        _statData.countDownTime = 0;
    }
};

$('#main-modal-scale').on('hidden.bs.modal', function(e) {
    _clearSubDomEvent($('.modal-body'), 'change', _changeModalScaleEvent);
    _clearSubDomEvent($('.modal-body'), 'blur', _changeModalThresholdEvent);
    _clearSubDomEvent($('.modal-body'), 'blur', _changeModalCriticalEvent);
    $('.modal-body').empty();
});