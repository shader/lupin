var gulp    = require('gulp'),
    del     = require('del'),
    nib     = require('nib'),
    es      = require('event-stream'),
    
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
    .pipe(p.sourcemaps.write('maps'))
    .pipe(gulp.dest('dist'))
});

gulp.task('markup', function() {
  return gulp.src('src/**/*.?(jade|html)')
    .pipe(p.plumber())
    .pipe(p.changed('dist'))
    .pipe(p.if('*.jade', p.jade()))
    .pipe(p.injectReload({ host: 'http://localhost' }))
    .pipe(gulp.dest('dist'))
});

var copyPaths = [{path:'config.js', base: './'},
                 {path:'../dist/*.js', base: './'},
                 {path:'src/lib/**/*.js', base:'src/'}];
gulp.task('copy', function() {
  //List all paths that need to be copied directly to dist
  return es.merge(copyPaths.map(function(p){
    return gulp.src(p.path, {base: p.base})
  }))
    .pipe(p.changed('dist'))
    .pipe(gulp.dest('dist'))
});

gulp.task('jspm', ['copy'], function() {
  return gulp.src(['jspm/**/*'])
    .pipe(p.changed('dist/jspm'))
    .pipe(gulp.dest('dist/jspm'))
});

gulp.task('clean', function(cb) {
  del('dist/**/*', cb)
});

gulp.task('watch', function() {
  gulp.watch(['src/**/*.styl', 'src/**/*.css'], ['styles']);
  gulp.watch('src/**/*.js', ['scripts']);
  gulp.watch(['src/**/*.jade', 'src/**/*.html'], ['markup']);
  gulp.watch('src/**/*.tag', ['riot']);

  gulp.watch(copyPaths.map(function(p){return p.path}), ['copy'])
  gulp.watch(['config.js'], ['jspm']);

  // Create LiveReload server
  p.livereload.listen();
  // Watch any files in dist/, reload on change
  gulp.watch(['dist/**/*.js',
              'dist/**/*.html',
              'dist/**/*.css']).on('change', p.livereload.changed);
});

gulp.task('serve', function() {
  p.connect.server({
    port: 8080,
    root: ['dist']
  });
})

gulp.task('dev', ['serve', 'watch'])

gulp.task('default', ['clean'], function() {
  gulp.start('scripts', 'markup', 'copy', 'jspm');
});
