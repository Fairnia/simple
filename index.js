var express = require('express');
var socket = require('socket.io');
var PORT = process.env.PORT || 4000;

//Express server set up
var app = express ();
//cli: nodemon index.js
var server = app.listen(PORT, function(){
  console.log('listening on *:4000');
});

// connecting to the static files
app.use(express.static('public'));

//socket (signaling setup)
var io = socket(server);

// make a list of all current users waiting to be connected
const waitingList = [];
const pairs = [];

//when a socket makes a connection from the browser
io.on('connection',function(socket)
{

  socket.on('waiting',()=>
  {
    socket.to(socket.id).emit('backinwaiting');
    waitingList.push(socket.id);
    console.log('waitingList', waitingList)

    if(waitingList.length > 1)
    {
      const user1 = waitingList.shift();
      const user2 = waitingList.pop();

      if (!io.sockets.connected[user1]) {
        waitingList.push(user2);
      } else if (!io.sockets.connected[user2]) {
        waitingList.push(user1);
      } else {
        const msg = {
          user1: user1,
          user2: user2
        }

        const paired = user1.concat('///',user2);
        pairs.push(paired);

        io.to(user1).emit('match', msg);
        console.log('user2 ', user2)
        io.to(user2).emit('match', msg);
        //user2 will create the peerconnection
        io.to(user2).emit('start-pc-user2', msg);

      }

    }
    socket.on('send-offer-user1', (msg)=>{
      io.to(msg.user1).emit('video-offer-user1',msg);
    });

    socket.on('send-resp-user2', (msg)=>{
      io.to(msg.user1).emit('video-answer-user2',msg);
    });

    socket.on('new-ice-to-user1', (msg)=>{
      io.to(msg.user1).emit('handle-ice-to-user1',msg);
    });
    socket.on('new-ice-to-user2', (msg)=>{
      io.to(msg.user2).emit('handle-ice-to-user2',msg);
    });


    socket.on('disconnect', () =>
    {
      console.log('disconnected ', socket.id)
       // If disconnected user was in waiting state
       waitingListIndex = waitingList.indexOf(socket.id);
       if(waitingListIndex > -1){
         waitingList.splice(waitingList.indexOf(socket.id), 1);
       }

       //if disconnected user was in chat we have to get her/his partner back in waitingList array
         for (i = pairs.length - 1; i >= 0; i--) {
           if (pairs[i].includes(socket.id)) {
             const users = pairs[i].split("///");
             for (i = users.length - 1; i >= 0 ; i--) {
               if(users[i] !== socket.id){
                 io.to(users[i]).emit('getNewPeerId');
               }
             }
             pairs.splice(i, 1);
           }
         }

    }) //disconnect

  }) //waiting

}); //on connect
