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
// importerar http, skapar en http-server med app som indata
const http = require('http').createServer(app);
const io = require('socket.io')(http);

/* !!kommenterar bort för lab2!! 
// startar webbwervern och lyssnar efter anrop på 3000
app.listen(3000, function() { 
    console.log('server uppe');
}); */

/* http-server som lyssnar på port 3000 */
http.listen(3000, () => {
    console.log('server uppe');
});


// middleware för mappen static så klienten kan ladda filerna, ger "/public" tillgång eftersom det är länkat så i html-filen.
app.use('/public', express.static(__dirname + '/static'));

// middleware för att servern skall kunna ta emot från klienten, Med "extended : true" för att tolka fler data-objekt
app.use(express.urlencoded({ extended: true }));

// middleware för att hantera kakor
app.use(cookieParser());

// endpoint för get '/'
app.get('/', function (request, response) {

    // Kollar om båda kakorna finns
    if (request.cookies.nickName && request.cookies.color) {
        // om kakor finns skickar index.html
        response.sendFile(__dirname + '/static/html/index.html', function (err) {
            // skickar felmeddelande om ett fel påträffas
            if (err) {
                console.log('fel:' + err);
                response.send(err.status);
                // vid normal drift logga url-begäran och http metod
            } else {
                console.log(request.url, request.method);
            }
        });
    } else {
        // om kakor ej existerar, skicka loggain.html
        response.sendFile(__dirname + '/static/html/loggain.html', function (err) {
            // skickar felmeddelande om ett fel påträffas
            if (err) {
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
app.get('/reset', function (request, response) {

    // kontrollerar om kakor finns
    if (request.cookies.nickName) {
        //finns kaka till nickName, rensa
        response.clearCookie('nickName');
    }
    //finns kaka till color, rensa
    if (request.cookies.color) {
        response.clearCookie('color');
    }

    // rensar i globalObject
    globalObject.playerOneNick = null, // Attribut för att spara nickname på spelare 1
    globalObject.playerOneColor = null, // Attribut för att spara färg till spelare 1

    globalObject.playerTwoNick = null, // Attribut för att spara nickname på spelare 2
    globalObject.playerTwoColor = null; // Attribut för att spara färg till spelare 1

    globalObject.playerOneSocketId = null; // Attribut för att spara socket.id för spelare 1 (Lades till vid LAB2)
    globalObject.playerTwoSocketId = null; // Attribut för att spara socket.id för spelare 2 (Lades till vid LAB2)

    // omdirigerar till '/'
    response.redirect('/');
});

// end-poin för post '/'
app.post('/', function (request, response) {

    let nick_1 = request.body.nick_1; // hämtar namnet som användaren skickar
    let color_1 = request.body.color_1; // hämtar färgkoden användaren skickar


    try {
        console.log('namn: ' + nick_1);
        console.log('color: ' + color_1);
        console.log(request.body);

        // om nick_1 är undefined
        if (nick_1 === undefined) {
            throw 'Nickname saknas!';
        }
        // om color_1 är undefined
        else if (color_1 === undefined) {
            throw 'Färg saknas!';
        }

        // trimmar nick_1 och color_1 för att ta bort eventuella mellanslag
        nick_1 = nick_1.trim();
        color_1 = color_1.trim();

        // om nick_1 är mindre än tre tecken
        if (nick_1.length < 3) {
            throw 'Nickname skall vara tre tecken långt!';
        }
        // om color_1 inte är 7 tecken
        else if (!color_1.length === 7) {
            throw 'Färg skall innehålla sju tecken!';
        }
        // om color_1 har förbjudna färger
        else if (color_1 === '#ffffff' || color_1 === '#000000') {
            throw 'Ogiltig färg!';
        }

        // kollar om spelare 2 angav samma namn som spelare 1
        else if (nick_1 === globalObject.playerOneNick) {
            throw 'Nickname redan taget!';
        }
        // kollar om spelare 2 angav samma färg som spelare 1
        else if (color_1 === globalObject.playerOneColor) {
            throw 'Färg redan tagen!';
        }

        /* !! denna är förmodligen fel!! */
        // om spelarnas namn är likadana
        /*else if(globalObject.playerTwoNick === globalObject.playerOneNick) {
            throw 'Nickname redan taget!';
        }
        // om spelarna färg är likadana
        else if(globalObject.playerTwoColor === globalObject.playerOneColor) {
            throw 'Färg redan tagen!';
        }*/


        // !!!här går allt bra och vi skall skapa kakor!!!
        // skapar två kakor med namn och tillhörande variabel, sätter livslängd till 2 timmar, och endast tillgänglig för servern
        response.cookie('nickName', nick_1, { maxAge: 120 * 60 * 1000, httpOnly: true });
        response.cookie('color', color_1, { maxAge: 120 * 60 * 1000, httpOnly: true });
        // omdiregerar användaren till "/"
        response.redirect('/');


    } catch (errMsg) {
        // läser loggain.html för att nå dom
        fs.readFile(__dirname + '/static/html/loggain.html', function (err, data) {
            // skickar felmeddelande om ett fel påträffas
            if (err) {
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






/* lyssnar på io(sockets) */

// variabel för att räkna antalet anslutna
let clientCount = 0; 
/* lyssnar efter connection */
io.on('connection', (socket) => {

    // ++ vid connect
    clientCount++;
    //console.log('Antal anslutna connect: ' + clientCount);
    //console.log('Antal anslutna connect io: ' + io.engine.clientsCount);

    // Lyssnar efter disconnect
    socket.on('disconnect', () => {

        // -- vid disconnect
        clientCount--;
        console.log('Antal anslutna disconnect: ' + clientCount);

        // sätter timeout för att det skall hinna loggas rätt, försökte använda io.engine.clientsCount för att räkna först. fungerar förmodligen också, verkar något fördröjd.
        setTimeout(() => {
            console.log('Antal anslutna disconnect io: ' + io.engine.clientsCount);
        }, 1000);

        /* OBS !!!vet inte hur jag skall skicka strängen!!! OBS */
        /* OBS !!!vet inte hur jag skall skicka strängen!!! OBS */

    });

    //console.log('användare anslutit');
    //console.log(socket.client.server.clientsCount);
    //console.log(io.engine.clientsCount);
    //console.log(socket);

    let cookies = globalObject.parseCookies(socket.handshake.headers.cookie);
    //let clientCount = io.engine.clientsCount; !!!KAN MAN LITA PÅ DENNA??!!!



    //console.log('Antal anslutna: ' + clientCount);
    //console.log(cookies.nickName);
    //console.log(cookies.color);
    //console.log(socket.id);

    /* kontrollerar om kakor finns, samt om det är fler än 2 spelare */
    if (cookies.nickName && cookies.color) {
        
        if (clientCount > 2) {
            console.log('Mer än 2 klienter anslutna, kopplar från klient: ' + socket.id);
            console.log('Redan två spelare anslutna!');
            
            socket.disconnect('Redan två spelare anslutna!');
        }


        //console.log('kakor finns');
        
        /* spelare 1 */
        // om clientCount är 1 (spelare 1)
        else if (clientCount === 1) {
            console.log(socket.id);
            //tilldelar kakornas värde till playerOneNick
            globalObject.playerOneNick = cookies.nickName;
            globalObject.playerOneColor = cookies.color;
            globalObject.playerOneSocketId = socket.id;
            //spelare 1 tilldelad

            /*console.log('spelare 1: ' + globalObject.playerOneNick + ', '
            + 'color: ' + globalObject.playerOneColor + ', '
            + 'id: ' + globalObject.playerOneSocketId );*/




            console.log('p1 nick: ' + globalObject.playerOneNick);
            
            /* spelare 2 */
            // om clientCount är 2 (spelare 2)
        } else if (clientCount === 2) {
            console.log(socket.id);
            //tilldelar kakornas värde till playerTwoNick
            globalObject.playerTwoNick = cookies.nickName;
            globalObject.playerTwoColor = cookies.color;
            globalObject.playerTwoSocketId = socket.id;
            //spelare 2 tilldelad



            console.log('p2 nick: ' + globalObject.playerTwoNick);
            
            /* nollställ spelplanen */
            globalObject.resetGameArea();


            /*data som skall skickas med newGame händelsen */
            let playerOneData = {
                opponentNick: globalObject.playerTwoNick,
                opponentColor: globalObject.playerTwoColor,
                myColor: globalObject.playerOneColor
            };

            let playerTwoData = {
                opponentNick: globalObject.playerOneNick,
                opponentColor: globalObject.playerOneColor, 
                myColor: globalObject.playerTwoColor
            };

            console.log('emit newgame');
            /* skicka händelsen newGame till båda, med tillhörande data */
            io.to(globalObject.playerOneSocketId).emit('newGame', playerOneData);
            io.to(globalObject.playerTwoSocketId).emit('newGame', playerTwoData);

            /* låter spelare 1 börja */
            globalObject.currentPlayer = 1; 

            
            io.to(globalObject.playerOneSocketId).emit('yourMove', globalObject.cellId);

            //startar timer
            globalObject.timerId = setTimeout(timeout, 5000);

            /*console.log('spelare 1: ' + globalObject.playerTwoNick + ', '
           + 'color: ' + globalObject.playerTwoColor + ', '
           + 'id: ' + globalObject.playerTwoSocketId );*/
        }
        

    // kommer vi hit hade vi inga kakor
    } else {
        console.log('Kakorna saknas!');
        socket.disconnect('Kakorna saknas!');
    };


    // lyssnar på newMove
    socket.on('newMove', (data) => {
        /* kod för newMove */



        /* Uppdatera spelplanen i oGlobalObject med aktuell spelare. */
        globalObject.gameArea[data.cellId] = globalObject.currentPlayer;

        // hanterar vilken spelares tur
        if (globalObject.currentPlayer === 1) {
            globalObject.currentPlayer = 2;
            io.to(globalObject.playerTwoSocketId).emit('yourMove', data);

            // nollställer timer
            if (globalObject.timerId) {
                clearTimeout(globalObject.timerId);
            }
            // startar en ny timer
            globalObject.timerId = setTimeout(timeout, 5000);

           

        } else if (globalObject.currentPlayer === 2) {
            globalObject.currentPlayer = 1;
            io.to(globalObject.playerOneSocketId).emit('yourMove', data);

            // nollställer timer
            if (globalObject.timerId) {
                clearTimeout(globalObject.timerId);
            }
            // startar en ny timer
            globalObject.timerId = setTimeout(timeout, 5000);
        }
        




        let winner = globalObject.checkForWinner();
        //console.log(winner);
        //console.log(globalObject.gameArea);

        if (winner === 1) {
            // Spelare 1 vann
            io.emit('gameover', 'Spelare 1 vann!');

            // stoppar timer
            if (globalObject.timerId) {
                clearTimeout(globalObject.timerId);
            } 

        } else if (winner === 2) {
            // Spelare 2 vann
            io.emit('gameover', 'Spelare 2 vann!');

            // stoppar timer
            if (globalObject.timerId) {
                clearTimeout(globalObject.timerId);
            }

        } else if (winner === 3) {
            // Oavgjort
            io.emit('gameover', 'Oavgjort!');

            // stoppar timer
            if (globalObject.timerId) {
                clearTimeout(globalObject.timerId);
            }

        }

    });

});

function timeout() {
    console.log('kallar på timer');

    if (globalObject.currentPlayer === 1) {
        // aktuell spelare är P1 
        io.to(globalObject.playerOneSocketId).emit('timeout');
        io.to(globalObject.playerTwoSocketId).emit('yourMove');
        globalObject.currentPlayer = 2;

    } else if (globalObject.currentPlayer === 2) {
        // aktuell spelare är P2 
        io.to(globalObject.playerTwoSocketId).emit('timeout');
        io.to(globalObject.playerOneSocketId).emit('yourMove');
        globalObject.currentPlayer = 1;
    }

    // är en timer igång, rensar 
    if (globalObject.timerId) {
        clearTimeout(globalObject.timerId);
    }

    // Kör timeout funktionen efter 5 sekunder 
    globalObject.timerId = setTimeout(timeout, 5000);
};

/* För att reseta rätt spelare, kolla namnet i kakan för att återställa värdena för rätt spelare */