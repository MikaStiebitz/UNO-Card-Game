const socket = io('http://localhost:8080');

// handle the "updateGamesList" event from the server
socket.on('updateGamesList', (games) => {
  console.log(`Available games: ${games}`);
});

// handle the "gameCreated" event from the server
socket.on('gameCreated', (gameId) => {
  localStorage.setItem("gameID", gameId);
  console.log(`Game created: ${gameId}`);
});

// handle the "gameJoined" event from the server
socket.on('gameJoined', (state) => {
  console.log(`Game joined: ${state}`);
});

// handle the "gameStarted" event from the server
socket.on('gameStarted', (state) => {
  console.log(`Game started: ${state}`);
});

// handle the "gameUpdated" event from the server
socket.on('gameUpdated', (state) => {
  console.log(`Game updated: ${state}`);
});

// handle the "playerDisconnected" event from the server
socket.on('playerDisconnected', (playerId) => {
  console.log(`Player disconnected: ${playerId}`);
});

// handle the "invalidGameId" event from the server
socket.on('invalidGameId', () => {
  console.log('Invalid game id');
});

// handle the "invalidCard" event from the server
socket.on('invalidCard', () => {
  console.log('Invalid card');
});
  
// handle the "cannotDrawCard" event from the server
socket.on('cannotDrawCard', () => {
  console.log('Cannot draw card');
});

socket.emit('createGame');



var button = document.getElementById("jn_btn");

// Attach a click event handler to the button
button.addEventListener("click", function() {
  // Get the value of the input element with the ID "inputId"
  var inputValue = document.getElementById("gameINP").value;

  // Do something with the input value
  console.log("hidddd" + inputValue);
  socket.emit('joinGame', inputValue);
});


  // Get the value of the input element with the ID "inputId"

// create a new game


// join an existing game


// start the game (assuming the client is the creator of the game)
socket.emit('startGame');

// play a card
socket.emit('playCard', { color: 'red', value: 3 });

// draw a card
socket.emit('drawCard');
