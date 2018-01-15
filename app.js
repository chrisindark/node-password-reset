var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var mongoStore = require('connect-mongo')(session);
var validator = require('express-validator');
var flash = require('express-flash');
var mongoose = require('mongoose');
var async = require('async');
var crypto = require('crypto');
var passport = require('passport');

require('./users/models');

var index = require('./routes/index');
var users = require('./users/routes');

// connect to mongoDB database
mongoose.connect('mongodb://localhost/todo',
  { useMongoClient: true, promiseLibrary: global.Promise },
  function(err) {
    if (err) throw err;
  });

require('./config/passport-config'); // configure passport strategies

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: 'session secret key',
  store: new mongoStore({ mongooseConnection: mongoose.connection }),
  // cookie: { secure: true },
  // resave: true,
  // saveUninitialized: false,
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize()); // initialize passport
app.use(passport.session());
app.use(validator({}));
app.use(flash());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
