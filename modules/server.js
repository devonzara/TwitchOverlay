var TwitchChat = require('./twitch-chat');
var Twitch = require('./twitch');
var ActivityStream = require('./activity-stream');
var Database = require('./database');
var io = require('socket.io')();
var ip = require('ip');

function TwitchOverlayServer(config) {

    var that = this;

    this._bot = new TwitchChat();
    this._db = new Database();
    this._activityStream = new ActivityStream(this._db);
    this._twitch = new Twitch(this._db, this._activityStream);

    var db = null;
    this._db.getCollection('config', function (instance) {
        db = instance;
    });
    this._db = null;
    this._data = {};
    this._sockets = [];

    io.on('connection', function (socket) {
        that._sockets.push(socket);

        that._twitch.on('newFollower', socket.emit.bind(this, 'followerAlert:update'));

        that._twitch.getEmotes(function (emotes) {
            socket.emit('emotes', emotes);
        });
    });

    this._socket = io.listen(config.port);

    (function loop() {
        setTimeout(loop, config.serverTick);
        that._tick.call(that);
    })();
}

var proto = TwitchOverlayServer.prototype;

proto._tick = function () {
    this._twitch.get(function() {});
};

proto._socketConnected = function (socket) {
    return socket.connected;
};

proto.destroy = function () {
    this._socket.close();
};

proto.setConfig = function (name, payload) {
    this._data[name] = payload;
    var that = this;
    this._db.find({_id: name}, function (err, docs) {
        console.log(arguments);
        if (docs.length > 0) {
            that._db.update({_id: name}, {_id: name, payload: payload});
        } else {
            that._db.insert({_id: name, payload: payload});
        }
    });
};

proto.getConfig = function (name) {
    return this._data[name] || null;
};

proto.getIp = ip.address;

proto.getModule = function (module) {
    return this['_' + module];
};

module.exports = TwitchOverlayServer;
