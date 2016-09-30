/**
 * @fileoverview Handles all commands used in
 * 	the chat and server
 * @author xCryptic (Github)
 */

var functions = require('./functions.js');

module.exports = {

	afk: {
		aliases: ['afk'],
		role: ['User', 'Admin'],
		run: function (args, data) {
			if (!(data.socket.username in data.status)) {
				var message = args.splice(1).toString().replace(/\,/g, ' ');

				if (message.length > 15) {
					data.users[data.socket.username].emit('chat message', functions.clientMsg({
						type: functions.msgType.ServerSave,
						msg: 'Your afk message is too long (max length is 15 characters)'
					}));
				} else {
					data.status[data.socket.username] = { status: 'afk', msg: message };
					functions.updateNicknames(data.io, data.users, data.admins, data.status);
					data.users[data.socket.username].emit('chat message', functions.clientMsg({
						type: functions.msgType.Server,
						msg: 'AFK message set - your status will be reset next time you chat'
					}));
				}
			}
		}
	},

	/**
	 * Sends a list of commands to the user
	 */
	commands: {
		aliases: ['commands', 'c', 'help'],
		role: ['User', 'Admin'],
		run: function (args, data) {
			var messages = [];

			messages.push('..:: Chat Project commands ::..');
			messages.push('<b>/afk message</b> - sets your status as afk with a custom message (max length is 15 characters)');
			messages.push('<b>/commands</b> - shows a list of commands (you are here!)');
			messages.push('<b>/w username message</b> - sends a whisper/pm to the selected user');

			if (data.socket.role == 'Admin') {
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
				data.users[data.socket.username].emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: messages[item]
				}));
		}
	},

	/**
	 * Sends a private message to the specified user
	 */
	whisper: {
		aliases: ['whisper', 'w'],
		role: ['User', 'Admin'],
		run: function (args, data) {
			var name = args[0],
				message = args.splice(1).toString().replace(/\,/g, ' ');

			if (message == '') {
				data.users[data.socket.username].emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'Please make sure you entered a valid username and a valid message'
				}));
				return;
			}
			if (!(name in data.users)) { // Make sure the user exists
				data.users[data.socket.username].emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'User <b>' + name + '</b> was not found'
				}));
				return;
			}
			if (name == data.socket.username) {
				data.users[data.socket.username].emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'You can\'t whisper yourself!'
				}));
				return;
			}

			// send it to the reciever
			data.users[name].emit('chat message', functions.clientMsg({
				user: data.socket.username,
				type: functions.msgType.Whisper,
				msg: message
			}));
			// send it to the user so they know it sent
			data.users[data.socket.username].emit('chat message', functions.clientMsg({
				user: data.socket.username,
				type: functions.msgType.Whisper,
				msg: message
			}));
		} 
	},

	/**
	 * Sends a message as the server
	 */
	broadcast: {
		aliases: ['broadcast', 'bc', 'say'],
		role: ['Admin'],
		run: function (args, data) {
			var msg = args.toString().replace(/\,/g, ' ');

			functions.cmdMsg(functions.cmdType.Normal, ('[Admin] ').blue.bold + data.socket.username + ': ' + msg);
			data.users[data.socket.username].emit('chat message', functions.clientMsg({
				type: functions.msgType.ServerSave,
				msg: msg
			}));
		}
	},

	/**
	 * Kicks a user from the chat
	 */
	kick: {
		aliases: ['kick'],
		role: ['Admin'],
		run: function (args, data) {
			var now = functions.moment(),
				getID = functions.guid(),
				msg;

			if (!(args[0] in data.users)) {
				data.users[data.socket.username].emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'User<b>' + (args[0] ? ' ' + args[0] + ' ' : ' ') + '</b>does not exist or is not online'
				}));
				return;
			}
			if (args[0] == data.socket.username) 
				msg = 'User <b>' + data.socket.username + '</b> just kicked themself from the chat';
			else
				msg = 'User <b>' + args[0] + '</b> has been kicked from the chat by <b>' + data.socket.username + '</b>';

			data.users[args[0]].disconnect();
			functions.cmdMsg(functions.cmdType.Normal, 'User "' + args[0] + '" has been kicked by "' + data.socket.username + '"');
			data.io.emit('chat message', functions.clientMsg({
				type: functions.msgType.ServerSave,
				msg: msg
			}));
		}
	},

	/**
	 * Bans a user (with a reason)
	 */
	ban: {
		aliases: ['ban', 'banhammer'],
		role: ['Admin'],
		run: function (args, data) {
			var name = args[0],
				reason = args.splice(1).toString().replace(/\,/g, ' ');

			if (!name || !reason) {
				data.users[data.socket.username].emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'The command was entered incorrectly - ban name reason'
				}));
				return;
			}
			if (name == data.socket.username) {
				data.users[data.socket.username].emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'I mean... I can ban you but, that\'d be kinda pointless'
				}));
				return;
			}

			var regex = new RegExp(['^', name, '$'].join(''), 'i'),
				userCheck = functions.userdb.find({ username: regex });

			userCheck.sort().limit(1).exec(function (err, result) {
				if (err) {
					functions.cmdMsg(functions.cmdType.Error, err);
					return;
				}
				if (result.length != 1) {
					data.users[data.socket.username].emit('chat message', functions.clientMsg({
						type: functions.msgType.Server,
						msg: 'User <b>' + name + '</b> was not found'
					}));
					return;
				}
				if (result[0].ban === true) {
					data.users[data.socket.username].emit('chat message', functions.clientMsg({
						type: functions.msgType.Server,
						msg: '<b>' + name + '</b> is already banned'
					}));
					return;
				} 

				if (name in data.users)
					data.users[name].disconnect();

				functions.userdb.update({ username: name }, { ban: true, banReason: reason }, function (err) { if (err) functions.cmdMsg(functions.cmdType.Error, err); });
				functions.cmdMsg(functions.cmdType.Normal, '"' + name + '" has been banned by "' + data.socket.username + '" for "' + reason + '"');
				data.io.emit('chat message', functions.clientMsg({
					type: functions.msgType.ServerSave,
					msg: 'User <b>' + name + '</b> has been banned by <b>' + data.socket.username + '</b> for <b>' + reason + '</b>'
				}));
			});
		}
	},

	/**
	 * Unbans a user
	 */
	unban: {
		aliases: ['unban', 'ub'],
		role: ['Admin'],
		run: function (args, data) {
			var name = args[0];

			if (!name) {
				data.users[data.socket.username].emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'You must enter a name'
				}));
				return;
			}

			var regex = new RegExp(['^', name, '$'].join(''), 'i'), // Case insensitive search
				userCheck = functions.userdb.find({ username: regex });

			userCheck.sort().limit(1).exec(function (err, result) {
				if (err) {
					functions.cmdMsg(functions.cmdType.Error, err);
					return;
				}
				if (result.length != 1) {
					data.users[data.socket.username].emit('chat message', functions.clientMsg({
						type: functions.msgType.Server,
						msg: 'User <b>' + name + '</b> was not found'
					}));
					return;
				}
				if (result[0].ban === false) {
					data.users[data.socket.username].emit('chat message', functions.clientMsg({
						type: functions.msgType.Server,
						msg: 'User <b>' + name + '</b> is not banned'
					}));
					return;
				}

				functions.userdb.update({ username: name }, { ban: false, banReason: '' }, function (err) { if (err) functions.cmdMsg(functions.cmdType.Error, err); });
				functions.cmdMsg(functions.cmdType.Normal, '"' + name + '" has been unbanned by "' + data.socket.username + '"');
				data.users[data.socket.username].emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'You have unbanned <b>' + name + '</b>'
				}));
			});
		}
	},

	/**
	 * Changes admins username, or another user's name
	 */
	namechange: {
		aliases: ['namechange', 'name', 'nc'],
		role: ['Admin'],
		run: function (args, data) {
			var name1 = args[0],
				name2 = args[1],
				regex = new RegExp(['^', name1, '$'].join(''), 'i'), // case insensitive search
				userCheck = functions.userdb.find({ username: regex });

			// nothing was entered after the command
			if (!name1) {
				data.users[data.socket.username].emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'You have entered the command incorrectly'
				}));
				return;
			}
			if (name1 == data.socket.username) {
				data.users[data.socket.username].emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'If you would like to change your own name, use /nc newname'
				}));
				return;
			}

			// a second name wasn't entered, so it's just a user changing their own name
			if (!name2) {
				userCheck.sort().limit(1).exec(function (err, result) {
					if (err) {
						functions.cmdMsg(functions.cmdType.Error, err);
						return;
					}
					if (result.length == 1) {
						data.users[data.socket.username].emit('chat message', functions.clientMsg({
							type: functions.msgType.Server,
							msg: 'The name <b>' + name1 + '</b> is already taken'
						}));
						return;
					}
					functions.userdb.update({ username: data.socket.username }, { username: name1 }, function (err) { if (err) { functions.cmdMsg(functions.cmdType.Error, err); return; } });

					delete data.users[data.socket.username];
					data.users[name1] = data.socket;
					delete data.admins[data.socket.username];
					data.admins[name1]++;

					functions.updateNicknames(data.io, data.users, data.admins, data.status); // reload the userlist
					functions.cmdMsg(functions.cmdType.Normal, '"' + data.socket.username + '" has changed their name to "' + name1 + '"');
					data.io.emit('chat message', functions.clientMsg({
						type: functions.msgType.Server,
						msg: '<b>' + data.socket.username + '</b> has changed their name to <b>' + name1 + '</b>'
					}));
					data.socket.username = name1;
				});
			} else {
				userCheck.sort().limit(1).exec(function (err, result) {
					if (err) {
						functions.cmdMsg(functions.cmdType.Error, err);
						return;
					} 
					if (result.length != 1) { // make sure the user exists
						data.users[data.socket.username].emit('chat message', functions.clientMsg({
							type: functions.msgType.Server,
							msg: 'User <b>' + name1 + '</b> was not found'
						}));
						return;
					}
					var newUser = new RegExp(['^', name2, '$'].join(''), 'i'), // case insensitive search
						newUserCheck = functions.userdb.find({ username: newUser }),
						role = result[0].role;

					newUserCheck.sort().limit(1).exec(function (err, result) {
						if (err) {
							functions.cmdMsg(functions.cmdType.Error, err);
							return;
						}
						if (result.length == 1) { // make sure the new username doesn't exist
							data.users[data.socket.username].emit('chat message', functions.clientMsg({
								type: functions.msgType.Server,
								msg: 'The name <b>' + name2 + '</b> is already taken'
							}));
							return;
						}
						functions.userdb.update({ username: name1 }, { username: name2 }, function (err) { if (err) { functions.cmdMsg(functions.cmdType.Error, err); return; } });

						if (name1 in data.users) { // if users is online
							var userSocket = data.users[name1];
							delete data.users[name1];
							data.users[name2] = userSocket;
							userSocket.username = name2;
						}

						if (role === 'Admin') { // just incase an admin changes another admin's name
							delete data.admins[name1];
							data.admins[name2]++;
						}

						functions.updateNicknames(data.io, data.users, data.admins, data.status); // reload the userlist
						functions.cmdMsg(functions.cmdType.Normal, '"' + data.socket.username + '" has changed "' + name1 + '" name to "' + name2 + '"');
						data.io.emit('chat message', functions.clientMsg({
							type: functions.msgType.Server,
							msg: 'User <b>' + data.socket.username + '</b> has changed <b>' + name1 + '</b>\'s name to <b>' + name2 + '</b>'
						}));
					});
				});
			}
		}
	},

	/**
	 * Deletes a specified message
	 */
	deletemsg: {
		aliases: ['delete', 'del'],
		role: ['Admin'],
		run: function (args, data) {
			var messageID = args[0],
				query = functions.chat.find({ txtID: messageID });

			query.sort().limit(1).exec(function (err, msg) { // Make sure the message exists
				if (err) {
					functions.cmdMsg(functions.cmdType.Error, err);
					return;
				}
				if (msg.length == 1) {
					functions.chat.update({ txtID: messageID }, { $set: { deleted: true } }, function (err) { if (err) functions.cmdMsg(functions.cmdType.Error, err); });
					var delMsg;

					try {
						delMsg = msg[0].rawMsg[0].message;
					} catch (err) {
						delMsg = msg[0].msg[0].message;
					}

					functions.cmdMsg(functions.cmdType.Normal, '"' + data.socket.username + '" has deleted message "' + delMsg + '" made by "' + msg[0].username + '"');
				} else {
					functions.cmdMsg(functions.cmdType.Normal, '"' + data.socket.username + '" deleted a non-saved message (' + messageID + ')');
				}
				data.io.emit('delete message', messageID);
			});
		}
	},

	/**
	 * Deletes a set number of messages
	 */
	delmsgs: {
		aliases: ['deltemessages', 'delmessages', 'delmsgs'],
		role: ['Admin'],
		run: function (args, data) {
			var name = args[0],
				amount = args[1],
				regex = new RegExp(['^', name, '$'].join(''), 'i'), // case insensitive search
				userCheck = functions.userdb.find({ username: regex });

			userCheck.sort().exec(function (err, result) {
				if (err) {
					functions.cmdMsg(functions.cmdType.Error, err);
					return;
				}
				if (name.toLowerCase() == '[server]')
					regex = '[Server]';
				if (result.length < 1 && regex != '[Server]') { // make sure the user exists
					data.users[data.socket.username].emit('chat message', functions.clientMsg({
						type: functions.msgType.Server,
						msg: 'User <b>' + name + '</b> could not be found'
					}));
					return;
				}
				if (amount == 'all') { // this will delete ALL messages
					var chats = functions.chat.find({ username: regex });

					chats.sort().exec(function (err, result) {
						if (err) {
							functions.cmdMsg(functions.cmdType.Error, err);
							return;
						}
						if (result.length < 1) { // make sure there are messages to delete
							data.users[data.socket.username].emit('chat message', functions.clientMsg({
								type: functions.msgType.Server,
								msg: 'There are no messages to delete'
							}));
							return;
						}
						for (var i = 0; i < result.length; i++) {
							data.io.emit('delete message', result[i].txtID);
							functions.chat.update({ txtID: result[i].txtID }, { $set: { deleted: true } }, function (err) { if (err) { functions.cmdMsg(functions.cmdType.Error, err); return; } });
						}

						functions.cmdMsg(functions.cmdType.Normal, '"' + data.socket.username + '" has deleted ' + amount + ' messages made by "' + result[0].username + '"');
					});
				} else if (!isNaN(amount) && amount > 0) {
					var chats = functions.chat.find({ username: regex });

					chats.sort('-date').limit(amount).exec(function (err, result) {
						if (err) {
							functions.cmdMsg(functions.cmdType.Error, err);
							return;
						}
						if (result.length < 1) { // make sure there are messages to delete
							data.users[data.socket.username].emit('chat message', functions.clientMsg({
								type: functions.msgType.Server,
								msg: 'There are no messages to delete'
							}));
							return;
						}
						for (var i = 0; i < result.length; i++) {
							data.io.emit('delete message', result[i].txtID);
							functions.chat.update({ txtID: result[i].txtID }, { $set: { deleted: true } }, function (err) { if (err) { functions.cmdMsg(functions.cmdType.Error, err); return; } });
						}

						functions.cmdMsg(functions.cmdType.Normal, '"' + data.socket.username + '" has deleted ' + amount + ' messages made by "' + result[0].username + '"');
					});
				} else {
					data.users[data.socket.username].emit('chat message', functions.clientMsg({
						type: functions.msgType.Server,
						msg: 'You have entered the command incorrectly. You must specifiy the username and amount of messages to delete'
					}));
				}
			});
		}
	},

	/**
	 * Deletes messages that conatains set text
	 */
	deltext: {
		aliases: ['deletetext', 'deltext', 'deltxt'],
		role: ['Admin'],
		run: function (args, data) {
			var text = args.toString().replace(/\,/g, ' '),
				textFind = functions.chat.find({ msg: { $elemMatch: { message: { '$regex': text, '$options': 'i' } } }, deleted: false });

			textFind.sort().limit(50).exec(function (err, result) {
				if (err) {
					functions.cmdMsg(functions.cmdType.Error, err);
					return;
				}
				if (result.length < 1) {
					data.users[data.socket.username].emit('chat message', functions.clientMsg({
						type: functions.msgType.Server,
						msg: 'User <b>' + text + '</b> could not be found in any recent chats'
					}));
					return;
				}
				for (var i = 0; i < result.length; i++) {
					data.io.emit('delete message', result[i].txtID);
					functions.chat.update({ txtID: result[i].txtID }, { $set: { deleted: true } }, function (err) { if (err) { functions.cmdMsg(functions.cmdType.Error, err); return; } });
				}

				functions.cmdMsg(functions.cmdType.Normal, '"' + data.socket.username + '" has deleted messages that contains the text "' + text + '"');

			});
		}
	},

	/**
	 * Mutes a user for a set time
	 * (needs cleaning/simplifing)
	 */
	mute: {
		aliases: ['mute'],
		role: ['Admin'],
		run: function (args, data) {
			var now = functions.moment(),
				modTime = functions.moment(),
				name = args[0],
				muteLength = args[1],
				days, hours, minutes,
				regex = new RegExp(['^', name, '$'].join(''), 'i'), // case insensitive search
				userCheck = functions.userdb.find({ username: regex });

			if (muteLength == undefined) // check if the user entered a valid time
				muteLength = 0; // have it set to 0 so that we don't get a undefind var

			if (muteLength.length < 1) {
				data.users[data.socket.username].emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'The command was not entered correctly - /mute user time (format: 2d3h4m)'
				}));
				return;
			}
			userCheck.sort().limit(1).exec(function (err, result) {
				if (err) {
					functions.cmdMsg(functions.cmdType.Error, err);
					return;
				}
				if (result.length < 1) {
					data.users[data.socket.username].emit('chat message', functions.clientMsg({
						type: functions.msgType.Server,
						msg: 'User <b>' + name + '</b> was not found'
					}));
					return;
				}
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
					data.users[data.socket.username].emit('chat message', functions.clientMsg({
						type: functions.msgType.Server,
						msg: 'The command was not entered correctly, you must enter the time in order (days -> hours -> minutes)'
					}));
					return;
				}
				functions.userdb.update({ username: name }, { $set: { mute: modTime.format('YYYY-MM-DD HH:mm') } }, function (err) { if (err) { functions.cmdMsg(functions.cmdType.Error, err); return;	} });

				functions.cmdMsg(functions.cmdType.Normal, '"' + name + '" has been muted by "' + data.socket.username + '" - expires ' + modTime.fromNow() + ' @ ' + modTime.format('LT'));
				data.users[data.socket.username].emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'User <b>' + name + '</b> has been muted - expires <i>' + modTime.fromNow() + '</i>'
				}));

				if (name in data.users)
					data.users[data.socket.username].emit('chat message', functions.clientMsg({
						type: functions.msgType.Server,
						msg: 'You have been muted by <b>' + data.socket.username + '</b> - expires <i>' + modTime.fromNow() + '</i>'
					}));
			});
		}
	},

	/**
	 * Executes Javascript for quick testing
	 */
	javascript: {
		aliases: ['javascript', 'js'],
		role: ['Admin'],
		run: function (args, data) {
			var code = args.toString().replace(/\,/g, ' '),
				msg;

			try {
				msg = eval(code); 
			} catch (e) {
				functions.cmdMsg(functions.cmdType.Error, 'Eval Error: ' + e.message)
				msg = e.message;
			}

			data.users[data.socket.username].emit('console', msg);
			data.users[data.socket.username].emit('chat message', functions.clientMsg({
				type: functions.msgType.Server,
				msg: '<span style="color: #F0DB4F;">(JS)</span> ' + msg
			}));
		}
	},

	/**
	 * [CMD] Kicks a user
	 */
	cmdKick: {
		aliases: ['kick'],
		role: ['CMD'],
		run: function (args, data) {
			var input = args.toString().replace(/\,/g, ' ');

			if (input in data.users) {
				functions.cmdMsg(functions.cmdType.Normal, 'User "' + input + '" has been kicked');
				data.io.emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'User <b>' + input + '</b> has been kicked from the chat'
				}));
				data.users[input].disconnect();
			} else {
				functions.cmdMsg(functions.cmdType.Error, 'User "' + input + '" does not exist');
			}
		}
	},

	/**
	 * [CMD] Bans a user (with a reason)
	 */
	cmdBan: {
		aliases: ['ban'],
		role: ['CMD'],
		run: function (args, data) {
			var name = args[0];

			if (name == null) {
				functions.cmdMsg(functions.cmdType.Error, 'The command was entered incorrectly - ban name reason');
				return;
			}
			var reason = args.splice(1).toString().replace(/\,/g, ' '),
				regex = new RegExp(['^', name, '$'].join(''), 'i'),
				userCheck = functions.userdb.find({ username: regex });

			userCheck.sort().limit(1).exec(function (err, result) {
				if (err) {
					functions.cmdMsg(functions.cmdType.Error, err);
					return;
				}
				if (result.length < 1) {
					functions.cmdMsg(functions.cmdType.Error, 'User "' + name + '" was not found');
					return;
				}
				if (result[0].ban === true) {
					functions.cmdMsg(functions.cmdType.Error, '"' + name + '" is already banned');
					return;
				}
				functions.userdb.update({ username: name }, { ban: true, banReason: reason }, function (err) { if (err) { functions.cmdMsg(functions.cmdType.Error, err); return; } });

				if (name in data.users)
					data.users[name].disconnect();

				functions.cmdMsg(functions.cmdType.Normal, '"' + name + '" has been banned');
				data.io.emit('chat message', functions.clientMsg({
					type: functions.msgType.Server,
					msg: 'User <b>' + name + '</b> has been banned for <i>' + reason + '</i>'
				}));
			});
		}
	},

	/**
	 * [CMD] Unbans a user
	 */
	cmdUnban: {
		aliases: ['unban'],
		role: ['CMD'],
		run: function (args, data) {
			var name = args[0],
				regex = new RegExp(['^', name, '$'].join(''), 'i'),
				userCheck = functions.userdb.find({ username: regex });

			userCheck.sort().limit(1).exec(function (err, result) {
				if (err) {
					functions.cmdMsg(functions.cmdType.Error, err);
					return;
				}
				if (result.length < 1) {
					functions.cmdMsg(functions.cmdType.Error, '"' + name + '" was not found');
					return;
				}
				if (result[0].ban === false) {
					functions.cmdMsg(functions.cmdType.Error, '"' + name + '" is not banned');
				} else {
					functions.userdb.update({ username: name }, { ban: false, banReason: '' }, function (err) { if (err) { functions.cmdMsg(functions.cmdType.Error, err); return; } });
					functions.cmdMsg(functions.cmdType.Normal, '"' + name + '" has been unbanned');
				}
			});
		}
	},

	/**
	 * [CMD] Changes a user's role
	 */
	 cmdRole: {
	 	aliases: ['role'],
	 	role: ['CMD'],
	 	run: function (args, data) {
	 		var name = args[0],
	 			role = args[1],
	 			validRoles = { User: 'User', Admin: 'Admin' };

	 		if (!name || !role) {
	 			functions.cmdMsg(functions.cmdType.Error, 'You must enter a username and role');
				return;
	 		}
	 		role = role.charAt(0).toUpperCase() + args[1].slice(1);
	 		if (!(role in validRoles)) {
	 			functions.cmdMsg(functions.cmdType.Error, 'Role ' + role + ' is not a valid role. Pick from the following: ' + Object.keys(validRoles).toString().replace(/\,/g, ', '));
				return;
	 		}

			var regex = new RegExp(['^', name, '$'].join(''), 'i'),
				userCheck = functions.userdb.find({ username: regex });

			userCheck.sort().limit(1).exec(function (err, result) {
				if (err) {
					functions.cmdMsg(functions.cmdType.Error, err);
					return;
				}
				if (result[0].length < 1) {
					functions.cmdMsg(functions.cmdType.Error, '"' + name + '" was not found');
					return;
				}
				if (result[0].role == role) {
					functions.cmdMsg(functions.cmdType.Error, '"' + name + '" is already a ' + result[0].role);
					return;
				}
				if (role == 'User')
					if (name in data.admins)
						delete data.admins[name];
				if (role == 'Admin')
					data.admins[name]++;

				data.users[name].role = role;

				functions.updateNicknames(data.io, data.users, data.admins, data.status);
				functions.userdb.update({ username: name }, { role: role }, function (err) { if (err) { functions.cmdMsg(functions.cmdType.Error, err); return; } });
				functions.cmdMsg(functions.cmdType.Normal, '"' + name + '"\'s role has been changed to ' + role);
				data.io.emit('chat message', functions.clientMsg({
					type: functions.msgType.ServerSave,
					msg: '<b>' + name + '</b>\'s role has been changed to ' + role
				}));
			});
		}
	}
}