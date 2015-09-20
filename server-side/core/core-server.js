/**
 * Aniruddh Adkar 9/19/2015
 */


var fs  = require('fs');
var express = require('express');
var bodyParser = require('body-parser')
var Firebase = require("firebase");
var AYLIENTextAPI = require('aylien_textapi');
var config = require('config');
var request = require('request');
var Parse = require('node-parse-api').Parse;

var publishers = [];
var subscribers = [];

loadPublishers('../publishers');
loadSubscribers('./subscribers.json');

var PARSE_APP_KEY = "Xe28AO2DBElJsgfN43uBr0KsPrArAYi74iiY3Pc1";
var PARSE_MASTER_KEY = "n8ofvOjeBIMTUupeh2ptGdNKTSq9xNJBP68yNOC9";

var datum = require('datumbox').factory("5f2a954bbbe2dc850ae87837d9060ff8");

var parseApp = new Parse(PARSE_APP_KEY, PARSE_MASTER_KEY);

var options = {
    app_id:'Xe28AO2DBElJsgfN43uBr0KsPrArAYi74iiY3Pc1',
    api_key:'n8ofvOjeBIMTUupeh2ptGdNKTSq9xNJBP68yNOC9'
}

//var parseApp = new Parse(options);


var serverConfig = config.get('Server')
const SERVER_LISTEN_PORT    = serverConfig.port;

//var databaseRef = new Firebase('https://rta.firebaseio.com/users');


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
        res.sendStatus(200);
    }
    else {
        next();
    }
};

app.use(allowCrossDomain);

app.use(bodyParser.json());


app.post('/message', function(req, res){
    processMessage(req.body);
});

app.post('/updateUser', function (req, res) {
    //send notification to all subscribers
    var userObj =  {
        "userId": req.body.userId,
        "domainName": req.body.domainName,
        "queryTerm": req.body.queryTerm
    };
    var email = req.body.email;

    subscribers.forEach(function (subscriber) {
        postToSubscriber(userObj, subscriber);
    });

    storeUserToDB(userObj,email);
    res.sendStatus(200);
});

function storeUserToDB(userObj,email){
//store user to db
    parseApp.update('Consumer', userObj.userId, {queryTerm: userObj.queryTerm}, function (err, response) {
        console.log(response);
    });
}



function processMessage(messageWithDetails){
    //check sentiment analysis if place is present
    if(messageWithDetails.originalObject.place){
        getSentimentAnalysis(messageWithDetails, function (sentimentResult) {
            var state = messageWithDetails.originalObject.place.full_name.split(",")[0];
            //Logic for calculating score for one of the third party APIs
            //var newScore = -1;
            ////calculate state's score
            //if(sentimentResult == "negative"){
            //    newScore = -0.5;
            //}else if(sentimentResult == "positive"){
            //    newScore = 0.5;
            //}
            //if(newScore == -1) return;
            //store to database

            updateUserDomainInfo(messageWithDetails.user, state, sentimentResult);
        })

    }
}

function updateUserDomainInfo(user, state, newScore){
    //fetch user from db
    //check current score
    //add new score to earlier score
    //save again
    console.log('updateUserDomainInfo');

    parseApp.find('Consumer', {objectId: user.userId}, function (err, userFromDB) {
        if(err)
            return console.log(err);
        else{
            //add new score for the same state
            if(userFromDB.locations){
                for(var count = 0; count < userFromDB.locations.length; count++){
                    if(userFromDB.locations[count].state == state){
                        userFromDB.locations[count].count += newScore;
                        console.log('updated new score' + userFromDB.locations[count].location.count);

                        parseApp.update('Consumer', user.userId, {locations: userFromDB.locations}, function(err, response){
                            console.log('updated' + response);
                        });
                        break;
                    }
                }
            }
        }
    });



}

function getSentimentAnalysis(messageWithDetails,callback){
    //Third party APIs commented due to limit usage
    //textapi.sentiment({
    //    text: messageWithDetails.message,
    //    mode: 'tweet'
    //}, function(error, response) {
    //    if (error === null) {
    //        console.log(response);
    //        callback(response);
    //    }else{
    //        console.log('error in getSentimentAnalysis ' + error);
    //    }
    //});

    datum.sentimentAnalysis(messageWithDetails.message, function(err, data) {
        if ( err )
            return console.log(err);
        else{
            callback(data);
        }
    });
    //var random = Math.random() * (1 - 0) + 0
    //callback(random);
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

function loadSubscribers(fileName){
    //load all json files from this dir
    var file = fs.readFileSync(fileName);
    var object = JSON.parse(file);
    object.forEach(function (subscriber) {
        subscribers.push(subscriber);
    })
}

//post to server
function postToSubscriber(userObj,subscriber){
    request({
        url:subscriber.url,
        method: "POST",
        json: userObj
    }).on('error', function (error) {
        console.log('error' + error);
    });
}