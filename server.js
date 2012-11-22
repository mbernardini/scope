var express = require('express');
var sockjs = require('sockjs');
var jade = require('jade');
var http = require('http');
var mongoose = require('mongoose');
//var db = mongoose.createConnection('localhost', 'test');
//db.on('error', console.error.bind(console, 'connection error: '));
//db.once('open', function(){
//	console.log('database connection opened!');
//});


// 1. Echo sockjs server
var sockjs_opts = {sockjs_url: "http://cdn.sockjs.org/sockjs-0.3.min.js"};

var sockjs_echo = sockjs.createServer(sockjs_opts);
connections = {};
sockjs_echo.on('connection', function(conn) {
    console.log(conn.id);
    connections[conn.id] = conn
    conn.on('close', function() {
        delete connections[conn.id];
    });

    // Echo.
    conn.on('data', function(message) {
        conn.write(message);
    });
});


var app = express();
var server = http.createServer(app);
sockjs_echo.installHandlers(server, {prefix:'/data'});

app.use(express.static(__dirname + '/public'));
app.use(express.logger());
app.engine('jade', require('jade').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.set('title', 'Scope');

app.get('/', function(req, res) {
  res.render('index.jade',{appTitle: app.get('title')});
  
});

server.listen(3000);
console.log('Listening on port 3000');
