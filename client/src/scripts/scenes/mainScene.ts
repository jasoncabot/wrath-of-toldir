import { Direction, GridEngine } from 'grid-engine'
import { FpsText, PlayerCharacter } from '../objects/'

import { Builder, ByteBuffer } from "flatbuffers";
import { EventLog } from '../../models/wrath-of-toldir/events/event-log';
import { AttackEvent, JoinEvent, LeaveEvent, MoveEvent, Update } from '../../models/events';
import { MoveCommand, JoinCommand, Action, Vec3 } from '../../models/commands';
import { v4 as uuidv4 } from 'uuid';
import { Command } from '../../models/wrath-of-toldir/commands/command';
import { AttackCommand } from '../../models/wrath-of-toldir/commands/attack-command';
import { preloadPlayerCharacter, SpriteTexture } from '../objects/playerCharacter';
import Weapon, { preloadWeapon } from '../objects/weapon';
import WebSocketClient from '@gamestdio/websocket';
import { MapJoinedEvent } from '../../models/wrath-of-toldir/events/map-joined-event';
import { TileMap } from '../../models/wrath-of-toldir/maps/tile-map';
import { MapLayer } from '../../models/maps';

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

export default class MainScene extends Phaser.Scene {
  fpsText: FpsText
  cursors: Phaser.Types.Input.Keyboard.CursorKeys
  player: PlayerCharacter
  gridEngine: GridEngine
  map: Phaser.Tilemaps.Tilemap
  interfaceCamera: Phaser.Cameras.Scene2D.Camera;
  onPositionChangedSubscription: any;
  sword: Weapon;
  connection: WebSocketClient;
  commandSequencer: number;
  currentState = MapSceneState.INITIAL;

  constructor() {
    super({ key: 'MainScene' });

    this.commandSequencer = 0;
  }

  preload() {
    preloadPlayerCharacter(this);
    preloadWeapon(this);
  }

  async create() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.interfaceCamera = this.cameras.add();

    this.fpsText = new FpsText(this);
    const hud = this.add.image(0, 0, 'hud').setOrigin(0, 0);
    this.cameras.main.ignore([this.fpsText, hud]);

    // Create our connection to the server
    this.connection = await this.openWebSocket();
  }

  update() {
    this.fpsText.update();

    if (this.currentState === MapSceneState.READY) {
      this.player.applyMovement(this.gridEngine, this.cursors, this.input.activePointer);
      if (this.sword.visible) this.sword.setPosition(this.player.getCenter().x, this.player.getCenter().y);

      if ((this.cursors.shift.isDown && this.input.activePointer.isDown) || this.cursors.space.isDown) {
        this.applyDefaultAction();
      }
    }
  }

  async openWebSocket() {
    // GET /api/map/name
    // to get an auth token to open a websocket

    const mapId = "fairweather";
    const wsURI = `${process.env.WS_URI}/api/map/${mapId}/connection`;
    console.log(`Connecting ${wsURI} ...`);

    const ws = new WebSocketClient(wsURI, [], {
      backoff: "exponential",
      initialDelay: 1
    });
    ws.onopen = (event: Event) => {
      let builder = new Builder(1024);

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

      this.currentState = MapSceneState.JOINED;
    };
    ws.onmessage = async (msg: MessageEvent) => {
      const data: ArrayBuffer = await (msg.data as Blob).arrayBuffer();
      let bb = new ByteBuffer(new Uint8Array(data));

      this.applyUpdate(EventLog.getRootAsEventLog(bb));
    };
    ws.onclose = (event: CloseEvent) => {
      console.log("Connection closed. Removing old sprites ...");
      this.map.destroy();
      this.sword.destroy();
      this.player.destroy();
      this.gridEngine.destroy();

      this.children.list.filter(child => {
        if (child instanceof PlayerCharacter && child != this.player) return true;
        if (child instanceof Weapon && child != this.sword) return true;
        return false;
      }).forEach(x => x.destroy());
      this.currentState = MapSceneState.INITIAL;
    };
    ws.onerror = (event: Event) => {
      console.error("Connection error.");
    };
    ws.onreconnect = (event: Event) => {
      console.log("Connection lost. Re-connecting ...");
    }

    return ws;
  }

  addOrMoveCharacter(key: string, texture: SpriteTexture, position: Vec3, name: string | null) {
    if (this.currentState !== MapSceneState.READY) return;
    const alreadyAdded = this.gridEngine.hasCharacter(key);
    if (!alreadyAdded) {
      const pc = new PlayerCharacter(this, position.x(), position.y(), texture, key);
      pc.setData("name", name);
      this.gridEngine.addCharacter(pc.gridEngineCharacterData);
      pc.playStandAnimation(this.gridEngine.getFacingDirection(key));
      this.interfaceCamera.ignore(pc);
    } else {
      this.gridEngine.moveTo(key, { x: position.x(), y: position.y() });
    }
  }

  submitAttack() {
    const facing = this.gridEngine.getFacingDirection('me');

    this.sword
      .setVisible(true)
      .setPosition(this.player.getCenter().x, this.player.getCenter().y)
      .playAttackAnimation(facing);
    this.player.playAttackAnimation(facing);

    let builder = new Builder(1024);
    const attack = AttackCommand.createAttackCommand(builder, Directions.indexOf(facing));
    Command.startCommand(builder);
    Command.addSeq(builder, ++this.commandSequencer);
    Command.addActionType(builder, Action.AttackCommand);
    Command.addAction(builder, attack);
    const update = Command.endCommand(builder);
    builder.finish(update);
    this.connection.send(builder.asUint8Array());
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
          const move: MoveEvent = update.events(i, new MoveEvent());
          this.addOrMoveCharacter(move.key().toString(), "hero1", move.pos()!, null);
          break;
        }
        case Update.JoinEvent: {
          const join: JoinEvent = update.events(i, new JoinEvent());
          this.addOrMoveCharacter(join.key().toString(), "hero1", join.pos()!, join.name());
          break;
        }
        case Update.LeaveEvent: {
          const leave: LeaveEvent = update.events(i, new LeaveEvent());
          this.gridEngine.getSprite(leave.key().toString()).destroy();
          this.gridEngine.removeCharacter(leave.key().toString());
          break;
        }
        case Update.AttackEvent: {
          const attack: AttackEvent = update.events(i, new AttackEvent());

          const key = attack.key().toString();
          const direction = Directions[attack.facing()];
          const otherPlayer = this.gridEngine.getSprite(key) as PlayerCharacter;
          this.gridEngine.turnTowards(key, direction);

          // TODO: only add a new weapon if there isn't one for this player already
          const sword = new Weapon(this, otherPlayer.getCenter().x, otherPlayer.getCenter().y, key);
          this.interfaceCamera.ignore(sword);
          sword.playAttackAnimation(direction);
          otherPlayer.playAttackAnimation(direction);

          break;
        }
        case Update.MapJoinedEvent: {
          const event: MapJoinedEvent = update.events(i, new MapJoinedEvent());

          this.transitionToReady(event);
          break;
        }
      }
    }
  }

  transitionToReady(event: MapJoinedEvent) {
    const map: TileMap = event.tilemap()!

    // create our client-side representation of this map
    this.map = this.make.tilemap({ tileWidth: 48, tileHeight: 48, width: map.width()!, height: map.height()! });

    // Create the images that are displayed for each layer of our map
    // This is the first thing we expect to get after joining a game
    const terrain = this.map.addTilesetImage("rural_village_terrain");

    // create the data for every layer
    const dataLayers: Phaser.Tilemaps.LayerData[] = [];
    for (let i = 0; i < map.layersLength(); i++) {
      const layer = map.layers(i, new MapLayer())!;

      var layerData = new Phaser.Tilemaps.LayerData({
        name: layer.key()!,
        width: map.width()!,
        height: map.height()!
      });

      // our FlatBuffer gives us a 1D array of the map tiles, our map graphics expect a 2D array
      const tiles: Phaser.Tilemaps.Tile[][] = Array(map.height()!).fill(null).map((_, y) => Array(map.width()!).fill(null).map((_, x) => {
        const positionIndex = (map.width()! * y) + x;
        const tileIndex = layer.data(positionIndex)!;
        return new Phaser.Tilemaps.Tile(layerData, tileIndex, x, y, 48, 48, 48, 48);
      }));

      layerData.data = tiles;

      dataLayers.push(layerData);
    }
    this.map.layers = dataLayers;

    // create the images associated with this layer, which has to be done after setting the map.layers
    for (let i = 0; i < map.layersLength(); i++) {
      const layer = map.layers(i, new MapLayer())!;
      const tileDisplayLayer = this.map.createLayer(layer.key()!, terrain);
      this.interfaceCamera.ignore(tileDisplayLayer);
    }

    this.player = new PlayerCharacter(this, event.pos()!.x(), event.pos()!.y(), "hero1", "me");
    this.sword = new Weapon(this, this.player.getCenter().x, this.player.getCenter().y, 'me').setVisible(false);
    this.cameras.main.startFollow(this.player, true);
    this.cameras.main.setFollowOffset(-this.player.width, -this.player.height);

    this.interfaceCamera.ignore([this.player, this.sword]);

    this.gridEngine.create(this.map, {
      characters: [
        this.player.gridEngineCharacterData
      ],
      numberOfDirections: 8
    });
    this.onPositionChangedSubscription = this.gridEngine.positionChangeStarted().subscribe(value => {
      // we only care about ourselves
      if (value.charId !== "me") return;
      let builder = new Builder(1024);

      MoveCommand.startMoveCommand(builder);
      MoveCommand.addPos(builder, Vec3.createVec3(builder, value.enterTile.x, value.enterTile.y, 0));
      const movement = MoveCommand.endMoveCommand(builder);

      Command.startCommand(builder);
      Command.addSeq(builder, ++this.commandSequencer);
      Command.addActionType(builder, Action.MoveCommand);
      Command.addAction(builder, movement);
      const update = Command.endCommand(builder);
      builder.finish(update);
      this.connection.send(builder.asUint8Array());
    });

    // Player Animations on movement
    this.player.playStandAnimation(this.gridEngine.getFacingDirection('me'));
    this.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
      const sprite = this.gridEngine.getSprite(charId) as PlayerCharacter;
      sprite.playWalkAnimation(direction);
    });

    this.gridEngine.movementStopped().subscribe(({ charId, direction }) => {
      const sprite = this.gridEngine.getSprite(charId) as PlayerCharacter;
      sprite.anims.stop();
      sprite.setFrame(sprite.getStopFrame(direction));
      sprite.playStandAnimation(direction);
    });

    this.currentState = MapSceneState.READY;
  }

}



