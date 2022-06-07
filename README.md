# Wrath of Toldir

A very simple MMORPG with the aim of learning more about Cloudflare's application platform and doing something fun.

## TODO List

- [ ] Interact with objects / friendly NPCs
- [ ] Quests
- [ ] Character should gain/lose health/mana/experience
- [ ] Actually spend some time making the React app frame look semi-decent
- [ ] Dynamic Lighting
- [ ] Sounds
- [ ] Monsters should fight back
- [ ] Magic Attacks
- [ ] Joining a map should only tell you about stuff you can see (so not all people / npcs and their positions)
- [ ] Item system should hold inventory
- [ ] Water should be animated
- [ ] Fishing
- [ ] Crafting
- [X] Transitions between scenes can be animated nicely
- [X] Loot items
- [X] HUD - switch between physical and magical attack (numbers 1, 2, 3)
- [X] Simple mobile controls using a virtual joystick
- [X] Attacks should kill NPC
- [X] Chat bubbles
- [X] Transitioning between maps should put you in the right position
- [X] NPCs should have some kind of basic AI - I mean they walk randomly
- [X] Spawning of players and monsters should not be on an invalid tile
- [X] Transfer player between maps (zones)
- [X] Combat system should hold HP, ATK, DEF e.t.c
- [X] Add NPC characters that just amble about
- [X] Add an attack action
- [X] Maps should share tiles
- [X] Events should trigger animations
- [X] Tile Collisions

## Development

The one thing you should never attempt is to write an MMORPG.

However if you want to give it a go, you can run:

```shell
$ yarn
# In ./client
$ yarn start
# In ./server
$ yarn dev
```

## Architecture

Front end is built using a mixture of React for everything out of game and in-game text. Phaser is used to render the WebGL canvas using a 2d tile grid.

API runs using a Cloudflare worker that is responsible for setting up an authenticated WebSocket connection to a Durable Object for all in-game actions.

Players issue `Commands` encoded in a FlatBuffer, these are validated on the server, which then emits `Events` to interested Observers.

The [current list of commands](https://github.com/jasoncabot/wrath-of-toldir/blob/main/shared/flatbuffers/commands.fbs#L35) that a player can issue.

### Durable Objects

Used to hold information about [various independent systems](https://github.com/jasoncabot/wrath-of-toldir/tree/main/server/src/durable-objects).

#### Character

One Durable Object exists for every user of the game. A single user can be considered as an account and has up to 5 characters.

#### Map

A map is the most complex object. It can be thought of as a zone or area in a traditional MMORPG. When a character connects it is a map that is responsible for establishing the WebSocket connection, responding to commands and issuing events to all characters.

#### Item

A Durable Object for items exists 1 per map, for every item that is on the floor. This is updated when items are dropped from monsters upon being killed or when a player picks up a particular item.

#### Combat

A Durable Object exists for every player within the game. It is responsible for holding a single players health, attack and defence statistics. When a player makes an attack or defends the adjustments are synchronously processed by this object.

## Map Editing

All Maps are located in `./shared/maps` and can be opened using Tiled.

After editing a `*.tmx` file you must export using Tiled as JSON to `./server/src/data/maps`

## Credits

* Phaser 3 - https://github.com/photonstorm/phaser
* Artwork from 'World of Solaria' - http://www.jamiebrownhill.com
* Serialisation using FlatBuffers - https://github.com/google/flatbuffers
* Tiled Map Editor - https://www.mapeditor.org
