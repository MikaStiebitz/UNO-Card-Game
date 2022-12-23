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
  });

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


// Game class to represent a UNO game
class Game {
  constructor(creator) {
    this.id = Date.now();
    this.creator = creator;
    this.players = [];
    this.deck = this.createDeck();
    this.discardPile = [];
    this.currentTurn = 0;
    this.started = false;
    this.gameEnded = false;
  }

  // create a new deck of UNO cards
  createDeck() {
    const deck = [];
    const colors = ['red', 'yellow', 'green', 'blue'];
    const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'Skip', 'Reverse', 'Draw Two'];
    for (const color of colors) {
      for (const value of values) {
        deck.push({ color, value });
      }
    }
    for (const value of ['Wild', 'Wild Draw Four']) {
      for (let i = 0; i < 4; i++) {
        deck.push({ color: 'black', value });
      }
    }
    return this.shuffle(deck);
  }

  // shuffle an array in place using the Fisher-Yates shuffle
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // add a player to the game
  addPlayer(socket) {
    this.players.push({
      id: socket.id,
      socket,
      hand: [],
    });
  }

  // remove a player from the game
  removePlayer(playerId) {
    this.players = this.players.filter((player) => player.id !== playerId);
  }

  // check if the game has the given player
  hasPlayer(playerId) {
    return this.players.some((player) => player.id === playerId);
  }

  // start the game
  start() {
    // deal 7 cards to each player
    for (let i = 0; i < 7; i++) {
      this.players.forEach((player) => {
        player.hand.push(this.deck.pop());
      });
    }

    // add the first card to the discard pile
    this.discardPile.push(this.deck.pop());

    this.started = true;
  }


  

  // play a card
  playCard(playerId, card) {

    // find the player who played the card
    const player = this.players.find((player) => player.id === playerId);
    if (!player) {
      return;
    }

    // check if the card is valid to play
    if (!this.isValidCard(card)) {
      player.socket.emit('invalidCard');
      return this.getState();
    }

    // remove the card from the player's hand
    player.hand = player.hand.filter((c) => c !== card);

    // add the card to the discard pile
    this.discardPile.push(card);

    switch (card.value) {
      // ...
      case 'Wild':
      case 'Wild Draw Four':
        // store the player's chosen color in a temporary variable
        player.chosenColor = card.chosenColor;
        // skip the current player's turn
        this.currentTurn = (this.currentTurn + 1) % this.players.length;
        break;
      default:
        // move to the next player's turn
        this.currentTurn = (this.currentTurn + 1) % this.players.length;
        break;
    }

    // check if the player has won
    if (player.hand.length === 0) {
      this.gameEnded = true;
    }

    return this.getState();
  }

  // draw a card
  drawCard(playerId) {
    // find the player who drew the card
    const player = this.players.find((player) => player.id === playerId);
    if (!player) {
      return;
    }

    // check if the player can draw a card
    if (!this.canDrawCard(player)) {
      player.socket.emit('cannotDrawCard');
      return this.getState();
    }

    // draw a card and add it to the player's hand
    player.hand.push(this.deck.pop());

    // move to the next player's turn
    this.currentTurn = (this.currentTurn + 1) % this.players.length;

    return this.getState();
  }

  // check if a card is valid to play
  isValidCard(card) {
    const topCard = this.discardPile[this.discardPile.length - 1];
    console.log("=");
    console.log(topCard);
    console.log("=");
    if (card.color === topCard.color || card.value === topCard.value || card.color === 'black') {
      return true;
    }
    return false;
  }

  // check if a player can draw a card
  canDrawCard(player) {
    const topCard = this.discardPile[this.discardPile.length - 1];
    return !player.hand.some((card) => this.isValidCard(card));
  }

  // get the current state of the game
  getState() {
    return {
      id: this.id,
      creator: this.creator,
      players: this.players.map((player) => ({
        id: player.id,
        hand: player.hand,
      })),
      deckSize: this.deck.length,
      discardPile: this.discardPile,
      currentTurn: this.players[this.currentTurn].id,
      started: this.started,
      gameEnded: this.gameEnded,
    };
  }

  // check if the game should end
  shouldEnd() {
    return this.players.length === 0;
  }
}});

http.listen(8080, () => console.log('listening on http://localhost:8080') );
