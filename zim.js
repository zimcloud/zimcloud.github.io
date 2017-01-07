/**
 * Copyright © 2016 Zhang Peihao <zhangpeihao@gmail.com>
 */
define([], function() {
    var strChr = String.fromCharCode;

    var SDK = (function() {
        var instance;
        var options;
        var ws;
        var pinger = null;
        var pingCounter = 0;

        var onLogin;
        var onClose;
        var onReceivedMessage;

        var websocketIsOpen;

        function init() {
            return {
                setOptions: function(_options) {
                    var defaults = {
                        appid: '',
                        userid: '',
                        token: ''
                    };

                    options = extend(defaults, _options || {});
                },
                run: function(onLoginCallback, onCloseCallback, onReceivedMessageCallback) {
                    onLogin = onLoginCallback;
                    onClose = onCloseCallback;
                    onReceivedMessage = onReceivedMessageCallback;
                    // 开始连
                    ws = new WebSocket(options.wsurl);
                    ws.onopen = function(evt) {
                        console.log("WebSocket::onopen()");
                        websocketIsOpen = true;
                        ping();
                        var loginCmd;
                        var loginPayload;
                        loginCmd = {"userid":options.userid, "timestamp": now(), "token": options.token};
                        loginPayload = {}
                        ws.send(compose("login", JSON.stringify(loginCmd), JSON.stringify(loginPayload)));
                    }
                    ws.onclose = function(evt) {
                        // Todo: 短线重连
                        console.log("WebSocket::onclose()");
                        cleanup();
                        ws = null;
                    }
                    ws.onmessage = function(evt) {
                        console.log("WebSocket::onmessage()");
                    }
                    ws.onerror = function(evt) {
                        // Todo: 短线重连
                        console.log("WebSocket::onerror() " + evt.data);
                    }
                },
                send: function(message) {
                    // 发送消息
                    ws.send(compose("msg", "{}", message))
                },
            };
        }

        function check(){
            if (pingCounter > 2){
                close();
                return false
            }
            return true
        }

        function ping(){
            /**
             * 30秒没有响应，停止
             */
            if (pinger == null) {
                pinger = setInterval(function () {
                    if (
                        check() &&
                        websocketIsOpen
                    ) {
                        ws.send(compose("hb","{}", ""));
                        pingCounter++;
                        console.log(pingCounter)
                    }
                }, 15000);
            }
        }
        
        function close() {
            ws.close();
            cleanup();
        }
        
        function cleanup() {
            pingCounter = 0;
            if (pinger != null) {
                clearInterval(pinger);
                pinger = null;
            }
        }

        function pong(){
            pingCounter = 0;
        }

        function extend(target, options) {
            for (name in options) {
                target[name] = options[name];
            }
            return target;
        }
        
        function now() {
            return Math.floor(new Date().valueOf()/1000);
        }
        
        function compose(name, cmd, payload) {
            return "t1\n"+options.appid+"\n"+name+"\n"+cmd+"\n"+payload;
        }

        return {
            getInstance: function() {
                if (!instance) {
                    instance = init();
                }
                return instance;
            }
        };
    })();

    return SDK;
});