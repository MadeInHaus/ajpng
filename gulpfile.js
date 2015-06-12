var gulp = require('gulp');
var browserify = require('gulp-browserify');
var uglify = require('gulp-uglify');
var addsrc = require('gulp-add-src');
var concat = require('gulp-concat');

gulp.task('prod', function () {
    gulp.src([ './index.js' ])
        .pipe(browserify({ standalone: 'AJPNG' }))
        .pipe(uglify())
        .pipe(addsrc.prepend('./src/about.js'))
        .pipe(concat('ajpng.min.js'))
        .pipe(gulp.dest('./build/'));
});

gulp.task('dev', function () {
    gulp.src([ './index.js' ])
        .pipe(browserify({ debug: true, standalone: 'AJPNG' }))
        .pipe(addsrc.prepend('./src/about.js'))
        .pipe(concat('ajpng.js'))
        .pipe(gulp.dest('./build/'));
});

gulp.task('watch', function () {
    gulp.watch('./src/*.js', [ 'dev' ]);
});

gulp.task('default', [ 'dev' ]);
