/**
* Copyright © 2016 Zhang Peihao <zhangpeihao@gmail.com>
*/

require(["zim"], function(zim) {
    console.log("main() begin");

    // 通过其他API接口取得以下参数
    var wsurl = 'ws://localhost:8870/ws';
    var appid = 'test';
    var userid = 'zhangpeihao@zim';
    var token = '';

    var sdk = zim.getInstance();

    sdk.setOptions({
        wsurl: wsurl,
        port: 8870,
        protocolVersion: 13,
        origin: '',
        keepAlive: 60  // Ping Interval in seconds.
    });
    
    sdk.run(
        function() {
            console.log("Connected to server");
            sdk.send("Hello Server");
        },
        function(msg) {
            console.log("MSG: " + msg);
        },
        function() {
            console.log("Connection closed");
        }
    );
});
