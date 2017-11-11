var express = require('express');
var router = express.Router();
var app = require('../app.js');
var movesApi = require('moves-api').MovesApi;
var moves = new movesApi({
    "clientId": "9ko4K08GS9BKuFVej6Zw9SZTiVWvscHp",
    "clientSecret": "qeIdV7DIi0Uk0OLeF2aDT4XIU_zZSxBbQ3PltGiE4cPEHo6i0M6eP4j9RGrj6__h",
    "redirectUri": "http://localhost:3000/token",
    "accessToken": "",
    "refreshToken" : "",
});

/* GET home page. */
router.get('/', function(req, res, next) {
  if (moves.options.accessToken == "") {
    // Redirect to start auth process
    var url = moves.generateAuthUrl();
    res.redirect(url);
  } else {
    var placesOptions = {
      "date": "20171111"
    }
    var placesSummary = moves.getPlaces(placesOptions, function(err, body) {
      if (err) {
        res.json(err);
      } else {
        res.json(body);
      }
    });
  }

});

router.get('/token', function(req, res, next) {
  // Return to here with an access code, exchange for token
  moves.getAccessToken(req.query.code, function(err, authData) {
      moves.options.accessToken = authData.access_token;
      moves.getProfile(function(err, profile) {
          console.log("Connected to Profile: " + profile);
          res.redirect("/");
      });
    });
});


module.exports = router;
