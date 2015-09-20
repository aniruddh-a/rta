/**
 * Aniruddh Adkar 9/19/2015
 */


var Twit = require('twit');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser')
var config = require('config');
var request = require('request');

var consumerConfig = config.get('Twitter.consumerConfig');
var accessConfig = config.get('Twitter.accessConfig');
var limitsConfig = config.get('Twitter.limitsConfig');

var serverConfig = config.get('Server');

var LISTEN_PORT = 5000;
var userToStreamMappings = [];

var Twit = new Twit({
    consumer_key:         consumerConfig.consumerKey
    , consumer_secret:      consumerConfig.consumerSecret
    , access_token:         accessConfig.accessToken
    , access_token_secret:  accessConfig.accessTokenSecret
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

app.use(bodyParser.json());

app.post('/updateStream', function(req, res){
    console.log('received for update stream' + req.body.queryTerm);
    var userId = req.body.userId;
    var domainName = req.body.domainName;

    //find stream from mappings and stop it
    var streamCount = -1;
    for(var count=0; count < userToStreamMappings.length ; count ++){
        if(userToStreamMappings[count].userId == userId && userToStreamMappings[count].domainName == domainName){
            var stream = userToStreamMappings[count].stream;
            stream.stop();
            streamCount = count;
            break;
        }
    }
    if(streamCount != -1){
        userToStreamMappings.splice(streamCount, 1);
    }

    var twitterStream = Twit.stream('statuses/filter', { track: req.body.queryTerm });
    var userObj = {
        userId: userId,
        domainName: domainName
    };

    userToStreamMappings.push({
        userId: req.body.userId,
        domainName: req.body.domainName,
        stream : twitterStream
    });

    twitterStream.on('tweet', function (tweet) {
        try{
            postTwitterDataToServer(tweet,userObj);
        }catch(e){

        }
    });
    res.send();
});

app.post('/stopStream',function(req, res){
    var userId = req.body.userId;
    var domainName = req.body.domain;

    //find stream from mappings and stop it
    var streamCount = -1;
    for(var count=0; count < userToStreamMappings.length ; count ++){
        if(userToStreamMappings[count].userId == userId && userToStreamMappings[count].domainName == domainName){
            var stream = userToStreamMappings[count].stream;
            stream.stop();
            streamCount = count;
            break;
        }
    }
    if(streamCount != -1){
        userToStreamMappings.splice(streamCount, 1);
    }
})


//post to server
function postTwitterDataToServer(tweet,userObj){
    var obj = {
        source: 'twitter',
        message: tweet.text,
        originalObject: tweet,
        user: userObj
    };

    request({
        url:serverConfig.url,
        method: "POST",
        json: obj
    }).on('error', function (error) {
        console.log('error' + error);
    });
}

app.listen(LISTEN_PORT);
console.log("Twitter subscriber listening on port :"+LISTEN_PORT);