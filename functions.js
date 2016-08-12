/**
 * @fileoverview Handles main functions
 * @author xCryptic (Github)
 */

var functions = require('./functions.js'),
	bcrypt = require('bcrypt-nodejs'),
	colors = require('colors');

exports.saveMsg;
exports.serverMsg = '<font color="#5E97FF"><b>[Server]</b> ';
exports.mongoose = require('mongoose');
exports.moment = require('moment');
exports.cmdType = {Error: 'Error', Normal: 'Normal', User: 'User', Admin: 'Admin'};

var schema = functions.mongoose.Schema({ msg: Array, txtID: String, rawMsg: Array, deleted: Boolean, username: String, date: { type: Date, default: Date.now } }),
	userschema = functions.mongoose.Schema({ username: String, password: String, isAdmin: Boolean, mute: String, ban: Boolean, banReason: String, optSound: Boolean });

exports.chat = functions.mongoose.model('message', schema);
exports.userdb = functions.mongoose.model('userdb', userschema);

/**
 * Gets the info from the client and registers the user
 * @param {registerData}
 * @param {callback}
 */
exports.register = function (registerData, callback) {
	var dataUsername = registerData.username, dataPassword = registerData.password,
		saveUser,
		user = /^[\w]{1,15}$/,
		userCheck = functions.userdb.find({ username: dataUsername }); // check to make sure the username doesn't already exist

	userCheck.sort().limit(1).exec(function (err, registerData) {
		if (err) {
			functions.cmdMsg(functions.cmdType.Error, err);
			callback('An error has occoured, please contact an administrator');
		} else {
			if (registerData.length == 1) {
				callback('That username is already taken');
			} else if (!user.test(dataUsername)) {
				callback('Your username contains invalid characters or is too long. Your username can only contain letters and numbers (1-15 characters long)');
			} else {
				bcrypt.genSalt(10, function (err, salt) {
					bcrypt.hash(dataPassword, salt, null, function (errormsg, hash) {
						/*if (error) { // it seems to always return 'undefined', even though the hash was created successfully
							functions.cmdMsg(functions.cmdType.Error, ' ..at hash! ' + hash);
							callback('An error has occoured, please contact an administrator');	
						} else {*/
							saveUser = new functions.userdb({ username: dataUsername, password: hash, isAdmin: false, ban: false, banReason: '', optSound: true, optMessageId: false });
							saveUser.save(function (err) {
								if (err) {
									functions.cmdMsg(functions.cmdType.Error, err);
									callback('An Error has occoured, please contact an administrator');
								} else {
									callback('success');
									functions.cmdMsg(functions.cmdType.Server, 'New user: ' + dataUsername);
								}
							});
					//	}
					});
				});
			}
		}
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
		} else {
			if (result.length == 1) {
				var dbUsername = result[0].username, dbPassword = result[0].password, dbisAdmin = result[0].isAdmin, dbBan = result[0].ban, dbbanReason = result[0].banReason,
					dbOptSound = result[0].optSound;

				bcrypt.compare(loginPassword, dbPassword, function (errormsg, res) {
					if (err) {
						functions.cmdMsg(functions.cmdType.Error, err);
						callback('An error has occoured, please contact an administrator');
					} else {
						if (res) {
							if (dbBan === true) {
								callback('Your account is banned\r\nReason: ' + dbbanReason);
							} else if (dbUsername in users) {
								callback('You are already logged in');
							} else {
								var now = functions.moment(),
									getID = functions.guid(),
									message = { id: getID, time: now, user: functions.serverMsg, message: dbUsername + ' has joined' };

								socket.username = dbUsername;
								users[socket.username] = socket;

								if (dbisAdmin === true)
									admins[socket.username]++;

								functions.updateNicknames(io, users, admins, status);
								functions.cmdMsg(functions.cmdType.Normal, 'User Joined: ' + socket.username);
								users[socket.username].emit('settings', dbOptSound);
								io.emit('chat message', message);
								functions.saveMsg = new functions.chat({ txtID: getID, msg: message, username: '[Server]', deleted: false });
								functions.saveMsg.save(function (errormsg) { if (err) functions.cmdMsg(functions.cmdType.Error, err); });
								callback('success');
							}
						} else {
							callback('Your password is incorrect');
						}
					}
				});
			} else {
				callback('You have entered an invalid username and password combo');
			}
		}
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

	if (result == 'even') {
		msg = msg.replace(/\*/g, ''); // remove all *
	} else {
		for (var i = (count / 2) - 1; i > -1; i--)
			msg = msg.replace('*', '').replace('*', ''); // remove all but the one lone *
	}

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

	if (result == 'even') {
		msg = msg.replace(/\_/g, ''); // remove all _
	} else {
		for (var i = (count / 2) - 1; i > -1; i--)
			msg = msg.replace('_', '').replace('_', ''); // remove all but the one lone _
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
		message = {},
		rawMessage = {},
		regex = new RegExp(['^', socket.username, '$'].join(''), 'i'),
		userCheck = functions.userdb.find({ username: regex }); // check to make sure the user exists

	userCheck.sort().limit(1).exec(function (err, result) {
		if (err) {
			functions.cmdMsg(functions.cmdType.Error, err);
		} else {
			var muteTime;
			try {
				muteTime = functions.moment(result[0].mute, 'YYYY-MM-DD HH:mm');
			} catch (err) {
				muteTime = functions.moment(now, 'YYYY-MM-DD HH:mm');
			}
			if (muteTime > now) {
				users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'You are muted - expires ' + muteTime.fromNow() });
			} else {
				var userName = '<b>' + socket.username + '</b>: ',
					finalMsg;

				if (msg.indexOf('<') == -1) { // check if the user is trying to use html
					var urlMsg = msg; // just so you don't get HTML from the link in the console
					
					if (urlMsg.indexOf('http') >= 0) // check to see if there's a link
						urlMsg = functions.getURL(noHTML);

					finalMsg = urlMsg;
				} else {
					var htmlRemoval = msg.replace(/</g, '&lt;'); // changes the character to show as a <, but will not work with HTML

					if (htmlRemoval.indexOf('http') >= 0) // check to see if there's a link
						htmlRemoval = functions.getURL(htmlRemoval);

					finalMsg = htmlRemoval;
				}

				var astNum = (msg.match(/\*/g) || []).length,
					italNum = (msg.match(/\_/g) || []).length;

				if (astNum > 1)
					finalMsg = functions.bold(finalMsg, astNum);
				if (italNum > 1)
					finalMsg = functions.italicize(finalMsg, italNum);

				rawMessage = { id: getID, time: now, user: userName, message: msg };
				message = { id: getID, time: now, user: userName, message: finalMsg };
				functions.saveMsg = new functions.chat({ txtID: getID, msg: message, rawMsg: rawMessage, username: socket.username, deleted: false });
				functions.saveMsg.save(function (err) { if (err) functions.cmdMsg(functions.cmdType.Error, err); });
				functions.cmdMsg(functions.cmdType.User, socket.username + ': ' + msg);
				io.emit('chat message', message);
			}
		}
	});
}

/**
 * Handles sending admin's messages
 * @param {msg}
 * @param {socket}
 * @param {io}
 */
exports.adminMessage = function (msg, socket, io) {
	var now = functions.moment(),
		getID = functions.guid(),
		linkMsg = msg; // just so you don't get HTML from the link in the console

	if (linkMsg.indexOf('http') >= 0)// check to see if there's a link
		linkMsg = functions.getURL(linkMsg);

	var astNum = (linkMsg.match(/\*/g) || []).length,
		italNum = (linkMsg.match(/\_/g) || []).length;

	if (astNum > 1)
		linkMsg = functions.bold(linkMsg, astNum);
	if (italNum > 1)
		linkMsg = functions.italicize(linkMsg, italNum);

	var userName = '<b><font color="#2471FF">[Admin] ' + socket.username + '</font></b>: ',
		message = { id: getID, time: now, user: userName, message: linkMsg },
		rawMessage = { id: getID, time: now, user: userName, message: msg };

	io.emit('chat message', message);
	functions.cmdMsg(functions.cmdType.Admin, socket.username + ': ' + msg);
	functions.saveMsg = new functions.chat({ txtID: getID, msg: message, rawMsg: rawMessage, username: socket.username, deleted: false });
	functions.saveMsg.save(function (err) { if (err) functions.cmdMsg(functions.cmdType.Error, err); });
}

/**
 * Handles message editing
 * @param {msg}
 * @param {socket}
 * @param {admins}
 * @param {rawMsg}
 */
exports.editMessage = function (msg, socket, admins, rawMsg) {
	if (socket.username in admins) {
		var linkMsg = msg; // just so you don't get HTML from the link in the console

		if (linkMsg.indexOf('http') >= 0) // check to see if there's a link
			linkMsg = functions.getURL(linkMsg);

		return { id: rawMsg.id, time: rawMsg.time, user: rawMsg.user, message: linkMsg };
	} else {
		if (msg.indexOf('<') == -1) { // check if the user is trying to use html
			var noHTML = msg; // just so you don't get HTML from the link in the console
			if (noHTML.indexOf('http') >= 0) // check to see if there's a link
				noHTML = functions.getURL(noHTML);

			return { id: rawMsg.id, time: rawMsg.time, user: rawMsg.user, message: noHTML };
		} else {
			var htmlRemoval = msg.replace(/</g, '&lt;'); // changes the character to show as a <, but will not work with HTML

			if (htmlRemoval.indexOf('http') >= 0) // check to see if there's a link
				htmlRemoval = functions.getURL(htmlRemoval);

			return { id: rawMsg.id, time: rawMsg.time, user: rawMsg.user, message: htmlRemoval };
		}
	}
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
	io.sockets.emit('usernames', allUsers);
}