import { Direction, GridEngine } from 'grid-engine'
import { FpsText, PlayerCharacter } from '../objects/'

import { Builder, ByteBuffer } from "flatbuffers";
import { EventLog } from '../../models/wrath-of-toldir/events/event-log';
import { AttackEvent, JoinEvent, LeaveEvent, MoveEvent, Update } from '../../models/events';
import { MoveCommand, JoinCommand, LeaveCommand, Action, Vec3 } from '../../models/commands';
import { v4 as uuidv4 } from 'uuid';
import { Command } from '../../models/wrath-of-toldir/commands/command';
import { AttackCommand } from '../../models/wrath-of-toldir/commands/attack-command';
import { SpriteTexture } from '../objects/playerCharacter';

export default class MainScene extends Phaser.Scene {
  fpsText: FpsText
  cursors: Phaser.Types.Input.Keyboard.CursorKeys
  player: PlayerCharacter
  gridEngine: GridEngine
  map: Phaser.Tilemaps.Tilemap
  interfaceCamera: Phaser.Cameras.Scene2D.Camera;
  onPositionChangedSubscription: any;
  sword: Phaser.GameObjects.Sprite;
  connection: WebSocket;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    const rate = 16;
    this.anims.create({
      key: 'attack_sword_' + Direction.DOWN,
      frames: this.anims.generateFrameNumbers('sword', { frames: [0, 1, 2, 3] }),
      frameRate: rate,
      hideOnComplete: true
    });
    this.anims.create({
      key: 'attack_sword_' + Direction.UP,
      frames: this.anims.generateFrameNumbers('sword', { frames: [4, 5, 6, 7] }),
      frameRate: rate,
      hideOnComplete: true
    });
    this.anims.create({
      key: 'attack_sword_' + Direction.RIGHT,
      frames: this.anims.generateFrameNumbers('sword', { frames: [8, 9, 10, 11] }),
      frameRate: rate,
      hideOnComplete: true
    });
    this.anims.create({
      key: 'attack_sword_' + Direction.LEFT,
      frames: this.anims.generateFrameNumbers('sword', { frames: [12, 13, 14, 15] }),
      frameRate: rate,
      hideOnComplete: true
    });

    this.anims.create({
      key: 'hero1_attack_' + Direction.DOWN,
      frames: this.anims.generateFrameNumbers('hero1', { frames: [65, 67, 68, 70] }),
      frameRate: rate
    });
    this.anims.create({
      key: 'hero1_attack_' + Direction.UP,
      frames: this.anims.generateFrameNumbers('hero1', { frames: [88, 90, 93, 95] }),
      frameRate: rate
    });
    this.anims.create({
      key: 'hero1_attack_' + Direction.RIGHT,
      frames: this.anims.generateFrameNumbers('hero1', { frames: [96, 98, 108, 110] }),
      frameRate: rate
    });
    this.anims.create({
      key: 'hero1_attack_' + Direction.LEFT,
      frames: this.anims.generateFrameNumbers('hero1', { frames: [121, 123, 117, 119] }),
      frameRate: rate
    });
  }

  async create() {
    const data: number[][] = Array(400).fill(null).map(arr => Array(400).fill(null).map(_ => Phaser.Math.Between(0, 456)));

    this.map = this.make.tilemap({ data, tileWidth: 48, tileHeight: 48, key: "terrain" });
    const terrain = this.map.addTilesetImage("rural_village_terrain", "rural_village_terrain", 48, 48);
    const terrainLayer = this.map.createLayer(0, terrain, 0, 0);

    this.player = new PlayerCharacter(this, Phaser.Math.Between(0, 4), Phaser.Math.Between(0, 4), "hero1", "me");
    this.sword = this.add.sprite(this.player.getCenter().x, this.player.getCenter().y, 'sword', 0)
      .setVisible(false);

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

    this.connection = await this.openWebSocket();
  }

  update() {
    this.fpsText.update();
    this.player.applyMovement(this.gridEngine, this.cursors, this.input.activePointer);

    if ((this.cursors.shift.isDown && this.input.activePointer.isDown) || this.cursors.space.isDown) {
      this.applyDefaultAction();
    }
  }

  async openWebSocket() {

    // GET /api/map/name
    // to get an auth token to open a websocket

    let socketHostname = location.hostname;
    if (socketHostname == 'localhost') socketHostname = '127.0.0.1';

    const socketHost = `ws://${socketHostname}:8787`;
    const mapId = "fairweather";

    let ws = new WebSocket(`${socketHost}/api/map/${mapId}/connection`);
    ws.addEventListener("open", (event: Event) => {
      let builder = new Builder(1024);

      const { x, y } = this.gridEngine.getPosition("me");
      const z = parseInt(this.gridEngine.getCharLayer("me"), 10);

      const name = builder.createString(uuidv4());
      JoinCommand.startJoinCommand(builder);
      JoinCommand.addName(builder, name);
      JoinCommand.addPos(builder, Vec3.createVec3(builder, x, y, z));
      const join = JoinCommand.endJoinCommand(builder);

      Command.startCommand(builder);
      Command.addSeq(builder, 0); // TODO: add sequence number
      Command.addActionType(builder, Action.JoinCommand);
      Command.addAction(builder, join);
      const update = Command.endCommand(builder);
      builder.finish(update);
      ws.send(builder.asUint8Array());

      this.onPositionChangedSubscription = this.gridEngine.positionChangeStarted().subscribe(value => {
        // we only care about ourselves
        if (value.charId !== "me") return;
        let builder = new Builder(1024);

        MoveCommand.startMoveCommand(builder);
        MoveCommand.addPos(builder, Vec3.createVec3(builder, value.enterTile.x, value.enterTile.y, 0));
        const movement = MoveCommand.endMoveCommand(builder);

        Command.startCommand(builder);
        Command.addSeq(builder, 0); // TODO: add sequence number
        Command.addActionType(builder, Action.MoveCommand);
        Command.addAction(builder, movement);
        const update = Command.endCommand(builder);
        builder.finish(update);
        ws.send(builder.asUint8Array());
      });
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
            const otherPlayer = this.gridEngine.getSprite(key);
            const direction = this.getNormalisedFacingDirection(key);
            const sword = this.add.sprite(otherPlayer.getCenter().x, otherPlayer.getCenter().y, key + '_sword', 0);
            this.interfaceCamera.ignore(sword);
            sword.play('attack_sword_' + direction);
            otherPlayer.play('hero1_attack_' + direction);

            break;
          }
        }
      }
    });

    let closeOrErrorHandler = (event: CloseEvent | MessageEvent | Event) => {
      console.error("Server connection has dropped " + event);
      // TODO: we could re-connect?
    };
    ws.addEventListener("close", closeOrErrorHandler);
    ws.addEventListener("error", closeOrErrorHandler);

    return ws;
  }

  addOrMoveCharacter(key: string, texture: SpriteTexture, position: Vec3, name: string | null) {
    const alreadyAdded = this.gridEngine.hasCharacter(key);
    if (!alreadyAdded) {
      const pc = new PlayerCharacter(this, position.x(), position.y(), texture, key);
      pc.setData("name", name);
      this.gridEngine.addCharacter(pc.gridEngineCharacterData);
      this.interfaceCamera.ignore(pc);
    } else {
      this.gridEngine.moveTo(key, { x: position.x(), y: position.y() });
    }
  }

  submitAttack() {
    if (this.gridEngine.isMoving('me')) {
      console.log("Can't attack whilst moving");
      return;
    }

    const direction = this.getNormalisedFacingDirection('me');

    this.sword
      .setVisible(true)
      .setPosition(this.player.getCenter().x, this.player.getCenter().y)
      .play('attack_sword_' + direction);

    this.player.play('hero1_attack_' + direction);

    let builder = new Builder(1024);
    const attack = AttackCommand.createAttackCommand(builder);
    Command.startCommand(builder);
    Command.addSeq(builder, 0); // TODO: add sequence number
    Command.addActionType(builder, Action.AttackCommand);
    Command.addAction(builder, attack);
    const update = Command.endCommand(builder);
    builder.finish(update);
    this.connection.send(builder.asUint8Array());
  }

  applyDefaultAction() {
    // Apply a very basic rate limited based on ohw long it takes for animations to complete
    // not perfect but this should be done by the server anyway
    if (this.player.anims.isPlaying) return;

    // TODO: depending on what we have selected we might choose to do something different
    // than just plain attacking
    const tile = this.map.getTileAt(this.gridEngine.getFacingPosition('me').x, this.gridEngine.getFacingPosition('me').y);
    // TODO: if we are facing something interesting
    this.submitAttack();
  }

  getNormalisedFacingDirection(charId: string) {
    let direction = this.gridEngine.getFacingDirection(charId);
    if (direction == Direction.DOWN_LEFT || direction == Direction.UP_LEFT) direction = Direction.LEFT;
    if (direction == Direction.DOWN_RIGHT || direction == Direction.UP_RIGHT) direction = Direction.RIGHT;
    return direction;
  }
}

