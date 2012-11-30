//Background IO tasks. 
importScripts("js/sockjs-0.3.min.js");

var sock = null;

self.addEventListener('message', function(e) {
  self.postMessage(e.data);
  if(e.data == "start")
  {
   sock = new SockJS('/data');
   //sock = new WebSocket('/data');
   sock.onopen = function() {
      console.log('open');
   };
   sock.onmessage = function(e) {
      var decodedMessage = JSON.parse(e.data);
      //for(var i = 0; i != decodedMessage.length; i++)
      //{
      //   addDataPoint(decodedMessage[i].time, decodedMessage[i].values);
      //}
      //grid.updateRowCount();
      //grid.render();
      // console.log('message', e.data);
      self.postMessage(decodedMessage);
   };
   sock.onclose = function(e) {
      console.log('close', e.reason);
   };
     
  }
}, false);