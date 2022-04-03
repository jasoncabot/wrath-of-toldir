import { Direction, GridEngine } from 'grid-engine'
import { DebugText, PlayerCharacter } from '../objects/'

import { Builder, ByteBuffer } from "flatbuffers";
import { EventLog } from '../../models/wrath-of-toldir/events/event-log';
import { AttackEvent, JoinEvent, LeaveEvent, MoveEvent, Npc, Update } from '../../models/events';
import { MoveCommand, JoinCommand, Action, Vec2 } from '../../models/commands';
import { v4 as uuidv4 } from 'uuid';
import { Command } from '../../models/wrath-of-toldir/commands/command';
import { AttackCommand } from '../../models/wrath-of-toldir/commands/attack-command';
import { WalkingAnimatable } from '../objects/playerCharacter';
import Weapon from '../objects/weapon';
import { MapJoinedEvent } from '../../models/wrath-of-toldir/events/map-joined-event';
import { TileMap } from '../../models/wrath-of-toldir/maps/tile-map';
import { MapLayer, TileCollision, TileSet } from '../../models/maps';
import Monster, { MonsterTexture } from '../objects/monster';
import { MapChangedEvent } from '../../models/wrath-of-toldir/events/map-changed-event';

const Directions = [Direction.NONE, Direction.LEFT, Direction.UP_LEFT, Direction.UP, Direction.UP_RIGHT, Direction.RIGHT, Direction.DOWN_RIGHT, Direction.DOWN, Direction.DOWN_LEFT];


/**
 * The state of the user interface for this particular map
 */
enum MapSceneState {
  /**
   * Scene is being / has been created, controls and cameras added but no data
   */
  INITIAL,
  /**
   * Server connection has been established and we have told the server who we are
   */
  JOINED,
  /**
   * Server has sent us all the data required for display - let's rock'n'roll
   */
  READY
}

const authToken = () => {
  let token = window.sessionStorage.getItem('token');
  if (!token) {
    token = uuidv4();
    window.sessionStorage.setItem('token', token);
  }
  return token;
}

export default class MainScene extends Phaser.Scene {
  debugText: DebugText
  cursors: Phaser.Types.Input.Keyboard.CursorKeys
  player: PlayerCharacter
  gridEngine: GridEngine
  map: Phaser.Tilemaps.Tilemap
  interfaceCamera: Phaser.Cameras.Scene2D.Camera;
  onPositionChangedSubscription: any;
  connection: WebSocket | undefined;
  commandSequencer: number;
  currentState = MapSceneState.INITIAL;
  chatOverlay: Phaser.GameObjects.DOMElement | undefined

  constructor() {
    super({ key: 'MainScene' });

    this.commandSequencer = 0;
  }

  preload() {
    Monster.preload(this, "slime1");
    PlayerCharacter.preload(this, "hero1");
    Weapon.preload(this);

    this.load.html('chatbox', 'assets/html/chatbox.html');
  }

  async create() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.interfaceCamera = this.cameras.add();

    this.debugText = new DebugText(this);
    const hud = this.add.image(0, 0, 'hud').setOrigin(0, 0);
    this.cameras.main.ignore([this.debugText, hud]);

    this.input.keyboard.on('keyup', (event: KeyboardEvent) => {
      if (!this.chatOverlay && event.keyCode == Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH) {
        this.showInputDialog();
      }
    });

    this.transitionToInitial("fisherswatch");
  }

  update() {
    this.debugText.update();

    if (this.currentState === MapSceneState.READY) {
      this.player.applyMovement(this.gridEngine, this.cursors, this.input.activePointer);

      if ((this.cursors.shift.isDown && this.input.activePointer.isDown) || this.cursors.space.isDown) {
        this.applyDefaultAction();
      }
    }
  }

  showInputDialog() {
    this.chatOverlay = this.add.dom(0, 576)
      .createFromCache('chatbox')
      .addListener('submit')
      .setOrigin(0, 0);

    this.input.keyboard.enabled = false;
    this.input.keyboard.disableGlobalCapture();

    this.chatOverlay.on('submit', _ => {
      this.input.keyboard.enabled = true;
      this.input.keyboard.enableGlobalCapture();
      const message = (document.getElementById('chatmessage') as HTMLInputElement).value;
      this.onTextEntered(message);
      this.chatOverlay?.destroy();
      this.chatOverlay = undefined;
    });

    document.getElementById('chatmessage')?.focus();
    this.tweens.add({
      targets: this.chatOverlay,
      y: 540,
      duration: 250,
      ease: 'Power3'
    });
  }

  onTextEntered(text: string) {
    // TODO: parse text and send appropriate event to server 
    // ChatEvent
    // CommandEvent
    // * /g 1:1 = move to space (1, 1)
    if (text.startsWith("/g")) {
      // just move us locally - this should tell the server we want to move
      const [x, y] = text.split(" ")[1].split(":");
      this.gridEngine.setPosition("me", { x: parseInt(x, 10), y: parseInt(y, 10) }, this.gridEngine.getCharLayer('me'));
    }
  }

  async openWebSocket(mapId: string) {
    // GET /api/map/name
    // to get an auth token and map id to to open a websocket

    const wsConnectionToken = await fetchConnectionToken(mapId);

    const wsURI = `${process.env.WS_URI}/api/map/${mapId}/connection?token=${wsConnectionToken}`;
    console.log(`Socket connecting ${wsURI} ...`);

    const ws = new WebSocket(wsURI, []);
    ws.onopen = (event: Event) => {
      console.log(`Socket connected ...`);
      let builder = new Builder(128);

      const name = uuidv4();
      const nameOffset = builder.createString(name);
      const join = JoinCommand.createJoinCommand(builder, nameOffset);

      Command.startCommand(builder);
      Command.addSeq(builder, ++this.commandSequencer);
      Command.addActionType(builder, Action.JoinCommand);
      Command.addAction(builder, join);
      const update = Command.endCommand(builder);
      builder.finish(update);
      ws.send(builder.asUint8Array());

      this.transitionToJoined();
    };
    ws.onmessage = async (msg: MessageEvent) => {
      const data: ArrayBuffer = await (msg.data as Blob).arrayBuffer();
      let bb = new ByteBuffer(new Uint8Array(data));
      this.applyUpdate(EventLog.getRootAsEventLog(bb));
    };
    ws.onclose = async (event: CloseEvent) => {
      console.log(`Socket closed (${event.code}) ... `);
      if (event.code !== 1000) { // considered a normal, clean exit, then try to reconnect
        this.transitionToInitial(mapId);
      }
    };
    ws.onerror = async (event: Event) => {
      console.log("Socket error ..." + event);
      ws.close();
    };

    return ws;
  }

  submitAttack() {
    const facing = this.gridEngine.getFacingDirection('me');

    if (!this.player.weaponSprite) {
      this.player.weaponSprite = new Weapon(this, this.player.getCenter().x, this.player.getCenter().y, 'me');
      this.interfaceCamera.ignore(this.player.weaponSprite);
    }
    this.player.playAttackAnimation(facing);

    let builder = new Builder(1024);
    const attack = AttackCommand.createAttackCommand(builder, Directions.indexOf(facing));
    Command.startCommand(builder);
    Command.addSeq(builder, ++this.commandSequencer);
    Command.addActionType(builder, Action.AttackCommand);
    Command.addAction(builder, attack);
    const update = Command.endCommand(builder);
    builder.finish(update);
    this.connection?.send(builder.asUint8Array());
  }

  applyDefaultAction() {
    // TODO: depending on what we have selected we might choose to do something different
    // than just plain attacking
    const lookingAtPosition = this.gridEngine.getFacingPosition('me');
    const tile = this.map.getTileAt(lookingAtPosition.x, lookingAtPosition.y);
    // TODO: if we are facing something interesting

    if (this.player.canAttack) {
      this.player.canAttack = false;
      this.time.delayedCall(500, () => { this.player.canAttack = true });
      this.submitAttack();
    }
  }

  applyUpdate(update: EventLog) {
    for (let i = 0; i < update.eventsLength(); i++) {
      switch (update.eventsType(i)) {
        case Update.MoveEvent: {
          if (this.currentState !== MapSceneState.READY) break;
          const move: MoveEvent = update.events(i, new MoveEvent());
          // We only bother animating (calling moveTo which is expensive since it does all kinds of pathfinding...)
          // if the character is likely already on screen
          const other = this.gridEngine.getSprite(move.key().toString());
          const onScreen = this.cameras.main.worldView.contains(other.x, other.y) || this.cameras.main.worldView.contains(other.x + other.width, other.y + other.height);
          if (onScreen) {
            this.gridEngine.moveTo(move.key().toString(), { x: move.pos()!.x(), y: move.pos()!.y() });
          } else {
            this.gridEngine.setPosition(move.key().toString(), { x: move.pos()!.x(), y: move.pos()!.y() }, this.gridEngine.getCharLayer(move.key().toString()));
          }
          break;
        }
        case Update.JoinEvent: {
          if (this.currentState !== MapSceneState.READY) break;
          const join: JoinEvent = update.events(i, new JoinEvent());
          const pc = new PlayerCharacter(this, join.pos()!.x(), join.pos()!.y(), join.charLayer()!, "hero1", join.key().toString());
          pc.setData("name", join.name());
          this.gridEngine.addCharacter(pc.gridEngineCharacterData);
          pc.playStandAnimation(this.gridEngine.getFacingDirection(join.key().toString()));
          this.interfaceCamera.ignore(pc);
          break;
        }
        case Update.LeaveEvent: {
          const leave: LeaveEvent = update.events(i, new LeaveEvent());
          this.gridEngine.getSprite(leave.key().toString()).destroy();
          this.gridEngine.removeCharacter(leave.key().toString());
          break;
        }
        case Update.AttackEvent: {
          if (this.currentState !== MapSceneState.READY) break;
          const attack: AttackEvent = update.events(i, new AttackEvent());

          const key = attack.key().toString();
          const direction = Directions[attack.facing()];
          const otherPlayer = this.gridEngine.getSprite(key) as PlayerCharacter;
          this.gridEngine.turnTowards(key, direction);

          if (!otherPlayer.weaponSprite) {
            otherPlayer.weaponSprite = new Weapon(this, otherPlayer.getCenter().x, otherPlayer.getCenter().y, key);
            this.interfaceCamera.ignore(otherPlayer.weaponSprite);
          }
          otherPlayer.playAttackAnimation(direction);

          break;
        }
        case Update.MapJoinedEvent: {
          const event: MapJoinedEvent = update.events(i, new MapJoinedEvent());
          this.transitionToReady(event);
          break;
        }
        case Update.MapChangedEvent: {
          const event: MapChangedEvent = update.events(i, new MapChangedEvent());
          this.transitionToInitial(event.id()!);
          break;
        }
      }
    }
  }

  async transitionToInitial(mapId: string) {
    this.currentState = MapSceneState.INITIAL;

    // Remove old sprites
    [this.map, this.player, this.gridEngine].forEach(sprite => { if (sprite) { sprite.destroy() } });
    this.children.list.filter(child => {
      if (child instanceof PlayerCharacter && child != this.player) return true;
      if (child instanceof Weapon) return true;
      if (child instanceof Monster) return true;
      return false;
    }).forEach(x => x.destroy());

    // Create our connection to the server
    this.connection?.close(1000);
    this.connection = await this.openWebSocket(mapId);
  }

  transitionToJoined() {
    this.currentState = MapSceneState.JOINED;
  }

  transitionToReady(event: MapJoinedEvent) {
    const map: TileMap = event.tilemap()!

    // create our client-side representation of this map
    this.map = this.make.tilemap({ tileWidth: 48, tileHeight: 48, width: map.width()!, height: map.height()! });

    // Create the images that are displayed for each layer of our map
    // This is the first thing we expect to get after joining a game
    const tilesetLayers: Phaser.Tilemaps.Tileset[] = [];
    const tileIndexCollisionMap: Record<number, number> = {};
    for (let i = 0; i < map.tilesetsLength(); i++) {
      const tilesetData: TileSet = map.tilesets(i, new TileSet())!;
      const tileset = this.map.addTilesetImage(tilesetData.key()!, tilesetData.key()!, undefined, undefined, undefined, undefined, tilesetData.gid());

      for (let k = 0; k < tilesetData.collisionsLength(); k++) {
        const tileCollision = tilesetData.collisions(k, new TileCollision())!;
        tileIndexCollisionMap[tileCollision.index()] = tileCollision.direction();
      }
      tilesetLayers.push(tileset);
    }

    // create the data for every layer
    const dataLayers: Phaser.Tilemaps.LayerData[] = [];
    for (let i = 0; i < map.layersLength(); i++) {
      const layer = map.layers(i, new MapLayer())!;

      var layerData = new Phaser.Tilemaps.LayerData({
        name: layer.key()!,
        width: map.width()!,
        height: map.height()!
      });

      const charLayer = layer.charLayer();
      if (charLayer && charLayer.length > 0) {
        layerData.properties.push({
          name: 'ge_charLayer',
          type: 'string',
          value: charLayer
        });
      }

      // our FlatBuffer gives us a 1D array of the map tiles, our map graphics expect a 2D array
      layerData.data = Array(map.height()!).fill(null).map((_, y) => Array(map.width()!).fill(null).map((_, x) => {
        const positionIndex = (map.width()! * y) + x;
        const tileIndex = layer.data(positionIndex)!;

        const tile = new Phaser.Tilemaps.Tile(layerData, tileIndex, x, y, 48, 48, 48, 48);

        const collider: number | undefined = tileIndexCollisionMap[tileIndex];
        if (collider) {
          if ((collider & 0b10000000) === 0b10000000) tile.properties['ge_collide_up'] = true;
          if ((collider & 0b01000000) === 0b01000000) tile.properties['ge_collide_down'] = true;
          if ((collider & 0b00100000) === 0b00100000) tile.properties['ge_collide_left'] = true;
          if ((collider & 0b00010000) === 0b00010000) tile.properties['ge_collide_right'] = true;
          if ((collider & 0b00001000) === 0b00001000) tile.properties['ge_collide_up-left'] = true;
          if ((collider & 0b00000100) === 0b00000100) tile.properties['ge_collide_up-right'] = true;
          if ((collider & 0b00000010) === 0b00000010) tile.properties['ge_collide_down-left'] = true;
          if ((collider & 0b00000001) === 0b00000001) tile.properties['ge_collide_down-right'] = true;
        }
        return tile;
      }));

      dataLayers.push(layerData);
    }
    this.map.layers = dataLayers;

    // create the images associated with this layer, which has to be done after setting the map.layers
    for (let i = 0; i < map.layersLength(); i++) {
      const layer = map.layers(i, new MapLayer())!;
      const tileDisplayLayer = this.map.createLayer(layer.key()!, tilesetLayers, 0, 0);
      // HACK - just for debugging - won't always be called ground on a map
      if (layer.key() == "charLevel1") tileDisplayLayer.setAlpha(0.3).setVisible(false);
      this.interfaceCamera.ignore(tileDisplayLayer);
    }

    this.debugText.prefix = this.debugText.prefix = `(${event.pos()!.x()},${event.pos()!.y()})`;

    this.player = new PlayerCharacter(this, event.pos()!.x(), event.pos()!.y(), event.charLayer()!, "hero1", "me");
    this.interfaceCamera.ignore(this.player);

    this.cameras.main.startFollow(this.player, true);
    this.cameras.main.setFollowOffset(-this.player.width, -this.player.height);

    this.gridEngine.create(this.map, {
      characters: [
        this.player.gridEngineCharacterData
      ],
      numberOfDirections: 8
    });

    for (let i = 0; i < event.npcsLength(); i++) {
      const npc = event.npcs(i)!;
      const sprite = new Monster(this, npc.pos()!.x(), npc.pos()!.y(), npc.charLayer()!, npc.texture()! as MonsterTexture, npc.key().toString(), npc.hp());
      this.gridEngine.addCharacter(sprite.gridEngineCharacterData);
      sprite.playStandAnimation(sprite.gridEngineCharacterData.facingDirection!);
      this.interfaceCamera.ignore(sprite);
    }

    this.onPositionChangedSubscription = this.gridEngine.positionChangeStarted().subscribe(({ charId, enterTile }) => {
      // we only care about ourselves
      if (charId !== "me") return;

      // show our current location in the debug text
      this.debugText.prefix = `(${enterTile.x},${enterTile.y})`;

      // tell others that we have moved
      let builder = new Builder(64);

      MoveCommand.startMoveCommand(builder);
      MoveCommand.addPos(builder, Vec2.createVec2(builder, enterTile.x, enterTile.y));
      const movement = MoveCommand.endMoveCommand(builder);

      Command.startCommand(builder);
      Command.addSeq(builder, ++this.commandSequencer);
      Command.addActionType(builder, Action.MoveCommand);
      Command.addAction(builder, movement);
      const update = Command.endCommand(builder);
      builder.finish(update);
      this.connection?.send(builder.asUint8Array());
    });

    // Player Animations on movement
    this.player.playStandAnimation(this.gridEngine.getFacingDirection('me'));
    this.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
      const sprite = this.gridEngine.getSprite(charId) as unknown as WalkingAnimatable;
      sprite.playWalkAnimation(direction);
    });

    this.gridEngine.movementStopped().subscribe(({ charId, direction }) => {
      const sprite = this.gridEngine.getSprite(charId) as unknown as WalkingAnimatable;
      sprite.playStandAnimation(direction);
    });

    this.currentState = MapSceneState.READY;
  }
}
async function fetchConnectionToken(mapId: string) {
  const apiURI = `${process.env.API_URI}/api/map/${mapId}`;
  const response = await fetch(apiURI, { headers: { 'Authorization': `Bearer ${authToken()}` } });
  if (!response) {
    throw new Error("Failed to fetch WebSocket connection token. Do you have an auth token?");
  }
  return await response.text();
}

