var express = require('express');
var socket = require('socket.io');

//Express server set up
var app = express ();
//cli: nodemon index.js
var server = app.listen(4000, function(){
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
  io.to(socket.id).emit('connected', socket.id)

  socket.on('waiting',(pregMatched)=>
  {

    waitingList.push(socket.id);
    console.log('waitingList', waitingList)

    if(waitingList.length > 1)
    {
      const user1 = waitingList.pop();
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

        io.to(user1).emit('userid', msg);
        io.to(user2).emit('userid:', msg);
        //user2 is getting an offer from user1
        io.to(user2).emit('initiate-offer', msg);
      }

    }
    socket.on('video-offer', (msg)=>{
      //user2 always sends the answer to user1
      io.to(msg.user1).emit('received-offer', msg);
    })

    socket.on('answer', (msg)=>{
      //user2 always sends the answer to user1
      io.to(msg.user1).emit('answered', msg);
    })


    socket.on('new-ice-candidate', (msg)=>{
      io.to(msg.target).emit('received-ice-candidate', msg);
    })

    socket.on('disconnect', () =>
    {
      console.log('diconnected ', socket.id)
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
                 io.to(users[i]).emit('go-wait');
               }
             }
             pairs.splice(i, 1);
           }
         }

    }) //disconnect

  }) //waiting

}); //on connect
