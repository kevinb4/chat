/**
 * @fileoverview Handles all commands used in
 * 	the chat and server
 * @author xCryptic (Github)
 */

var functions = require('./functions.js');

const cmdType = {Error: 'Error', Normal: 'Normal', User: 'User', Admin: 'Admin'};

module.exports = {

	/**
	 * Sends a list of commands to the user
	 * @param {socket}
	 * @param {admins}
	 * @param {users}
	 */
	commands: function (socket, admins, users) {
		var now = functions.moment(),
			getID = functions.guid()
			messages = [];

		messages.push('..:: Chat Project commands ::..');
		messages.push('/commands - shows a list of commands (you are here!)');
		messages.push('/w username message - sends a whisper/pm to the selected user');

		if (socket.username in admins) {
			messages.push('..:: Admin Commands ::..');
			messages.push('<b>/broadcast</b> or <b>/bc</b> message - sends a message as the Server');
			messages.push('<b>/kick username</b> - kicks the user from the chat');
			messages.push('<b>/ban username reason</b> - bans the user with a set reson [reason is required]');
			messages.push('<b>/unban username</b> - unbans the user');
			messages.push('<b>/name newname</b> or <b>/name user\'susername newusername</b> - change your own name or change another user\'s name');
			messages.push('<b>/delete id</b> - deletes a message with that id (just click the timestamp of the message and it\'ll be put there for you)');
			messages.push('<b>/delmsgs username amount</b> - deletes a set number of messages made by a user (use <b>all</b> if you want to delete every single message a user has made)');
			messages.push('<b>/deltext text to delete</b> - deletes recent messages (last 50) that contain the text in the command');
			messages.push('<b>/mute username time</b> - mutes a user for a set time (format: 1d2h3m)');
			messages.push('<b>/js x</b> - used for quick testing (x being any Javascript code)');
		}

		for (item in messages)
			users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: messages[item] });
	},

	/**
	 * Sends a private message to the specified user
	 * @param {msg}
	 * @param {socket}
	 * @param {users}
	 */
	whisper: function (msg, socket, users) {
		msg = msg.substr(3); // remove the '/w '
		var now = functions.moment(),
			getID = functions.guid(),
			errormsg = { id: getID, time: now, user: functions.serverMsg, message: 'Please make sure you entered a valid username and a valid message' },
			index = msg.indexOf(' '); // Find the space, where the message starts

		if (index != -1) { // Checks to see if the space exists
			var name = msg.substring(0, index), // Set the name
				message = msg.substring(index + 1); // Set the message
			if (name in users) { // Make sure the user exists
				userName = '<font color="gray"><b>[Whisper]</b> ' + socket.username + ': ';
				users[name].emit('chat message', { id: getID, time: now, user: userName, message: message });
				users[socket.username].emit('chat message', { id: getID,  time: now, user: userName, message: message });
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
		var now = functions.moment(),
			getID = functions.guid();

		if (command.substr(0, 11) === '/broadcast ')
			command = command.substr(11);
		else
			command = command.substr(4);

		var msg = { id: getID, time: now, user: functions.serverMsg, message: command }
		functions.cmdMsg(cmdType.Normal, ('[Admin] ').blue.bold + socket.username + ': ' + msg.message);
		io.emit('chat message', msg);
		functions.saveMsg = new functions.chat({ txtID: getID, msg: msg, username: '[Server]', deleted: false });
		functions.saveMsg.save(function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });
	},

	/**
	 * Kicks a user from the chat
	 * @param {command}
	 * @param {socket}
	 * @param {io}
	 * @param {users}
	 */
	adminKick: function (command, socket, io, users) {
		var now = functions.moment(),
			getID = functions.guid(),
			msg = {};

		target = command.substr(6);

		if (target in users) { // Checks to make sure the user is online
			if (target == socket.username)
				msg = { id: getID, time: now, user: functions.serverMsg, message: '<b>' + socket.username + '</b> just kicked themself from the chat' }
			else
				msg = { id: getID, time: now, user: functions.serverMsg, message: '<b>' + target + '</b> has been kicked from the chat by <b>' + socket.username + '</b>' }

			io.emit('chat message', msg);
			functions.cmdMsg(cmdType.Normal, 'User "' + target + '" has been kicked by "' + socket.username + '"');
			functions.saveMsg = new functions.chat({ txtID: getID, msg: msg, username: '[Server]', deleted: false });
			functions.saveMsg.save(function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });
			users[target].disconnect();
		} else {
			users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'User <b>' + target + '</b> does not exist' });
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
		command = command.substr(5);
		var now = functions.moment(),
			getID = functions.guid();
			index = command.indexOf(' '); // Find the space, where the message starts

		if (index != -1) { // Checks to see if the space exists
			var name = command.substring(0, index), // Set the name
				reason = command.substring(index + 1), // Set the reason
				regex = new RegExp(['^', name, '$'].join(''), 'i'), // Case insensitive search
				userCheck = functions.userdb.find({ username: regex }); // Check to make sure the user exists

			userCheck.sort().limit(1).exec(function (err, result) {
				if (erro) {
					functions.cmdMsg(cmdType.Error, err);
				} else {
					if (result.length == 1) { // If a match is found...
						if (result[0].ban === true) {
							users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: '<b>' + name + ' is already banned' });
						} else {
							functions.userdb.update({ username: name }, { ban: true, banReason: reason }, function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });

							if (name in users)
								users[name].disconnect();

							var msg = { id: getID, time: now, user: functions.serverMsg, message: 'User <b>' + name + '</b> has been banned by <b>' + socket.username + '</b> for <i>' + reason + '</i>' }
							functions.cmdMsg(cmdType.Normal, '"' + name + '" has been banned by "' + socket.username + '" for "' + reason + '"');
							io.emit('chat message', msg);
							functions.saveMsg = new functions.chat({ txtID: getID, msg: msg, username: '[Server]', deleted: false });
							functions.saveMsg.save(function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });
						}
					} else {
						users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'User <b>' + name + '</b> was not found' });
					}
				}
			});
		} else {
			users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'The command was entered incorrectly - ban name reason' });
		}
	},

	/**
	 * Unbans a user
	 * @param {command}
	 * @param {socket}
	 * @param {users}
	 */
	adminUnban: function (command, socket, users) {
		var now = functions.moment(),
			getID = functions.guid(),
			name = command.substr(7),
			regex = new RegExp(['^', name, '$'].join(''), 'i'), // Case insensitive search
			userCheck = functions.userdb.find({ username: regex });

		userCheck.sort().limit(1).exec(function (err, result) {
			if (err) {
				functions.cmdMsg(cmdType.Error, err);
			} else {
				if (result.length == 1) {
					if (result[0].ban === false) {
						users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: '<b>' + name + '</b> is not banned' });
					} else {
						functions.userdb.update({ username: name }, { ban: false, banReason: '' }, function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });
						functions.cmdMsg(cmdType.Normal, '"' + name + '" has been unbanned by "' + socket.username + '"');
						users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'You have unbanned <b>' + name + '</b>' });
					}
				} else {
					users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'User <b>' + name + '</b> was not found' });
				}
			}
		});
	},

	/**
	 * Changes admins username, or another user's name
	 * @param {command}
	 * @param {socket}
	 * @param {io}
	 * @param {users}
	 * @param {admins}
	 */
	adminName: function (command, socket, io, users, admins, status) {
		command = command.split(' ');
		var now = functions.moment(),
			getID = functions.guid(),
			name1 = command[1],
			name2 = command[2],
			regex = new RegExp(['^', name1, '$'].join(''), 'i'), // case insensitive search
			userCheck = functions.userdb.find({ username: regex });

		if (name2 == null) { // admin is changing their own name
			userCheck.sort().limit(1).exec(function (err, result) {
				if (err) {
					functions.cmdMsg(cmdType.Error, err);
				} else {
					if (result.length != 1) {
						functions.userdb.update({ username: socket.username }, { username: name1 }, function (err) {
							if (err) {
								return functions.cmdMsg(cmdType.Error, err);
							} else {
								delete users[socket.username];
								users[name1] = socket;
								delete admins[socket.username];
								admins[name1]++;

								functions.updateNicknames(io, users, admins, status); // reload the userlist
								var msg = { id: getID, time: now, user: functions.serverMsg, message: '<b>' + socket.username + '</b> has changed their name to <b>' + name1 + '</b>' }
								functions.cmdMsg(cmdType.Normal, '"' + socket.username + '" has changed their name to "' + name1 + '"');
								socket.username = name1;
								io.emit('chat message', msg);
								functions.saveMsg = new functions.chat({ txtID: getID, msg: msg, username: '[Server]', deleted: false });
								functions.saveMsg.save(function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });
							}
						});
					} else {
						users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'The name <b>' + name1 + '</b> is already taken' });
					}
				}
			});
		} else { // admin is changing someone else's name
			userCheck.sort().limit(1).exec(function (err, result) {
				if (err) {
					functions.cmdMsg(cmdType.Error, err);
				} else {
					if (result.length == 1) { // make sure the user exists
						var newUser = new RegExp(['^', name2, '$'].join(''), 'i'), // case insensitive search
							newUserCheck = functions.userdb.find({ username: newUser }),
							isAdmin = result[0].isAdmin;

						newUserCheck.sort().limit(1).exec(function (err, result) {
							if (err) {
								functions.cmdMsg(cmdType.Error, err);
							} else {
								if (result.length != 1) { // make sure the new username doesn't exist
									functions.userdb.update({ username: name1 }, { username: name2 }, function (err) {
										if (err) {
											return functions.cmdMsg(cmdType.Error, err);
										} else {
											if (name1 in users) { // if users is online
												var userSocket = users[name1];
												delete users[name1];
												users[name2] = userSocket;
												userSocket.username = name2;
											}

											if (isAdmin === true) { // just incase an admin changes another admin's name
												delete admins[name1];
												admins[name2]++;
											}

											functions.updateNicknames(io, users, admins, status); // reload the userlist
											var msg = { id: getID, time: now, user: functions.serverMsg, message: '<b>' + socket.username + '</b> has changed <b>' + name1 + '</b> name to <b>' + name2 + '</b>' }
											functions.cmdMsg(cmdType.Normal, '"' + socket.username + '" has changed "' + name1 + '" name to "' + name2 + '"');
											io.emit('chat message', msg);
											functions.saveMsg = new functions.chat({ txtID: getID, msg: msg, username: '[Server]', deleted: false });
											functions.saveMsg.save(function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });
										}
									});
								} else {
									users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'The name <b>' + name2 + '</b> is already taken' });
								}
							}
						});
					} else {
						users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'The user <b>' + name1 + '</b> was not found' });
					}
				}
			});
		}
	},

	/**
	 * Deletes a specified message
	 * @param {messageID}
	 * @param {socket}
	 * @param {io}
	 * @param {users}
	 */
	adminDelete: function (messageID, socket, io, users) {
		messageID = messageID.substring(8);
		var query = functions.chat.find({ txtID: messageID });

		query.sort().limit(1).exec(function (err, msg) { // Make sure the message exists
			if (err) functions.cmdMsg(cmdType.Error, err);
			if (msg.length == 1) {
				functions.chat.update({ txtID: messageID }, { $set: { deleted: true } }, function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });
				var delMsg;

				try {
					delMsg = msg[0].rawMsg[0].message;
				} catch (err) {
					delMsg = msg[0].msg[0].message;
				}

				functions.cmdMsg(cmdType.Normal, '"' + socket.username + '" has deleted message "' + delMsg + '" made by "' + msg[0].username + '"');
			} else {
				functions.cmdMsg(cmdType.Normal, '"' + socket.username + '" deleted a non-saved message (' + messageID + ')');
			}
			io.emit('delete message', messageID);
		});
	},

	/**
	 * Deletes a set number of messages
	 * @param {command}
	 * @param {socket}
	 * @param {io}
	 * @param {users}
	 */
	adminDelMsgs: function (command, socket, io, users) {
		command = command.split(' ');
		var now = functions.moment(),
			getID = functions.guid(),
			name = command[1],
			amount = command[2],
			regex = new RegExp(['^', name, '$'].join(''), 'i'), // case insensitive search
			userCheck = functions.userdb.find({ username: regex });

		userCheck.sort().exec(function (err, result) {
			if (err) {
				functions.cmdMsg(cmdType.Error, err);
			} else {
				if (name.toLowerCase() == '[server]')
					regex = '[Server]';
				if (result.length == 1 || regex == '[Server]') { // make sure the user exists
					if (amount == 'all') { // this will delete ALL messages
						var chats = functions.chat.find({ username: regex });

						chats.sort().exec(function (err, result) {
							if (result.length >= 1) { // make sure there are messages to delete
								for (var i = 0; i < result.length; i++) {
									io.emit('delete message', result[i].txtID);
									functions.chat.update({ txtID: result[i].txtID }, { $set: { deleted: true } }, function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });
								}

								functions.cmdMsg(cmdType.Normal, '"' + socket.username + '" has deleted ' + amount + ' messages made by "' + result[0].username + '"');
							} else {
								users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'There are no messages to delete' });
							}
						});
					} else if (!isNaN(amount) && amount > 0) {
						var chats = functions.chat.find({ username: regex });

						chats.sort('-date').limit(amount).exec(function (err, result) {
							if (result.length >= 1) { // make sure there are messages to delete
								for (var i = 0; i < result.length; i++) {
									io.emit('delete message', result[i].txtID);
									functions.chat.update({ txtID: result[i].txtID }, { $set: { deleted: true } }, function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });
								}

								functions.cmdMsg(cmdType.Normal, '"' + socket.username + '" has deleted ' + amount + ' messages made by "' + result[0].username + '"');
							} else {
								users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'There are no messages to delete' });
							}
						});
					} else {
						users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'You have entered the command incorrectly. You must specifiy the username and amount of messages to delete' });
					}
				} else {
					users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: '<b>' + name + '</b> could not be found' });
				}
			}
		});
	},

	/**
	 * Deletes messages that conatains set text
	 * @param {command}
	 * @param {socket}
	 * @param {io}
	 * @param {users}
	 */
	adminDelText: function (command, socket, io, users) {
		var now = functions.moment(),
			getID = functions.guid(),
			text = command.substring(9),
			textFind = functions.chat.find({ msg: { $elemMatch: { message: { '$regex': text, '$options': 'i' } } }, deleted: false });

			textFind.sort().limit(50).exec(function (err, result) {
				functions.cmdMsg(cmdType.Normal, result);
				if (result.length > 0) {
					for (var i = 0; i < result.length; i++) {
						io.emit('delete message', result[i].txtID);
						functions.chat.update({ txtID: result[i].txtID }, { $set: { deleted: true } }, function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });
					}

					functions.cmdMsg(cmdType.Normal, '"' + socket.username + '" has deleted messages that contains the text "' + text + '"');
				} else {
					users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: '"<b>' + text + '</b>" could not be found in any recent chats' });
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
		var now = functions.moment(),
			modTime = functions.moment(),
			getID = functions.guid(),
			command = command.split(' '),
			name = command[1],
			muteLength = command[2],
			days, hours, minutes,
			regex = new RegExp(['^', name, '$'].join(''), 'i'), // case insensitive search
			userCheck = functions.userdb.find({ username: regex });

		if (muteLength == undefined) // check if the user entered a valid time
			muteLength = 0; // have it set to 0 so that we don't get a undefind var

		if (muteLength.length >= 2) {
			userCheck.sort().limit(1).exec(function (err, result) {
				if (err) {
					functions.cmdMsg(cmdType.Error, err);
				} else {
					if (result.length == 1) {
						for (var i = 0; i < muteLength.length; i++) {
							if (muteLength[i] === 'd') {
								days = i;

								if (days != 0) 
									days = muteLength.substr(0, days);

								muteLength = muteLength.substr(i + 1);
								i = muteLength.length; // just in case there's more than 1 d
							}
						}
						for (var i = 0; i < muteLength.length; i++) {
							if (muteLength[i] === 'h') {
								hours = i;

								if (hours != 0)
									hours = muteLength.substr(0, hours);

								muteLength = muteLength.substr(i + 1);
								i = muteLength.length; // just in case there's more than 1 h
							}
						}
						for (var i = 0; i < muteLength.length; i++) {
							if (muteLength[i] === 'm') {
								minutes = i;

								if (minutes != 0)
									minutes = muteLength.substr(0, minutes);

								muteLength = muteLength.substr(i + 1);
								i = muteLength.length; // just in case there's more than 1 m
							}
						}
						if (days != 0)
							modTime.add(days, 'd');
						if (hours != 0)
							modTime.add(hours, 'h');
						if (minutes != 0)
							modTime.add(minutes, 'm');
						if (modTime == now) {
							users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'The command was not entered correctly, you must enter the time in order (days -> hours -> minutes)' });
						} else {
							functions.userdb.update({ username: name }, { $set: { mute: modTime.format('YYYY-MM-DD HH:mm') } }, function (err) {
								if (err) { // make sure the db was updated successfully
									functions.cmdMsg(cmdType.Error, err);
									users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'There has been an error saving to the database - error description: <i>' + err + '</i>' });
								} else {
									functions.cmdMsg(cmdType.Normal, '"' + name + '" has been muted by "' + socket.username + '" - expires ' + modTime.fromNow() + ' @ ' + modTime.format('LT'));
									users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: '<b>' + name + '</b> has been muted - expires <i>' + modTime.fromNow() + '</i>' });

									if (name in users)
										users[name].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'You have been muted by <b>' + socket.username + '</b> - expires <i>' + modTime.fromNow() + '</i>' });
								}
							});
						}
					} else {
						users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'User <b>' + name + '</b> was not found' });
					}
				}
			});
		} else {
			users[socket.username].emit('chat message', { id: getID, time: now, user: functions.serverMsg, message: 'The command was not entered correctly - /mute user time (format: 2d3h4m)' });
		}
	},

	/**
	 * Executes Javascript for quick testing
	 * @param {js}
	 * @param {socket}
	 * @param {io}
	 * @param {users}
	 */
	adminJS: function (js, socket, io, users) {
		var getID = functions.guid(),
			msg;

		try {
			msg = eval(js.substr(4)); 
		} catch (e) {
			functions.cmdMsg(cmdType.Error, 'Eval Error: ' + e.message)
			msg = e.message;
		}

		users[socket.username].emit('chat message', { id: getID, time: functions.moment(), user: functions.serverMsg, message: '<span style="color: #F0DB4F;">(JS)</span> ' + msg });
	},

	/**
	 * [CMD] Kicks a user
	 * @param {input}
	 * @param {io}
	 * @param {users}
	 */
	cmdKick: function (input, io, users) {
		var now = functions.moment(),
			getID = functions.guid();

		if (input in users) {
			functions.cmdMsg(cmdType.Normal, 'User "' + input + '" has been kicked');
			var msg = { id: getID, time: now, user: functions.serverMsg, message: 'User <b>' + input + '</b> has been kicked from the chat' };
			io.emit('chat message', msg);
			functions.saveMsg = new functions.chat({ txtID: getID, msg: msg, username: '[Server]' });
			users[input].disconnect();
		} else {
			functions.cmdMsg(cmdType.Error, 'User "' + input + '" does not exist');
		}
	},

	/**
	 * [CMD] Bans a user (with a reason)
	 * @param {input}
	 * @param {io}
	 * @param {users}
	 */
	cmdBan: function (input, io, users) {
		var now = functions.moment(),
			time = now.format('LT'),
			getID = functions.guid();

		input = input.substr(4);
		var index = input.indexOf(' '); // find the space, where the message starts

		if (index != -1) { // checks to see if the space exists
			var name = input.substring(0, index), // set the name
				reason = input.substring(index + 1), // set the reason
				regex = new RegExp(['^', name, '$'].join(''), 'i'), // case insensitive search
				userCheck = functions.userdb.find({ username: regex });

			userCheck.sort().limit(1).exec(function (err, result) {
				if (err) {
					functions.cmdMsg(cmdType.Error, err);
				} else {
					if (result.length == 1) {
						if (result[0].ban === true) {
							functions.cmdMsg(cmdType.Error, '"' + name + '" is already banned');
						} else {
							functions.userdb.update({ username: name }, { ban: true, banReason: reason }, function (err) { functions.cmdMsg(cmdType.Error, err); });

							if (name in users)
								users[name].disconnect();

							functions.cmdMsg(cmdType.Normal, '"' + name + '" has been banned');
							var msg = { id: getID, time: now, user: functions.serverMsg, message: 'User <b>' + name + '</b> has been banned for <i>' + reason + '</i>' };
							io.emit('chat message', msg);
							functions.saveMsg = new functions.chat({ txtID: getID, msg: msg, username: '[Server]', deleted: false });
							functions.saveMsg.save(function (err) { if (err) if (err) functions.cmdMsg(cmdType.Error, err); });
						}
					} else {
						functions.cmdMsg(cmdType.Error, 'User "' + name + '" was not found');
					}
				}
			});
		} else {
			functions.cmdMsg(cmdType.Error, 'The command was entered incorrectly - ban name reason');
		}
	},

	/**
	 * [CMD] Unbans a user
	 * @param {input}
	 */
	cmdUnban: function (input) {
		name = input.substr(6);
		var regex = new RegExp(['^', name, '$'].join(''), 'i'), // case insensitive search
			userCheck = functions.userdb.find({ username: regex });

		userCheck.sort().limit(1).exec(function (err, result) {
			if (err) {
				functions.cmdMsg(cmdType.Error, err);
			} else {
				if (result.length == 1) {
					if (result[0].ban === false) {
						functions.cmdMsg(cmdType.Error, '"' + name + '" is not banned');
					} else {
						functions.userdb.update({ username: name }, { ban: false, banReason: '' }, function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });
						functions.cmdMsg(cmdType.Normal, '"' + name + '" has been unbanned');
					}
				} else {
					functions.cmdMsg(cmdType.Error, 'User "' + name + '" was not found');
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
	cmdAdmin: function (input, io, users, admins, status) {
		var now = functions.moment(),
			getID = functions.guid();

		input = input.substr(6);
		index = input.indexOf(' '); // find the space
		if (index != -1) { // checks to see if the space exists
			var name = input.substring(0, index), // set the name
				trufal = input.substring(index + 1), // set the true/false
				regex = new RegExp(["^", name, "$"].join(""), "i"), // case insensitive search
				userCheck = functions.userdb.find({ username: regex }); // check to make sure the user exists

			userCheck.sort().limit(1).exec(function (err, result) {
				if (err) {
					functions.cmdMsg(cmdType.Error, err);
				} else {
					if (result.length == 1) { // If a match is found...
						if (trufal == 'true') { // if the user enters true
							if (result[0].isAdmin === true) {
								functions.cmdMsg(cmdType.Error, '"' + name + '" is already an admin');
							} else {
								functions.userdb.update({ username: name }, { isAdmin: true }, function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });
								functions.cmdMsg(cmdType.Normal, '"' + name + '" rank has been changed to admin');
								var msg = { id: getID, time: now, user: functions.serverMsg, message: '<b>' + name + '</b> is now an Admin' };
								io.emit('chat message', msg);
								functions.saveMsg = new functions.chat({ txtID: getID, msg: msg, username: '[Server]', deleted: false });
								functions.saveMsg.save(function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });

								if (name in users) // If the user is online
									admins[name]++; // have that user added to the admin group

								functions.updateNicknames(io, users, admins, status); // reload the userlist
							}
						} else if (trufal == 'false') { // if the user enters false
							if (result[0].isAdmin === false) {
								functions.cmdMsg(cmdType.Error, '"' + name + '" is not an admin');
							} else {
								functions.userdb.update({ username: name }, { isAdmin: false }, function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });
								functions.cmdMsg(cmdType.Normal, '"' + name + '" has been removed from the admin group');
								var msg = { id: getID, time: now, user: functions.serverMsg, message: '<b>' + name + '</b> has been demoted to a user' };
								io.emit('chat message', msg);
								functions.saveMsg = new functions.chat({ txtID: getID, msg: msg, username: '[Server]', deleted: false });
								functions.saveMsg.save(function (err) { if (err) functions.cmdMsg(cmdType.Error, err); });

								if (name in admins) // if the user is online
									delete admins[name]; // have that user removed from the admin group

								functions.updateNicknames(io, users, admins, status); // reload the userlist
							}
						} else {
							functions.cmdMsg(cmdType.Error, 'You must enter true or false');
						}
					} else {
						functions.cmdMsg(cmdType.Error, 'User "' + name + '" was not found');
					}
				}
			});
		} else {
			functions.cmdMsg(cmdType.Error, 'The command was not entered correctly - admin name true/false');
		}
	}
}