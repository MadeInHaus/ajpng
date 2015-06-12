# ajpng v0.1.0

Library to display APNG ([Wikipedia](http://en.wikipedia.org/wiki/APNG), [specification](https://wiki.mozilla.org/APNG_Specification)) and *AJPNG* in a browser using canvas.

Based in large parts on [apng-canvas](https://github.com/davidmz/apng-canvas).

## AJPNG

AJPNG is an animated image file format similar to APNG, allowing the use of _JPEG encoded_ animation frames with optional _PNG encoded alpha channel_. This makes it possible to create true color [Cinemagraphs](http://en.wikipedia.org/wiki/Cinemagraph) with an optional 8 bit alpha channel, using lossy compression to keep file size small.

## Demo

http://madeinhaus.github.io/ajpng/

## Build instructions

Clone and install dependencies:

	git clone https://github.com/MadeInHaus/ajpng.git
	cd ajpng
    npm install

Create minified build (`./build/ajpng.min.js`):

    gulp prod

Create development build with source maps (`./build/ajpng.js`):

	gulp

Or use with Browserify:

	npm install ajpng --save

## Usage example

```javascript
var images = document.querySelectorAll(".ajpng-image");
for (var i = 0; i < images.length; i++) {
    AJPNG.animateImage(images[i]);
}
```

## API

The library creates a global object `AJPNG`.

You can also use ajpng with popular module loaders (AMD, CommonJS) and packagers (Browserify).

Most methods work asynchronously and return the ES6 `Promise` object. Most browsers have [built-in support](http://caniuse.com/#feat=promises) for it. For others browsers, the library uses a [polyfill](https://github.com/jakearchibald/es6-promise) (included in the library).

### High-level methods:

#### AJPNG.ifNeeded(\[ignoreNativeAPNG boolean\])
Checks whether there is a need to use the library.

Note: AJPNG *always* needs the library because that format is not (and probably never will be) supported by any browser.

**Fulfilled** (no value): The browser supports everything for the technology to work, but it does not support AJPNG. Usually
the library should only be used in this case.

If optional argument *ignoreNativeAPNG* is *true*, then native APNG support isn't tested.

**Rejected** (no value): The browser has native support for APNG (if *ignoreNativeAPNG* not used) or does not support all the necessary technologies for it to work.

#### AJPNG.animateImage(img HTMLImageElement)
Creates a `canvas` element where the AJPNG animation plays. The `img` element is removed from the DOM and replaced by `canvas`.
The `img` element attributes are preserved during replacement.

**Fulfilled** (no value): The `img` element is an AJPNG image.

**Rejected** (no value): The `img` element is not an AJPNG image, or there was an error when processing it. In this case the element is not replaced with `canvas`. 

#### AJPNG.releaseCanvas(canvas HTMLCanvasElement)
Detaches `canvas` from animation loop. May be useful for dynamic created AJPNG-images.
This is a synchronous method, it does not return a result.

### Low-level methods:

#### AJPNG.checkNativeFeatures()
Checks which technologies are supported by the browser.

**Fulfilled** (Features): Returns the *Features* object with the following fields:

    {
        TypedArrays:           boolean
        BlobURLs:              boolean
        requestAnimationFrame: boolean
        pageProtocol:          boolean
        canvas:                boolean
        APNG:                  boolean
    }

Each field has the value `true` or `false`. `true` means the browser has built-in support for the relevant technology. 
The `pageProtocol` field has the value `true` if the page is loaded over the `http` or `https` protocol (the library does not work on pages downloaded over other protocols).

The library can work if all fields except APNG have the value `true`.

**Rejected**: N/A.

#### AJPNG.parseBuffer(data ArrayBuffer)
Parses binary data from the AJPNG-file.

**Fulfilled** (Animation): If the transmitted data are valid AJPNG, then the `Animation` object is returned with the following fields:

    {
        // Properties
        
        width:      int // image width
        height:     int // image height
        numPlays:   int // number of times to loop this animation.  0 indicates infinite looping.
        playTime:   int // time of full animation cycle in millisecond
        frames: [       // animation frames
            {
                width:  int // frame image width
                height: int // frame image height
                left:   int // frame image horizontal offset 
                top:    int // frame image vertical offset
                delay:  int // frame delay in millisecond
                disposeOp:  int // frame area disposal mode (see spec.)
                blendOp:    int // frame area blend mode (see spec.)
                img:    HTMLImageElement // frame image                   
            }
        ]
        
        // Methods
        
        isPlayed(): boolean     // is animation playing now?  
        isFinished(): boolean   // is animation finished (if numPlays <> 0)? 
        play()                  // play animation (if not playing and not finished)
        rewind()                // rewind animation to initial state and stop it
        addContext(CanvasRenderingContext2D)    // play animation on this canvas context 
                                                // (one animation may be played on many contexts)
        removeContext(CanvasRenderingContext2D) // remove context from animation
    }

**Rejected** (string): The file is not valid AJPNG, or there was a parsing error. Returns a string with an error message.

#### AJPNG.parseURL(url string)
Downloads an image from the supplied URL and parses it.

**Fulfilled** (Animation): If the downloaded data are valid AJPNG, then the `Animation` object is returned (see `AJPNG.parseBuffer`).
The same `Animation` object is returned for the same URL.

**Rejected** (mixed): There was an error when downloading or parsing.

#### AJPNG.animateContext(url string, CanvasRenderingContext2D context)
Downloads an image from the supplied URL, parses it, and plays it in the given canvas environment.

**Fulfilled** (Animation): Similar to output of `AJPNG.parseURL`.

**Rejected** (mixed): There was an error when downloading or parsing.

## Limitations

The library requires the following technologies in order to run:

 * [Canvas](http://caniuse.com/#feat=canvas)
 * [Typed Arrays](http://caniuse.com/#feat=typedarrays)
 * [Blob URLs](http://caniuse.com/#feat=bloburls)
 * [requestAnimationFrame](http://caniuse.com/#feat=requestanimationframe)
 
These technologies are supported in all modern browsers and IE starting with version 10.

Some browsers (Firefox and Safari 8) have [native support for APNG](http://caniuse.com/#feat=apng). This library is not required for these browsers.

#### XMLHttpRequest

Images are loaded using `XMLHttpRequest`, therefore, the HTML page and AJPNG image must be located on the same domain or the correct [CORS](http://www.w3.org/TR/cors/ "Cross-Origin Resource Sharing") header should be provided (for example, `Access-Control-Allow-Origin: *`). For the same reason, the library will not work on a local machine (using the protocol `file://`).

#### Proxies

Compression proxies (turbo mode in Opera, "reduce data usage" mode in mobile Chrome, etc), doesn't know about
AJPNG format. These proxies transforms AJPNGs into static images. To prevent this for *your* images, they need to be served with 
`Cache-Control: no-transform` HTTP header (see [big article](http://calendar.perfplanet.com/2013/mobile-isp-image-recompression/) about such proxies), or via HTTPS.

## License

MIT
