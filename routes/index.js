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

var AUTH_REDIRECT_URL = "/#!/databox-driver-moves/ui";

/** Checks to see if we have an access token stored, this will then be verified and refreshed if necessary 
(saves re-inputting client details each time */
function verifyAccessToken() {
  databox.keyValue.read(storeHref, 'movesToken').then((res) => {
    console.log("Token found: " + res.access_token);
    // See if the token is still valid
    moves.options.access_token = res.access_token;
    moves.verifyToken(function(err) {
      if (err) {
        console.log("Token Verify Error: " + err);
        console.log("Attempting to refresh token...");
        // Attempt to refresh the token
        var appCreds = getAppCredentials();
        if (appCreds != null) {
          moves.options.clientId = appCreds.id;
          moves.options.clientSecret = appCreds.secret;
          // Attempt token refresh using stored app credentials
          moves.refreshToken(function(err, authData) {
            if (err) {
              console.log("Token Refresh Error: " + err);
              moves.options.access_token = "";
            } else {
              console.log("Token Refreshed");
              moves.options.accessToken = authData.access_token;
            }
          });
        } else {
          moves.options.access_token = "";
        }
      } else {
        console.log("Access token is valid " + err);
      }
    });
  }).catch(() => {
    console.log("No access token found");
  });
}

/** Stores the current Client ID/Client Secret for the Moves Application */
function storeAppCredentials(clientId, clientSecret) {
  var movesCredentials = {id: clientId, secret: clientSecret};
  databox.keyValue.write(storeHref, 'movesCredentials', movesCredentials).then((res) => {
    console.log("Moves crendetials stored: " + res);
  }).catch((err) => {
    console.log(err);
    console.log("Failed to store moves credentials");
  });
}

/** Gets the current Client ID/Client Secret for the Moves Application */
function getAppCredentials() {
  databox.keyValue.read(storeHref, 'movesCredentials').then((res) => {
    console.log("Credentials found: " + res);
    return res;
  }).catch(() => {
    console.log("No crendetials found");
    return null;
  });
}

/** Stores some basic information about the moves user, client ID/platform */
function storeMovesProfile() {
  var userProfile = moves.getProfile(function(err, profile) {
    if (err) {
      console.log("Error: Unable to retrieve profile");
    } else {
      var userId = profile.userId;
      var userPlatform = profile.platform;
      databox.keyValue.write(storeHref, 'movesUserId', userId).then((res) => {
        console.log("Stored Crendentials");
      }).catch(() => {
        console.log("Failed to store credentials");
      });
      databox.keyValue.write(storeHref, 'movesUserPlatform', userPlatform).then((res) => {
        console.log("Stored Platform");
      }).catch(() => {
        console.log("Failed to store platform");
      });
    }
  });
}


/** Driver home, will display data with a valid access token or begin authentication if necessary */
router.get('/', function(req, res, next) {
  // Just check if we have a stored access token which can be refreshed
  verifyAccessToken();
  if (moves.options.accessToken == "") {
    // Crendentials form, starts the authentication process
    res.render('index', {"title" : "Moves Driver"});
  } else {
    // We have a valid access token, render some useful data
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

/** Auth route, will create an auth code and redirect to /authtoken, where a token is created and stored */
router.post('/auth', function(req, res, next) {
  if (moves.options.accessToken == "") {
    moves.options.clientId = req.body.clientId;
    moves.options.clientSecret = req.body.clientSecret;
    storeAppCredentials(moves.options.clientId, moves.options.clientSecret);
    // Redirect to start auth process
    var url = moves.generateAuthUrl();
    console.log("Attempting to redirect to: " + url);
    // Will redirect to /token with auth code
    res.end('<html><body><p>Redirecting...</p><script>parent.location="' + url + '"</script></body></html>')
  } else {
    res.end("<html><head><meta http-equiv=\"refresh\" content=\"0; URL="+AUTH_REDIRECT_URL+"\" /></head></html>");
  }
});

/** Request an access token using a valid authenticate code, store it and redirect back to home */
router.get('/authtoken', function(req, res, next) {
  moves.getAccessToken(req.query.code, function(err, authData) {
    if (err) {
      console.log(err);
      res.json(err);
    } else {
      moves.options.accessToken = authData.access_token;
      databox.keyValue.write(storeHref, 'movesToken', authData).then((res) => {
        console.log("Token stored: " + res);
      }).catch((err) => {
        console.log(err);
        console.log("Failed to store token");
      });
      res.end("<html><head><meta http-equiv=\"refresh\" content=\"0; URL="+AUTH_REDIRECT_URL+"\" /></head></html>");
    }
  });
});


module.exports = router;
