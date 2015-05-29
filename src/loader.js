"use strict";

var Promise = Promise || require('es6-promise').Promise;

module.exports = function (img) {
    return new Promise(function (resolve, reject) {
        function load(url) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function () {
                if (this.status == 200) {
                    resolve(this.response);
                } else {
                    reject(this);
                }
            };
            xhr.send();
        }
        if (!img.complete || (typeof img.naturalWidth !== 'undefined' && img.naturalWidth === 0)) {
            img.onload = function () {
                load(img.src);
            };
        } else {
            load(img.src);
        }
    });
};
