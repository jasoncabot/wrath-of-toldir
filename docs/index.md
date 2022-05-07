## Wrath of Toldir

An open-souce MMORPG

## Architecture

The game is split into two components, the [client](/client) and [server](/server)

The client is responsible for presenting the current state of the game and accepting commands from the player.

The server listens for connections from the client and processes received commands from players, emitting events as things happen.

At it's core, the game is fundamentally turn-based, where the server processes all commands each tick. The ticks are advanced on a regular schedule on the server but the client is unaware of this.
