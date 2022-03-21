import { Direction, GridEngine } from 'grid-engine'
import { FpsText, PlayerCharacter } from '../objects/'

import { Builder, ByteBuffer } from "flatbuffers";
import { EventLog } from '../../models/wrath-of-toldir/events/event-log';
import { AttackEvent, JoinEvent, LeaveEvent, MoveEvent, Update } from '../../models/events';
import { MoveCommand, JoinCommand, LeaveCommand, Action, Vec3 } from '../../models/commands';
import { v4 as uuidv4 } from 'uuid';
import { Command } from '../../models/wrath-of-toldir/commands/command';
import { AttackCommand } from '../../models/wrath-of-toldir/commands/attack-command';
import { normalisedFacingDirection, preloadPlayerCharacter, SpriteTexture } from '../objects/playerCharacter';
import Weapon, { preloadWeapon } from '../objects/weapon';
import { backOff } from "exponential-backoff";

const Directions = [Direction.NONE, Direction.LEFT, Direction.UP_LEFT, Direction.UP, Direction.UP_RIGHT, Direction.RIGHT, Direction.DOWN_RIGHT, Direction.DOWN, Direction.DOWN_LEFT];

export default class MainScene extends Phaser.Scene {
  fpsText: FpsText
  cursors: Phaser.Types.Input.Keyboard.CursorKeys
  player: PlayerCharacter
  gridEngine: GridEngine
  map: Phaser.Tilemaps.Tilemap
  interfaceCamera: Phaser.Cameras.Scene2D.Camera;
  onPositionChangedSubscription: any;
  sword: Weapon;
  connection: WebSocket;
  commandSequencer: number

  constructor() {
    super({ key: 'MainScene' });

    this.commandSequencer = 0;
  }

  preload() {
    preloadPlayerCharacter(this);
    preloadWeapon(this);
  }

  async create() {
    const data: number[][] = Array(400).fill(null).map(arr => Array(400).fill(null).map(_ => Phaser.Math.Between(0, 456)));

    this.map = this.make.tilemap({ data, tileWidth: 48, tileHeight: 48, key: "terrain" });
    const terrain = this.map.addTilesetImage("rural_village_terrain", "rural_village_terrain", 48, 48);
    const terrainLayer = this.map.createLayer(0, terrain, 0, 0);

    this.player = new PlayerCharacter(this, Phaser.Math.Between(0, 4), Phaser.Math.Between(0, 4), "hero1", "me");
    this.sword = new Weapon(this, this.player.getCenter().x, this.player.getCenter().y, 'me').setVisible(false);

    this.cameras.main.startFollow(this.player, true);
    this.cameras.main.setFollowOffset(-this.player.width, -this.player.height);

    this.cursors = this.input.keyboard.createCursorKeys();

    this.gridEngine.create(this.map, {
      characters: [
        this.player.gridEngineCharacterData
      ],
      numberOfDirections: 8
    });

    this.interfaceCamera = this.cameras.add();
    this.interfaceCamera.ignore([this.player, terrainLayer, this.sword]);

    this.fpsText = new FpsText(this);
    const hud = this.add.image(0, 0, 'hud').setOrigin(0, 0);

    this.cameras.main.ignore([this.fpsText, hud]);

    await this.reconnect();

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
  }

  update() {
    this.fpsText.update();
    this.player.applyMovement(this.gridEngine, this.cursors, this.input.activePointer);
    if (this.sword.visible) this.sword.setPosition(this.player.getCenter().x, this.player.getCenter().y);

    if ((this.cursors.shift.isDown && this.input.activePointer.isDown) || this.cursors.space.isDown) {
      this.applyDefaultAction();
    }
  }

  async openWebSocket() {
    // GET /api/map/name
    // to get an auth token to open a websocket

    const mapId = "fairweather";
    const wsURI = `${process.env.WS_URI}/api/map/${mapId}/connection`;
    console.log(`Connecting ${wsURI} ...`);

    let ws = new WebSocket(wsURI);
    ws.addEventListener("open", (event: Event) => {
      let builder = new Builder(1024);

      const { x, y } = this.gridEngine.getPosition("me");
      const z = parseInt(this.gridEngine.getCharLayer("me"), 10);

      const name = uuidv4();
      const nameOffset = builder.createString(name);
      const join = JoinCommand.createJoinCommand(builder,
        Vec3.createVec3(builder, x, y, z),
        nameOffset);

      Command.startCommand(builder);
      Command.addSeq(builder, ++this.commandSequencer);
      Command.addActionType(builder, Action.JoinCommand);
      Command.addAction(builder, join);
      const update = Command.endCommand(builder);
      builder.finish(update);
      ws.send(builder.asUint8Array());
    });
    ws.addEventListener('message', async (msg: MessageEvent) => {
      const data: ArrayBuffer = await (msg.data as Blob).arrayBuffer();
      let bb = new ByteBuffer(new Uint8Array(data));

      const update = EventLog.getRootAsEventLog(bb);

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
        }
      }
    });

    let closeOrErrorHandler = (event: CloseEvent | MessageEvent | Event) => {
      console.error("Server connection has dropped");
      backOff(this.reconnect.bind(this), { jitter: 'full' });
    };
    ws.addEventListener("close", closeOrErrorHandler);
    ws.addEventListener("error", closeOrErrorHandler);

    return ws;
  }

  async reconnect() {
    this.connection = await this.openWebSocket()
  }

  addOrMoveCharacter(key: string, texture: SpriteTexture, position: Vec3, name: string | null) {
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

}

