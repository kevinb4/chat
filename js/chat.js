/**
 * @fileoverview Client handler
 * @author xCryptic (Github)
 */

var socket = io(),
	username = $('#username'),
	btnLogin = $('#btnLogin'),
	btnRegister = $('#btnRegister'),
	btnSubmit = $('#btnSubmit'),
	regUsername = $('#regUsername'),
	regPassword = $('#regPassword'),
	regpasswordConfirm = $('#regpasswordConfirm'),
	txtUsername = $('#username'),
	txtPassword = $('#password'),
	loginForm = $('#login'),
	registerForm = $('#registerForm'),
	chat = $('#chat'),
	chatbox = $('#chat-box'),
	reply = $('#reply'),
	textarea = $('#chat-textarea'),
	send = $('#send'),
	users = $('#online-users'),
	options = $('#options'),
	btnOptions = $('#btnOptions'),
	btnSave = $('#btnSave'),
	optionslist = $('#options_list'),
	checkbox1 = document.getElementById('checkbox1'),
	isEdit = false,
	audio = new Audio('mp3/alert.mp3');

/**
 * Handles logging in
 */
function login() {
	var loginDetails = { username: txtUsername.val(), password: txtPassword.val() }

	socket.emit('user login', loginDetails, function (data) {
		if (data == 'success') { // have the server check if the username is valid
			loginForm.fadeOut('slow', function () {
				chat.fadeIn('slow', function () { }); // fade into the chatbox
				btnOptions.fadeIn('slow', function () { });
				chatbox.scrollTop($(chatbox).get(0).scrollHeight); // scroll to the bottom
			});
		} else {
			alert(data);
		}
	});
}

/**
 * Handles sending messages
 */
function sendMessage() {
	socket.emit('rstatus');
	if (isEdit === true) {
		socket.emit('edit message', reply.val());
		reply.val(''); // clear the reply box
		isEdit = false;
	} else {
		socket.emit('chat message', reply.val()); // emit the message
		reply.val(''); // clear the reply box
	}
}

/**
 * Adds the message to the chat box
 * @param {msg}
 */
function appendMessage(msg) {
	var scrollpos = (chatbox).scrollTop(),
		scrolltotal = chatbox.prop('scrollHeight'),
		bottom = scrolltotal - scrollpos;

	textarea.append(msg); // show message
	chatbox.perfectScrollbar('update');
	$('[data-toggle="tooltip"]').tooltip(); // for full timestamp

	if (bottom == 400) { // check to see if the scroll bar is at the bottom
		chatbox.scrollTop($(chatbox).get(0).scrollHeight); // scroll to the bottom
		chatbox.perfectScrollbar('update');
	}
}

/**
 * Adds the recent messages recieved from the server
 * @param {msgs}
 */
function loadMessages(msgs) {
	for (var i = Object.keys(msgs).length - 1; i >= 0; i--) {
		appendMessage(message(msgs[i]));
	}
}

/**
 * Sends the id of the text to the server
 * @param {object}
 */
function clickHandler(object) {
	socket.emit('delete message', object.id);
}

function message (data) {
	var classType,
		localTime = moment(data.time).format('LT'),
		localDate = moment(data.time).format('LLLL'),
		localHours = moment(data.time).hour();

	if (localHours > 0 && localHours < 10 || localHours > 12 && localHours < 22)
		localTime = "0" + localTime;

	switch (data.type) {
		case 'Server':
		case 'ServerSave':
			classType = 'serverMsg';
			break;

		case 'ServerLeave': classType = 'serverLeave'; break;
		case 'Whisper': classType = 'whisper'; break;
		case 'Admin': classType = 'adminMsg'; break;
		default: classType = ''; break;
	}

	return '<span id="' + data.id + '"><span id="' + data.id + '" class="time" data-toggle="tooltip" data-placement="auto-right" title="' + localDate + '" onclick="clickHandler(this);">' + localTime + '</span> <span class="' + classType + '"><b>' + data.user + (classType.contains('server') ? '</b> ' + data.message + '</span>' : '</b></span>: ' + data.message) + '<br></span>';
}

/**
 * Checks weather the document has loaded
 * 	and hides forms
 */
$(document).ready(function () {
	chat.hide();
	registerForm.hide();
	options.hide();
	btnOptions.hide();
	ifvisible.setIdleDuration(5 * 60); // page will become idle after 5 minutes
});

/**
 * Handles the login button clicking
 */
btnLogin.click(function () {
	login();
});

/**
 * Checks for the enter key being pressed
 */
loginForm.keypress(function (e) {
	if (e.which == 13)
		login();
});

/**
 * Handles clicking the register button
 */
btnRegister.click(function () {
	loginForm.fadeOut('slow', function () {
		registerForm.fadeIn('slow', function () { });
	});
});

/**
 * Handles clicking the submit button
 */
btnSubmit.click(function () {
	var passLen = regPassword.val();

	if (!regPassword.val() == regpasswordConfirm.val()) {
		alert('Your passwords do not match');
	} else if (passLen.length < 2 || passLen.length > 20) {
		alert('Your password must be 3-20 characters long');
	} else {
		var registerDetails = { username: regUsername.val(), password: regPassword.val() }
		socket.emit('register', registerDetails, function (data) {
			if (data == 'success') {
				alert('Signup successful! You may now login');
				registerForm.fadeOut('slow', function () {
					loginForm.fadeIn('slow', function () { });
				});
			} else {
				alert(data);
			}
		});
	}
});

/**
 * Handles clicking the options button
 */
btnOptions.click(function () {
	chat.fadeOut('slow', function () {
		options.fadeIn('slow', function () { });
	});
});

/**
 * Handles clicking the save button
 */
btnSave.click(function () {
	if (checkbox1.checked)
		optSound = true;
	else
		optSound = false;

	socket.emit('settings saved', optSound);
	options.fadeOut('slow', function () {
		chat.fadeIn('slow', function () { });
	});
});

/**
 * Handles clicking the send button
 */
send.click(function () {
	sendMessage();
});

/**
 * Checks for the enter key being pressed
 */
reply.keypress(function (e) { // Checks for keys being pressed
	if (e.which == 13) { // Pressing Enter
		sendMessage();
	}
});

/**
 * Handles functions before a key is pressed
 * For help on key codes:
 * https://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
 */
reply.keydown(function (e) {
	var replyText = document.getElementById('reply').value,
		value = e.which;

	switch (true) {
		case (value == 8): return; // backspace

		case (value == 38): // up arrow key
			if (replyText.length == 0)
				socket.emit('get prev msg');
			break;

		case (value == 27): // esc key
			isEdit = false;
			break;

		case (value == 191): // '/' key
			if (replyText.length <= 1) return;
			break;

		case (value == 32 || value == 173): // space and -
		case (value >= 48 && value <= 90): // 0-9, a-z
		case (value >= 96 && value <= 111): // numberpad 0-9, and multiply, add, subtract, divide
		case (value >= 186 && value <= 192): // signs
		case (value >= 219 && value <= 222): // more signs
			if (replyText.length == 0)
					socket.emit('typing');
			break;

		default: return;
	}
});

/**
 * Handles functions after a key is pressed
 */
reply.keyup(function (e) {
	if (!this.value)
		if (e.which == 8 || e.which == 17) // backspace or ctrl (for ctrl + z)
			socket.emit('rstatus');
});

/**
 * Checks to see if the tab is focused
 */
ifvisible.on('focus', function () {
	document.title = 'ChatProject';
});

/**
 * Detects when the user goes idle
 */
ifvisible.on('idle', function () {
	socket.emit('idle');
});

/**
 * Detects when the user comes back from being idle
 */
ifvisible.on('wakeup', function () {
	socket.emit('ridle');
});

socket.on('console', function (data) {
	console.log(data)
});

socket.on('userdata', function (userdata) {
	admins = userdata.admins;
	users = userdata.users;
});

/**
 * Handles sending messages to the chat box
 * @param {msg}
 */
socket.on('chat message', function (msg) {
	appendMessage(message(msg));

	if (!ifvisible.now()) {
		if (chat.is(":visible")) // so we don't get this on the login screen
			document.title = '[!] ChatProject';
		if (checkbox1.checked)
			audio.play();
	}
});

/**
 * Handles saving settings
 * @param {data}
 */
socket.on('settings', function (data) {
	checkbox1.checked = data;
});

/**
 * Adds the delete command to the message box
 * @param {data}
 */
socket.on('del msg id', function (id) {
	document.getElementById('reply').value = '/delete ' + id;
	reply.focus();
});

/**
 * Handles getting recent message from the server
 * @param {msg}
 */
socket.on('rcv prev msg', function (msg) {
	if (!(msg == null)) {
		isEdit = true;
		reply.val(msg);
	}
});

/**
 * Handles editing messages
 * @param {data}
 */
socket.on('edited message', function (data) {
	document.getElementById(data.id).innerHTML = message(data);
	chatbox.perfectScrollbar('update');
});

/**
 * Handles deleting messages
 * @param {data}
 */
socket.on('delete message', function (data) {
	try {
		var element = document.getElementById(data);
		element.outerHTML = '';

		delete element;
		chatbox.perfectScrollbar('update');
	} catch (err) {
		console.log(err);
	}
});

/**
 * Handles adding usernames to the userlist
 * @param {data}
 */
socket.on('usernames', function (data) {
	var list = '';

	for (var i = 0; i < data.length; i++)
		list += data[i];

	document.getElementById('online-users').innerHTML = list;
});

/**
 * Handles disconnecting
 */
socket.on('disconnect', function () {
	textarea.html(''); // clear the chat
	users.html(''); // clear the userlist
	appendMessage('<span class="time" data-toggle="tooltip" data-placement="auto-right" title="' + moment().format('LLLL') + '">' + moment().format('LT') + '</span> <span class="serverMsg"><b>[Server]</b> You have been disconnected</span>');
	reply.fadeOut('slow', function () { }); // so the user can no longer type
	btnOptions.fadeOut('slow', function () { }); // so the user can't change options
});

/**
 * Handles loading the last 50 messages from the server
 * @param {msgs}
 */
socket.on('load messages', function (msgs) {
	var txt = $('#chat-textarea');

	if (txt.text().indexOf('You have been disconnected') !== -1) { // this way, the messages won't load in if the user is still on the div chat
		chat.fadeOut('slow', function () {
			loginForm.fadeIn('slow', function () { }); // fade into the chatbox
			reply.fadeIn('slow', function () { }); // so the user can type again
			textarea.html(''); // clear the chat
			loadMessages(msgs);
		});
	} else {
		loadMessages(msgs);
	}
});