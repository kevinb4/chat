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
		if (err) functions.cmdMsg(functions.cmdType.Error, err);
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
		var now = functions.moment(),
			getID = functions.guid(),
			message = { id: getID, time: now, user: '<font color="#4E7ACC"><b>[Server]</b> ', message: socket.username + ' has left' };

		if (!socket.username) return;
			delete users[socket.username]; // remove user from list
		if (socket.username in admins)
			delete admins[socket.username]; // remove admin from list
		if (socket.username in status)
			delete status[socket.username]; // remove from status list

		functions.updateNicknames(io, users, admins, status);
		functions.cmdMsg(functions.cmdType.Normal, 'User Left: ' + socket.username);
		io.emit('chat message', message);
		functions.saveMsg = new functions.chat({ txtID: getID, msg: message, username: '[Server]', deleted: false });
		functions.saveMsg.save(function (err) { if (err) functions.cmdMsg(functions.cmdType.Error, err); });
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
					users[socket.username].emit('rcv prev msg', result[0].rawMsg[0].message);
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
		var query = userdb.find({ username: socket.username });

		query.sort().limit(1).exec(function (err, result) {
			if (err)
				functions.cmdMsg(functions.cmdType.Error, err);
			else
				userdb.update({ username: socket.username }, { optSound: data }, function (err) { if (err) return functions.cmdMsg(functions.cmdType.Error, err); });
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
			if (err) functions.cmdMsg(functions.cmdType.Error, err);
			if (data != '') {
				var fullMsg = functions.editMessage(data, socket, admins, msg[0].rawMsg[0]);

				functions.chat.update({ date: msg[0].date }, { $set: { 'rawMsg.0.message': data, 'msg.0.message': fullMsg.message } }, function (err) { if (err) return functions.cmdMsg(functions.cmdType.Error, err); });
				io.emit('edited message', fullMsg);
			} else {
				var msgData = { id: msg[0].rawMsg[0].id, time: msg[0].rawMsg[0].time, user: msg[0].rawMsg[0].user, message: '<i>This message has been deleted</i>' };

				functions.chat.update({ date: msg[0].date }, { $set: { 'rawMsg.0.message': msgData.message, 'msg.0.message': msgData.message, deleted: true } }, function (err) { if (err) functions.cmdMsg(functions.cmdType.Error, err); });
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
			status[socket.username] = {status: 'idle'};
			functions.updateNicknames(io, users, admins, status);
		}
	});

	/**
	 * Handles user typing status
	 */
	socket.on('typing', function () {
		if (!(socket.username in status)) {
			status[socket.username] = {status: 'typing'};
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
		if (msg != '') { // check to make sure a message was entered
			if (socket.username != '') { // check to make sure the client has a username
				if (msg.indexOf('/afk') === 0) {
					commands.AFK(msg, socket, io, users, admins, status);
				} else if (msg.indexOf('/commands') === 0) {
					commands.commands(socket, admins, users);
				} else if (msg.indexOf('/w ') === 0) {
					commands.whisper(msg, socket, users);
				} else {
					if (socket.username in admins) {
						if (msg.indexOf('/broadcast ') === 0 || msg.indexOf('/bc ') === 0)
							commands.adminBroadcast(msg, socket, io);
						else if (msg.indexOf('/kick ') === 0)
							commands.adminKick(msg, socket, io, users);
						else if (msg.indexOf('/ban ') === 0)
							commands.adminBan(msg, socket, io, users);
						else if (msg.indexOf('/unban ') === 0)
							commands.adminUnban(msg, socket, users);
						else if (msg.indexOf('/name ') === 0)
							commands.adminName(msg, socket, io, users, admins, status);
						else if (msg.indexOf('/delete ') === 0)
							commands.adminDelete(msg, socket, io, users);
						else if (msg.indexOf('/delmsgs ') === 0)
							commands.adminDelMsgs(msg, socket, io, users);
						else if (msg.indexOf('/deltext ') == 0)
							commands.adminDelText(msg, socket, io, users);
						else if (msg.indexOf('/mute ') === 0)
							commands.adminMute(msg, socket, users);
						else if (msg.indexOf('/js ') === 0)
							commands.adminJS(msg, socket, io, users);
						else if (msg.indexOf('/') === 0)
							users[socket.username].emit('chat message', { id: 'error', time: functions.moment(), user: functions.serverMsg, message: 'You have entered an invalid command "' + msg.substring(1) + '"' });
						else
							functions.adminMessage(msg, socket, io);
					} else {
						functions.message(msg, socket, io, users);
					}
				}
			}
		}
	});
});

var stdin = process.stdin, stdout = process.stdout;

/**
 * Handles CMD/Server input
 * @param {data}
 */
stdin.resume();
stdin.on('data', function (data) {
	var input = data.toString().trim(); // take out any unecessary spaces

	if (input == 'shutdown') { // shutdown command
		functions.cmdMsg(functions.cmdType.Normal, 'Shutting down...');
		functions.mongoose.disconnect;
		process.exit();
	} else if (input.indexOf('kick ') === 0) {
		commands.cmdKick(input, io, users);
	} else if (input.indexOf('ban ') === 0) {
		commands.cmdBan(input, io, users);
	} else if (input.indexOf('unban ') === 0) {
		commands.cmdUnban(input);
	} else if (input.indexOf('admin ') === 0) {
		commands.cmdAdmin(input, io, users, admins, status);
	} else { // anything else that's entered is sent as a server message
		var now = functions.moment(),
			getID = functions.guid(),
			message = { id: getID, time: now, user: functions.serverMsg, message: input };

		io.emit('chat message', message);
		functions.saveMsg = new functions.chat({ txtID: getID, msg: message, username: '[Server]', deleted: false });
		functions.saveMsg.save(function (err) { if (err) functions.cmdMsg(functions.cmdType.Error, err); });
	}
});