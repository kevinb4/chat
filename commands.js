/**
 * @fileoverview Handles all commands used in
 * 	the chat and server
 * @author xCryptic (Github)
 */

var functions = require('./functions.js'),
	mongoose = require('mongoose'),
	moment = require('moment'),
	chat = mongoose.model('message', schema),
	userdb = mongoose.model('userdb', userschema),
	serverMsg = '<font color="#5E97FF"><b>[Server]</b> ',
	cmdServerMsg = ' [Server] '.white.bold,
	cmdErrorMsg = ' [Error] '.red.bold,
	saveMsg,
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

module.exports = {

	/**
	 * Sends a list of commands to the user
	 * @param {socket}
	 * @param {admins}
	 * @param {users}
	 */
	commands: function (socket, admins, users) {
		var now = moment(),
			time = now.format('LT'),
			fulldate = now.format('LLLL'),
			getID = functions.guid();

		users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: '..:: Chat Project commands ::..' });
		users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: '/commands - shows a list of commands (you are here!)' });
		users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: '/w username message - sends a whisper/pm to the selected user' });
		if (socket.username in admins) {
			users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: '..:: Admin Commands ::..' });
			users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: '<i>/broadcast</i> or <i>/bc</i> message - sends a message as the Server' });
			users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: '/kick username - kicks the user from the chat' });
			users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: '/mute username time - mutes a user for a set time (format: 1d2h3m)' });
			users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: '/ban username reason - bans the user with a set reson [reason is required]' });
			users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: '/unban username - unbans the user' });
		}
	},

	/**
	 * Sends a private message to the specified user
	 * @param {msg}
	 * @param {socket}
	 * @param {users}
	 */
	whisper: function (msg, socket, users) {
		msg = msg.substr(3); // remove the '/w '
		var now = moment(),
			time = now.format('LT'),
			fulldate = now.format('LLLL'),
			getID = functions.guid(),
			errormsg = { id: getID, time: now, user: serverMsg, message: 'Please make sure you entered a valid username and a valid message' },
			index = msg.indexOf(' '); // Find the space, where the message starts

		if (index != -1) { // Checks to see if the space exists
			var name = msg.substring(0, index), // Set the name
				message = msg.substring(index + 1); // Set the message
			if (name in users) { // Make sure the user exists
				userName = '<font color="gray"><b>[Whisper]</b> ' + socket.username + ': ';
				users[name].emit('chat message', { id: getID, time: now, user: userName, message: message });
				users[socket.username].emit('chat message', { id: getID, time: now, user: userName, message: message });
			} else {
				users[socket.username].emit('chat message', errormsg);
			}
		} else {
			users[socket.username].emit('chat message', errormsg);
		}
	},

	/**
	 * Sends a message as the server
	 * @param {command}
	 * @param {socket}
	 * @param {io}
	 */
	adminBroadcast: function (command, socket, io) {
		var now = moment(),
			time = now.format('LT'),
			fulldate = now.format('LLLL'),
			getID = functions.guid();

		if (command.substr(0, 11) === '/broadcast ') {
			command = command.substr(11);
		} else {
			command = command.substr(4);
		}

		var msg = { id: getID, time: now, user: serverMsg, message: command }
		console.log(time + cmdServerMsg + ('[Admin] ').blue.bold + ' ' + socket.username + ': ' + msg.message);
		io.emit('chat message', msg);
		saveMsg = new chat({ txtID: getID, msg: msg, username: '[Server]' });
		saveMsg.save(function (errormsg) { if (errormsg) console.log(time + cmdErrorMsg + errormsg); });
	},

	/**
	 * Kicks a user from the chat
	 * @param {command}
	 * @param {socket}
	 * @param {io}
	 * @param {users}
	 */
	adminKick: function (command, socket, io, users) {
		var now = moment(),
			time = now.format('LT'),
			fulldate = now.format('LLLL'),
			getID = functions.guid();

		target = command.substr(6);
		var msg = { id: getID, time: now, user: serverMsg, message: 'User <b>' + target + '</b> has been kicked from the chat by <b>' + socket.username + '</b>' }

		if (target in users) { // Checks to make sure the user is online
			console.log(time + cmdServerMsg + 'User "' + target + '" has been kicked by "' + socket.username + '"');
			io.emit('chat message', msg);
			saveMsg = new chat({ txtID: getID, msg: msg, username: '[Server]' });
			saveMsg.save(function (errormsg) { if (errormsg) console.log(time + cmdErrorMsg + errormsg); });
			users[target].disconnect();
		} else {
			users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: 'User <b>' + target + '</b> does not exist' });
		}
	},

	/**
	 * Bans a user (with a reason)
	 * @param {command}
	 * @param {socket}
	 * @param {io}
	 * @param {users}
	 */
	adminBan: function (command, socket, io, users) {
		var now = moment(),
			time = now.format('LT'),
			fulldate = now.format('LLLL'),
			getID = functions.guid();

		command = command.substr(5);
		var index = command.indexOf(' '); // Find the space, where the message starts
		if (index != -1) { // Checks to see if the space exists
			var name = command.substring(0, index), // Set the name
				reason = command.substring(index + 1), // Set the reason
				regex = new RegExp(['^', name, '$'].join(''), 'i'), // Case insensitive search
				userCheck = userdb.find({ username: regex }); // Check to make sure the user exists
			userCheck.sort().limit(1).exec(function(errormsg, result) {
				if (errormsg) {
					console.log(time + cmdErrorMsg + errormsg);
				} else {
					if (result.length == 1) { // If a match is found...
						if (result[0].ban === true) {
							users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: '<b>' + name + ' is already banned' });
						} else {
							userdb.update({ username: name }, { ban: true, banReason: reason }, function(err, raw) { if (err) return console.log(err)});
							if (name in users)
								users[name].disconnect();
							var msg = { id: getID, time: now, user: serverMsg, message: 'User <b>' + name + '</b> has been banned by <b>' + socket.username + '</b> for <i>' + reason + '</i>' }
							console.log(time + cmdServerMsg + '"' + name + '" has been banned by "' + socket.username + '" for "' + reason + '"');
							io.emit('chat message', msg);
							saveMsg = new chat({ txtID: getID, msg: msg , username: '[Server]' });
						}
					} else {
						users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: 'User <b>' + name + '</b> was not found' });
					}
				}
			});
		} else {
			users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: 'The command was entered incorrectly - ban name reason' });
		}
	},

	/**
	 * Unbans a user
	 * @param {command}
	 * @param {socket}
	 * @param {users}
	 */
	adminUnban: function (command, socket, users) {
		var now = moment(),
			time = now.format('LT'),
			fulldate = now.format('LLLL'),
			getID = functions.guid(),
			name = command.substr(7),
			regex = new RegExp(['^', name, '$'].join(''), 'i'), // Case insensitive search
			userCheck = userdb.find({ username: regex });

		userCheck.sort().limit(1).exec(function(errormsg, result) {
			if (errormsg) {
				console.log(time + cmdErrorMsg + errormsg);
			} else {
				if (result.length == 1) {
					if (result[0].ban === false) {
						users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: '<b>' + name + '</b> is not banned' });
					} else {
						userdb.update({ username: name }, { ban: false, banReason: '' }, function(err, raw) { if (err) return console.log(err)});
						console.log(time + cmdServerMsg + '"' + name + '" has been unbanned by "' + socket.username + '"');
						users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: 'You have unbanned <b>' + name + '</b>' });
					}
				} else {
					users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: 'User <b>' + name + '</b> was not found' });
				}
			}
		});
	},

	/**
	 * Deletes a specified message
	 * @param {messageID}
	 * @param {socket}
	 * @param {io}
	 * @param {users}
	 */
	adminDelete: function (messageID, socket, io, users) {
		var now = moment(),
			time = now.format('LT'),
			fulldate = now.format('LLLL'),
			getID = functions.guid();

		messageID = messageID.substring(8);
		var query = chat.find({ txtID: messageID });

		query.sort().limit(1).exec(function(errormsg, msg) { // Make sure the message exists
			if (errormsg) console.log(time + cmdErrorMsg + errormsg);
			if (msg.length == 1) {
				chat.collection.remove( { txtID: messageID }, 1 ); // Find the ID and delete the entry
				io.emit('delete message', messageID);

				try {
					var delMsg = msg[0].rawMsg[0].message
				} catch (err) {
					var delMsg = msg[0].msg[0].message
				}

				console.log(time + cmdServerMsg + '"' + socket.username + '" has deleted message "' + delMsg + '" made by "' + msg[0].username + '"');
			} else {
				users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: 'Message ID <b>' + messageID + '</b> was not found in the database (perhaps you\'re trying to delete a non-saved message?)' });
			}
		});
	},

	/**
	 * Mutes a user for a set time
	 * 	(needs cleaning/simplifing)
	 * @param {command}
	 * @param {socket}
	 * @param {users}
	 */
	adminMute: function (command, socket, users) {
		var now = moment(),
			modTime = moment(),
			time = now.format('LT'),
			fulldate = now.format('LLLL'),
			getID = functions.guid(),
			command = command.split(' '),
			name = command[1],
			muteLength = command[2],
			days,
			hours,
			minutes,
			regex = new RegExp(['^', name, '$'].join(''), 'i'), // case insensitive search
			userCheck = userdb.find({ username: regex });

		if (muteLength == undefined) { // check if the user entered a valid time
			var muteLength = 0; // have it set to 0 so that we don't get a undefind var
		}

		if (muteLength.length >= 2) {
			userCheck.sort().limit(1).exec(function(errormsg, result) {
				if (errormsg) {
					console.log(time + cmdErrorMsg + errormsg);
				} else {
					if (result.length == 1) {
						for(var i = 0; i < muteLength.length; i++) {
							if (muteLength[i] === 'd') {
								days = i;
								if (days != 0) {
									days = muteLength.substr(0, days);
								}
								muteLength = muteLength.substr(i + 1);
								i = muteLength.length; // just in case there's more than 1 d
							}
						}
						for(var i = 0; i < muteLength.length; i++) {
							if (muteLength[i] === 'h') {
								hours = i;
								if (hours != 0) {
									hours = muteLength.substr(0, hours);
								}
								muteLength = muteLength.substr(i + 1);
								i = muteLength.length; // just in case there's more than 1 h
							}
						}
						for(var i = 0; i < muteLength.length; i++) {
							if (muteLength[i] === 'm') {
								minutes = i;
								if (minutes != 0) {
									minutes = muteLength.substr(0, minutes);
								}
								muteLength = muteLength.substr(i + 1);
								i = muteLength.length; // just in case there's more than 1 m
							}
						}
						if (days != 0) {
							modTime.add(days, 'd');
						}
						if (hours != 0) {
							modTime.add(hours, 'h');
						}
						if (minutes != 0) {
							modTime.add(minutes, 'm');
						}
						if (modTime == now) {
							users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: 'The command was not entered correctly, you must enter the time in order (days -> hours -> minutes)' });
						} else {
							userdb.update({ username: name }, { $set: { mute: modTime.format('YYYY-MM-DD HH:mm') }}, function(err, raw) { 
								if (err) { // make sure the db was updated successfully
									console.log(time + cmdErrorMsg + err)
									users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: 'There has been an error saving to the database - error description: <i>' + err + '</i>' });
								} else {
									console.log(time + cmdServerMsg + '"' + name + '" has been muted by "' + socket.username + '" - expires ' + modTime.fromNow());
									users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: '<b>' + name + '</b> has been muted - expires <i>' + modTime.fromNow() + '</i>' });
									if (name in users)
										users[name].emit('chat message', { id: getID, time: now, user: serverMsg, message: 'You have been muted by <b>' + socket.username + '</b> - expires <i>' + modTime.fromNow() + '</i>' });
								}
							});
						}
					} else {
						users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: 'User <b>' + name + '</b> was not found' });
					}
				}
			});
		} else {
			users[socket.username].emit('chat message', { id: getID, time: now, user: serverMsg, message: 'The command was not entered correctly - /mute user time (format: 2d3h4m)' });
		}
	},

	/**
	 * [CMD] Kicks a user
	 * @param {input}
	 * @param {io}
	 * @param {users}
	 */
	cmdKick: function (input, io, users) {
		var now = moment(),
			time = now.format('LT'),
			fulldate = now.format('LLLL'),
			getID = functions.guid();

		if (input in users) {
			console.log(time + cmdServerMsg + 'User "' + input + '" has been kicked');
			var msg = { id: getID, time: now, user: serverMsg, message: 'User <b>' + input + '</b> has been kicked from the chat' };
			io.emit('chat message', msg);
			saveMsg = new chat({ txtID: getID, msg: msg , username: '[Server]' });
			users[input].disconnect();
		} else {
			console.log(time + cmdErrorMsg + 'User "' + input + '" does not exist');
		}
	},

	/**
	 * [CMD] Bans a user (with a reason)
	 * @param {input}
	 * @param {io}
	 * @param {users}
	 */
	cmdBan: function (input, io, users) {
		var now = moment(),
			time = now.format('LT'),
			fulldate = now.format('LLLL'),
			getID = functions.guid();

		input = input.substr(4);
		var index = input.indexOf(' '); // find the space, where the message starts

		if (index != -1) { // checks to see if the space exists
			var name = input.substring(0, index), // set the name
				reason = input.substring(index + 1), // set the reason
				regex = new RegExp(['^', name, '$'].join(''), 'i'), // case insensitive search
				userCheck = userdb.find({ username: regex });
			userCheck.sort().limit(1).exec(function(errormsg, result) {
				if (errormsg) {
					console.log(time + cmdErrorMsg + errormsg);
				} else {
					if (result.length == 1) {
						if (result[0].ban === true) {
							console.log(time + cmdServerMsg + '"' + name + '" is already banned');
						} else {
							userdb.update({ username: name }, { ban: true, banReason: reason }, function(err, raw) { if (err) return console.log(err)});

							if (name in users)
								users[name].disconnect();

							console.log(time + cmdServerMsg + '"' + name + '" has been banned');
							var msg = { id: getID, time: now, user: serverMsg, message: 'User <b>' + name + '</b> has been banned for <i>' + reason + '</i>' };
							io.emit('chat message', msg);
							saveMsg = new chat({ txtID: getID, msg: msg , username: '[Server]' });
						}
					} else {
						console.log(time + cmdErrorMsg + 'User "' + name + '" was not found');
					}
				}
			});
		} else {
			console.log(time + cmdErrorMsg + 'The command was entered incorrectly - ban name reason');
		}
	},

	/**
	 * [CMD] Unbans a user
	 * @param {input}
	 */
	cmdUnban: function (input) {
		name = input.substr(6);
		var time = moment().format('LT'),
			regex = new RegExp(['^', name, '$'].join(''), 'i'), // case insensitive search
			userCheck = userdb.find({ username: regex });

		userCheck.sort().limit(1).exec(function(errormsg, result) {
			if (errormsg) { 
				console.log(time + cmdErrorMsg + errormsg);
			} else {
				if (result.length == 1) {
					if (result[0].ban === false) {
						console.log(time + cmdErrorMsg + '"' + name + '" is not banned');
					} else {
						userdb.update({ username: name }, { ban: false, banReason: '' }, function(err, raw) { if (err) return console.log(err)});
						console.log(time + cmdServerMsg + '"' + name + '" has been unbanned');
					}
				} else {
					console.log(time + cmdErrorMsg + 'User "' + name + '" was not found');
				}
			}
		});
	},

	/**
	 * [CMD] Sets or removes a user as an admin
	 * @param {input}
	 * @param {io}
	 * @param {users}
	 * @param {admins}
	 */
	cmdAdmin: function (input, io, users, admins) {
		var now = moment(),
			time = now.format('LT'),
			fulldate = now.format('LLLL'),
			getID = functions.guid();

		input = input.substr(6);
		index = input.indexOf(' '); // find the space
		if (index != -1) { // checks to see if the space exists
			var name = input.substring(0, index), // set the name
				trufal = input.substring(index + 1), // set the true/false
				regex = new RegExp(["^", name, "$"].join(""), "i"), // case insensitive search
				userCheck = userdb.find({ username: regex }); // check to make sure the user exists

			userCheck.sort().limit(1).exec(function(errormsg, result) {
				if (errormsg) { 
					console.log(time + cmdErrorMsg + errormsg);
				} else {
					if (result.length == 1) { // If a match is found...
						if (trufal == 'true') { // if the user enters true
							if (result[0].isAdmin === true) {
								console.log(time + cmdServerMsg + '"' + name + '" is already an admin');
							} else {
								userdb.update({ username: name }, { isAdmin: true }, function(err, raw) { if (err) return console.log(err)});
								console.log(time + cmdServerMsg + '"' + name + '" rank has been changed to admin');
								var msg = { id: getID, time: now, user: serverMsg, message: '<b>' + name + '</b> is now an Admin' };
								io.emit('chat message', msg);
								saveMsg = new chat({ txtID: getID, msg: msg , username: '[Server]' });

								if (name in users) // If the user is online
									admins[name]++; // have that user added to the admin group

								functions.updateNicknames(io, users, admins); // reload the userlist
							}
						} else if (trufal == 'false') { // if the user enters false
							if (result[0].isAdmin === false) {
								console.log(time + cmdServerMsg + '"' + name + '" is not an admin');
							} else {
								userdb.update({ username: name }, { isAdmin: false }, function(err, raw) { if (err) return console.log(err)});
								console.log(time + cmdServerMsg + '"' + name + '" has been removed from the admin group');
								var msg = { id: getID, time: now, user: serverMsg, message: '<b>' + name + '</b> has been demoted to a user' };
								io.emit('chat message', msg);
								saveMsg = new chat({ txtID: getID, msg: msg , username: '[Server]' });

								if (name in admins) // if the user is online
									delete admins[name]; // have that user removed from the admin group

								functions.updateNicknames(io, users, admins); // reload the userlist
							}
						} else {
							console.log(time + cmdErrorMsg + 'You must enter true or false')
						}
					} else {
						console.log(time + cmdErrorMsg + 'User "' + name + '" was not found');
					}
				}
			});
		} else {
			console.log(time + cmdErrorMsg + 'The command was not entered correctly - admin name true/false');
		}
	}
}