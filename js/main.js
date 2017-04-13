'use strict';
//Scope data
var _commonConstant = {
    path: 'C://cfgPresureMonitor/',
    config: 'config.json',
    scale: 'scale.txt'
};
//serialPort
var SerialPort = null;
var serialport = null;

var WINDOW = null;
try {
    WINDOW = nw.Window.get();
    WINDOW.on('close', function() {
        try {
            var saveData = {};
            saveData.port = commConfig.port;
            saveData.baudRange = commConfig.baudRange;
            saveData.radius = commConfig.radius;
            saveData.flushRange = commConfig.flushRange;
            saveData.productionWidth = commConfig.productionSize.width;
            saveData.productionHeight = commConfig.productionSize.height;
            saveData.minNoise = commConfig.noiseLimit.min;
            saveData.maxNoise = commConfig.noiseLimit.max;
            saveData.scaleTables = commConfig.scaleTables;
            saveData.defaultLanguage = _statData.defaultLanguage;
            saveData.calibrationData = _statData.calibrationData;
            _saveFile(_commonConstant.path + _commonConstant.config, new Buffer(JSON.stringify(saveData)), true);
            _destoryMe();
        } catch (e) {
            alert(e);
        } finally {
            this.close(true);
        }
    });
} catch (e) {};

//config data
var commConfig = {
    port: 'COM15',
    baudRange: 500000,
    radius: 40,
    flushRange: 1,
    productionSize: {
        width: 16,
        height: 16
    },
    noiseLimit: {
        max: 1023,
        min: 0
    },
    portList: [],
    scaleTables: ['Braden']
};

var _statData = {
    defaultLanguage: 'en',
    langData: {},
    activedPage: 'home',
    realMax: 0,
    scaleData: null, //_parseScaleStream
    constantScale: 0,
    countDownTime: 0,
    restDistance: 1,
    preCountDownRange: 0,
    preCountDown: 0,
    portOpened: false,
    alertHandle: 0,
    autoCalibrationHandle: 0,
    //maxPresureList: [],
    //preAvgPresure: 0,
    delayScaleList: [],
    calibrationData: []
};

//heatmap data
var heatmapInstance = null;
var innerData = null;

var initInnerData = function() {
    var innerData = [];
    for (var i = 0; i < commConfig.productionSize.width; i++) {
        var inLine = [];
        for (var j = 0; j < commConfig.productionSize.height; j++) {
            inLine.push(0);
        }
        innerData.push(inLine);
    }
    return innerData;
};
/*
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
        /
        for (var i = 0; i < commConfig.productionSize.width; i++) {
            var inLine = [];
            for (var j = 0; j < commConfig.productionSize.height; j++) {
                var tmpRad = Math.round(Math.random() * 1000);
                if (tmpRad < 500) tmpRad = 0;
                if (tmpRad > 800) tmpRad = 0;
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
*/
var _autoCalibration = function() {
    if (!_statData.portOpened) return;
    if (!innerData || !innerData.length || !innerData[0].length) return;
    if (!_statData.calibrationData.length ||
        _statData.calibrationData.length !== commConfig.productionSize.width ||
        _statData.calibrationData[0].length !== commConfig.productionSize.height) {
        _getCalibrationData();
        return;
    }
    var variance = 0;
    var cntData = commConfig.productionSize.width * commConfig.productionSize.height;
    var baseDataList = [];
    var innerDataList = [];
    for (var i = 0; i < _statData.calibrationData.length; i++) {
        for (var j = 0; j < _statData.calibrationData[i].length; j++) {
            variance += Math.pow((innerData[i][j] - _statData.calibrationData[i][j]), 2);
            if (Math.abs(innerData[i][j] - _statData.calibrationData[i][j]) != 0) {
                baseDataList.push(_statData.calibrationData[i][j]);
                innerDataList.push(innerData[i][j]);
            }
        }
    }
    var avgCalibration = eval(baseDataList.join('+')) / cntData;
    var avgInner = eval(innerDataList.join('+')) / cntData;
    if (Math.floor(avgInner) < Math.ceil(avgCalibration)) {
        _getCalibrationData();
        return;
    }
    variance = variance / cntData;
    if (variance < 200) _getCalibrationData();
    //alert('variance=' + variance + ' : avgCalibration=' + avgCalibration + ' : avgInner=' + avgInner);
    /*
    if (_statData.maxPresureList.length < commConfig.productionSize.width * commConfig.productionSize.height) return;
    var max = 0;

    max = _statData.maxPresureList[_statData.maxPresureList.length - 1];
    var aHasValue = [];
    for (var i = 0; i < _statData.maxPresureList.length; i++) {
        max = Math.max(max, _statData.maxPresureList[i]);
        if (_statData.maxPresureList[i] === 0) continue;
        aHasValue.push(_statData.maxPresureList[i]);
    }

    aHasValue = aHasValue.sort().slice(Math.floor(aHasValue.length / 4), Math.floor(aHasValue.length * 3 / 4));

    var avg = eval(aHasValue.join('+')) / aHasValue.length;

    if (commConfig.noiseLimit.min < 10) {
        commConfig.noiseLimit.min = max + 10;
        _statData.preAvgPresure = avg;
        if (heatmapInstance) heatmapInstance.repaint();
    } else {
        if (avg <= Math.ceil(_statData.preAvgPresure * 1.2) && avg >= Math.floor(_statData.preAvgPresure * 0.8)) {
            commConfig.noiseLimit.min = max + 10;
            _statData.preAvgPresure = avg;
            if (heatmapInstance) heatmapInstance.repaint();
        }
    }
    _statData.maxPresureList.length = 0;
    //alert(commConfig.noiseLimit.min);
    */
};
//Page behavor
$(document).ready(function() {
    $('#common-message').hide();
    setConfig(_readFile(_commonConstant.path + _commonConstant.config, 'utf8', 'json'));
    innerData = initInnerData();
    callLocales(_statData.defaultLanguage);
    _statData.autoCalibrationHandle = setInterval(_autoCalibration, 5000);
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
        if (commConfig.portList.length === 3) {
            commConfig.port = commConfig.portList[1].comName;
        }
    } catch (e) {
        //alert(e);
    }
});
$(window).resize(function() {
    _fixRadius();
});

var _countDownCallBack = function(hours, minutes, seconds, cd) {
    //console.log(hours + ':' + minutes + ':' + seconds);
    /*
        if (cd <= 60) {
            $('#countdown').removeClass('alert-success');
            $('#countdown').addClass('alert-danger');
        } else {
            $('#countdown').removeClass('alert-danger');
            $('#countdown').addClass('alert-success');
        }
    */
    if (cd === 0) {
        _setCountDownZero();
        /*
        $('#countdown').stop();
        setTimeout(function() {
            //alert(_getLocalesValue('langMainMsgCountDownFinished', 'Move!!!'));
            _setCountDownZero();
        }, 1000);*/
        return;
    }
    _recalcScale(cd);
};
var _recalcScale = function(cd) {
    if (serialport && !serialport.isOpen()) {
        try {
            serialport.open(function(error) {
                if (!error) {
                    _statData.portOpened = true;
                    serialport.on('data', function(data) {
                        getDataFromBuffer(data);
                    });
                }
            });
            $('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnClosePort', 'Deconnection'));
        } catch (e) {}
    }
    //_statData.realMax = 600;
    //if (cd % 10 !== 0) return;
    //##########Algorithms about times and presure################
    if (!_statData || !_statData.constantScale || !_statData.scaleData ||
        !_statData.scaleData.presureRange || !_statData.scaleData.presureRange.ranges ||
        !_statData.scaleData.presureRange.ranges.length || !_statData.scaleData.threshold ||
        !_statData.scaleData.threshold.length ||
        !innerData || !innerData.length || !innerData[0].length ||
        !_statData.calibrationData || !_statData.calibrationData.length ||
        !_statData.calibrationData[0].length || innerData.length !== _statData.calibrationData.length ||
        innerData[0].length !== _statData.calibrationData[0].length) return;
    var newScale = _statData.constantScale;

    var cntHasValue = 0;
    var sumDeviation = 0;
    for (var i = 0; i < innerData.length; i++) {
        for (var j = 0; j < innerData[i].length; j++) {
            if (innerData[i][j] === 0 || innerData[i][j] < _statData.calibrationData[i][j]) continue;
            sumDeviation += Math.abs(innerData[i][j] - _statData.calibrationData[i][j]);
            cntHasValue++;
        }
    }

    var idxPresureRange = 0;
    for (idxPresureRange = 0; idxPresureRange < _statData.scaleData.presureRange.ranges.length; idxPresureRange++) {
        if (Math.ceil(sumDeviation / cntHasValue) > _statData.scaleData.presureRange.ranges[idxPresureRange].critical) {
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

    //-----------delay recalc
    if (_statData.delayScaleList.length < 31) {
        _statData.delayScaleList.push(newCountDownRange);
        return;
    }
    _statData.delayScaleList.sort();

    var tmpIdx = [];
    for (var i = 0; i < _statData.delayScaleList.length - 1; i++) {
        if (_statData.delayScaleList[i] !== _statData.delayScaleList[i + 1]) {
            if (!tmpIdx.length) tmpIdx.push({
                cnt: i + 1,
                value: _statData.delayScaleList[i]
            });
            else tmpIdx.push({
                cnt: i + 1 - tmpIdx[tmpIdx.length - 1].cnt,
                value: _statData.delayScaleList[i]
            });
        }
    }
    if (!tmpIdx.length) tmpIdx.push({
        cnt: _statData.delayScaleList.length,
        value: _statData.delayScaleList[_statData.delayScaleList.length - 1]
    });
    else tmpIdx.push({
        cnt: _statData.delayScaleList.length - tmpIdx[tmpIdx.length - 1],
        value: _statData.delayScaleList[_statData.delayScaleList.length - 1]
    });
    if (tmpIdx.length <= 1) newCountDownRange = _statData.delayScaleList[0];
    else {
        var max = 0;
        var maxRange = 0;
        for (var i = 0; i < tmpIdx.length; i++) {
            if (tmpIdx[i].cnt > max) {
                maxRange = tmpIdx[i].value;
                max = tmpIdx[i].cnt;
            }
        }
        if (maxRange !== 0) newCountDownRange = maxRange;
    }
    _statData.delayScaleList.length = 0;
    //----------------------

    if (newCountDownRange === 0) {
        _setCountDownZero();
        return;
    }
    if ((newCountDownRange * 60) === _statData.preCountDownRange) return;
    $('#countdown').stop();
    var tmpDist = (_statData.restDistance - ((_statData.preCountDown - cd) / (_statData.preCountDownRange * 60)));
    var newTime = parseInt(tmpDist * newCountDownRange * 60);
    if (newTime <= 0) {
        _setCountDownZero();
        return;
    }
    $('#countdown').reset(newTime);
    _statData.restDistance = tmpDist;
    _statData.preCountDown = newTime;
    _statData.preCountDownRange = newCountDownRange * 60;
};

var _setCountDownZero = function() {
    $('#countdown').setFinished();
    var num = _statData.constantScale;
    if (_statData.scaleData.presureRange && _statData.scaleData.presureRange.ranges && _statData.scaleData.presureRange.ranges.length) {
        var max = 0;
        for (var i = 0; i < _statData.scaleData.presureRange.ranges.length; i++) {
            if (!_statData.scaleData.presureRange.ranges[i].scale || isNaN(parseInt(_statData.scaleData.presureRange.ranges[i].scale)))
                continue;
            max = Math.max(max, _statData.scaleData.presureRange.ranges[i].scale);
        }
        num += max;
    }
    if (!_statData.scaleData.threshold || !_statData.scaleData.threshold.length) return;
    var rangeTime = 0;
    for (var i = 0; i < _statData.scaleData.threshold.length; i++) {
        if (_statData.scaleData.threshold[i].min <= num && _statData.scaleData.threshold[i].max >= num) {
            rangeTime = _statData.scaleData.threshold[i].rangeTime;
            break;
        }
    }
    if (rangeTime > 0) _statData.countDownTime = rangeTime * 60;
    else _statData.countDownTime = 0;
    _statData.preCountDown = _statData.preCountDownRange = _statData.countDownTime;
    _statData.restDistance = 1;
    _callAlert();
};
var _callAlert = function() {
    if (_statData.activedPage != 'alert') {
        _statData.activedPage = 'alert';
        //heatmapInstance = null;
        $("#main-content").load('pages/alert.html');
        var audio = document.getElementById('main-audio-alert');
        audio.play();
        setTimeout(function() {
            audio.pause();
        }, 2000);
        _statData.alertHandle = setTimeout(_doAlert, 5000);
    }
};
var _doAlert = function() {
    var audio = document.getElementById('main-audio-alert');
    audio.play();
    setTimeout(function() {
        audio.pause();
    }, 2000);
    $('#alert-log-container').prepend('<div class="item-group alert-record"><label>' + (new Date()).Format("yyyy-MM-dd hh:mm:ss") + '</label><br /><span z-lang="langMainMsgCountDownFinished">' + _getLocalesValue('langMainMsgCountDownFinished', 'Move move move') + '</span></div>');
    _statData.alertHandle = setTimeout(_doAlert, 5000);
};
var _destoryMe = function() {
    if (serialport && serialport.isOpen()) {
        _statData.portOpened = false;
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
var _getLocalesValue = function(node, defaultValue) {
    if (_statData && _statData.langData && _statData.langData.hasOwnProperty(node))
        return _statData.langData[node];
    return defaultValue;
};
var callHome = function() {
    if (_statData.activedPage === 'home') return;
    _statData.activedPage = 'home';
    $("#main-content").hide();
    $("#main-content").empty();
    $("#main-content").fadeIn(666);
};
var callHeatmap = function() {
    if (_statData.activedPage === 'heatmap') return;
    _statData.activedPage = 'heatmap';
    //heatmapInstance = null;
    //innerData = initInnerData(true);
    $("#main-content").hide();
    $("#main-content").load('pages/heatmap.html');
    $("#main-content").fadeIn(666);
};
var callConfig = function() {
    if (_statData.activedPage === 'config') return;
    _statData.activedPage = 'config';
    //heatmapInstance = null;
    $("#main-content").hide();
    $("#main-content").load('pages/config.html');
    $("#main-content").fadeIn(666);
};

var callScale = function() {
    if (_statData.activedPage === 'scales') return;
    _statData.activedPage = 'scales';
    //heatmapInstance = null;
    $("#main-content").hide();
    $("#main-content").load('pages/scales.html');
    $("#main-content").fadeIn(666);
};

var callLocales = function(lang) {
    _statData.defaultLanguage = lang;
    $.getJSON('asset/locales.json', function(result) {
        if (result.hasOwnProperty(_statData.defaultLanguage)) {
            _statData.langData = result[_statData.defaultLanguage];
            _traverseLocales($('body').children());
            if (serialport && serialport.isOpen()) $('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnClosePort', 'Deconnection'));
            else $('#heatmap-btnDoPort').html(_getLocalesValue('langHeatmapBtnOpenPort', 'Connection'));
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
    if (data.hasOwnProperty('flushRange')) commConfig.flushRange = _toInt(data.flushRange);

    if (data.hasOwnProperty('productionWidth')) commConfig.productionSize.width = _toInt(data.productionWidth);
    if (data.hasOwnProperty('productionHeight')) commConfig.productionSize.height = _toInt(data.productionHeight);

    if (data.hasOwnProperty('minNoise')) commConfig.noiseLimit.min = _toInt(data.minNoise);
    if (data.hasOwnProperty('maxNoise')) commConfig.noiseLimit.max = _toInt(data.maxNoise);

    if (data.hasOwnProperty('defaultLanguage')) _statData.defaultLanguage = data.defaultLanguage;
    if (data.hasOwnProperty('scaleTables')) commConfig.scaleTables = data.scaleTables;

    if (data.hasOwnProperty('calibrationData')) _statData.calibrationData = data.calibrationData;

    var w = $(window).get(0).innerWidth;
    var h = $(window).get(0).innerHeight;
    commConfig.radius = Math.floor((w > h ? h : w) * 4 / 100);
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
    }
    /*
    if (_statData.maxPresureList.length < commConfig.productionSize.width * commConfig.productionSize.height) {
        _statData.maxPresureList.push(numData);
    }
    */
    //$('#testData').html($('#testData').html() + '<br/>x=' + x + ':y=' + y + '#' + recordData.toString() + '#data=' + numData);
};

var resetSerialPort = function() {
    try {
        if (serialport && serialport.isOpen()) {
            serialport.close();
            _statData.portOpened = false;
        }
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
                resetHeatmap();
            }
        });
    } catch (e) {
        //alert(e);
    }
};
var _fixRadius = function() {
    //var canvas = document.getElementById('heatmap-canvasAbs');
    //if (!canvas) return;
    if (_statData.activedPage !== 'heatmap') return;
    var w = $(window).get(0).innerWidth - 120;
    var h = $(window).get(0).innerHeight - 120;
    commConfig.radius = Math.floor((w > h ? h : w) * 4 / 100);

    var radius = (commConfig && commConfig.radius) ? commConfig.radius : 40;
    var width = innerData.length * radius + radius;
    var height = innerData[0].length * radius + radius;

    //canvas.width = width;
    //canvas.height = height;

    $('.heatmap').width(width);
    $('.heatmap').height(height);
    $('.heatmap').empty();
    resetHeatmap();
};
var _getCalibrationData = function() {
    _statData.calibrationData.length = 0;
    for (var i = 0; i < innerData.length; i++) {
        var record = [];
        for (var j = 0; j < innerData[i].length; j++) {
            record.push(innerData[i][j]);
        }
        _statData.calibrationData.push(record);
    }
};
var resetHeatmap = function() {
    if (heatmapInstance) heatmapInstance = null;
    // heatmap instance configuration
    heatmapInstance = heatmap.create({
        // only container is required, the rest can be defaults
        backgroundColor: 'rgb(0,0,180)',
        gradient: {
            0: "rgb(0,0,200)",
            0.25: "rgb(0,255,255)",
            0.45: "rgb(0,255,0)",
            0.65: "rgb(255,255,0)",
            0.85: "rgb(255,0,0)",
            1.0: "rgb(153,0,51)"
        },
        maxOpacity: 1,
        minOpacity: 0,
        blur: 0.95,
        radius: commConfig.radius * 1.6,
        container: document.querySelector('.heatmap')
    });
    setHeatMap(innerData);
};

var setHeatMap = function(innerData) {
    var radius = (commConfig && commConfig.radius) ? commConfig.radius : 40;
    var points = [];
    var maxPoint = {
        x: 0,
        y: 0
    };
    var max = 0;
    var min = 1023;
    var realMax = 0;
    for (var i = 0; i < innerData.length; i++) {
        for (var j = 0; j < innerData[i].length; j++) {
            if (innerData[i][j] === 0) continue;
            var numData = _toInt(innerData[i][j]);
            if (realMax < numData) {
                maxPoint.x = (i >= 10) ? i : '0' + i;
                maxPoint.y = (j >= 10) ? j : '0' + j;
                realMax = numData;
            };
            numData = (numData < commConfig.noiseLimit.min) ? 0 : numData;
            numData = (numData > commConfig.noiseLimit.max) ? commConfig.noiseLimit.max : numData;
            /*
            numData = numData + 10 - commConfig.noiseLimit.min;
            if (numData < 0) {
                numData = (commConfig.noiseLimit.min - numData) / commConfig.noiseLimit.min;
            }
            */

            max = Math.max(max, numData);
            min = Math.min(min, numData);

            if (_statData.calibrationData.length > i && _statData.calibrationData[0].length > j) {
                numData = Math.abs(numData - _statData.calibrationData[i][j]);
                if (numData < 20) numData = 0;
                //if (numData < Math.abs(commConfig.noiseLimit.min - _statData.calibrationData[i][j]))
                //    numData = 0;
            }
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
        max: (max === 0) ? 1023 : max,
        min: (min >= 1023) ? commConfig.noiseLimit.min : min,
        data: points
    };
    _statData.realMax = realMax;
    $('#heatmap-labMaxRecord').html(realMax);
    $('#heatmap-labMaxRecordPoint').html('(' + maxPoint.x + ',' + maxPoint.y + ')');
    // if you have a set of datapoints always use setData instead of addData
    // for data initialization
    heatmapInstance.setData(data);
    /*
        var strInn = '<div>';
        for (var i = 0; i < innerData.length; i++) {
            for (var j = 0; j < innerData[i].length; j++) {
                strInn += '<span style="margin:0.25em;display:inline-block;width:2.2em;">' + innerData[i][j] + '</span>';
            }
            strInn += '<br />';
        }
        strInn += '</div>';
        $('#test-matrix').append(strInn);
    */
};

var getDataFromBuffer = function(data) {
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