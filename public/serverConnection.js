
var isRecording = false;
$(function(){
var DeviceInputs = Backbone.Model.extend({
   name:"i1, i2, etc",
   type:"analog",
   enabled:false
});

var Device = Backbone.Model.extend({
   allowedSampleRates:["0.1","1.0","10.0","100.0","200.0"],
   sampleRate:null,
   deviceInputs: [],
   urlRoot:"/device/",
   initialize: function(){
      
   },
   sampleRateChaged: function(event){
      var device = event.data.device;
      device.set("sampleRate", event.target.value);
      device.save();
   }
});

var currentDevice = new Device({id:"10"});


var DeviceSampleRateView = Backbone.View.extend({
   el: $("#samplingRateSelection"),
   initialize: function(){
      currentDevice.on("change:sampleRate", this.renderSelectedSampleRate, this);
      currentDevice.on("change:allowedSampleRates", this.renderAllowedRates, this);
      $(this.el).on("change",{device:currentDevice},currentDevice.sampleRateChaged);
      currentDevice.fetch();
      this.renderAllowedRates();
   },
  
   renderSelectedSampleRate: function(){
      $(this.el).val(currentDevice.get("sampleRate"));
   },
   
   renderAllowedRates: function(){
     var selection = $(this.el);
     var allowed = currentDevice.allowedSampleRates;
     $.each(allowed, function(key,value) {   
     selection.append($("<option></option>")
         .attr("value",value)
         .text(value + " Hz")); 
      }); 
   }
});
var samleRateView = new DeviceSampleRateView();

var DataGridView = Backbone.Model.extend({
   elId:"#dataGrid",
   data: [{},{},{},{},{},{},{},{},{},{}],
   columns: [
                 {id: "dataIndex", name: "#", field: "dataIndex", selectable:false, width: 50, resizable: false,cssClass: "cell-selection" },
                 {id: "time", name: "Time Stamp", field: "time", sortable: true},
                 {id: "v1", name: "Analog 1", field: "v1",sortable: true},
                 {id: "v2", name: "Analog 2", field: "v2",sortable: true},
                 {id: "v3", name: "Analog 3", field: "v3",sortable: true},
                 {id: "d1", name: "Digital 1", field: "d1",sortable: true},
                 {id: "d2", name: "Digital 2", field: "d2",sortable: true}
                ],

  options: {
      enableCellNavigation: true,
      enableColumnReorder: false,
      forceFitColumns: true},
  initialize: function(){
      this.grid = new Slick.Grid(this.elId, this.data, this.columns, this.options);
  },
  updateView: function(){
      this.grid.updateRowCount();
      this.grid.render();
  },
  addRow:function(timestamp, values){
     this.data.push({dataIndex:this.data.length,time:timestamp/1000, v1:values[0], v2:values[1]});
     this.updateView();
  },
  clear:function(){
    this.data = [];
    this.grid.setData(this.data) 
    this.updateView();
  }
});

window.grid = new DataGridView();
grid.initialize();
});

//Install the tool tips:
$('.tt').tooltip({delay: { show: 100, hide: 100 }});

sock = new SockJS('/data');
//sock = new WebSocket('/data');
sock.ping = function(){
      this.lastPingTime = new Date().getTime();
      this.send('ping');
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
      $('.latencyOnWire').text((this.onTheWireTime/2000).toFixed(3) + "s");
      return;
   }
   this.totalMessagesReceived++;
   var decodedMessage = JSON.parse(e.data);
   var data = decodedMessage.data;
   
   for(var i = 0; i != data.length; i++)
   {
      addDataPoint(data[i].time, data[i].values);
   }
   if(smoothie){
      smoothie.timeOffset = decodedMessage.timeSpanEnd - Date.now();
   }
   
   if(isRecording){
      grid.updateView();
   }
   
   var avg = this.computeLatency(decodedMessage.timeSpanStart, decodedMessage.timeSpanEnd);
   $('.latency').text( avg.toFixed(3) +"s");
   
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
  millisPerPixel:10,
  timestampFormatter: SmoothieChart.timeFormatter,
  verticalAxisFormatter: voltageFormatter,
  interpolation: "line"
});
smoothie.streamTo(document.getElementById("plot"));
// Data
var line1 = new TimeSeries();
var line2 = new TimeSeries();


function addDataPoint(timestamp, values){
   if(isRecording){
      grid.addRow(timestamp, values);
   }
   line1.append(timestamp, values[0]);
   line2.append(timestamp, values[1]);
}

$('.start').button('toggle');
$('.lineToggleButton').button('toggle');
// Add to SmoothieChart
smoothie.addTimeSeries(line1,{ strokeStyle:'rgb(0, 0, 255)',  lineWidth:2 });
smoothie.addTimeSeries(line2,{ strokeStyle:'rgb(255, 0, 255)',  lineWidth:2 });

function startGraph(event)
{
   smoothie.start();
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
   if(isRecording){
      isRecording = false;
   }
   else{
      isRecording = true;
      grid.clear();
   }
}

function setBezier(event)
{
	if(smoothie.options.interpolation == "bezier"){
	   smoothie.options.interpolation = "line"; 
	}
	else{
	   smoothie.options.interpolation = "bezier";
	}
}

function setLine(event)
{
	smoothie.options.interpolation = "line";	
}

function updateSampleRate(event){
   var selection = $('#samplingRateSelection option:selected').val();
   $.ajax({
    url: '/device/sampleRate/',
    type: 'POST',
    data: JSON.stringify({ sampleRate: parseFloat(selection) }),
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    success: function() { alert('post completed'); }
});
   
}

function deleteLog(event){
   grid.clear();
}
function saveToFile(event){
   var bb = new BlobBuilder;
   for(var i = 0; i != grid.data.length;i++){
      var obj = grid.data[i];
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
}
