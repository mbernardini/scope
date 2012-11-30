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

    // Ping.
    conn.on('data', function(message) {
       if(message == 'ping')
       {
          conn.write('pong');
       }
    });
});

function roundToPrecision(number, precision){
   return Math.round(number * 1000)/1000;
}

function MockDataProducer(minValue,maxValue){
   this.minValue = minValue;
   this.maxValue = maxValue;
   this.range = maxVlue - minValue;
}
// This returns a random number within the specified range
// for time t.
MockDataProducer.prototype.getDataPoint = function(timeInMs){
   return this.maxValue - Math.random()*this.range
}

function MockSinWaveDataProducer(amplitude, frequencyHz, phase){
   this.amplitude = amplitude;
   this.radPerMs = frequencyHz * Math.PI*2/1000; // (1/2pi)/1000 to get rads/ms
   this.phase = (phase == null)?0:phase;
}
MockSinWaveDataProducer.prototype.getDataPoint= function(timeInMs){
   return this.amplitude*Math.sin(timeInMs*this.radPerMs +this.phase);
}

var sin = new MockSinWaveDataProducer(0.5,0.3);
var sin2 = new MockSinWaveDataProducer(1,0.5,1);

function MockDevice(samplingRate, signalGenFunArr){
   this.samplingRate = samplingRate;
   this.signalGen = signalGenFunArr;
   this.observers = [];
}
MockDevice.prototype.start = function(){
   if(this.timer)
   {
      this.stop();
   }
   var self = this;
   this.timer = setInterval(function(){
      self.sampleData(new Date().getTime());
   },1000/self.samplingRate);
}
MockDevice.prototype.stop = function(){
   if(this.timer)
      clearInterval(this.timer);
   this.timer = null;
}
MockDevice.prototype.sampleData = function(time){
   var measurement = {time: time};
   var vals = [];
   for(var i = 0; i != this.signalGen.length; i++){
      var value = this.signalGen[i].getDataPoint(time) + (Math.random() - 0.5) * 0.1;
      vals.push(value.toFixed(4));
   }
   measurement.values = vals;
   this.notifyObservers([measurement]);
}
MockDevice.prototype.notifyObservers = function(measurementArray){
   for(var i = 0; i != this.observers.length; i++){
      this.observers[i].notify(measurementArray);
   }
}
MockDevice.prototype.registerObserver = function(observer){
   this.observers.push(observer);
}
MockDevice.prototype.unregisterObserver = function(observer){
   for(var i = 0; i != this.observers.length; i++){
      if(observer === this.observers[i])
         this.observers.splice(i,1);
   }
}

var mockDevice = new MockDevice(100,[sin,sin2]);
mockDevice.start();
function DeviceObserver(device){
   this.device = device;
   device.registerObserver(this);
}
DeviceObserver.prototype.notify = function(measurementArray){
   var stime = measurementArray[0].time;
   var etime = measurementArray[measurementArray.length - 1].time +1;//Exclusive bound
   var message = {timeSpanStart:stime,timeSpanEnd:etime,samplingRate:this.device.samplingRate,data:measurementArray}
   var encodedMeasurement = JSON.stringify(message);
   for(var connId in connections)
   {
      connections[connId].write(encodedMeasurement);  
   }
}
var deviceObs = new DeviceObserver(mockDevice);


var app = express();
var server = http.createServer(app);
sockjs_echo.installHandlers(server, {prefix:'/data'});

app.use(express.static(__dirname + '/public'));
app.use(express.logger());
app.use(express.bodyParser());

app.engine('jade', require('jade').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.set('title', 'Scope');

app.get('/', function(req, res) {
  res.render('index.jade',{appTitle: app.get('title')});
  
});
//app.param('srate', /^[0-9]+$/);
app.get('/device/sampleRate/'), function(){
   var msg = {sampleRate: mockDevice.samplingRate};
   res.send(JSON.stringify(msg));
}
app.post('/device/sampleRate/', function (req, res) {
   var rate = req.body;
   console.log("updating sample rate to: "+rate.sampleRate);
   if(rate.sampleRate){
      mockDevice.samplingRate = rate.sampleRate;
      mockDevice.start();
   }
  res.send('ok');
});

server.listen(3000);
console.log('Listening on port 3000');
