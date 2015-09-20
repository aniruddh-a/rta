/**
 * Aniruddh Adkar 9/19/2015
 */


var fs  = require('fs');
var express = require('express');
var bodyParser = require('body-parser')
var Firebase = require("firebase");
var AYLIENTextAPI = require('aylien_textapi');
var config = require('config');

var publishers = [];

loadPublishers('../publishers');
//var plugins = require('./plugins.js');

var serverConfig = config.get('Server')
const SERVER_LISTEN_PORT    = serverConfig.port;

var databaseRef = new Firebase('https://rta.firebaseio.com/');

var textapi = new AYLIENTextAPI({
    application_id: "6c74d0a3",
    application_key: "dc7cbb8556a6d6fea2959c804bd011b5"
});

var app = express();

var allowCrossDomain = function(req, res, next) {

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    // allow options method  - sent by browser to determine allowed methods for URI
    if ('OPTIONS' == req.method) {
        res.send(200);
    }
    else {
        next();
    }
};

app.use(allowCrossDomain);

app.use(bodyParser.json())


app.post('/message', function(req, res){
    processMessage(req.body);
});

function storeToDB(messageWithDetails){
    //store to database
    databaseRef.push(messageWithDetails);
}


function processMessage(messageWithDetails){
    //check sentiment analysis
    getSentimentAnalysis(messageWithDetails, function (sentimentResult) {
        messageWithDetails.sentiments = sentimentResult;
        if(messageWithDetails.originalObject.geo){
            messageWithDetails.location = {
                lat: messageWithDetails.originalObject.geo.coordinates[0],
                long: messageWithDetails.originalObject.geo.coordinates[1],
                place: messageWithDetails.originalObject.place
            };
        }
        //store to database
        storeToDB(messageWithDetails);
    });


    //calculate score / rank based on positive - negative
    //if it crosses threshold, notify publishers
}

function getSentimentAnalysis(messageWithDetails,callback){
    textapi.sentiment({
        'text': messageWithDetails.message
    }, function(error, response) {
        if (error === null) {
            console.log(response);
            callback(response);
        }else{
            console.log('error in getSentimentAnalysis');
        }
    });
}

app.listen(SERVER_LISTEN_PORT);
console.log("Server listening on port :"+SERVER_LISTEN_PORT);

function loadPublishers(dirName){
    //load all json files from this dir
    var files = fs.readdirSync(dirName);
    for(var count=0; count<files.length; count++) {
        var file = fs.readFileSync(dirName + "/" + files[count]);
        var object = JSON.parse(file);
        publishers.push(object);
    }
}