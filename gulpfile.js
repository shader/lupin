var gulp    = require('gulp'),
    del     = require('del'),
    
    p = require('gulp-load-plugins')();

gulp.task('lint', function () {
  return gulp.src(['src/app/**/*.js'])
    .pipe(p.plumber())
    .pipe(p.standard())
    .pipe(p.standard.reporter('default', {
      breakOnError: true
    }))
})

gulp.task('scripts', ['lint'], function() {
  return gulp.src('src/**/*.js')
    .pipe(p.plumber())
    .pipe(p.changed('dist'))
    .pipe(p.sourcemaps.init())
    .pipe(p.babel())
    .pipe(p.uglify())
    .pipe(p.sourcemaps.write('maps'))
    .pipe(gulp.dest('dist'))
});

gulp.task('clean', function(cb) {
  del('dist/**/*', cb)
});

gulp.task('default', ['clean'], function() {
  gulp.start('scripts');
});
