/**
 * Copyright © 2016 Zhang Peihao <zhangpeihao@gmail.com>
 */

define([], function (argument) {
    var urlObj = {
        dev: {
            api: 'http://localhost:8080/zim/login',
            ws: 'ws://localhost:8870'
        },
        test: {
            api: 'http://zim.test/zim/login',
            ws: 'ws://zim.test:8870'
        },
        release: {
            api: 'http://zim.prod/zim/login',
            ws: 'ws://zim.prod:8870'
        }
    };
    var environment = 'dev';
    return urlObj[environment];
});