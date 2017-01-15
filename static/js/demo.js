$(function() {
  var sdk
  var url = "wss://demo.zimcloud.cn/ws"
  var msg = $("#msg")
  var log = $("#log")

  function appendLog(msg) {
    var d = log[0]
    var doScroll = d.scrollTop == d.scrollHeight - d.clientHeight
    msg.appendTo(log)
    if (doScroll) {
      d.scrollTop = d.scrollHeight - d.clientHeight
    }
  }

  $("#form").submit(function(evt) {
    if (!sdk) {
      return false;
    }
    if (!msg.val()) {
      return false;
    }

    sdk.send(msg.val())

    appendLog($("<div class=\"msg\"/>").text("You: " + msg.val()))

    msg.val("")

    return false
  })

  sdk = new zim(url, 
    {appID: "test", userID: "123", deviceID: "###", timestamp: 0, token: ""})

  sdk.onopen = function(evt) {
    appendLog($("<div class=\"success\"/>").text("Connection ready."))
  }
  sdk.onclose = function(evt) {
    appendLog($("<div class=\"warning\"/>").text("Connection closed."))
  }
  sdk.onmessage = function(evt) {
    appendLog($("<div class=\"msg\"/>").text("Remote: " + evt.data))
  }
});
