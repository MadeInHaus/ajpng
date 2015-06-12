# ajpng v1.0.0

Library to display APNG ([Wikipedia](http://en.wikipedia.org/wiki/APNG), [specification](https://wiki.mozilla.org/APNG_Specification)) and AJPNG in a browser using canvas.

The library requires the following technologies in order to run:

 * [Canvas](http://caniuse.com/#feat=canvas)
 * [Typed Arrays](http://caniuse.com/#feat=typedarrays)
 * [Blob URLs](http://caniuse.com/#feat=bloburls)
 * [requestAnimationFrame](http://caniuse.com/#feat=requestanimationframe)
 
These technologies are supported in all modern browsers and IE starting with version 10.

Some browsers (Firefox and Safari 8) have [native support for APNG](http://caniuse.com/#feat=apng). This library is not required for these browsers.

## Usage example

```javascript
AJPNG.ifNeeded().then(function() {
    var images = document.querySelectorAll(".ajpng-image");
    for (var i = 0; i < images.length; i++) {
        AJPNG.animateImage(images[i]);
    }
});
```

## Limitations

Images are loaded using `XMLHttpRequest`, therefore, the HTML page and AJPNG image must be located on the same domain or the correct [CORS](http://www.w3.org/TR/cors/ "Cross-Origin Resource Sharing") header should be provided (for example, `Access-Control-Allow-Origin: *`). For the same reason, the library will not work on a local machine (using the protocol `file://`).

**Important note!** Compression proxies (turbo mode in Opera, "reduce data usage" mode in mobile Chrome, etc), doesn't know about
AJPNG format. These proxies transforms AJPNGs into static images. To prevent this for *your* images, they need to be served with 
`Cache-Control: no-transform` HTTP header (see [big article](http://calendar.perfplanet.com/2013/mobile-isp-image-recompression/) about such proxies), or via HTTPS.

## API

The library creates a global object **AJPNG**, which has several methods.

High-level methods:

* [AJPNG.ifNeeded](API.md#user-content-apngifneededignorenativeapng-boolean)
* [AJPNG.animateImage](API.md#user-content-apnganimateimageimg-htmlimageelement)
* [AJPNG.releaseCanvas](API.md#user-content-apngreleasecanvascanvas-htmlcanvaselement)

Low-level methods:

* [AJPNG.checkNativeFeatures](API.md#user-content-apngchecknativefeatures)
* [AJPNG.parseBuffer](API.md#user-content-apngparsebufferdata-arraybuffer)
* [AJPNG.parseURL](API.md#user-content-apngparseurlurl-string)
* [AJPNG.animateContext](API.md#user-content-apnganimatecontexturl-string-canvasrenderingcontext2d-context)

Most methods work asynchronously and return the ES6 *Promise* object. Most browsers have [built-in support](http://caniuse.com/#feat=promises) for it. For others browsers, the library uses a [polyfill](https://github.com/jakearchibald/es6-promise) (included in the library).

## Build instructions

Install dependencies:

    npm install

Minified build:

    gulp prod

Development build:

	gulp
