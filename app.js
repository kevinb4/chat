/**
 * @fileoverview Handles the main functions
 * @author xCryptic (Github)
 */

var express = require('express'),
	app = express(),
	port = Number(process.env.PORT || 3000),
	io = require('socket.io').listen(app.listen(port)),
	commands = require('./commands.js'),
	functions = require('./functions.js'),
	users = {},
	admins = {},
	status = {};

functions.cmdMsg(functions.cmdType.Normal, 'listening @ localhost:' + port);
functions.cmdMsg(functions.cmdType.Normal, Object.keys(functions.emotes).length + ' emote(s) loaded');

functions.mongoose.connect('mongodb://127.0.0.1/chat', function (err) {
	if (err)
		functions.cmdMsg(functions.cmdType.Error, err);
	else
		functions.cmdMsg(functions.cmdType.Normal, 'Connected to MongoDB');
});

app.use('/images', express.static('images'));
app.use('/css', express.static('css'));
app.use('/mp3', express.static('mp3'));
app.use('/js', express.static('js'));
app.get('/', function (req, res) {
	res.sendFile(__dirname + '/chat.html');
});

/**
 * The connection - handles most of the functions
 * @param {socket} The connection link for each user
 */
io.on('connection', function (socket) {
	var query = functions.chat.find({ deleted: false });

	query.sort('-date').limit(50).exec(function (err, msgs) { // load the last 50 messages in order
		if (err) {
			functions.cmdMsg(functions.cmdType.Error, err);
			return;
		}
		var msgArray = {};
		for (var i = 0; i < msgs.length; i++)
			msgArray[i] = msgs[i].msg[0];

		socket.emit('load messages', msgArray);
	});

	socket.on('register', function (registerData, callback) {
		functions.register(registerData, callback);
	});

	socket.on('user login', function (data, callback) {
		functions.login(data, callback, socket, io, admins, users, status);
	});

	/**
	 * Handles what happens when the user disconnects
	 */
	socket.on('disconnect', function () {
		if (!socket.username) return;
			delete users[socket.username]; // remove user from list
		if (socket.username in admins)
			delete admins[socket.username]; // remove admin from list
		if (socket.username in status)
			delete status[socket.username]; // remove from status list

		functions.updateNicknames(io, users, admins, status);
		functions.cmdMsg(functions.cmdType.Normal, 'User Left: ' + socket.username);
		io.emit('chat message', functions.clientMsg({
			type: functions.msgType.ServerLeave,
			msg: socket.username + ' has left'
		}));
	});

	/**
	 * Gets the previous message the user sent
	 * which is used for editing messages
	 * @param {message}
	 * @param {callback}
	 */
	socket.on('get prev msg', function (message, callback) {
		var query = functions.chat.find({ username: socket.username });

		query.sort('-date').limit(1).exec(function (err, result) {
			if (err) functions.cmdMsg(functions.cmdType.Error, err);
			try {
				if (result[0].deleted === false) 
					users[socket.username].emit('rcv prev msg', result[0].rawMsg);
			} catch (err) {
				users[socket.username].emit('rcv prev msg', null);
			}
		});
	});

	/**
	 * Saves the settings
	 * @param {data} The data recieved from the client
	 */
	socket.on('settings saved', function (data) {
		var query = functions.userdb.find({ username: socket.username });

		query.sort().limit(1).exec(function (err, result) {
			if (err)
				functions.cmdMsg(functions.cmdType.Error, err);
			else
				functions.userdb.update({ username: socket.username }, { optSound: data }, function (err) { if (err) return functions.cmdMsg(functions.cmdType.Error, err); });
		});
	});

	/**
	 * Handles editing/deleting the most previous
	 * 	message made by the user
	 * @param {data} The edited message sent from the client
	 */
	socket.on('edit message', function (data) {
		var query = functions.chat.find({ username: socket.username });

		query.sort('-date').limit(1).exec(function (err, msg) {
			if (err) {
				functions.cmdMsg(functions.cmdType.Error, err);
				return;
			}
			if (data) {
				var fullMsg = functions.editMessage(data, socket, admins, msg[0]);

				functions.chat.update({ date: msg[0].date }, { $set: { 'rawMsg': data, 'msg.0.message': fullMsg.message } }, function (err) { if (err) return functions.cmdMsg(functions.cmdType.Error, err); });
				io.emit('edited message', fullMsg);
			} else {
				var msgData = { id: msg[0].rawMsg[0].id, time: msg[0].rawMsg[0].time, user: msg[0].rawMsg[0].user, type: msg[0].msg.type, message: '<i>This message has been deleted</i>' };

				functions.chat.update({ date: msg[0].date }, { $set: { 'rawMsg': msgData.message, 'msg.0.message': msgData.message, deleted: true } }, function (err) { if (err) functions.cmdMsg(functions.cmdType.Error, err); });
				io.emit('edited message', msgData);
			}
		});
	});

	/**
	 * Handles message deleting by admins
	 * @param {messageID}
	 */
	socket.on('delete message', function (messageID) {
		if (socket.username in admins)
			users[socket.username].emit('del msg id', messageID);
	});

	/**
	 * Handles idle status
	 */
	socket.on('idle', function () {
		if (!(socket.username in status)) {
			status[socket.username] = { status: 'idle' };
			functions.updateNicknames(io, users, admins, status);
		}
	});

	/**
	 * Handles user typing status
	 */
	socket.on('typing', function () {
		if (!(socket.username in status)) {
			status[socket.username] = { status: 'typing' };
			functions.updateNicknames(io, users, admins, status);
		}
	});

	/**
	 * Removes a user from status
	 */
	socket.on('rstatus', function () {
		if (socket.username in status) {
			delete status[socket.username];
			functions.updateNicknames(io, users, admins, status);
		}
	});

	/**
	 * Removes a user from only idle status
	 */
	socket.on('ridle', function () {
		if (socket.username in status) {
			if (status[socket.username].status == 'idle') {
				delete status[socket.username];
				functions.updateNicknames(io, users, admins, status);
			}
		}
	});

	/**
	 * Handles chat messages along with commands
	 * @param {msg}
	 */
	socket.on('chat message', function (msg) {
		if (!msg) { // check to make sure a message was entered
			return;
		}
		if (!socket.username) { // check to make sure the client has a username
			return;
		}
		if (msg.indexOf('/') == 0) {
			var name = msg.substring((msg.indexOf(' ') == -1 ? msg.length : msg.indexOf(' ')), 1).toLowerCase(),
				args = msg.split(' ').splice(1),
				cmds = Object.keys(commands).map(function (key) {return commands[key]}),
				data = { socket, io, users, admins, status };

			for (var i = 0; i < cmds.length; i++)
				if (cmds[i].aliases.indexOf(name) != -1)
					if (cmds[i].role.indexOf(socket.role) != -1)
						cmds[i].run(args, data);
		} else {
			functions.message(msg, socket, io, users);
		}
	});
});

/**
 * Handles CMD/Server input
 * @param {data}
 */
var stdin = process.stdin;

stdin.resume();
stdin.on('data', function (data) {
	var input = data.toString().trim(),
		args = input.split(' ').splice(1),
		data = { io, users, admins, status };

	if (input == 'shutdown') { // shutdown command
		functions.cmdMsg(functions.cmdType.Normal, 'Shutting down...');
		functions.mongoose.disconnect;
		process.exit();
	} else if (input.indexOf('kick ') === 0) {
		commands.cmdKick.run(args, data);
	} else if (input.indexOf('ban ') === 0) {
		commands.cmdBan.run(args, data);
	} else if (input.indexOf('unban ') === 0) {
		commands.cmdUnban.run(args, data);
	} else if (input.indexOf('role ') === 0) {
		commands.cmdRole.run(args, data);
	} else { // anything else that's entered is sent as a server message
		io.emit('chat message', functions.clientMsg({
			type: functions.msgType.ServerSave,
			msg: input
		}));
	}
});