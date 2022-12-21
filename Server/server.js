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

  // handle the "create game" event from the client
  socket.on('createGame', () => {
    console.log(`Client ${socket.id} creating a new game`);

    // create a new game and add it to the list of active games
    const game = new Game(socket.id);
    games.push(game);

    // add the client as the first player of the game
    game.addPlayer(socket);
    let tmp_id = game.id;
    console.log(tmp_id);
    // notify the client that they have successfully created a new game
    socket.emit('gameCreated', tmp_id);
  });

  // handle the "join game" event from the client
  socket.on('joinGame', (gameId) => {
    console.log(`Client ${socket.id} joining game ${gameId}`);

    // find the game that the client wants to join
    const game = games.find((game) => game.id == gameId);
    console.log(game);
    if (!game) {
      // if no such game exists, notify the client
      socket.emit('invalidGameId');
      return;
    }

    // add the client as a player of the game
    game.addPlayer(socket);

    // send the game state to the new player
    socket.emit('gameJoined', game.getState());

  // handle the "start game" event from the client
  socket.on('startGame', () => {
    console.log(`Client ${socket.id} starting game ${game.id}`);

    // start the game
    game.start();

    // send the updated game state to all players
    game.players.forEach((player) => {
      player.socket.emit('gameStarted', game.getState());
    });
  });

  // handle the "play card" event from the client
  socket.on('playCard', (card) => {
    console.log(`Client ${socket.id} playing card ${card.color} ${card.value} in game ${game.id}`);

    // play the card and get the updated game state
    const state = game.playCard(socket.id, card);

    // send the updated game state to all players
    game.players.forEach((player) => {
      player.socket.emit('gameUpdated', state);
    });

    // check if the game has ended
    if (state.gameEnded) {
      // if the game has ended, remove it from the list of active games
      games = games.filter((g) => g.id !== game.id);
    }
  });

  // handle the "draw card" event from the client
  socket.on('drawCard', () => {
    console.log(`Client ${socket.id} drawing a card in game ${game.id}`);

    // draw a card and get the updated game state
    const state = game.drawCard(socket.id);

    // send the updated game state to all players
    game.players.forEach((player) => {
      player.socket.emit('gameUpdated', state);
    });
  });
});



http.listen(8080, () => console.log('listening on http://localhost:8080') );
