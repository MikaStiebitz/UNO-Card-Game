const http = require('http').createServer();

const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

// list of all connected clients
let clients = [];

// list of all active games
let games = [];

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // add the new client to the list of clients
  clients.push(socket);

  // send a list of all available games to the new client
  socket.emit('updateGamesList', games.map((game) => game.id));

  // handle client disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    // remove the client from the list
    clients = clients.filter((client) => client.id !== socket.id);

    // find the game that the disconnected client was part of, if any
    const gameIndex = games.findIndex((game) => game.hasPlayer(socket.id));
    if (gameIndex >= 0) {
      // if the client was part of a game, remove them from the game and
      // check if the game should be ended
      const game = games[gameIndex];
      game.removePlayer(socket.id);
      if (game.shouldEnd()) {
        // if the game should end, remove it from the list of active games
        games.splice(gameIndex, 1);
      } else {
        // if the game should continue, notify the remaining players of the
        // disconnected player's departure
        game.players.forEach((player) => {
          player.socket.emit('playerDisconnected', socket.id);
        });
      }
    }
  })});
