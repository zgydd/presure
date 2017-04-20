'use strict';
//Scope data
var _commonConstant = {
    path: 'C://cfgPresureMonitor/',
    config: 'config.json',
    scale: '.scale'
};
//serialPort
var SerialPort = null;
var serialport = null;

var bufferDataWorker = null;
var dataAnalysisWorker = null;
if (typeof(Worker) !== undefined) {
    bufferDataWorker = new Worker('./js/bufferData.worker.js');
    bufferDataWorker.onmessage = _bufferDataWorkerCallback_;
    dataAnalysisWorker = new Worker('./js/dataAnalysis.worker.js');
    dataAnalysisWorker.onmessage = _dataAnaylysisWorkerCallback_;
}

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
    radius: 0,
    flushRange: 1,
    productionSize: {
        width: 16,
        height: 16
    },
    noiseLimit: {
        max: 1024,
        min: 0
    },
    portList: [],
    scaleTables: ['Braden', 'Norton', '布兰登']
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
    //delayScaleList: [],
    calibrationData: []
};

//heatmap data
var heatmapInstance = null;
var innerData = null;
var initInnerData = function() {
    var innerData = [];
    for (var i = 0; i < commConfig.productionSize.height; i++) {
        var inLine = [];
        for (var j = 0; j < commConfig.productionSize.width; j++) {
            inLine.push(0);
            //inLine.push(Math.random() * 100);
        }
        innerData.push(inLine);
    }
    return innerData;
};
//Page behavor
$(document).ready(function() {
    $('#common-message').hide();
    setConfig(_readFile(_commonConstant.path + _commonConstant.config, 'utf8', 'json'));
    innerData = initInnerData();
    callLocales(_statData.defaultLanguage);
    _statData.autoCalibrationHandle = setInterval(_autoCalibration, 20000);
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
            commConfig.portList.sort(function(a, b) {
                if (a.comName > b.comName) return 1;
                return -1;
            });
            if (commConfig.portList.length === 3) {
                commConfig.port = commConfig.portList[1].comName;
            }
        });
        _resetMainHeight();
    } catch (e) {
        //alert(e);
    }
});
$(window).resize(function() {
    _fixRadius();
    _resetMainHeight();
});
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
    $("#main-content").hide();
    $("#main-content").load('pages/heatmap.html');
    $("#main-content").fadeIn(666);
};
var callConfig = function() {
    if (_statData.activedPage === 'config') return;
    _statData.activedPage = 'config';
    $("#main-content").hide();
    $("#main-content").load('pages/config.html');
    $("#main-content").fadeIn(666);
};

var callScale = function() {
    if (_statData.activedPage === 'scales') return;
    _statData.activedPage = 'scales';
    $("#main-content").hide();
    $("#main-content").load('pages/scales.html');
    $("#main-content").fadeIn(666);
};
var callSet = function() {
    if (_statData.activedPage === 'set') return;
    _statData.activedPage = 'set';
    $("#main-content").hide();
    $("#main-content").load('pages/set.html');
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
var _callAlert = function() {
    if (_statData.activedPage != 'alert') {
        _statData.activedPage = 'alert';
        //heatmapInstance = null;
        $("#main-content").load('pages/alert.html');
    }
    _doAlert();
};
var changeLocales = function(lang) {
    if (_statData.defaultLanguage === lang) return;
    callLocales(lang);
};
var setFullScreen = function() {
    if (!WINDOW) return;
    try {
        WINDOW.toggleFullscreen();
    } catch (e) {}
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
    commConfig.radius = Math.floor((w > h ? h : w) * (commConfig.productionSize.width === 16 ? 4 : 2.5) / 100);
};
var _destoryMe = function() {
    if (serialport && serialport.isOpen()) {
        _statData.portOpened = false;
        serialport.close();
    }
    serialport = null;
    SerialPort = null;
    if (bufferDataWorker) bufferDataWorker.terminate();
    bufferDataWorker = null;
    if (dataAnalysisWorker) dataAnalysisWorker.terminate();
    dataAnalysisWorker = null;
    commConfig = null;
    _statData = null;
    heatmapInstance = null;
    innerData = null;
    _commonConstant = null;
    $('body').empty();
};
/*
var _formatABufferData = function(startIdx, endIdx, bufferData) {
    if (endIdx - startIdx != 5) return;
    var x = parseInt(bufferData[startIdx]);
    var y = parseInt(bufferData[startIdx + 1]);
    if (y >= innerData.length || x >= innerData[0].length) return;

    var recordData = [];
    for (var i = startIdx + 2; i < endIdx; i++) {
        recordData.push(_hex2char(bufferData[i].toString(16)));
    }
    var numData = parseInt(new String(recordData[0] + recordData[1] + recordData[2]), 16);
    if (innerData[y][x] != numData) {
        innerData[y][x] = numData;
    }
};
*/
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
var resetHeatmap = function() {
    if (heatmapInstance) heatmapInstance = null;

    var gradient = null;
    if (commConfig.productionSize.width === 16) {
        gradient = {
            0: "rgb(153,255,255)",
            0.25: "rgb(0,255,255)",
            0.45: "rgb(0,255,0)",
            0.65: "rgb(255,255,0)",
            0.85: "rgb(255,0,0)",
            1.0: "rgb(153,0,51)"
        };
    } else {
        gradient = {
            0.4: "rgb(153,255,255)",
            0.8: "rgb(0,255,255)",
            0.88: "rgb(0,255,0)",
            0.95: "rgb(255,255,0)",
            0.995: "rgb(255,0,0)"
        };
    }

    // heatmap instance configuration
    heatmapInstance = heatmap.create({
        // only container is required, the rest can be defaults
        backgroundColor: 'rgba(0,0,180,0.8)',
        gradient: gradient,
        maxOpacity: 1,
        minOpacity: 0,
        blur: 0.95,
        radius: commConfig.radius * (commConfig.productionSize.width === 16 ? 1.4 : 2.1),
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
    var min = 1024;
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
        max: (max === 0) ? 1024 : max,
        min: (min >= 1024) ? commConfig.noiseLimit.min : min,
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
/*
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
*/

var getDataFromBuffer = function(data) {
    var buffer = new Buffer(data, 'hex');
    var postStr = {};
    postStr.innerData = innerData;
    postStr.data = buffer;
    bufferDataWorker.postMessage(JSON.stringify(postStr));
};