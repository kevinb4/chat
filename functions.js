/**
 * @fileoverview Handles main functions
 * @author xCryptic (Github)
 */

var functions = require('./functions.js'),
	bcrypt = require('bcrypt-nodejs'),
	colors = require('colors');

exports.saveMsg;
exports.mongoose = require('mongoose');
exports.moment = require('moment');
exports.cmdType = { Error: 'Error', Normal: 'Normal', User: 'User', Admin: 'Admin' };
exports.msgType = { User: 'User', Whisper: 'Whisper', Admin: 'Admin', Server: 'Server', ServerSave: 'ServerSave', ServerLeave: 'ServerLeave' };

var schema = functions.mongoose.Schema({ txtID: String, msg: Array, rawMsg: Array, deleted: Boolean, username: String, type: String, date: { type: Date, default: Date.now } }),
	userschema = functions.mongoose.Schema({ uid: Number, username: String, password: String, role: String, mute: String, ban: Boolean, banReason: String, options: { optSound: Boolean }});

exports.chat = functions.mongoose.model('message', schema);
exports.userdb = functions.mongoose.model('userdb', userschema);

/**
 * Gets the info from the client and registers the user
 * @param {registerData}
 * @param {callback}
 */
exports.register = function (registerData, callback) {
	var dataUsername = registerData.username, dataPassword = registerData.password,
		errorMsg = 'An error has occoured, please contact an administrator',
		saveUser,
		user = /^[\w]{1,15}$/,
		userCheck = functions.userdb.find({ username: dataUsername }); // check to make sure the username doesn't already exist

	userCheck.sort().limit(1).exec(function (err, registerData) {
		if (err) {
			functions.cmdMsg(functions.cmdType.Error, err);
			callback(errorMsg);
			return;
		}
		if (registerData.length == 1) {
			callback('That username is already taken');
			return;
		}
		if (!user.test(dataUsername)) {
			callback('Your username contains invalid characters or is too long. Your username can only contain letters and numbers (1-15 characters long)');
			return;
		}
		bcrypt.genSalt(10, function (err, salt) {
			bcrypt.hash(dataPassword, salt, null, function (err, hash) {
				if (err) {
					functions.cmdMsg(functions.cmdType.Error, ' ..at hash! ' + hash);
					callback(errorMsg);	
					return;
				}
				saveUser = new functions.userdb({ username: dataUsername, password: hash, role: 'User', ban: false, banReason: '', optSound: true, optMessageId: false });
				saveUser.save(function (err) {
					if (err) {
						functions.cmdMsg(functions.cmdType.Error, err);
						callback(errorMsg);
						return;
					}
					callback('success');
					functions.cmdMsg(functions.cmdType.Normal, 'New user: ' + dataUsername);
				});
			});
		});
	});
}

/**
 * Gets the info from the client and registers the user
 * @param {data}
 * @param {callback}
 * @param {socket}
 * @param {io}
 * @param {admins}
 * @param {users}
 */
exports.login = function (data, callback, socket, io, admins, users, status) {
	var loginUsername = data.username, loginPassword = data.password,
		login,
		regex = new RegExp(['^', loginUsername, '$'].join(''), 'i'); // Case insensitive search
		userCheck = functions.userdb.find({ username: regex });

	userCheck.sort().limit(1).exec(function (err, result) {
		if (err) {
			functions.cmdMsg(functions.cmdType.Error, err);
			callback('An error has occoured, please contact an administrator');
			return;
		}
		if (result.length != 1) {
			callback('You have entered an invalid username and password combo');
			return;
		}
		var dbUsername = result[0].username, dbPassword = result[0].password, dbRole = result[0].role,
			dbBan = result[0].ban, dbbanReason = result[0].banReason, dbOptSound = result[0].optSound;

		bcrypt.compare(loginPassword, dbPassword, function (errormsg, res) {
			if (err) {
				functions.cmdMsg(functions.cmdType.Error, err);
				callback('An error has occoured, please contact an administrator');
				return;
			}
			if (!res) {
				callback('Your password is incorrect');
				return;
			}
			if (dbBan === true) {
				callback('Your account is banned\r\nReason: ' + dbbanReason);
				return;
			}
			if (dbUsername in users) {
				callback('You are already logged in');
				return;
			}
			socket.role = dbRole;
			socket.username = dbUsername;
			users[socket.username] = socket;

			if (dbRole == 'Admin')
				admins[socket.username]++;

			functions.updateNicknames(io, users, admins, status);
			functions.cmdMsg(functions.cmdType.Normal, 'User Joined: ' + socket.username);
			users[socket.username].emit('settings', dbOptSound);
			io.emit('chat message', functions.clientMsg({
				type: functions.msgType.ServerSave,
				msg: dbUsername + ' has joined'
			}));
			callback('success');
		});
	});
}

/**
 * Genereates a random ID for messages
 * @return {string}
 */
exports.guid = function () {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}
	return s4() + s4();
}

/**
 * Inserts text into a string at a set location
 * @param {str}
 * @param {index}
 * @param {value}
 * @return {string}
 */
exports.insert = function (str, index, value) {
	return str.substr(0, index) + value + str.substr(index);
}

/**
 * Adds bold to messages
 * @param {msg}
 * @param {count}
 * @return {string}
 */
exports.bold = function (msg, count) {
	var result = (count % 2 == 0) ? 'even' : 'odd',
		indices = [];

	for (var i = 0; i < msg.length; i++)
		if (msg[i] === '*')
			indices.push(i);

	if (result == 'odd')
		count -= 1;

	var track = (count / 2) - 1;
	for (var i = (count / 2) - 1; i > -1; i--) {
		var ast1 = (indices[(i) + track]),
			ast2 = (indices[(i + 1) + track]);

		// inserting these backwards means less adding/subtracting indices
		msg = functions.insert(msg, ast2, '</b>');
		msg = functions.insert(msg, ast1, '<b>');
		track -= 1;
	}

	if (result == 'even')
		msg = msg.replace(/\*/g, ''); // remove all *
	else
		for (var i = (count / 2) - 1; i > -1; i--)
			msg = msg.replace('*', '').replace('*', ''); // remove all but the one lone *

	return msg;
}

/**
 * Adds italicizing to messages
 * @param {msg}
 * @param {count}
 * @return {string}
 */
exports.italicize = function (msg, count) {
	var result = (count % 2 == 0) ? 'even' : 'odd',
		indices = [];

	for (var i = 0; i < msg.length; i++)
		if (msg[i] === '_')
			indices.push(i);

	if (result == 'odd')
		count -= 1;

	var track = (count / 2) - 1;
	for (var i = (count / 2) - 1; i > -1; i--) {
		var ital1 = (indices[(i) + track]),
			ital2 = (indices[(i + 1) + track]);

		// inserting these backwards means less adding/subtracting indices
		msg = functions.insert(msg, ital2, '</i>');
		msg = functions.insert(msg, ital1, '<i>');
		track -= 1;
	}

	if (result == 'even')
		msg = msg.replace(/\_/g, ''); // remove all _
	else
		for (var i = (count / 2) - 1; i > -1; i--)
			msg = msg.replace('_', '').replace('_', ''); // remove all but the one lone _

	return msg;
}

/**
 * Adds inline code blocks
 * @param {msg}
 * @param {count}
 * @return {string}
 */
exports.code = function (msg, count) {
	var result = (count % 2 == 0) ? 'even' : 'odd',
		indices = [];

	for (var i = 0; i < msg.length; i++)
		if (msg[i] === '`')
			indices.push(i);

	if (result == 'odd')
		count -= 1;

	var track = (count / 2) - 1;
	for (var i = (count / 2) - 1; i > -1; i--) {
		var code1 = (indices[(i) + track]),
			code2 = (indices[(i + 1) + track]);

		// inserting these backwards means less adding/subtracting indices
		msg = functions.insert(msg, code2, '</code>');
		msg = functions.insert(msg, code1, '<code>');
		track -= 1;
	}

	if (result == 'even')
		msg = msg.replace(/\`/g, ''); // remove all `
	else
		for (var i = (count / 2) - 1; i > -1; i--)
			msg = msg.replace('`', '').replace('`', ''); // remove all but the one lone `

	return msg;
}

/**
 * Adds emotes to messages
 * @param {msg}
 * @param {count}
 * @return {string}
 */
exports.emote = function (msg, count) {
	var result = (count % 2 == 0) ? 'even' : 'odd',
		indices = [];

	for (var i = 0; i < msg.length; i++)
		if (msg[i] === ':')
			indices.push(i); // add all the indices to an array

	var names = [];
	for (var i = 0; i < count; i++) {
		var loc1 = indices[i],
			loc2 = indices[i + 1],
			name = msg.substring(loc1 + 1, loc2);

		if (name) // just so we're not adding null entries
			names.push(name);
	}

	for (var i = 0; i < names.length; i++) {
		var regex = new RegExp([':', names[i], ':'].join(''), 'g');

		// we're adding a non-width character "&#8203;" so it doesn't get replaced
		if ((names[i].toLowerCase() in functions.emotes) && msg.indexOf(names[i]) != -1)
			msg = msg.replace(regex, '<img src="' + functions.emotes[names[i]] + '" title=":&#8203;' + names[i] + '&#8203;:" style="display: inline-block; vertical-align: top;" />');
	}

	return msg;
}

/**
 * Handles sending messages (along with muting)
 * @param {msg}
 * @param {socket}
 * @param {io}
 * @param {users}
 */
exports.message = function (msg, socket, io, users) {
	var now = functions.moment(),
		getID = functions.guid(),
		regex = new RegExp(['^', socket.username, '$'].join(''), 'i'),
		userCheck = functions.userdb.find({ username: regex }); // check to make sure the user exists

	userCheck.sort().limit(1).exec(function (err, result) {
		if (err) {
			functions.cmdMsg(functions.cmdType.Error, err);
			return;
		}
		var muteTime;
		try {
			muteTime = functions.moment(result[0].mute, 'YYYY-MM-DD HH:mm');
		} catch (err) {
			muteTime = functions.moment(now, 'YYYY-MM-DD HH:mm');
		}
		if (socket.role != 'Admin' && muteTime > now) {
			users[socket.username].emit('chat message', functions.clientMsg({
				type: functions.msgType.Server,
				msg: 'You are muted - expires <i>' + muteTime.fromNow() + '</i>'
			}));
			return;
		}
		var finalMsg;

		if (socket.role != 'Admin' && msg.indexOf('<') != -1) { // check if the user is trying to use html
			var htmlRemoval = msg.replace(/</g, '&lt;'); // changes the character to show as a <, but will not work with HTML

			if (htmlRemoval.match(/(http?:\/\/.*\.(?:png|jpg|jpeg|gif))/i))
				htmlRemoval = functions.getImg(htmlRemoval);
			else if (htmlRemoval.indexOf('http') >= 0) // check to see if there's a link
				htmlRemoval = functions.getURL(htmlRemoval);

			finalMsg = htmlRemoval;
		} else {
			var urlMsg = msg; // just so you don't get HTML from the link in the console
			
			if (urlMsg.match(/(http?:\/\/.*\.(?:png|jpg|gif))/i))
				urlMsg = functions.getImg(urlMsg);
			else if (urlMsg.indexOf('http') >= 0) // check to see if there's a link
				urlMsg = functions.getURL(urlMsg);

			finalMsg = urlMsg;
		}

		var astNum = (msg.match(/\*/g) || []).length,
			italNum = (msg.match(/\_/g) || []).length,
			codeNum = (msg.match(/\`/g) || []).length,
			emoteNum = (msg.match(/\:/g) || []).length,
			serverType = (socket.role in functions.cmdType ? socket.role : functions.cmdType.User),
			clientType = (socket.role in functions.msgType ? socket.role : functions.msgType.User);

		if (astNum > 1)
			finalMsg = functions.bold(finalMsg, astNum);
		if (italNum > 1)
			finalMsg = functions.italicize(finalMsg, italNum);
		if (codeNum > 1)
			finalMsg = functions.code(finalMsg, codeNum);
		if (emoteNum > 1)
			finalMsg = functions.emote(finalMsg, emoteNum);

		functions.cmdMsg(serverType, socket.username + ': ' + msg);
		io.emit('chat message', functions.clientMsg({
			user: socket.username,
			type: clientType,
			raw: msg,
			msg: finalMsg
		}));
	});
}

/**
 * Handles message editing
 * @param {msg}
 * @param {socket}
 * @param {admins}
 * @param {rawMsg}
 */
exports.editMessage = function (msg, socket, admins, oldMsg) {
	if (socket.role != 'Admin' && msg.indexOf('<') == -1) { // check if the user is trying to use html
		var htmlRemoval = msg.replace(/</g, '&lt;'); // changes the character to show as a <, but will not work with HTML

		if (htmlRemoval.indexOf('http') >= 0) // check to see if there's a link
			htmlRemoval = functions.getURL(htmlRemoval);

		return { id: oldMsg.txtID, time: oldMsg.date, user: oldMsg.username, message: htmlRemoval, type: oldMsg.msg[0].type };
	} else {
		var noHTML = msg;

		if (noHTML.indexOf('http') >= 0) // check to see if there's a link
			noHTML = functions.getURL(noHTML);

		return { id: oldMsg.txtID, time: oldMsg.date, user: oldMsg.username, message: noHTML, type: oldMsg.msg[0].type };
	}
}

/**
 * Shows images (needs resizing and a few other things)
 * @param {text}
 * @return {string}
 */
exports.getImg = function (text) {
	var link = /(http?:\/\/.*\.(?:png|jpg|gif))/i;
	return text.replace(link, '<br><a href="$1" target="_blank"><img src="$1" class="img"></a>');
}

/**
 * Makes links clickable
 * @param {text}
 * @return {string}
 */
exports.getURL = function (text) {
	var link = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
	return text.replace(link, '<a href="$1" target="_blank">$1</a>');
}

/**
 * Creates a client message
 * @param {data}
 */
exports.clientMsg = function (data) {
	var getID = functions.guid(),
		getTime = functions.moment(),
		getUser = (data.user ? data.user : '[Server]'),
		raw = (data.raw ? data.raw : data.msg),
		msg = { id: getID, time: getTime, user: getUser, message: data.msg },
		rawMessage = { id: getID, time: getTime, user: getUser, message: raw };

	switch (data.type) {
		case functions.msgType.Server:
		case functions.msgType.ServerSave: 
			msg.type = 'Server';
			break;

		case functions.msgType.UserLeave: msg.type = 'ServerSave';	break;
		case functions.msgType.ServerLeave: msg.type = 'ServerLeave'; break;
		case functions.msgType.Admin: msg.type = 'Admin'; break;
		case functions.msgType.Whiser: msg.type = 'Whisper';
		default: msg.type = 'User'; break;
	}

	if (data.type != functions.msgType.Server) {
		functions.saveMsg = new functions.chat({ txtID: getID, msg: msg, rawMsg: rawMessage, username: getUser, deleted: false });
		functions.saveMsg.save(function (err) { if (err) if (err) functions.cmdMsg(functions.cmdType.Error, err); });
	}

	return msg;
}

/**
 * Logs a CMD message
 * @param {type}
 * @return {text}
 */
exports.cmdMsg = function (type, text) {
	var now = functions.moment().format('LT'),
		message;

	switch (type) {
		case functions.cmdType.Normal:
			message = now + ' [Server] '.white.bold + text;
			break;

		case functions.cmdType.Error:
			message = now + ' [Error] '.red.bold + text;
			break;

		case functions.cmdType.User:
			message = now + ' [User] '.gray.bold + text;
			break;

		case functions.cmdType.Admin:
			message = now + ' [Admin] '.blue.bold + text;
			break;

		default:
			message = text;
			break;
	}

	console.log(message);
}

/**
 * Returns the user's status
 * @param {data}
 * @return {txt}
 */
exports.getStatus = function (data) {
	var txt = '';

	switch (data.status) {
		case 'afk':
			if (data.msg != '')
				txt = ' <font size="2"><i>afk (' + data.msg + ')</i></font><br/>';
			else
				txt = ' <font size="2"><i>afk</i></font><br/>';
			break;

		case 'idle':
			txt = ' <font size="2"><i>idle</i></font><br/>';
			break;

		case 'typing':
			txt = ' <font size="2"><i>typing...</i></font><br/>'
			break;
	}

	return txt;
}

/**
 * Updates the userlist
 * @param {io}
 * @param {users}
 * @param {admins}
 */
exports.updateNicknames = function (io, users, admins, status) {
	var uNames = [],
		aNames = [],
		allUsers = [],
		usersToArray = Object.keys(users),
		adminsToArray = Object.keys(admins);

	for (var i = 0; i < usersToArray.length; i++) {
		if (adminsToArray.indexOf(usersToArray[i]) == -1) {
			if (usersToArray[i] in status)
				uNames.push('<b>' + usersToArray[i] + '</b>' + functions.getStatus(status[usersToArray[i]]));
			else
				uNames.push('<b>' + usersToArray[i] + '</b><br/>');
		} else {
			if (usersToArray[i] in status)
				aNames.push('<b><font color="#2471FF">' + usersToArray[i] + '</font></b>' + functions.getStatus(status[usersToArray[i]]));
			else
				aNames.push('<b><font color="#2471FF">' + usersToArray[i] + '</font></b><br/>');
		}
	}

	aNames.sort();
	uNames.sort();
	allUsers = aNames.concat(uNames);
	io.emit('usernames', allUsers);
}

/**
 * Loads all the emotes in /images/emotes/
 * @param {dir}
 * @return {results}
 */
exports.getEmotes = function(dir) {
	var filesystem = require('fs');
	var results = {};

	filesystem.readdirSync(dir).forEach(function(file) {
		dir = dir.replace(/\\/g, '/');
		var stat = filesystem.statSync(dir + file),
			loc = file.indexOf('.');

		if (stat && stat.isDirectory())
			results = results.concat(_getAllFilesFromFolder(file))
		else
			results[file.substring(loc, 0).toLowerCase()] = (dir.slice(dir.indexOf('chat') + 4, dir.length) + file);
	});

	return results;
}

exports.emotes = functions.getEmotes(__dirname + '/images/emotes/');