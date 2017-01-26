/**
 * Copyright © 2016 Zhang Peihao <zhangpeihao@gmail.com>
 */
(function (global, factory) {
     if (typeof define === 'function' && define.amd) {
         define([], factory);
     } else if (typeof module !== 'undefined' && module.exports){
         module.exports = factory();
     } else {
         global.zim = factory();
     }
})(this, function () {
    if (!('WebSocket' in window)) {
        return;
    }
    function zim(url, options) {
        // Default settings
        var settings = {
            /** Whether this instance should log debug messages. */
            debug: false,
            /** Whether or not the websocket should attempt to connect immediately upon instantiation. */
            automaticOpen: true,
            /** The number of milliseconds to delay before attempting to reconnect. */
            reconnectInterval: 1000,
            /** The maximum number of milliseconds to delay a reconnection attempt. */
            maxReconnectInterval: 30000,
            /** The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. */
            reconnectDecay: 1.5,
            /** The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. */
            timeoutInterval: 2000,
            /** The maximum number of reconnection attempts to make. Unlimited if null. */
            maxReconnectAttempts: null,
            /** The binary type, possible values 'blob' or 'arraybuffer', default 'blob'. */
            binaryType: 'blob',
            /** zim protocol, possible values 'plaintext' or 'json', default 'plaintext'. */
            zimProtocol: 'plaintext',
            /** application ID */
            appID: 'test',
            /** user ID */
            userID: '',
            /** device ID */
            deviceID: '',
            /** timestamp */
            timestamp: 0,
            /** token */
            token: ''
        }

        if (!options) { options = {}; }

        // Overwrite and define settings with options if they exist.
        for (var key in settings) {
            if (typeof options[key] !== 'undefined') {
                this[key] = options[key];
            } else {
                this[key] = settings[key];
            }
        }

        // These should be treated as read-only properties
        /** The URL as resolved by the constructor. This is always an absolute URL. Read only. */
        this.url = url;
        /** The number of attempted reconnects since starting, or the last successful connection. Read only. */
        this.reconnectAttempts = 0;
        /**
         * The current state of the connection.
         * Can be one of: WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED
         * Read only.
         */
        this.readyState = WebSocket.CONNECTING;
        /**
         * A string indicating the name of the sub-protocol the server selected; this will be one of
         * the strings specified in the protocols parameter when creating the WebSocket object.
         * Read only.
         */
        this.protocol = null;

        // Private state variables
        var _self = this;
        var ws;
        var forcedClose = false;
        var timedOut = false;
        var eventTarget = document.createElement('div');

        // Wire up "on*" properties as event handlers
        eventTarget.addEventListener('open',       function(event) { _self.onopen(event); });
        eventTarget.addEventListener('close',      function(event) { _self.onclose(event); });
        eventTarget.addEventListener('connecting', function(event) { _self.onconnecting(event); });
        eventTarget.addEventListener('message',    function(event) { _self.onmessage(event); });
        eventTarget.addEventListener('error',      function(event) { _self.onerror(event); });

        // Expose the API required by EventTarget
        this.addEventListener = eventTarget.addEventListener.bind(eventTarget);
        this.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
        this.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);

        /**
         * This function generates an event that is compatible with standard
         * compliant browsers and IE9 - IE11
         *
         * This will prevent the error:
         * Object doesn't support this action
         *
         * http://stackoverflow.com/questions/19345392/why-arent-my-parameters-getting-passed-through-to-a-dispatched-event/19345563#19345563
         * @param s String The name that the event should use
         * @param args Object an optional object that the event will use
         */
        function generateEvent(s, args) {
        	var evt = document.createEvent("CustomEvent");
        	evt.initCustomEvent(s, false, false, args);
        	return evt;
        };

        this.open = function (reconnectAttempt) {
            ws = new WebSocket(_self.url);
            ws.binaryType = this.binaryType;

            if (reconnectAttempt) {
                if (this.maxReconnectAttempts && this.reconnectAttempts > this.maxReconnectAttempts) {
                    return;
                }
            } else {
                eventTarget.dispatchEvent(generateEvent('connecting'));
                this.reconnectAttempts = 0;
            }

            if (_self.debug || this.debugAll) {
                console.debug('zim', 'attempt-connect', _self.url);
            }

            var localWs = ws;
            var timeout = setTimeout(function() {
                if (_self.debug || this.debugAll) {
                    console.debug('zim', 'connection-timeout', _self.url);
                }
                this.timedOut = true;
                localWs.close();
                this.timedOut = false;
            }, _self.timeoutInterval);

            ws.onopen = function(event) {
                clearTimeout(timeout);
                if (_self.debug || this.debugAll) {
                    console.debug('zim', 'onopen', _self.url);
                }
                _self.protocol = ws.protocol;
                _self.readyState = WebSocket.OPEN;
                _self.reconnectAttempts = 0;
                var e = generateEvent('open');
                e.isReconnect = reconnectAttempt;
                reconnectAttempt = false;
                eventTarget.dispatchEvent(e);
                ws.send(_self.marshal("login", 
                    {
                        userid: _self.userID,
                        deviceid: _self.deviceID,
                        timestamp: 0,
                        token: ""
                    }, 
                    ""));
            };

            ws.onclose = function(event) {
                clearTimeout(timeout);
                ws = null;
                if (forcedClose) {
                    _self.readyState = WebSocket.CLOSED;
                    eventTarget.dispatchEvent(generateEvent('close'));
                } else {
                    _self.readyState = WebSocket.CONNECTING;
                    var e = generateEvent('connecting');
                    e.code = event.code;
                    e.reason = event.reason;
                    e.wasClean = event.wasClean;
                    eventTarget.dispatchEvent(e);
                    if (!reconnectAttempt && !timedOut) {
                        if (_self.debug || zim.debugAll) {
                            console.debug('zim', 'onclose', _self.url);
                        }
                        eventTarget.dispatchEvent(generateEvent('close'));
                    }

                    var timeout = _self.reconnectInterval * Math.pow(_self.reconnectDecay, _self.reconnectAttempts);
                    setTimeout(function() {
                        _self.reconnectAttempts++;
                        _self.open(true);
                    }, timeout > _self.maxReconnectInterval ? _self.maxReconnectInterval : timeout);
                }
            };
            ws.onmessage = function(event) {
                if (_self.debug || zim.debugAll) {
                    console.debug('zim', 'onmessage', _self.url, event.data);
                }
                var cmd = _self.unmarshal(event.data);
                if (cmd.payload != 'undefined' && cmd.payload.length > 0) {
                    var payload = eval("("+cmd.payload+")");
                    var e = generateEvent('message');
                    e.data = payload;
                    eventTarget.dispatchEvent(e);
                }
            };
            ws.onerror = function(event) {
                if (_self.debug || zim.debugAll) {
                    console.debug('zim', 'onerror', _self.url, event);
                }
                eventTarget.dispatchEvent(generateEvent('error'));
            };
        }

        // Whether or not to create a websocket upon instantiation
        if (this.automaticOpen == true) {
            this.open(false);
        }

        /**
         * Transmits data to the server over the WebSocket connection.
         *
         * @param data a text string, ArrayBuffer or Blob to send to the server.
         */
        this.send = function(data) {
            if (ws) {
                if (_self.debug || zim.debugAll) {
                    console.debug('zim', 'send', _self.url, data);
                }
                return ws.send(this.marshal("msg", {userid: "1"}, data));
            } else {
                throw 'INVALID_STATE_ERR : Pausing to reconnect websocket';
            }
        };

        /**
         * Closes the WebSocket connection or connection attempt, if any.
         * If the connection is already CLOSED, this method does nothing.
         */
        this.close = function(code, reason) {
            // Default CLOSE_NORMAL code
            if (typeof code == 'undefined') {
                code = 1000;
            }
            forcedClose = true;
            if (ws) {
                ws.close(code, reason);
            }
        };

        /**
         * Additional public API method to refresh the connection if still open (close, re-open).
         * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
         */
        this.refresh = function() {
            if (ws) {
                ws.close();
            }
        };
    
        /**
         * 编码
         */
        this.marshal = function(cmd, data, payload) {
            if (_self.debug || zim.debugAll) {
                console.debug('zim', 'marshal', "_self.zimProtocol: ", _self.zimProtocol);
            }
            var ret;
            switch (_self.zimProtocol) {
                case "plaintext":
                    ret = marshalPlaintext(_self.appID, cmd, data, payload);
                    break;
                case "json":
                    ret = marshalJSON(_self.appID, cmd, data, payload);
                    break;
                default:
                    throw 'INVALID_STATE_ERR : marshal unknown protocol: ' + _self.zimProtocol;
            }
            if (_self.debug || zim.debugAll) {
                console.debug('zim', 'marshal', "ret: ", ret);
            }
            return ret;
        };
        
        function marshalPlaintext(appID, cmd, data, payload) {
            var dataString = "";
            if (typeof data !== 'undefined') {
                dataString = JSON.stringify(data);
            }
            return "t1\n" + appID + "\n" + cmd +"\n" + dataString + "\n" + payload
        };

        function marshalJSON(appID, cmd, data, payload) {
            var obj = {version: "j1", appid: appID, name: cmd}
            if (typeof data !== 'undefined') {
                obj.data = data;
            }
            if (typeof payload !== 'undefined') {
                obj.payload = payload;
            }
            return JSON.stringify(obj);
        };
        
        /**
         * 解码
         */
        this.unmarshal = function(data) {
            if (_self.debug || zim.debugAll) {
                console.debug('zim', 'unmarshal', "_self.zimProtocol: ", _self.zimProtocol);
            }
            var ret;
            switch (_self.zimProtocol) {
                case "plaintext":
                    ret = unmarshalPlaintext(data);
                    break;
                case "json":
                    ret = unmarshalJSON(data);
                    break;
                default:
                    throw 'INVALID_STATE_ERR : unmarshal unknown protocol: ' + _self.zimProtocol;
            }
            if (_self.debug || zim.debugAll) {
                console.debug('zim', 'unmarshal', "ret: ", ret);
            }
            return ret;
        };
        function unmarshalPlaintext(data) {
            var lines = data.split('\n');
            if (lines.length < 5) {
                if (_self.debug || zim.debugAll) {
                    console.debug('zim', 'unmarshalPlaintext', "only ", lines.length , " lines");
                }
                return {}
            }
            var ret = {
                version: lines[0],
                appid: lines[1],
                name: lines[2],
                payload: ""
            }
            if (lines[3].length > 0) {
                ret.data = eval("("+lines[3]+")");
            }
            for (var i = 4; i < lines.length; i++) {
                if (lines[i].length > 0) {
                    if (ret.payload.length > 0) {
                        ret.payload = ret.payload + "\n" + lines[i];
                    } else {
                        ret.payload = lines[i];
                    }
                }
            }
            return ret;
        };
        function unmarshalJSON(data) {
            var ret = eval("("+data+")");
            // Todo: base64 payload decode
            return ret;
        }
    }

    /**
     * An event listener to be called when the WebSocket connection's readyState changes to OPEN;
     * this indicates that the connection is ready to send and receive data.
     */
    zim.prototype.onopen = function(event) {};
    /** An event listener to be called when the WebSocket connection's readyState changes to CLOSED. */
    zim.prototype.onclose = function(event) {};
    /** An event listener to be called when a connection begins being attempted. */
    zim.prototype.onconnecting = function(event) {};
    /** An event listener to be called when a message is received from the server. */
    zim.prototype.onmessage = function(event) {};
    /** An event listener to be called when an error occurs. */
    zim.prototype.onerror = function(event) {};

    /**
     * Whether all instances of zim should log debug messages.
     * Setting this to true is the equivalent of setting all instances of zim.debug to true.
     */
    zim.debugAll = true;

    zim.CONNECTING = WebSocket.CONNECTING;
    zim.OPEN = WebSocket.OPEN;
    zim.CLOSING = WebSocket.CLOSING;
    zim.CLOSED = WebSocket.CLOSED;

    return zim;
});
