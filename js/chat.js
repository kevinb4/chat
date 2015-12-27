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
	progBar = $('#progressbar'),
	options = $('#options'),
	btnOptions = $('#btnOptions'),
	btnSave = $('#btnSave'),
	optionslist = $('#options_list'),
	isEdit = false;

/**
 * Handles logging in
 */
function login() {
	var loginDetails = { username : txtUsername.val(), password : txtPassword.val() }
	socket.emit('user login', loginDetails, function (data) {
		if (data == 'success') { // have the server check if the username is valid
			loginForm.fadeOut("slow", function () {
				chat.fadeIn("slow", function () { }); // fade into the chatbox
				btnOptions.fadeIn("slow", function () { });
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
	if (isEdit === true) {
		socket.emit('edit message', reply.val());
		reply.val(""); // clear the reply box
		isEdit = false;
	} else {
		socket.emit('chat message', reply.val()); // emit the message
		reply.val(""); // clear the reply box
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
	for (var i = msgs.length - 1; i >= 0; i--) {
		var localTime = moment(msgs[i].msg[0].time).format('LT'),
			localDate = moment(msgs[i].msg[0].time).format('LLLL');

		appendMessage(msgs[i].msg[0].idSpan + '<font size="2" data-toggle="tooltip" data-placement="auto-right" title="' + localDate + '" id="' + msgs[i].msg[0].id + '" onclick="clickHandler(this);">' + localTime + '</font> ' + msgs[i].msg[0].user + msgs[i].msg[0].message + '</font><br/>');
	}
}

/**
 * Checks if the window is fucoused
 */
window.onfocus = function() {
	document.title = "ChatProject";
}

/**
 * Plays a sound (for notifications)
 */
$.extend({
	playSound: function(){
		return $("<embed src='" + arguments[0] + ".mp3' hidden='true' autostart='true' loop='false' height='0' width='0' class='playSound'>" + "<audio autoplay='autoplay' style='display:none;' controls='controls'><source src='"+arguments[0]+".mp3' /><source src='"+arguments[0]+".ogg' /></audio>").appendTo('body');
	}
});

/**
 * Sends the id of the text to the server
 * @param {object}
 */
function clickHandler(object) {
	socket.emit('delete message', object.id);
}

/**
 * Checks weather the document has loaded
 * 	and hides forms
 */
$(document).ready(function() {
	chat.hide();
	registerForm.hide();
	options.hide();
	btnOptions.hide();
});

/**
 * Handles the login button clicking
 */
btnLogin.click(function() {
	login();
});

/**
 * Checks for the enter key being pressed
 */
txtPassword.keypress(function(e) {
	if (e.which == 13) {
		login();
	}
});

/**
 * Handles clicking the register button
 */
btnRegister.click(function() {
	loginForm.fadeOut("slow", function () {
		registerForm.fadeIn("slow", function () { });
	});
});

/**
 * Handles clicking the submit button
 */
btnSubmit.click(function() {
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
				registerForm.fadeOut("slow", function () {
					loginForm.fadeIn("slow", function () { });
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
btnOptions.click(function() {
	chat.fadeOut("slow", function () {
		options.fadeIn("slow", function () { });
	});
});

/**
 * Handles clicking the save button
 */
btnSave.click(function() {
	var checkbox1 = document.getElementById('checkbox1');
	if (checkbox1.checked) {
		optSound = true;
	} else {
		optSound = false;
	}
	socket.emit('settings saved', optSound);
	options.fadeOut("slow", function () {
		chat.fadeIn("slow", function () { });
	});
});

/**
 * Handles clicking the send button
 */
send.click(function() {
	sendMessage();
});

/**
 * Checks for the enter key being pressed
 */
reply.keypress(function(e) { // Checks for keys being pressed
	if (e.which == 13) { // Pressing Enter
		sendMessage();
	}
});

/**
 * Checks to see if the up arrow key was pressed
 */
reply.keydown(function(e) {
	switch(e.which) {
		case 38:
			socket.emit('get prev msg');
		break;

		default: return;
	}
	e.preventDefault();
});

/**
 * Checks for window visibility
 *	(not perfect)
 */
var vis = (function(){
	var stateKey, eventKey, keys = {
		hidden: "visibilitychange",
		webkitHidden: "webkitvisibilitychange",
		mozHidden: "mozvisibilitychange",
		msHidden: "msvisibilitychange"
	};
	for (stateKey in keys) {
		if (stateKey in document) {
			eventKey = keys[stateKey];
			break;
		}
	}
	return function(c) {
		if (c) document.addEventListener(eventKey, c);
		return !document[stateKey];
	}
})();

/**
 * Handles sending messages to the chat box
 * @param {msg}
 */
socket.on('chat message', function (msg) {
	var localTime = moment(msg.time).format('LT'),
		localDate = moment(msg.time).format('LLLL');

	appendMessage(msg.idSpan + '<font size="2" data-toggle="tooltip" data-placement="auto-right" title="' + localDate + '" id="' + msg.id + '" onclick="clickHandler(this);">' + localTime + '</font> ' + msg.user + msg.message + '</font><br/>');
	if (chat.is(":visible")) {
		if(vis() == true) {
			document.title = "ChatProject";
		} else {
			document.title = "[!] ChatProject";
			var checkbox1 = document.getElementById('checkbox1');
			if (checkbox1.checked)
				$.playSound('mp3/alert');
		}
	}
});

/**
 * Handles saving settings
 * @param {data}
 */
socket.on('settings', function(data) {
	var checkbox1 = document.getElementById('checkbox1');
	checkbox1.checked = data;
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
socket.on('edited message', function(data) {
	var localTime = moment(data.time).format('LT'),
		localDate = moment(data.time).format('LLLL')

	document.getElementById(data.id).innerHTML = '<font size="2" data-toggle="tooltip" data-placement="auto-right" title="' + localDate + '" id="' + data.id + '" onclick="clickHandler(this);">' + localTime + '</font> ' + data.user + data.message + '<br/>';
});

/**
 * Handles deleting messages
 * @param {data}
 */
socket.on('delete message', function(data) {
	var element = document.getElementById(data);
	element.outerHTML = "";
	try {
		delete element;
	} catch (err) {
		console.log(err);
	}
	chatbox.perfectScrollbar('update');
});

/**
 * Handles adding usernames to the userlist
 * @param {data}
 */
socket.on('usernames', function (data) {
	var list = '';
	for (var i = 0; i < data.length; i++) {
		list += data[i];
	}
	document.getElementById('online-users').innerHTML = list;
});

/**
 * Handles disconnecting
 */
socket.on('disconnect', function () {
	textarea.html(''); // clear the chat
	users.html(''); // clear the userlist
	appendMessage('<font size="2" data-toggle="tooltip" data-placement="auto-right" title="' + moment().format('LLLL') + '" onclick="clickHandler(this);">' + moment().format('LT') + '</font> <font color="#5E97FF"><b>[Server]</b> You have been disconnected</font><br/>');
	reply.fadeOut('slow', function() { }); // so the user can no longer type
});

/**
 * Handles loading the last 50 messages from the server
 * @param {msgs}
 */
socket.on('load messages', function (msgs) {
	var txt = $('#chat-textarea');
	if (txt.text().indexOf('You have been disconnected') !== -1) { // this way, the messages won't load in if the user is still on the div chat
		chat.fadeOut("slow", function () {
			loginForm.fadeIn("slow", function () { }); // fade into the chatbox
			reply.fadeIn('slow', function() { }); // so the user can type again
			textarea.html(''); // clear the chat
			loadMessages(msgs);
		});
	} else {
		loadMessages(msgs);
	}
});