/**
 * API:
 *
 * ifNeeded([ignoreNativeAPNG bool]) → Promise()
 * animateImage(img HTMLImageElement) → Promise()
 *
 * animateContext(url String, CanvasRenderingContext2D context) → Promise(Animation)
 * parseBuffer(ArrayBuffer) → Promise(Animation)
 * parseURL(url String) → Promise(Animation)
 * checkNativeFeatures() → Promise(features)
 */

// UMD (Universal Module Definition)
// See https://github.com/umdjs/umd for reference
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.AJPNG = factory();
    }
} (this, function () {
    return function () {

        "use strict";

        var Promise = Promise || require('es6-promise').Promise;
        var support = require("./src/support-test");
        var parseAPNG = require("./src/parser");
        var loadUrl = require('./src/loader');

        var AJPNG = {};
        var url2promise = {};

        AJPNG.checkNativeFeatures = support.checkNativeFeatures;
        
        AJPNG.ifNeeded = support.ifNeeded;

        /**
         * @param {ArrayBuffer} buffer
         * @return {Promise}
         */
        AJPNG.parseBuffer = function (buffer) { return parseAPNG(new Uint8Array(buffer)); };

        /**
         * @param {String} url
         * @return {Promise}
         */
        AJPNG.parseURL = function (url) {
            if (!(url in url2promise)) url2promise[url] = loadUrl(url).then(parseAPNG);
            return url2promise[url];
        };

        /**
         * @param {String} url
         * @param {CanvasRenderingContext2D} context
         * @return {Promise}
         */
        AJPNG.animateContext = function (url, context) {
            return AJPNG.parseURL(url).then(function (a) {
                a.addContext(context);
                a.play();
                return a;
            });
        };

        /**
         * @param {HTMLImageElement} img
         * @return {Promise}
         */
        AJPNG.animateImage = function (img) {
            img.setAttribute("data-is-apng", "progress");
            return AJPNG.parseURL(img).then(
                function (anim) {
                    img.setAttribute("data-is-apng", "yes");
                    var canvas = document.createElement("canvas");
                    canvas.width = anim.width;
                    canvas.height = anim.height;
                    Array.prototype.slice.call(img.attributes).forEach(function (attr) {
                        if (["alt", "src", "usemap", "ismap", "data-is-apng", "width", "height"].indexOf(attr.nodeName) == -1) {
                            canvas.setAttributeNode(attr.cloneNode());
                        }
                    });
                    canvas.setAttribute("data-apng-src", img.src);
                    if (img.alt != "") canvas.appendChild(document.createTextNode(img.alt));

                    var imgWidth = "", imgHeight = "", val = 0, unit = "";

                    if (img.style.width != "" && img.style.width != "auto") {
                        imgWidth = img.style.width;
                    } else if (img.hasAttribute("width")) {
                        imgWidth = img.getAttribute("width") + "px";
                    }
                    if (img.style.height != "" && img.style.height != "auto") {
                        imgHeight = img.style.height;
                    } else if (img.hasAttribute("height")) {
                        imgHeight = img.getAttribute("height") + "px";
                    }
                    if (imgWidth != "" && imgHeight == "") {
                        val = parseFloat(imgWidth);
                        unit = imgWidth.match(/\D+$/)[0];
                        imgHeight = Math.round(canvas.height * val / canvas.width) + unit;
                    }
                    if (imgHeight != "" && imgWidth == "") {
                        val = parseFloat(imgHeight);
                        unit = imgHeight.match(/\D+$/)[0];
                        imgWidth = Math.round(canvas.width * val / canvas.height) + unit;
                    }
                    canvas.style.width = imgWidth;
                    canvas.style.height = imgHeight;

                    var p = img.parentNode;
                    p.insertBefore(canvas, img);
                    p.removeChild(img);
                    anim.addContext(canvas.getContext("2d"));
                    anim.play();
                },
                function () {
                    img.setAttribute("data-is-apng", "no");
                });
        };

        /**
         * @param {HTMLCanvasElement} canvas
         * @return {void}
         */
        AJPNG.releaseCanvas = function(canvas) {
            var ctx = canvas.getContext("2d");
            if ('_apng_animation' in ctx) {
                ctx['_apng_animation'].removeContext(ctx);
            }
        };

        return AJPNG;
    };
}));
