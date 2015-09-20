/**
 * Aniruddh Adkar 9/19/2015
 */


var Twit = require('twit');
var fs = require('fs');
var config = require('config');
var request = require('request');

var consumerConfig = config.get('Twitter.consumerConfig');
var accessConfig = config.get('Twitter.accessConfig');
var limitsConfig = config.get('Twitter.limitsConfig');

var serverConfig = config.get('Server');


var Twit = new Twit({
    consumer_key:         consumerConfig.consumerKey
    , consumer_secret:      consumerConfig.consumerSecret
    , access_token:         accessConfig.accessToken
    , access_token_secret:  accessConfig.accessTokenSecret
});


//susbcribe to stream for tweets from twitter
var twitterStream = Twit.stream('statuses/filter', { track: 'apple' });

twitterStream.on('tweet', function (tweet) {
    //console.log('tweet' + JSON.stringify(tweet));
    try{
        postTwitterDataToServer(tweet);
    }catch(e){

    }
});

//post to server
function postTwitterDataToServer(tweet){
    var obj = {
        source: 'twitter',
        message: tweet.text,
        originalObject: tweet
    };

    request({
        url:serverConfig.url,
        method: "POST",
        json: obj
    }).on('error', function (error) {
        console.log('error' + error);
    });
}