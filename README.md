# Wrath of Toldir

A very simple MMORPG with the aim of learning more about Cloudflare's application platform and doing something fun.

## TODO List

- [ ] Interact with objects / friendly NPCs
- [ ] Transitions between scenes can be animated nicely
- [ ] Quests
- [ ] Character should gain/lose health/mana/experience
- [ ] Actually spend some time making the React app frame look semi-decent
- [ ] Dynamic Lighting
- [ ] Sounds
- [ ] Monsters should fight back
- [ ] Magic Attacks
- [ ] Joining a map should only tell you about stuff you can see (so not all people / npcs and their positions)
- [ ] Item system should hold inventory
- [ ] Loot items
- [ ] Water should be animated
- [ ] Fishing
- [ ] Crafting
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

## Map Editing

All Maps are located in `./shared/maps` and can be opened using Tiled.

After editing a `*.tmx` file you must export using Tiled as JSON to `./server/src/data/maps`

## Credits

* Phaser 3 - https://github.com/photonstorm/phaser
* Artwork from 'World of Solaria' - http://www.jamiebrownhill.com
* Serialisation using FlatBuffers - https://github.com/google/flatbuffers
* Tiled Map Editor - https://www.mapeditor.org
