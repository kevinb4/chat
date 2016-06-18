#Chat
This is a chat I started from scratch (check out the chat-legacy for previous commits). It's been a great learning experience so far, and I plan to work on it here and there.

#Requirements
- Node.js must be installed (found here http://nodejs.org/)
- MongoDB must be installed and running (found here https://www.mongodb.org/)

#Node.js Requirements
- bcrypt-nodejs
- colors
- express
- moment
- mongoose
- socket.io

#Setting up MongoDB
1. Install MongoDB
2. Open CMD and navigate to the bin directory (might look like C:\Program Files\MongoDB\Server\3.0\bin)
3. Execute `mongod.exe --dbpath "...\chat\db"`

You can also make a batch file with the following (the `...` being the path that leads to the respective directories)

```
cd "...\MongoDB\Server\3.0\bin\"
start mongod.exe --dbpath "...\chat\db"
```

MongoDB should now be running. If you run into any issues, refer to MongoDB's docs.

#ToDo List
- [x] Remake UI/Rewrite code from socket.io tutorial
- [x] Add usernames
- [x] Add HTML prevention
- [x] Add server commands
- [x] Add user & admin commands
- [x] Add server messages from cmd
- [x] Add userlist
- [x] Add database
- [x] Add clickable links
- [x] Add whisper function (user command)
- [x] Add timestamp
- [x] Add a custom scrollbar
- [x] Add gitter-like notifcation
- [x] Add Admin/Mod roles (sorta)
- [x] Add login system
- [x] Add sound notifications
- [x] Add "edit previous message" feature
- [x] Add an options menu
- [x] Add function comments
- [ ] Add a command to delete messages with specific text
- [ ] Add status (user idle, user is typing..., etc)
- [ ] Add formatting
- [ ] Write a client in VB.net
- [ ] Write an andriod app

...more to come