var express = require('express');
var router = express.Router();
var app = require('../app.js');
var movesApi = require('moves-api').MovesApi;
var databox = require('node-databox');
var storeHref = process.env.DATABOX_STORE_ENDPOINT;
var moves = new movesApi({
    "clientId": "",
    "clientSecret": "",
    "redirectUri": "",
    "accessToken": "",
    "refreshToken" : "",
});

function verifyAccessToken() {
  databox.keyValue.read(storeHref, 'movesToken').then((res) => {
    console.log("Token found: " + res);
  }).catch(() => {
    console.log("No access token found");
  });
}

// Entry point, form for credentials input
router.get('/', function(req, res, next) {
  console.log("In /");
  // Just check if we have anything
  verifyAccessToken();
  if (moves.options.accessToken == "") {
    res.render('index', {"title" : "Moves Driver"});
  } else {
    var placesOptions = {
      "date": "20171111"
    }
    var placesSummary = moves.getPlaces(placesOptions, function(err, body) {
      if (err) {
        res.json(err);
      } else {
        res.render('places', {"title" : "Moves Driver", "placesData" : body});
      }
    });
  }
});

/* Auth route, will create an auth code and redirect to /authtoken, where a token is created and stored */
router.post('/auth', function(req, res, next) {
  console.log("In /auth");
  if (moves.options.accessToken == "") {
    moves.options.clientId = req.body.clientId;
    moves.options.clientSecret = req.body.clientSecret;
    // Redirect to start auth process
    var url = moves.generateAuthUrl();
    console.log("Attempting to redirect to: " + url);
    // Will redirect to /token with auth code
    res.redirect(url);
  } else {
    res.redirect("/");
  }
});

/* Create a token from the current auth code, store it and redirect to show data */
router.get('/authtoken', function(req, res, next) {
  console.log("In /authtoken");
  /*
  // Return to here with an access code, exchange for token
  moves.getAccessToken(req.query.code, function(err, authData) {
    if (err) {
      console.log(err);
      res.json(err);
    } else {
      moves.options.accessToken = authData.access_token;
      databox.keyValue.write(storeHref, 'movesToken', authData.access_token).then((res) => {
        console.log("Token stored: " + res);
      }).catch(() => {
        console.log("Failed to store token");
      });
      res.redirect("/");
    }
  });
  */
  res.send('Auth Token Page');
});


module.exports = router;
