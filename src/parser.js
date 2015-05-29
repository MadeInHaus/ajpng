"use strict";

var Promise = Promise || require('es6-promise').Promise;
var Animation = require('./animation');
var crc32 = require('./crc32');

// "\x89PNG\x0d\x0a\x1a\x0a"
var PNG_SIGNATURE_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * @param {ArrayBuffer} buffer
 * @return {Promise}
 */
module.exports = function (buffer) {
    var bytes = new Uint8Array(buffer);
    return new Promise(function (resolve, reject) {
        for (var i = 0; i < PNG_SIGNATURE_BYTES.length; i++) {
            if (PNG_SIGNATURE_BYTES[i] != bytes[i]) {
                reject("Not a PNG file (invalid file signature)");
                return;
            }
        }

        // fast animation test
        var isAnimated = false;
        var isAJPNG = false;
        parseChunks(bytes, function (type) {
            if (type == "acTL") {
                isAnimated = true;
                return false;
            }
            if (type == "acTV") {
                isAnimated = true;
                isAJPNG = true;
                return false;
            }
            return true;
        });
        if (!isAnimated) {
            reject("Not an animated PNG");
            return;
        }

        var
            preDataParts = [],
            postDataParts = [],
            headerDataBytes = null,
            frame = null,
            anim = new Animation(),
            hasIDAT = false;

        parseChunks(bytes, function (type, bytes, off, length) {
            switch (type) {
                case "IHDR":
                    headerDataBytes = bytes.subarray(off + 8, off + 8 + length);
                    anim.width = readDWord(bytes, off + 8);
                    anim.height = readDWord(bytes, off + 12);
                    break;
                case "acTL":
                case "acTV":
                    anim.numPlays = readDWord(bytes, off + 8 + 4);
                    break;
                case "fcTL":
                case "fcTV":
                    if (frame) anim.frames.push(frame);
                    frame = {};
                    frame.isAJPNG = isAJPNG;
                    frame.isDefault = !hasIDAT;
                    frame.width = readDWord(bytes, off + 8 + 4);
                    frame.height = readDWord(bytes, off + 8 + 8);
                    frame.left = readDWord(bytes, off + 8 + 12);
                    frame.top = readDWord(bytes, off + 8 + 16);
                    var delayN = readWord(bytes, off + 8 + 20);
                    var delayD = readWord(bytes, off + 8 + 22);
                    if (delayD == 0) delayD = 100;
                    frame.delay = 1000 * delayN / delayD;
                    // see http://mxr.mozilla.org/mozilla/source/gfx/src/shared/gfxImageFrame.cpp#343
                    if (frame.delay <= 10) frame.delay = 100;
                    anim.playTime += frame.delay;
                    frame.disposeOp = readByte(bytes, off + 8 + 24);
                    frame.blendOp = readByte(bytes, off + 8 + 25);
                    frame.dataParts = [];
                    break;
                case "fdAT":
                    if (frame) frame.dataParts.push(bytes.subarray(off + 8 + 4, off + 8 + length));
                    break;
                case "fdAV":
                    if (frame) {
                        var alphaOffs = readDWord(bytes, off + 8 + 4);
                        if (alphaOffs === 0) {
                            frame.dataParts.push({
                                jpeg: bytes.subarray(off + 8 + 8, off + 8 + length)
                            });
                        } else {
                            frame.dataParts.push({
                                jpeg: bytes.subarray(off + 8 + 8, off + 8 + 8 + alphaOffs),
                                alpha: bytes.subarray(off + 8 + 8 + alphaOffs, off + 8 + length),
                            });
                        }
                    }
                    break;
                case "IDAT":
                    if (frame) frame.dataParts.push(bytes.subarray(off + 8, off + 8 + length));
                    hasIDAT = true;
                    break;
                case "IEND":
                    postDataParts.push(subBuffer(bytes, off, 12 + length));
                    break;
                default:
                    preDataParts.push(subBuffer(bytes, off, 12 + length));
            }
        });

        if (frame) anim.frames.push(frame);

        if (anim.frames.length == 0) {
            reject("Not an animated PNG");
            return;
        }

        // creating images
        var createdImages = 0;
        var preBlob = new Blob(preDataParts), postBlob = new Blob(postDataParts);
        for (var f = 0; f < anim.frames.length; f++) {
            frame = anim.frames[f];

            var j;
            var url;

            if (frame.isAJPNG && !frame.isDefault) {
                for (j = 0; j < frame.dataParts.length; j++) {
                    var frameDataPart = frame.dataParts[j];
                    if(frameDataPart && frameDataPart.jpeg) {
                        var jpegUrl = URL.createObjectURL(new Blob([frameDataPart.jpeg], { "type": "image/jpeg" }));
                        if (!frameDataPart.alpha) {
                            url = jpegUrl;
                        } else {
                            var alphaUrl = URL.createObjectURL(new Blob([frameDataPart.alpha], { "type": "image/png" }));
                            (function (frame) {
                                createCompositeImage(jpegUrl, alphaUrl, function (err, img) {
                                    if (img) {
                                        frame.img = img;
                                        if (++createdImages == anim.frames.length) {
                                            resolve(anim);
                                        }
                                    } else {
                                        reject(err);
                                    }
                                });
                            })(frame);
                            url = null;
                        }
                        break;
                    }
                }
            } else {
                var bb = [];
                bb.push(PNG_SIGNATURE_BYTES);
                headerDataBytes.set(makeDWordArray(frame.width), 0);
                headerDataBytes.set(makeDWordArray(frame.height), 4);
                bb.push(makeChunkBytes("IHDR", headerDataBytes));
                bb.push(preBlob);
                for (j = 0; j < frame.dataParts.length; j++) {
                    bb.push(makeChunkBytes("IDAT", frame.dataParts[j]));
                }
                bb.push(postBlob);
                url = URL.createObjectURL(new Blob(bb, {"type": "image/png"}));
                bb = null;
            }

            delete frame.dataParts;

            if (url) {
                (function (frame) {
                    loadImgUrl(url, function (err, img) {
                        if (img) {
                            frame.img = img;
                            if (++createdImages == anim.frames.length) {
                                resolve(anim);
                            }
                        } else {
                            reject(err);
                        }
                    });
                })(frame);
            }
        }
    });
};

var createCompositeImage = function (jpegUrl, alphaUrl, callback) {
    loadImgUrl(jpegUrl, function (err, jpegImg) {
        if (jpegImg) {
            loadImgUrl(alphaUrl, function (err, alphaImg) {
                if (alphaImg) {
                    var canvas = document.createElement('canvas');
                    var w = canvas.width = alphaImg.naturalWidth;
                    var h = canvas.height = alphaImg.naturalHeight;
                    var ctx = canvas.getContext('2d');
                    // draw jpg to canvas and get pixels
                    ctx.drawImage(jpegImg, 0, 0);
                    var pdRGB = ctx.getImageData(0, 0, w, h);
                    var pdRGBData = pdRGB.data;
                    // draw png to canvas and get pixels
                    ctx.clearRect(0, 0, w, h);
                    ctx.drawImage(alphaImg, 0, 0);
                    var pdAlpha = ctx.getImageData(0, 0, w, h);
                    var pdAlphaData = pdAlpha.data;
                    // alpha compositing against black matte
                    for (var i = pdRGBData.length - 1; i > 0; i -= 4) {
                        var alphaU8 = pdAlphaData[i];
                        var alpha = 255 / alphaU8;
                        // copy alpha
                        pdRGBData[i] = alphaU8;
                        // premultiply alpha
                        pdRGBData[i - 1] *= alpha;
                        pdRGBData[i - 2] *= alpha;
                        pdRGBData[i - 3] *= alpha;
                    }
                    // write result back
                    ctx.putImageData(pdRGB, 0, 0);
                    callback(null, canvas);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
}

var loadImgUrl = function (url, callback) {
    /**
     * Using "createElement" instead of "new Image" because of bug in Chrome 27
     * https://code.google.com/p/chromium/issues/detail?id=238071
     * http://stackoverflow.com/questions/16377375/using-canvas-drawimage-in-chrome-extension-content-script/16378270
     */
    var img = document.createElement('img');
    img.onload = function () {
        URL.revokeObjectURL(this.src);
        callback(null, this);
    };
    img.onerror = function () {
        callback("Image creation error");
    };
    img.src = url;
}

/**
 * @param {Uint8Array} bytes
 * @param {function(string, Uint8Array, int, int)} callback
 */
var parseChunks = function (bytes, callback) {
    var off = 8;
    do {
        var length = readDWord(bytes, off);
        var type = readString(bytes, off + 4, 4);
        var res = callback(type, bytes, off, length);
        off += 12 + length;
    } while (res !== false && type != "IEND" && off < bytes.length);
};

/**
 * @param {Uint8Array} bytes
 * @param {int} off
 * @return {int}
 */
var readDWord = function (bytes, off) {
    var x = 0;
    // Force the most-significant byte to unsigned.
    x += ((bytes[0 + off] << 24 ) >>> 0);
    for (var i = 1; i < 4; i++) x += ( (bytes[i + off] << ((3 - i) * 8)) );
    return x;
};

/**
 * @param {Uint8Array} bytes
 * @param {int} off
 * @return {int}
 */
var readWord = function (bytes, off) {
    var x = 0;
    for (var i = 0; i < 2; i++) x += (bytes[i + off] << ((1 - i) * 8));
    return x;
};

/**
 * @param {Uint8Array} bytes
 * @param {int} off
 * @return {int}
 */
var readByte = function (bytes, off) {
    return bytes[off];
};

/**
 * @param {Uint8Array} bytes
 * @param {int} start
 * @param {int} length
 * @return {Uint8Array}
 */
var subBuffer = function (bytes, start, length) {
    var a = new Uint8Array(length);
    a.set(bytes.subarray(start, start + length));
    return a;
};

var readString = function (bytes, off, length) {
    var chars = Array.prototype.slice.call(bytes.subarray(off, off + length));
    return String.fromCharCode.apply(String, chars);
};

var makeDWordArray = function (x) {
    return [(x >>> 24) & 0xff, (x >>> 16) & 0xff, (x >>> 8) & 0xff, x & 0xff];
};
var makeStringArray = function (x) {
    var res = [];
    for (var i = 0; i < x.length; i++) res.push(x.charCodeAt(i));
    return res;
};
/**
 * @param {string} type
 * @param {Uint8Array} dataBytes
 * @return {Uint8Array}
 */
var makeChunkBytes = function (type, dataBytes) {
    var crcLen = type.length + dataBytes.length;
    var bytes = new Uint8Array(new ArrayBuffer(crcLen + 8));
    bytes.set(makeDWordArray(dataBytes.length), 0);
    bytes.set(makeStringArray(type), 4);
    bytes.set(dataBytes, 8);
    var crc = crc32(bytes, 4, crcLen);
    bytes.set(makeDWordArray(crc), crcLen + 4);
    return bytes;
};

