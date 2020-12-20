"use strict";
exports.__esModule = true;
var slpMiddleware = function (req, res, next) {
    if (!req.is('application/simpleledger-payment'))
        return next();
    var data = [];
    req.on('data', function (chunk) {
        data.push(chunk);
    });
    req.on('end', function () {
        if (data.length <= 0)
            return next();
        var endData = Buffer.concat(data);
        req.raw = endData;
        next();
    });
};
exports["default"] = slpMiddleware;
