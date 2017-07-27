'use strict';
//Scope data
var _commonConstant = {
    path: 'C://cfgPresureMonitor/',
    config: 'config.json',
    scale: '.scale',
    firmwares: null
};
//serialPort
var SerialPort = null;
var serialport = null;

var bufferDataWorker = null;
var dataAnalysisWorker = null;
var edgeDetectionWorker = null;
var skeletonExtractionWorker = null;
if (typeof(Worker) !== undefined) {
    bufferDataWorker = new Worker('./js/bufferData.worker.js');
    bufferDataWorker.onmessage = _bufferDataWorkerCallback_;
    dataAnalysisWorker = new Worker('./js/dataAnalysis.worker.js');
    dataAnalysisWorker.onmessage = _dataAnaylysisWorkerCallback_;
    edgeDetectionWorker = new Worker('./js/edgeDetection.worker.js');
    edgeDetectionWorker.onmessage = _edgeDetectionWorkerCallback_;
    skeletonExtractionWorker = new Worker('./js/skeletonExtraction.worker.js');
    skeletonExtractionWorker.onmessage = _skeletonExtractionWorkerCallback_;
}
var getSaveData = function() {
    var saveData = {};
    saveData.port = commConfig.port;
    saveData.alertFreque = commConfig.alertFreque;
    saveData.alertTime = commConfig.alertTime;
    saveData.baudRange = commConfig.baudRange;
    saveData.showMultiple = commConfig.showMultiple;
    saveData.radius = commConfig.radius;
    saveData.islandPoint = commConfig.islandPoint;
    saveData.autoCalibration = commConfig.autoCalibration;
    saveData.delayedSampling = commConfig.delayedSampling;
    saveData.filterTimes = commConfig.filterTimes;
    saveData.sobelThreshold = commConfig.sobelThreshold;
    saveData.leaveJudge = commConfig.leaveJudge;
    saveData.turnJudge = commConfig.turnJudge;
    saveData.skeletonLimit = commConfig.skeletonLimit;
    saveData.productionWidth = commConfig.productionSize.width;
    saveData.productionHeight = commConfig.productionSize.height;
    saveData.minNoise = commConfig.noiseLimit.min;
    saveData.maxNoise = commConfig.noiseLimit.max;
    saveData.scaleTables = commConfig.scaleTables;
    saveData.defaultLanguage = _statData.defaultLanguage;
    saveData.calibrationData = _statData.calibrationData;
    return saveData;
};
var _WINDOW_ = null;
try {
    _WINDOW_ = nw.Window.get();
    _WINDOW_.on('close', function() {
        try {
            var saveData = getSaveData();
            _saveFile(_commonConstant.path + _commonConstant.config, new Buffer(JSON.stringify(saveData)), true);
            _destoryMe();
        } catch (e) {
            alert(e);
        } finally {
            this.close(true);
        }
    });
    _WINDOW_.maximize();
} catch (e) {};

//config data
var commConfig = {
    port: 'COM998',
    baudRange: 500000,
    showMultiple: 0,
    radius: 0,
    islandPoint: 0,
    autoCalibration: 20,
    alertFreque: 120,
    alertTime: 3,
    delayedSampling: 31,
    filterTimes: 3,
    sobelThreshold: 68,
    leaveJudge: 10,
    turnJudge: 60,
    skeletonLimit: 0,
    productionSize: {
        width: 16,
        height: 16
    },
    noiseLimit: {
        max: 100,
        min: 0
    },
    portList: [],
    scaleTables: ['Braden', '布兰登'],
    firmwareVersion: '0',
    firmware: '0',
    heatmapNoBg: 0
};

var _statData = {
    defaultLanguage: 'en',
    envHost: '',
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
    portListener: 0,
    reOpenDelayCnt: 0,
    me: {
        actioned: 0,
        leaveCounter: 0,
        backCounter: 0,
        selfTurnCounter: 0,
        preScale: 0
    },
    alertHandle: 0,
    autoCalibrationHandle: 0,
    inEdgeDetectionRange: false,
    inSkeletonDetectionRange: false,
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
    try {
        $.getJSON('asset/firmwares.json', function(result) {
            _commonConstant.firmwares = result;
        });
        if (_WINDOW_) setConfig(_readFile(_commonConstant.path + _commonConstant.config, 'utf8', 'json'));
        else if (window.MyApp) window.MyApp.setCommConfig();
        innerData = initInnerData();
        callLocales(_statData.defaultLanguage);
        whoAmI(_statData.envHost);
        _statData.autoCalibrationHandle = setInterval(_autoCalibration, (commConfig.autoCalibration * 1000));

        if (_WINDOW_) {
            SerialPort = require('serialport');
            commConfig.portList.length = 0;
            SerialPort.list(function(err, ports) {
                var inConfig = false;
                ports.forEach(function(port) {
                    if (port.comName === commConfig.port) inConfig = true;
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
                if (!inConfig) {
                    if (commConfig.portList.length === 3) commConfig.port = commConfig.portList[1].comName;
                    else if (commConfig.portList.length > 0) commConfig.port = commConfig.portList[0].comName;
                }
            });
        }
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
    if (window.MyApp) {
        try {
            window.MyApp.closeData();
        } catch (e) {}
    }
    $("#main-content").append('<label>我要写个首页……</label>');
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
    if (window.MyApp) {
        try {
            window.MyApp.closeData();
        } catch (e) {}
    }
    $("#main-content").load('pages/config.html');
    $("#main-content").fadeIn(666);
};

var callScale = function() {
    if (_statData.activedPage === 'scales') return;
    _statData.activedPage = 'scales';
    $("#main-content").hide();
    if (window.MyApp) {
        try {
            window.MyApp.closeData();
        } catch (e) {}
    }
    $("#main-content").load('pages/scales.html');
    $("#main-content").fadeIn(666);
};
var callSet = function() {
    if (_statData.activedPage === 'set') return;
    _statData.activedPage = 'set';
    $("#main-content").hide();
    if (window.MyApp) {
        try {
            window.MyApp.closeData();
        } catch (e) {}
    }
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
var whoAmI = function(I) {
    if (!I) return;
    _statData.envHost = I;
    _traverseHideInI($('body').children(), I);
}
var _callAlert = function() {
    /*
    if (_statData.activedPage != 'alert') {
        _statData.activedPage = 'alert';
        //heatmapInstance = null;
        $("#main-content").load('pages/alert.html');
    }
    _doAlert();
    */
    $(".overlay > section").empty();
    $(".overlay > section").load('pages/alert.html');
    $(".overlay").fadeIn(666);
    _doAlert();
};
var changeLocales = function(lang) {
    if (_statData.defaultLanguage === lang) return;
    if (window.MyApp) {
        try {
            window.MyApp.postLanguage(lang);
        } catch (e) {}
    }
    callLocales(lang);
};
var setFullScreen = function() {
    if (!_WINDOW_) return;
    try {
        _WINDOW_.toggleFullscreen();
    } catch (e) {}
};

var setConfigFromJson = function(strJson) {
    var data = JSON.parse(strJson);
    setConfig(data);
    initInnerData();
};
var setConfig = function(data) {
    commConfig.showMultiple = _getDefaultMultiples(commConfig.productionSize.width + '-' + commConfig.productionSize.height);
    if (!data) return;
    if (data.hasOwnProperty('port')) commConfig.port = data.port;

    if (data.hasOwnProperty('alertFreque')) commConfig.alertFreque = _toInt(data.alertFreque);
    if (data.hasOwnProperty('alertTime')) commConfig.alertTime = _toInt(data.alertTime);

    if (data.hasOwnProperty('baudRange')) commConfig.baudRange = _toInt(data.baudRange);
    if (data.hasOwnProperty('radius')) commConfig.radius = _toInt(data.radius);
    if (data.hasOwnProperty('islandPoint')) commConfig.islandPoint = _toInt(data.islandPoint);
    if (data.hasOwnProperty('autoCalibration')) commConfig.autoCalibration = _toInt(data.autoCalibration);
    if (data.hasOwnProperty('delayedSampling')) commConfig.delayedSampling = _toInt(data.delayedSampling);

    if (data.hasOwnProperty('filterTimes')) commConfig.filterTimes = _toInt(data.filterTimes);
    if (data.hasOwnProperty('sobelThreshold')) commConfig.sobelThreshold = _toInt(data.sobelThreshold);
    if (data.hasOwnProperty('leaveJudge')) commConfig.leaveJudge = _toInt(data.leaveJudge);
    if (data.hasOwnProperty('turnJudge')) commConfig.turnJudge = _toInt(data.turnJudge);
    if (data.hasOwnProperty('skeletonLimit')) commConfig.skeletonLimit = _toInt(data.skeletonLimit);

    if (data.hasOwnProperty('productionWidth')) commConfig.productionSize.width = _toInt(data.productionWidth);
    if (data.hasOwnProperty('productionHeight')) commConfig.productionSize.height = _toInt(data.productionHeight);

    if (data.hasOwnProperty('showMultiple')) commConfig.showMultiple = _toFloat(data.showMultiple);
    if (commConfig.showMultiple === 0)
        commConfig.showMultiple = _getDefaultMultiples(commConfig.productionSize.width + '-' + commConfig.productionSize.height);

    if (data.hasOwnProperty('minNoise')) commConfig.noiseLimit.min = _toInt(data.minNoise);
    if (data.hasOwnProperty('maxNoise')) commConfig.noiseLimit.max = _toInt(data.maxNoise);

    if (data.hasOwnProperty('defaultLanguage')) _statData.defaultLanguage = data.defaultLanguage;
    if (data.hasOwnProperty('scaleTables')) commConfig.scaleTables = data.scaleTables;

    if (data.hasOwnProperty('calibrationData')) _statData.calibrationData = data.calibrationData;

    if (data.hasOwnProperty('envHost')) _statData.envHost = data.envHost;

    if (data.hasOwnProperty('heatmapNoBg')) commConfig.heatmapNoBg = 1;

    var w = $(window).get(0).innerWidth;
    var h = $(window).get(0).innerHeight;
    commConfig.radius = Math.floor((w > h ? h : w) * (commConfig.productionSize.width === 16 ? 4 : 2.5) / 100);
};
var _destoryMe = function() {
    if (serialport && serialport.isOpen()) {
        _statData.portOpened = false;
        if (_statData.portListener) clearInterval(_statData.portListener);
        _statData.portListener = 0;
        serialport.close();
    }
    serialport = null;
    SerialPort = null;
    if (bufferDataWorker) bufferDataWorker.terminate();
    bufferDataWorker = null;
    if (dataAnalysisWorker) dataAnalysisWorker.terminate();
    dataAnalysisWorker = null;
    if (edgeDetectionWorker) edgeDetectionWorker.terminate();
    edgeDetectionWorker = null;
    if (skeletonExtractionWorker) skeletonExtractionWorker.terminate();
    skeletonExtractionWorker = null;
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
            if (_statData.portListener) clearInterval(_statData.portListener);
            _statData.portListener = 0;
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
            /*
            //0: "rgb(153,255,255)",
            0.25: "rgb(0,255,255)",
            0.45: "rgb(0,255,0)",
            0.65: "rgb(255,255,0)",
            0.85: "rgb(255,0,0)" //,
            //1.0: "rgb(153,0,51)"
            */
            0.15: "rgb(176,225,255)",
            0.25: "rgb(1,139,250)",
            0.35: "rgb(5,252,241)",
            0.45: "rgb(48,254,5)",
            0.55: "rgb(202,255,0)",
            0.65: "rgb(252,255,13)",
            0.75: "rgb(252,146,2)",
            0.85: "rgb(249,97,0)",
            0.95: "rgb(255,0,13)"
        };
    } else {
        gradient = {
            /*
            0.4: "rgb(153,255,255)",
            0.8: "rgb(0,255,255)",
            0.88: "rgb(0,255,0)",
            0.95: "rgb(255,255,0)",
            0.995: "rgb(255,0,0)"
            */
            0.4: "rgb(176,225,255)",
            0.52: "rgb(1,139,250)",
            0.65: "rgb(5,252,241)",
            0.75: "rgb(48,254,5)",
            0.78: "rgb(202,255,0)",
            0.85: "rgb(252,255,13)",
            0.88: "rgb(252,146,2)",
            0.9: "rgb(249,97,0)",
            0.93: "rgb(255,0,13)"
        };
    }
    /*
    var gradient = {
        0.1: "rgb(176,196,222)",
        0.2: "rgb(65,105,225)",
        0.3: "rgb(0,255,255)",
        0.4: "rgb(0,128,0)",
        0.5: "rgb(173,255,47)",
        0.6: "rgb(255,255,0)",
        0.7: "rgb(255,165,0)",
        0.8: "rgb(178,34,34)",
        0.9: "rgb(255,0,0)"
    };
    */
    if ($('.heatmap-datainfo').length) {
        var html = '<ul class="legend-container">';
        var title = _getLocalesValue('langHeatmapTitleLegend', 'Sample: input number between 0 and 1(not include) that lager shows higher presure');
        html += '<i id="toSymbol" class="icon-refresh icon-large icon-spin"></i>&nbsp;&nbsp;<label title="' + title + '" z-lang="langHeatmapTitleLegend">' + title + '</label>';
        for (var ele in gradient) {
            html += '<li><input class="form-control number-input" style="background-color:' + gradient[ele] + '" type="number" value="' + ele + '" old-value="' + ele + '" /></li>';
        }
        //html += '<label title="' + footer + '" z-lang="langHeatmapTitleLegend">' + footer + '</label>';
        html += '</ul>';
        $('.heatmap-datainfo').empty();
        $('.heatmap-datainfo').append(html);
        if (!$('#toSymbol').attr('onclick')) {
            $('#toSymbol').on('click', function() {
                $('.heatmap-datainfo').hide();
                $('.heatmap-symbol').show();
            });
        }
    }

    if ($('.heatmap-symbol').length) {
        var html = '<ul class="legend-container">';
        var title = _getLocalesValue('langHeatmapTitleSymbol', 'Low');
        var footer = _getLocalesValue('langHeatmapFooterSymbol', 'High');
        html += '<label title="' + title + '" z-lang="langHeatmapTitleSymbol">' + title + '</label>';
        for (var ele in gradient) {
            html += '<li><i class="icon-stop icon-2x" style="color:' + gradient[ele] + ';"></i></li>';
        }
        html += '<label title="' + footer + '" z-lang="langHeatmapFooterSymbol" id="toInfo">' + footer + '</label>';
        html += '</ul>';
        $('.heatmap-symbol').empty();
        $('.heatmap-symbol').append(html);
        if (!$('#toInfo').attr('onclick')) {
            $('#toInfo').on('click', function() {
                $('.heatmap-symbol').hide();
                $('.heatmap-datainfo').show();
            });
        }
    }

    // heatmap instance configuration
    var cfg = {
        // only container is required, the rest can be defaults
        //backgroundColor: 'rgba(0,0,180,0.8)',
        gradient: gradient,
        maxOpacity: 1,
        minOpacity: 0,
        blur: 0.95,
        radius: commConfig.radius * (commConfig.productionSize.width === 16 ? 1.4 : 2.1),
        container: document.querySelector('.heatmap')
    };
    cfg.backgroundColor = 'rgba(0,0,0,0.8)';
    /*
    if (!commConfig.heatmapNoBg) {
        cfg.backgroundColor = 'rgba(0,0,180,0.8)';
    }
    */
    heatmapInstance = heatmap.create(cfg);
    setHeatMap(innerData);
};

var setHeatMap = function(innerData) {
    var radius = (commConfig && commConfig.radius) ? commConfig.radius : 40;
    var points = [];
    var maxPoint = {
        x: 0,
        y: 0
    };
    var maxList = [];
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
            numData = (numData > 1023) ? 1023 : numData;
            /*
            numData = numData + 10 - commConfig.noiseLimit.min;
            if (numData < 0) {
                numData = (commConfig.noiseLimit.min - numData) / commConfig.noiseLimit.min;
            }
            */

            max = Math.max(max, numData);
            min = Math.min(min, numData);

            if (_statData.calibrationData.length > i && _statData.calibrationData[0].length > j) {
                if (numData < _statData.calibrationData[i][j]) numData = 0;
                else numData = Math.abs(numData - _statData.calibrationData[i][j]);
                if ((numData * 100 / (1024 - _statData.calibrationData[i][j])) < commConfig.noiseLimit.min)
                    numData = 0;
                if ((numData * 100 / (1024 - _statData.calibrationData[i][j])) > commConfig.noiseLimit.max)
                    numData = 1024 - _statData.calibrationData[i][j];
            }
            if (commConfig.islandPoint) {
                var cntNoValue = 0;
                var p4 = (j === innerData[i].length - 1) ? 1 : (innerData[i][j + 1] - ((_statData.calibrationData && _statData.calibrationData[i] && _statData.calibrationData[i][j + 1]) ? _statData.calibrationData[i][j + 1] : 0));
                var p8 = (j === 0) ? 1 : (innerData[i][j - 1] - ((_statData.calibrationData && _statData.calibrationData[i] && _statData.calibrationData[i][j - 1]) ? _statData.calibrationData[i][j - 1] : 0));
                var p2 = (i === 0) ? 1 : (innerData[i - 1][j] - ((_statData.calibrationData && _statData.calibrationData[i - 1] && _statData.calibrationData[i - 1][j]) ? _statData.calibrationData[i - 1][j] : 0));
                var p3 = (i === 0 || j === innerData[i].length - 1) ? 1 : (innerData[i - 1][j + 1] - ((_statData.calibrationData && _statData.calibrationData[i - 1] && _statData.calibrationData[i - 1][j + 1]) ? _statData.calibrationData[i - 1][j + 1] : 0));
                var p9 = (i === 0 || j === 0) ? 1 : (innerData[i - 1][j - 1] - ((_statData.calibrationData && _statData.calibrationData[i - 1] && _statData.calibrationData[i - 1][j - 1]) ? _statData.calibrationData[i - 1][j - 1] : 0));
                var p6 = (i === innerData.length - 1) ? 1 : (innerData[i + 1][j] - ((_statData.calibrationData && _statData.calibrationData[i + 1] && _statData.calibrationData[i + 1][j]) ? _statData.calibrationData[i + 1][j] : 0));
                var p5 = (i === innerData.length - 1 || j === innerData[i].length - 1) ? 1 : (innerData[i + 1][j + 1] - ((_statData.calibrationData && _statData.calibrationData[i + 1] && _statData.calibrationData[i + 1][j + 1]) ? _statData.calibrationData[i + 1][j + 1] : 0));
                var p7 = (i === innerData.length - 1 || j === 0) ? 1 : (innerData[i + 1][j - 1] - ((_statData.calibrationData && _statData.calibrationData[i + 1] && _statData.calibrationData[i + 1][j - 1]) ? _statData.calibrationData[i + 1][j - 1] : 0));
                if (p4 <= 0) cntNoValue++;
                if (p8 <= 0) cntNoValue++;
                if (p2 <= 0) cntNoValue++;
                if (p3 <= 0) cntNoValue++;
                if (p9 <= 0) cntNoValue++;
                if (p6 <= 0) cntNoValue++;
                if (p5 <= 0) cntNoValue++;
                if (p7 <= 0) cntNoValue++;
                switch (commConfig.islandPoint) {
                    case 1:
                        if (cntNoValue > 6) numData = 0;
                        break;
                    case 2:
                        if (cntNoValue > 5) numData = 0;
                        break;
                    case 3:
                        if (cntNoValue > 4) numData = 0;
                        break;
                    default:
                        break;
                }
            }
            if (numData > 5) {
                points.push({
                    x: i * radius + radius,
                    y: j * radius + radius,
                    value: numData
                });
            }
        }
    }
    // heatmap data format
    var data = {
        //max: (max === 0) ? 1024 : max,
        max: 1023,
        min: (min >= 1023) ? commConfig.noiseLimit.min : min,
        data: points
    };
    _statData.realMax = realMax;
    $('#heatmap-labMaxRecord').html(realMax);
    $('#heatmap-labMaxRecordPoint').html('(' + maxPoint.x + ',' + maxPoint.y + ')');
    // if you have a set of datapoints always use setData instead of addData
    // for data initialization
    heatmapInstance.setData(data);
    if ($('.heatmap canvas').length > 0 && serialport && serialport.isOpen()) {
        var canvas = $('.heatmap canvas').get(0);
        var ctx = canvas.getContext("2d");
        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        if (!_statData.inEdgeDetectionRange) {
            _statData.inEdgeDetectionRange = true;
            var inner = [];
            var row = [];
            for (var i = 0; i < imgData.length; i += 4) {
                if (imgData[i] === null) continue;
                row.push((((imgData[i] * 299 + imgData[i + 1] * 587 + imgData[i + 2] * 114 + 500) / 1000) /* (imgData[i + 3] / 255)*/ ));
                //row.push(imgData[i + 3]);
                if (row.length === canvas.width) {
                    inner.push(row.slice(0));
                    row.length = 0;
                }
            }
            var postData = {};
            postData.imgData = inner;
            postData.filterTimes = commConfig.filterTimes;
            edgeDetectionWorker.postMessage(JSON.stringify(postData));
        }
        if (!_statData.inSkeletonDetectionRange) {
            _statData.inSkeletonDetectionRange = true;
            var inner = [];
            var row = [];
            for (var i = 0; i < imgData.length; i += 4) {
                if (imgData[i] === null) continue;
                if (imgData[i + 3] > 0) row.push(1);
                else row.push(0);
                if (row.length === canvas.width) {
                    inner.push(row.slice(0));
                    row.length = 0;
                }
            }
            var postData = {};
            postData.binaryImg = inner;
            postData.skeletonLimit = commConfig.skeletonLimit;
            skeletonExtractionWorker.postMessage(JSON.stringify(postData));
        }
    }
};
var setHeatMapAndUpdate = function(strJson) {
    innerData = JSON.parse(strJson);
    setHeatMap(innerData);
};

var getDataFromBuffer = function(data) {
    try {
        var buffer = null;
        if (_WINDOW_) buffer = new Buffer(data, 'hex');
        else {
            switch (typeof(data)) {
                case 'string':
                    buffer = data.split(',');
                    break;
                default:
                    buffer = data;
                    break;
            }
        }
        var postStr = {};
        postStr.innerData = innerData;
        postStr.data = buffer;
        bufferDataWorker.postMessage(JSON.stringify(postStr));
    } catch (e) {}
};