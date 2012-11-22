sock = new SockJS('/data');
//sock = new WebSocket('/data');
sock.onopen = function() {
   console.log('open');
};
sock.onmessage = function(e) {
   console.log('message', e.data);
};
sock.onclose = function(e) {
   console.log('close', e.reason);
};


//This doesn't really belong here but this will work for now:

var smoothie = new SmoothieChart({
  grid: { strokeStyle:'rgb(0, 125, 0)', fillStyle:'rgb(0, 30, 0)',
          lineWidth: 0.5, millisPerLine: 250, verticalSections: 6, },
  labels: { fillStyle:'rgb(60, 0, 0)' },
  fps: 20
});
smoothie.streamTo(document.getElementById("plot"));

// Data
var line1 = new TimeSeries();
var line2 = new TimeSeries();

// Add a random value to each line every second
var intervalId = startTimeSeries();
function startTimeSeries(){
   return setInterval(function() {
	  var time = new Date().getTime();
  	  line1.append(time, Math.random());
  	  line2.append(time, Math.random());
   }, 1000);
}
$('.start').button('toggle');
$('.bezierToggleButton').button('toggle');
// Add to SmoothieChart
smoothie.addTimeSeries(line1,{ strokeStyle:'rgb(0, 0, 255)',  lineWidth:2 });
smoothie.addTimeSeries(line2,{ strokeStyle:'rgb(255, 0, 255)',  lineWidth:2 });

function startGraph(event)
{
	if(null == intervalId)
	{
	   intervalId = startTimeSeries();
	   smoothie.start();
	}
}

function stopGraph(event)
{
	if(intervalId != null)
	{
		window.clearInterval(intervalId);
		smoothie.stop();
		intervalId = null;
	}
}

function setBezier(event)
{
	smoothie.options.interpolation = "bezier";
}

function setLine(event)
{
	smoothie.options.interpolation = "line";	
}
