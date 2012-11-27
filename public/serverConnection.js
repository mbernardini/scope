
var isRecording = false;


sock = new SockJS('/data');
//sock = new WebSocket('/data');
sock.ping = function(){
   //if(this.protocol){
      this.lastPingTime = new Date().getTime();
      this.send('ping');
   //}
}
sock.onopen = function() {
   this.totalPingPongs = 0;
   this.totalMessagesReceived = 0;
   this.ping();
};
sock.onmessage = function(e) {
   if(e.data == 'pong')
   {
      this.lastPongTime = new Date().getTime();
      this.onTheWireTime = this.lastPongTime - this.lastPingTime;
      this.totalPingPongs++;
      return;
   }
   this.totalMessagesReceived++;
   var decodedMessage = JSON.parse(e.data);
   var data = decodedMessage.data;
   
   for(var i = 0; i != data.length; i++)
   {
      addDataPoint(data[i].time, data[i].values);
   }
   if(isRecording){
      grid.updateRowCount();
      grid.render();
   }
   
   var avg = this.computeLatency(decodedMessage.timeSpanStart, decodedMessage.timeSpanEnd);
   $('.latency').text("Average data latency: "+ avg.toFixed(3) + " seconds.");
   
   if(!(this.totalMessagesReceived % 10))
   {
      this.ping();   
   }
};
sock.onclose = function(e) {
   console.log('close', e.reason);
};

sock.computeLatency = function(messageTsBegin,messageTsEnd){
   var messageTimeFrame =  messageTsEnd- messageTsBegin;
   var avgLatency = this.onTheWireTime + messageTimeFrame/2;
   var maxLatency = this.onTheWireTime + messageTimeFrame;
   return avgLatency/1000;
}

function voltageFormatter(value){
   return value.toFixed(2) + "v";
}
//This doesn't really belong here but this will work for now:
var smoothie = new SmoothieChart({
  grid: { strokeStyle:'rgb(0, 125, 0)', fillStyle:'rgb(0, 30, 0)',
          lineWidth: 0.1, millisPerLine: 1000, verticalSections: 6 },
  labels: { fillStyle:'rgb(0, 125, 0)' },
  fps: 30,
  millisPerPixel:10,
  timestampFormatter: SmoothieChart.timeFormatter,
  verticalAxisFormatter: voltageFormatter,
  interpolation: "line"
});
smoothie.streamTo(document.getElementById("plot"));

// Data
var line1 = new TimeSeries();
var line2 = new TimeSeries();
var data = [];
var grid;
var columns = [
                 {id: "time", name: "Time Stamp", field: "time", sortable: true},
                 {id: "v1", name: "Analog 1", field: "v1"},
                 {id: "v2", name: "Analog 2", field: "v2"},
                 {id: "v3", name: "Analog 3", field: "v3"},
                 {id: "d1", name: "Digital 1", field: "d1"},
                 {id: "d2", name: "Digital 2", field: "d2"}
                ];

var options = {
      enableCellNavigation: true,
      enableColumnReorder: false,
      forceFitColumns: true
};

grid = new Slick.Grid("#dataGrid", data, columns, options);
function addDataPoint(timestamp, values){
   if(isRecording){
      data.push({time:timestamp/1000, v1:values[0], v2:values[1]});
   }
   line1.append(timestamp, values[0]);
   line2.append(timestamp, values[1]);
}

// Add a random value to each line every second
var intervalId = null;//startTimeSeries();

$('.start').button('toggle');
$('.lineToggleButton').button('toggle');
// Add to SmoothieChart
smoothie.addTimeSeries(line1,{ strokeStyle:'rgb(0, 0, 255)',  lineWidth:2 });
smoothie.addTimeSeries(line2,{ strokeStyle:'rgb(255, 0, 255)',  lineWidth:2 });

function startGraph(event)
{
   smoothie.start();
   sock = new SockJS('/data');
}

function stopGraph(event)
{
		smoothie.stop();
		if(isRecording)
		{
		 isRecording = false;
		 $('.record').button('toggle');
		}
}

function record(event){
   isRecording = true;
}

function setBezier(event)
{
	smoothie.options.interpolation = "bezier";
}

function setLine(event)
{
	smoothie.options.interpolation = "line";	
}
function saveToFile(event){
   var bb = new BlobBuilder;
   for(var i = 0; i != data.length;i++){
      var obj = data[i];
      var isFirst = true;
      var row = "";
      for(key in obj)
      {
         if(isFirst)
         {
            isFirst = false;
         }
         else
         {
            row += ","
         }
         row += obj[key];
      }
      row += '\n';
      bb.append(row);
   }
   saveAs(bb.getBlob("text/plain;charset=utf-8"), "data.csv");

   alert("Not yet implemented");
    
}
