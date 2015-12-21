/**
 * @fileoverview Handles main functions
 * @author xCryptic (Github)
 */

var mongoose = require('mongoose'),
	bcrypt = require('bcrypt-nodejs'),
	functions = require('./functions.js'),
	moment = require('moment'),
	serverMsg = '<font color="#5E97FF"><b>[Server]</b> ',
	cmdServerMsg = ' [Server] '.white.bold,
	cmdErrorMsg = ' [Error] '.red.bold,
	userdb = mongoose.model('userdb', userschema),
	chat = mongoose.model('message', schema),
	schema = mongoose.Schema({
	msg: Array,
	txtID: String,
	rawMsg: Array,
	deleted: Boolean,
	username: String,
	date: { type: Date, default: Date.now }
}),
	userschema = mongoose.Schema({
	username: String,
	password: String,
	isAdmin: Boolean,
	mute: String,
	ban: Boolean,
	banReason: String,
	optSound: Boolean
});

/**
 * Gets the info from the client and registers the user
 * @param {registerData}
 * @param {callback}
 */
exports.register = function (registerData, callback) {
	var dataUsername = registerData.username, dataPassword = registerData.password,
		saveUser,
		user = /^[\w]{1,15}$/,
	userCheck = userdb.find({ username: dataUsername }); // check to make sure the username doesn't already exist
	userCheck.sort().limit(1).exec(function(errormsg, registerData) {
		if (errormsg) { 
			console.log(moment().format('LT') + cmdErrorMsg + errormsg);
			callback('An error has occoured, please contact an administrator');
		} else {
			if (registerData.length == 1) {
				callback('That username is already taken');
			} else if (!user.test(dataUsername)) {
				callback('Your username contains invalid characters or is too long. Your username can only contain letters and numbers (1-15 characters long)');
			} else {
				bcrypt.genSalt(10, function(err, salt) {
					bcrypt.hash(dataPassword, salt, null, function(errormsg, hash) {
						/*if (error) { // it seems to always return 'undefined', even though the hash was created successfully
							console.log(cmdErrorMsg + errormsg + ' ..at hash! ' + hash);
							callback('An error has occoured, please contact an administrator');	
						} else {*/
							saveUser = new userdb ({ username: dataUsername, password: hash, isAdmin: false, ban: false, banReason: '', optSound: true, optMessageId: false });
							saveUser.save(function (errormsg) {
								if (errormsg) {
									console.log(moment().format('LT') + cmdErrorMsg + errormsg);
									callback('An Error has occoured, please contact an administrator');
								} else {
									callback('success');
									console.log(moment().format('LT') + cmdServerMsg + 'New user: ' + dataUsername);
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
exports.login = function (data, callback, socket, io, admins, users) {
	var loginUsername = data.username, loginPassword = data.password,
		login,
		regex = new RegExp(['^', loginUsername, '$'].join(''), 'i'); // Case insensitive search
		userCheck = userdb.find({ username: regex });
	userCheck.sort().limit(1).exec(function(errormsg, result) {
		if (errormsg) { 
			console.log(moment().format('LT') + cmdErrorMsg + errormsg);
			callback('An error has occoured, please contact an administrator');
		} else {
			if (result.length == 1) {
				var dbUsername = result[0].username, dbPassword = result[0].password, dbisAdmin = result[0].isAdmin, dbBan = result[0].ban, dbbanReason = result[0].banReason,
					dbOptSound = result[0].optSound;
				bcrypt.compare(loginPassword, dbPassword, function(errormsg, res) {
					if (errormsg) {
						console.log(moment().format('LT') + cmdErrorMsg + errormsg);
						callback('An error has occoured, please contact an administrator');
					} else {
						if (res) {
							if (dbBan === true) {
								callback('Your account is banned\r\nReason: ' + dbbanReason);
							} else if (dbUsername in users) {
								callback('You are already logged in');
							} else {
								var now = moment(),
									time = now.format('LT'),
									fulldate = now.format('LLLL'),
									getID = functions.guid(),
									idSpan = '<span id="' + getID + '">',
									message = { id: getID, idSpan: idSpan, time: now, user: serverMsg, message: dbUsername + ' has joined' };
								socket.username = dbUsername;
								users[socket.username] = socket;
								if (dbisAdmin === true) {
									admins[socket.username]++;
								}
								functions.updateNicknames(io, users, admins);
								console.log(time + cmdServerMsg + 'User Joined: ' + socket.username);
								users[socket.username].emit('settings', dbOptSound);
								io.emit('chat message', message);
								saveMsg = new chat({ txtID: getID, msg: message, username: '[Server]' });
								saveMsg.save(function (errormsg) { if (errormsg) console.log(time + cmdErrorMsg + errormsg);	});
								callback('success');
							}
						} else {
							callback('Your password is incorrect');
						}
					}
				});
			} else {
				callback('That username does not exist in our database');
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
 * Handles sending messages (along with muting)
 * @param {msg}
 * @param {socket}
 * @param {io}
 * @param {users}
 */
exports.message = function (msg, socket, io, users) {
	var now = moment(),
		time = now.format('LT'),
		getID = functions.guid(),
		idSpan = '<span id="' + getID + '">',
		regex = new RegExp(['^', socket.username, '$'].join(''), 'i'),
		userCheck = userdb.find({ username: regex }); // check to make sure the user exists
	userCheck.sort().limit(1).exec(function(errormsg, result) {
		if (errormsg) {
			console.log(time + cmdErrorMsg + errormsg);
		} else {
			try {
				var muteTime = moment(result[0].mute, 'YYYY-MM-DD HH:mm');
			} catch (err) {
				var muteTime = moment(now, 'YYYY-MM-DD HH:mm');
			}
			if (muteTime > now) {
				users[socket.username].emit('chat message', { id: getID, idSpan: idSpan, time: now, user: serverMsg, message: 'You are muted - expires ' + muteTime.fromNow() })
			} else {
				if (msg.indexOf('<') == -1) { // check if the user is trying to use html
					var noHTML = msg; // just so you don't get HTML from the link in the console
					if (noHTML.indexOf('http') >= 0) { // check to see if there's a link
						noHTML = functions.getURL(noHTML);
					}
					var userName = '<b>' + socket.username + '</b>: ',
						message = { id: getID, idSpan: idSpan, time: now, user: userName, message: noHTML },
						rawMessage = { id: getID, idSpan: idSpan, time: now, user: userName, message: msg };
					io.emit('chat message', message);
					console.log(time + (' [User] ').gray.bold + socket.username + ': ' + msg);
					saveMsg = new chat({ txtID: getID, msg: message, rawMsg: rawMessage, username: socket.username, deleted: false });
				} else {
					var htmlRemoval = msg.replace(/</g, '&lt;'); // changes the character to show as a <, but will not work with HTML
					if (htmlRemoval.indexOf('http') >= 0) { // check to see if there's a link
						htmlRemoval = functions.getURL(htmlRemoval);
					}
					var userName = '<b>' + socket.username + '</b>: ',
						message = { id: getID, idSpan: idSpan, time: now, user: userName, message: htmlRemoval },
						rawMessage = { id: getID, idSpan: idSpan, time: now, user: userName, message: msg };

					io.emit('chat message', message);
					console.log(time + (' [User] ').gray.bold + socket.username + ': ' + msg);
					saveMsg = new chat({ txtID: getID, msg: message, rawMsg: rawMessage, username: socket.username, deleted: false });
				}
				saveMsg.save(function (errormsg) { if (errormsg) console.log(time + cmdErrorMsg + errormsg); });
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
	var now = moment(),
		time = now.format('LT'),
		getID = functions.guid(),
		idSpan = '<span id="' + getID + '">',
		linkMsg = msg; // just so you don't get HTML from the link in the console
	if (linkMsg.indexOf('http') >= 0) { // check to see if there's a link
		linkMsg = functions.getURL(linkMsg);
	}
	var userName = '<b><font color="#2471FF">[Admin] ' + socket.username + '</font></b>: ',
		message = { id: getID, idSpan: idSpan, time: now, user: userName, message: linkMsg },
		rawMessage = { id: getID, idSpan: idSpan, time: now, user: userName, message: msg };
	io.emit('chat message', message);
	console.log(time + (' [Admin] ').blue.bold + socket.username + ': ' + msg);
	saveMsg = new chat({ txtID: getID, msg: message, rawMsg: rawMessage, username: socket.username, deleted: false });
	saveMsg.save(function (errormsg) { if (errormsg) console.log(time + cmdErrorMsg + errormsg); });
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
		if (linkMsg.indexOf('http') >= 0) { // check to see if there's a link
			linkMsg = functions.getURL(linkMsg);
		}
		return { id: rawMsg.id, idSpan: rawMsg.idSpan, time: rawMsg.time, user: rawMsg.user, message: linkMsg };
	} else {
		if (msg.indexOf('<') == -1) { // check if the user is trying to use html
			var noHTML = msg; // just so you don't get HTML from the link in the console
			if (noHTML.indexOf('http') >= 0) { // check to see if there's a link
				noHTML = functions.getURL(noHTML);
			}
			return { id: rawMsg.id, idSpan: rawMsg.idSpan, time: rawMsg.time, user: rawMsg.user, message: noHTML };
		} else {
			var htmlRemoval = msg.replace(/</g, '&lt;'); // changes the character to show as a <, but will not work with HTML
			if (htmlRemoval.indexOf('http') >= 0) { // check to see if there's a link
				htmlRemoval = functions.getURL(htmlRemoval);
			}
			return { id: rawMsg.id, idSpan: rawMsg.idSpan, time: rawMsg.time, user: rawMsg.user, message: htmlRemoval };
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

/**
 * Updates the userlist
 * @param {io}
 * @param {users}
 */
exports.updateNicknames = function (io, users, admins) {
	var usernamesArray = [],
		userArray = Object.keys(users);
	for (user in userArray) {
		if (userArray[user] in admins) {
			usernamesArray[user] = '<b><font color="#2471FF">' + userArray[user] + '</font></b><br/>';
		} else {
			usernamesArray[user] = userArray[user] + '<br/>'
		}
	}
	io.sockets.emit('usernames', usernamesArray);
}