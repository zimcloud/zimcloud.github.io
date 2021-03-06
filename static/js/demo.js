$(function() {
  var sdk;
  var url;
  var msg = $("#msg");
  var log = $("#log");

  var userID = (1000000 + Math.round(Math.random() * 9000000)).toString();
  var deviceID = "web";
  var timestamp = Math.round(new Date().getTime() / 1000);
  var key = "1234567890";

  var token = md5(key + userID + deviceID + timestamp.toString());

  if ('https:' == document.location.protocol) {
    url = "wss://demo.zimcloud.cn/ws";
  } else {
    url = "ws://demo.zimcloud.cn/ws";
  }

  function appendLog(msg) {
    var d = log[0];
    var doScroll = d.scrollTop == d.scrollHeight - d.clientHeight;
    msg.appendTo(log);
    if (doScroll) {
      d.scrollTop = d.scrollHeight - d.clientHeight;
    }
  }

  $("#form").submit(function(evt) {
    if (!sdk) {
      return false;
    }
    if (!msg.val()) {
      return false;
    }

    sdk.send(msg.val());

    msg.val("");

    return false;
  })

  sdk = new zim(url, 
    {appID: "test", userID: userID, deviceID: deviceID, timestamp: timestamp, token: token});

  sdk.onopen = function(evt) {
    appendLog($("<div class=\"success\"/>").text("Connection ready."));
  }
  sdk.onclose = function(evt) {
    appendLog($("<div class=\"warning\"/>").text("Connection closed."));
  }
  sdk.onmessage = function(evt) {
    var from;
    if (evt.data.from == userID) {
        from = "You";
    } else {
        from = evt.data.from;
    }
    appendLog($("<div class=\"msg\"/>").text(from + ": " + evt.data.msg));
  }
});
