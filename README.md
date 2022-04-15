# Wrath of Toldir

A very simple MMORPG with the aim of learning more about Cloudflare's application platform and doing something fun.

## TODO List

- [ ] Transitioning between maps should put you in the right position
- [ ] Simple mobile controls using a virtual joystick
- [ ] Chat bubbles
- [ ] HUD - switch between physical and magical attack (numbers 1, 2, 3)
- [ ] Magic Attacks
- [ ] Joining a map should only tell you about stuff you can see (so not all people / npcs and their positions)
- [ ] Attacks should kill NPC
- [ ] Item system should hold inventory
- [ ] Loot items
- [ ] Water should be animated
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

## Credits

* Phaser 3 - https://github.com/photonstorm/phaser
* Artwork from 'World of Solaria' - http://www.jamiebrownhill.com
* Serialisation using FlatBuffers - https://github.com/google/flatbuffers

