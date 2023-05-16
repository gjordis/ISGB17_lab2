/* Grupp 17: Jonas Schymberg, Kristoffer Tapper och Emil Vestlund */

'use strict';

//Filen app.js är den enda ni skall och tillåts skriva kod i.

const express = require('express'); //konstant som hämtar express biblioteket
const jsDom = require('jsdom'); // konstant som hämtar jsdom biblioteket
const cookieParser = require('cookie-parser'); // konstant som hämtar cookie-parser biblioteket
const globalObject = require('./servermodules/game-modul.js'); // konstant som hämtar game-modul
const fs = require('fs'); // konstant som hämtar File System biblioteket

// konstant att använda för att hantera middleware, lyssnare
const app = express(); 

// startar webbwervern och lyssnar efter anrop på 3000
app.listen(3000, function() { 
    console.log('server uppe');
});

// middleware för mappen static så klienten kan ladda filerna, ger "/public" tillgång eftersom det är länkat så i html-filen.
app.use('/public', express.static(__dirname + '/static'));

// middleware för att servern skall kunna ta emot från klienten, Med "extended : true" för att tolka fler data-objekt
app.use(express.urlencoded({extended : true})); 

// middleware för att hantera kakor
app.use(cookieParser());

// endpoint för get '/'
app.get('/', function(request, response) {
 
    // Kollar om båda kakorna finns
    if (request.cookies.nickName && request.cookies.color) {
        // om kakor finns skickar index.html
        response.sendFile(__dirname + '/static/html/index.html', function (err){
            // skickar felmeddelande om ett fel påträffas
            if(err){
                console.log('fel:' + err);
                response.send(err.status);
            // vid normal drift logga url-begäran och http metod
            } else {
                console.log(request.url, request.method);
            }
        });
    }else {
        // om kakor ej existerar, skicka loggain.html
        response.sendFile(__dirname + '/static/html/loggain.html', function (err){
            // skickar felmeddelande om ett fel påträffas
            if(err){
                console.log(err);
                response.send(err.status);
            // vid normal drift logga url-begäran och http metod
            } else {
                console.log(request.url, request.method);
            }
        });
        }
    });

      

// end-point för get '/reset'
app.get('/reset', function(request, response){

    // kontrollerar om kakor finns
    if(request.cookies.nickName) {
        //finns kaka till nickName, rensa
        response.clearCookie('nickName');
    }
        //finns kaka till color, rensa
    if(request.cookies.color) {
        response.clearCookie('color');
    }

        // rensar i globalObject
        globalObject.playerOneNick = null, // Attribut för att spara nickname på spelare 1
        globalObject.playerOneColor = null, // Attribut för att spara färg till spelare 1
        
        globalObject.playerTwoNick = null, // Attribut för att spara nickname på spelare 2
        globalObject.playerTwoColor = null; // Attribut för att spara färg till spelare 1

        // omdirigerar till '/'
        response.redirect('/');
});

// end-poin för post '/'
app.post('/', function(request, response) {

    let nick_1 = request.body.nick_1; // hämtar namnet som användaren skickar
    let color_1 = request.body.color_1; // hämtar färgkoden användaren skickar


    try {
        console.log('namn: ' + nick_1);
        console.log('color: ' + color_1);
        console.log(request.body);

        // om nick_1 är undefined
        if(nick_1 === undefined) {
            throw 'Nickname saknas!';
        }
        // om color_1 är undefined
        else if(color_1 === undefined) {
            throw 'Färg saknas!';
        }

        // trimmar nick_1 och color_1 för att ta bort eventuella mellanslag
        nick_1 = nick_1.trim();
        color_1 = color_1.trim();
        
        // om nick_1 är mindre än tre tecken
        if(nick_1.length < 3) {
            throw 'Nickname skall vara tre tecken långt!';
        }
        // om color_1 inte är 7 tecken
        else if(!color_1.length === 7) {
            throw 'Färg skall innehålla sju tecken!';
        }
        // om color_1 har förbjudna färger
        else if(color_1 === '#ffffff' || color_1 === '#000000') {
            throw 'Ogiltig färg!';
        }
        // om spelarnas namn är likadana
        else if(globalObject.playerOneNick === globalObject.playerTwoNick) {
            throw 'Nickname redan taget!';
        }
        // om spelarna färg är likadana
        else if(globalObject.playerOneColor === globalObject.playerTwoColor) {
            throw 'Färg redan tagen!';
        }
        // !!!här går allt bra och vi skall skapa kakor!!!
        // skapar två kakor med namn och tillhörande variabel, sätter livslängd till 2 timmar, och endast tillgänglig för servern
        response.cookie('nickName', nick_1, { maxAge : 120 * 60 * 1000, httpOnly : true});
        response.cookie('color', color_1, { maxAge : 120 * 60 * 1000, httpOnly : true});
        // omdiregerar användaren till "/"
        response.redirect('/');


    } catch (errMsg) {
        // läser loggain.html för att nå dom
        fs.readFile(__dirname + '/static/html/loggain.html', function(err, data){
            // skickar felmeddelande om ett fel påträffas
            if(err) {
                console.log(err);
                response.send(err.status);
            } else {
                // variabel för att nå DOM och kunna manipulera här från serversidan
                let serverDOM = new jsDom.JSDOM(data); 

                // ändrar texten i #errorMsg
                serverDOM.window.document.querySelector('#errorMsg').textContent = errMsg;
                // återför namnet till inputfältet
                serverDOM.window.document.querySelector('#nick_1').setAttribute('value', nick_1);
                // återför färgen till inputfältet
                serverDOM.window.document.querySelector('#color_1').setAttribute('value', color_1);

                // skickar det ändrade html dokumentet, serialize konverterar tillbaka till en sträng 
                response.send(serverDOM.serialize());
        }
    });
        
    }

});