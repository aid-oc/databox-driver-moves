var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var databox = require('node-databox');
var fs = require('fs');
var movesApi = require('moves-api').MovesApi;

var index = require('./routes/index');

var app = express();

// JSON Store
var DATABOX_STORE_BLOB_ENDPOINT = process.env.DATABOX_STORE_ENDPOINT;
var hasValidToken = false;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);

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


// Wait until store is ready and then initalise it
databox.waitForStoreStatus(DATABOX_STORE_BLOB_ENDPOINT, 'active', 100).then(() => {
  console.log("DEBUG: Moves-Driver - registerDatasource()");
  databox.catalog.registerDatasource(
    DATABOX_STORE_BLOB_ENDPOINT, {
              description: 'Moves API Storage',
              contentType: 'text/json',
              vendor: 'Databox Inc.',
              type: 'movesApiStorage',
              datasourceid: 'MovesApiStorage',
              storeType: 'databox-store-blob',
            });
});


module.exports = app;
