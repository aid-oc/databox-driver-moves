var express = require('express');
var router = express.Router();
var app = require('../app.js');
var movesApi = require('moves-api').MovesApi;
var databox = require('node-databox');
var moment = require('moment');
var moves = new movesApi({
    "clientId": "",
    "clientSecret": "",
    "redirectUri": "",
    "accessToken": "",
    "refreshToken": "",
});
var AUTH_REDIRECT_URL = "/#!/databox-driver-moves/ui";

const DATABOX_ZMQ_ENDPOINT = process.env.DATABOX_ZMQ_ENDPOINT;


var kvc = databox.NewKeyValueClient(DATABOX_ZMQ_ENDPOINT, false);


// Set up data stores 
// Configure Key-Value Store for Driver Settings
var driverSettings = databox.NewDataSourceMetadata();
driverSettings.Description = 'Moves driver settings';
driverSettings.ContentType = 'application/json';
driverSettings.Vendor = 'psyao1';
driverSettings.DataSourceType = 'movesSettings';
driverSettings.DataSourceID = 'movesSettings';
driverSettings.StoreType = 'kv';

// Register Key-Value Store
kvc.RegisterDatasource(driverSettings)
.then(() => {
  console.log("Registered store: driverSettings");
})
.catch((err) => {
  console.log("Error registering data source:" + err);
});



/** Checks to see if we have an access token stored, this will then be verified and refreshed if necessary 
(saves re-inputting client details each time */
function verifyAccessToken(callback) {
    let isValid = false;
    kvc.Read('movesToken')
    .then(()=>{
      console.log("Verify: Token found: " + res.access_token);
        // See if the token is still valid
        moves.options.accessToken = res.access_token;
        getAppCredentials(function(storedCreds) {
            if (storedCreds != null) {
                console.log("Verify: Creds found: " + JSON.stringify(storedCreds));
                moves.options.clientId = storedCreds.id;
                moves.options.clientSecret = storedCreds.secret;
                moves.verifyToken(function(err) {
                    if (err) {
                        console.log("Token Verify Error: " + err);
                        console.log("Attempting to refresh token...");
                        moves.options.refreshToken = moves.options.accessToken;
                        // Attempt to refresh the token
                        // Attempt token refresh using stored app credentials
                        moves.refreshToken(function(err, authData) {
                            if (err) {
                                console.log("Token Refresh Error: " + err);
                                moves.options.access_token = "";
                            } else {
                                console.log("Token Refreshed");
                                moves.options.accessToken = authData.access_token;
                                isValid = true;
                            }
                            callback(isValid);
                        });
                    } else {
                        console.log("Access token is valid");
                        isValid = true;
                        callback(isValid);
                    }
                });
            } else {
                console.log("Verify: Invalid Credentials")
                moves.options.access_token = "";
                callback(isValid)
            }
        });
    })
    .catch((err)=>{
      console.log("No access token found");
      callback(isValid);
    });
}

/** Stores the current Client ID/Client Secret for the Moves Application */
function storeAppCredentials(clientId, clientSecret) {
    var movesCredentials = {
        id: clientId,
        secret: clientSecret
    };
    kvc.Write('movesCredentials', movesCredentials).then(() => {
        console.log("Moves crendetials stored");
    }).catch((err) => {
        console.log(err);
        console.log("Failed to store moves credentials");
    });
}

/** Gets the current Client ID/Client Secret for the Moves Application */
function getAppCredentials(callback) {
    kvc.Read('movesCredentials').then((res) => {
        console.log("Credentials found: " + res);
        callback(res);
    }).catch((err) => {
        console.log("No credentials found: " + err);
        callback(null);
    });
}

/** Stores some basic information about the moves user, client ID/platform */
function storeMovesProfile(callback) {
    let movesProfile = {
        userId: "Unknown",
        userPlatform: "Unknown"
    };
    moves.getProfile(function(err, profile) {
        if (err) {
            console.log("Error: Unable to retrieve profile: " + err);
            callback(null);
        } else {
            movesProfile.userId = profile.userId;
            movesProfile.userPlatform = profile.profile.platform;
            kvc.Write('movesUserProfile', movesProfile).then(() => {
                console.log("Stored profile");
                callback(movesProfile);
            }).catch((err) => {
                console.log("Failed to store profile " + err);
                callback(movesProfile);
            });
        }
    });
}

function getMovesProfile(callback) {
    kvc.Read('movesUserProfile').then((res) => {
        console.log("User profile found: " + res);
        callback(res);
    }).catch((err) => {
        console.log("No user profile found: " + err);
        callback(null);
    });
}

/** Store/Update places visisted this month */
/* TODO: Update to use core-store timeseries
function storeMovesPlaces(callback) {
    var placesOptions = {
        month: moment().format("YYYY-MM")
    }
    console.log("Retrieving Places for: " + placesOptions.month);
    moves.getPlaces(placesOptions, function(err, places) {
        kvc.Write('movesPlaces-' + placesOptions.month, places).then((res) => {
            console.log("Stored Places: " + JSON.stringify(places));
            movesPlaces = places;
            callback(places);
        }).catch(() => {
            console.log("Failed to store places: " + err);
            callback(null);
        });
    });
}
*/


/** Driver home, will display data with a valid access token or begin authentication if necessary */
router.get('/', function(req, res, next) {
    // Just check if we have a stored access token which can be refreshed
    verifyAccessToken(function(isValid) {
        if (isValid) {
            storeMovesProfile(function(movesProfile) {
                console.log("User is authenticated");
                /* TODO - Move storeMovesPlaces to core-store timeseries
                storeMovesPlaces(function(storedPlaces) {
                    var syncStatus = (storedPlaces != null) ? "Synced: "+moment() : "Not synced";
                    console.log(JSON.stringify(storedPlaces));
                    console.log("Showing settings with profile: " + JSON.stringify(movesProfile));
                    res.render('settings', {
                        "title": "Moves Driver",
                        "profile": movesProfile,
                        "syncStatus": syncStatus
                    });
                });
                */
                let syncStatus = "synced";
                res.render('settings', {
                        "title": "Moves Driver",
                        "profile": movesProfile,
                        "syncStatus": syncStatus
                });
            });
        } else {
            moves.options.accessToken = "";
            res.render('index', {
                "title": "Moves Driver"
            });
        }
    });
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
        res.end('<html><body><p>Redirecting...</p><script>parent.location="' + AUTH_REDIRECT_URL + '"</script></body></html>')
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
            kvc.Write('movesToken', authData).then((res) => {
                console.log("Token stored: " + res);
            }).catch((err) => {
                console.log(err);
                console.log("Failed to store token");
            });
            res.end("<html><head><meta http-equiv=\"refresh\" content=\"0; URL=" + AUTH_REDIRECT_URL + "\" /></head></html>");
        }
    });
});


module.exports = router;