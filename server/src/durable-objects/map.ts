import { Builder, ByteBuffer } from "flatbuffers";
import { EventLog } from "@/models/wrath-of-toldir/events/event-log";
import { JoinEvent, LeaveEvent, MapJoinedEvent, MoveEvent, TileMap, Update, Vec3 } from "@/models/events";
import { Command } from "@/models/wrath-of-toldir/commands/command";
import { Action, AttackCommand, JoinCommand, LeaveCommand, MoveCommand } from "@/models/commands";
import { AttackEvent } from "@/models/wrath-of-toldir/events/attack-event";
import { MapLayer, TileSet } from "@/models/maps";
import { Npc as NPCBuilder } from "@/models/wrath-of-toldir/npcs/npc";
import { NPC, Player, PlayerId, ReceivedCommand, TiledJSON } from "@/game/game";
import { findAttackWitnesses, findJoinWitnesses, findMovementWitnesses } from "@/game/witness";
import { loadMapData, validMaps } from "@/data/maps";
import { v4 as uuidv4 } from 'uuid';
import { getEntityPosition, setEntityPosition } from "@/game/components/positions";

export type MapAction = 'store-key' | 'websocket';

export interface Connection {
    socket: WebSocket
    quitting: boolean
    player: Player | undefined // set after a player has 'joined' this connection
}

const TICK_RATE = 500;

export class Map implements DurableObject {
    socketKeys: Record<string, string>;
    connections: Record<PlayerId, Connection>;
    intervalHandle: number;
    commandQueue: ReceivedCommand[];
    mapData: TiledJSON | undefined;
    tickCount: number = 0;
    npcs: Record<string, NPC>;

    constructor(private readonly state: DurableObjectState, private readonly env: Bindings) {
        this.state = state;
        this.env = env;

        this.socketKeys = {};
        this.connections = {};
        this.commandQueue = [];
        this.intervalHandle = 0;
        this.mapData = undefined;
        this.npcs = {};
    }

    initialiseMap(mapId: string) {
        this.mapData = loadMapData(mapId);

        // Create NPCs
        // TODO: this is just temporary to see some stuff
        for (let i = 0; i < 10; i++) {
            const npcId = uuidv4();
            this.npcs[npcId] = {
                key: Math.floor(Math.random() * 2147483647),
                type: "slime1",
                hp: 100
            };
            setEntityPosition(npcId, {
                x: Math.floor(Math.random() * this.mapData.width),
                y: Math.floor(Math.random() * this.mapData.height),
                z: 0
            });
        }
    }

    async fetch(request: Request) {
        return await this.handleErrors(request, async () => {
            const searchParams = new URLSearchParams(new URL(request.url).search);
            const action = searchParams.get('action') as MapAction;

            switch (action) {
                case "websocket": {
                    const [client, server] = Object.values(new WebSocketPair());

                    const mapId = request.headers.get('X-MapId')!;
                    const socketKey = request.headers.get('X-Socket-Key');

                    // ensure that socketKey matches the key we stored earlier
                    if (!socketKey || !this.socketKeys[socketKey]) {
                        return new Response("expected key", { status: 400 });
                    }

                    if (validMaps.has(mapId) && !this.mapData) {
                        this.initialiseMap(mapId);
                    }

                    const playerId = this.socketKeys[socketKey];
                    await this.handleSession(server, playerId);

                    // consume this token
                    delete this.socketKeys[socketKey];

                    return new Response(null, {
                        status: 101,
                        headers: {
                            'Access-Control-Allow-Origin': this.env.FRONTEND_URI,
                            'Content-type': 'application/json',
                        },
                        webSocket: client
                    });
                }

                case "store-key": {
                    const playerId = request.headers.get('X-PlayerId')!;
                    const socketKey = request.headers.get('X-Socket-Key')!;
                    this.socketKeys[socketKey] = playerId;
                    return new Response(socketKey, {
                        status: 201,
                        headers: {
                            'Access-Control-Allow-Origin': this.env.FRONTEND_URI,
                            'Content-type': 'text/plain'
                        }
                    });
                }

                default:
                    return new Response("Not found", { status: 404 });
            }
        });
    }

    onGameTick() {
        const start = new Date().getTime();
        this.tickCount++;

        type Effects = { builder: Builder, eventOffsets: number[], eventTypeOffsets: number[] };
        const eventsAffectingPlayer: Record<PlayerId, Effects> = {};

        const findEventStore = (playerId: PlayerId) => {
            let data = eventsAffectingPlayer[playerId];
            if (!data) {
                data = {
                    builder: new Builder(1024),
                    eventOffsets: [],
                    eventTypeOffsets: []
                };
                eventsAffectingPlayer[playerId] = data;
            }
            return data;
        }

        const players: PlayerId[] = Object.keys(this.connections);
        this.commandQueue.forEach(({ playerId, command }) => {
            console.log(`[tick:${this.tickCount}] [${playerId}:${command.seq()}] ${Action[command.actionType()]}`);

            let player = this.connections[playerId].player;
            if (!player && command.actionType() !== Action.JoinCommand) {
                console.log(`Player with id ${playerId} does not exist players.length = ${players.length}`);
                return;
            }

            switch (command.actionType()) {
                case Action.MoveCommand: {
                    // read client command
                    const move: MoveCommand = command.action(new MoveCommand());

                    // update game state
                    const pos = getEntityPosition(playerId);
                    const oldPos = { ...pos };
                    pos.x = move.pos()!.x();
                    pos.y = move.pos()!.y();
                    pos.z = move.pos()!.z();

                    // inform other players
                    findMovementWitnesses(playerId, players, oldPos, pos, (id: PlayerId) => {
                        const { builder, eventOffsets, eventTypeOffsets } = findEventStore(id);

                        MoveEvent.startMoveEvent(builder);
                        MoveEvent.addKey(builder, player!.key);
                        MoveEvent.addPos(builder, Vec3.createVec3(builder, pos.x, pos.y, pos.z));
                        eventOffsets.push(MoveEvent.endMoveEvent(builder));
                        eventTypeOffsets.push(Update.MoveEvent);
                    });
                    break;
                }
                case Action.JoinCommand: {
                    // read client command
                    const join: JoinCommand = command.action(new JoinCommand());

                    // update game state
                    player = {
                        key: Math.floor(Math.random() * 2147483647),
                        name: join.name()!
                    };
                    this.connections[playerId].player = player;
                    setEntityPosition(playerId, {
                        x: Math.floor(Math.random() * this.mapData!.width),
                        y: Math.floor(Math.random() * this.mapData!.height),
                        z: 0
                    });

                    // inform other players
                    const joined = findEventStore(playerId);
                    this.addCurrentMapState(joined, playerId);
                    const playerPos = getEntityPosition(playerId);
                    findJoinWitnesses(playerId, players, otherPlayerId => {
                        const { builder, eventOffsets, eventTypeOffsets } = findEventStore(otherPlayerId);

                        // tell the player who joined about other players who are already here
                        const otherPlayer = this.connections[otherPlayerId].player;
                        if (otherPlayer) {
                            const otherPlayerPos = getEntityPosition(otherPlayerId);
                            const otherPlayerName = joined.builder.createString(otherPlayer.name);
                            JoinEvent.startJoinEvent(joined.builder);
                            JoinEvent.addKey(joined.builder, otherPlayer.key);
                            JoinEvent.addName(joined.builder, otherPlayerName);
                            JoinEvent.addPos(joined.builder, Vec3.createVec3(joined.builder, otherPlayerPos.x, otherPlayerPos.y, otherPlayerPos.z));
                            joined.eventOffsets.push(JoinEvent.endJoinEvent(joined.builder));
                            joined.eventTypeOffsets.push(Update.JoinEvent);
                        }

                        const nameOffset = builder.createString(player!.name);

                        JoinEvent.startJoinEvent(builder);
                        JoinEvent.addKey(builder, player!.key);
                        JoinEvent.addName(builder, nameOffset);
                        JoinEvent.addPos(builder, Vec3.createVec3(builder, playerPos.x, playerPos.y, playerPos.z));
                        eventOffsets.push(JoinEvent.endJoinEvent(builder));
                        eventTypeOffsets.push(Update.JoinEvent);
                    });
                    break;
                }
                case Action.LeaveCommand: {
                    // read client action
                    const leave: LeaveEvent = command.action(new LeaveCommand());

                    // update game state
                    delete this.connections[playerId];

                    if (players.length === 0) {
                        // no one is connected, no point to carry on ticking
                        console.log('No players are connected, shutting down game tick ...');
                        this.onGameEmpty();
                    } else {
                        // inform other players
                        players.forEach(otherPlayerId => {
                            if (otherPlayerId == playerId) return;
                            const { builder, eventOffsets, eventTypeOffsets } = findEventStore(otherPlayerId);

                            eventOffsets.push(LeaveEvent.createLeaveEvent(builder, player!.key));
                            eventTypeOffsets.push(Update.LeaveEvent);
                        });
                    }
                    break;
                }
                case Action.AttackCommand: {
                    // read client action
                    const attack: AttackEvent = command.action(new AttackCommand());

                    // update game state

                    // inform other players
                    findAttackWitnesses(playerId, players, otherPlayerId => {
                        const { builder, eventOffsets, eventTypeOffsets } = findEventStore(otherPlayerId);

                        AttackEvent.startAttackEvent(builder);
                        AttackEvent.addKey(builder, player!.key);
                        AttackEvent.addFacing(builder, attack.facing());
                        eventOffsets.push(AttackEvent.endAttackEvent(builder));
                        eventTypeOffsets.push(Update.AttackEvent);
                    });
                    break;
                }
            }
        });
        this.commandQueue = [];

        // TODO: rather going through all - keep a wake up list
        // where we just pick the ones that are allowed to act on
        // this.tickCount instead of randomly choosing each turn
        Object.keys(this.npcs).forEach(npcId => {
            const { key } = this.npcs[npcId];
            const pos = getEntityPosition(npcId);
            // update game state
            const willMove = Math.random() < 0.50;
            if (willMove) {
                const oldPos = { ...pos };
                const x = Math.random();
                if (x < 0.25) {
                    pos.x -= 1;
                } else if (x < 0.50) {
                    pos.x += 1;
                } else if (x < 0.75) {
                    pos.y -= 1;
                } else {
                    pos.y += 1;
                }

                // inform other playres
                findMovementWitnesses(npcId, players, oldPos, pos, otherPlayerId => {
                    const { builder, eventOffsets, eventTypeOffsets } = findEventStore(otherPlayerId);

                    MoveEvent.startMoveEvent(builder);
                    MoveEvent.addKey(builder, key);
                    MoveEvent.addPos(builder, Vec3.createVec3(builder, pos.x, pos.y, pos.z));
                    eventOffsets.push(MoveEvent.endMoveEvent(builder));
                    eventTypeOffsets.push(Update.MoveEvent);
                });
            }
        })

        // emit events for affected clients
        for (const [playerId, player] of Object.entries(this.connections)) {
            try {
                if (player.quitting && player.socket.readyState !== WebSocket.READY_STATE_CLOSED) {
                    player.socket.close(1011, "WebSocket broken.");
                    return;
                }

                const events = eventsAffectingPlayer[playerId];
                if (events) {
                    const { builder, eventOffsets, eventTypeOffsets } = events;
                    const eventVector = EventLog.createEventsVector(builder, eventOffsets);
                    const eventTypeVector = EventLog.createEventsTypeVector(builder, eventTypeOffsets);
                    EventLog.startEventLog(builder);
                    EventLog.addEvents(builder, eventVector);
                    EventLog.addEventsType(builder, eventTypeVector);
                    const update = EventLog.endEventLog(builder);
                    builder.finish(update);

                    player.socket.send(builder.asUint8Array());
                }
            } catch (err) {
                console.error(err);
            }
        };

        if ((new Date().getTime() - start) > 300) {
            console.warn(`[tick:${this.tickCount}] queue-length:${this.commandQueue.length} took too much time to process`);
        }
    }

    onGameEmpty() {
        clearInterval(this.intervalHandle);
        this.intervalHandle = 0;
        this.socketKeys = {};
        this.tickCount = 0;
    }

    addCurrentMapState(buffer: { builder: Builder; eventOffsets: number[]; eventTypeOffsets: number[]; }, playerId: PlayerId) {

        if (!this.mapData) {
            console.error("Attempted to send current state when it does not exist");
            return;
        }

        const { builder, eventOffsets, eventTypeOffsets } = buffer;

        const layerOffsets = this.mapData.layers.map(layer => {
            const mapKeyOffset = builder.createString(layer.key);
            const dataOffset = MapLayer.createDataVector(builder, layer.data);
            return MapLayer.createMapLayer(builder, mapKeyOffset, dataOffset);
        });
        const tilesetOffsets = this.mapData.tilesets.map(set => {
            const mapKeyOffset = builder.createString(set.key);
            return TileSet.createTileSet(builder, mapKeyOffset, set.gid);
        });
        const layersVector = TileMap.createLayersVector(builder, layerOffsets);
        const tilesetsVector = TileMap.createTilesetsVector(builder, tilesetOffsets);
        const tilemapOffset = TileMap.createTileMap(builder, this.mapData.width, this.mapData.height, layersVector, tilesetsVector);

        const npcOffsets = Object.keys(this.npcs).map(npcId => {
            const npc = this.npcs[npcId];
            const pos = getEntityPosition(npcId);
            const textureOffset = builder.createString(npc.type);
            NPCBuilder.startNpc(builder);
            NPCBuilder.addKey(builder, npc.key);
            NPCBuilder.addTexture(builder, textureOffset);
            NPCBuilder.addPos(builder, Vec3.createVec3(builder, pos.x, pos.y, pos.z))
            NPCBuilder.addHp(builder, npc.hp);
            return NPCBuilder.endNpc(builder);
        })
        const npcsVector = MapJoinedEvent.createNpcsVector(builder, npcOffsets);

        const playerPosition = getEntityPosition(playerId);
        MapJoinedEvent.startMapJoinedEvent(builder);
        MapJoinedEvent.addPos(builder, Vec3.createVec3(builder, playerPosition.x, playerPosition.y, playerPosition.z));
        MapJoinedEvent.addTilemap(builder, tilemapOffset);

        MapJoinedEvent.addNpcs(builder, npcsVector);
        const eventOffset = MapJoinedEvent.endMapJoinedEvent(builder);
        eventOffsets.push(eventOffset);
        eventTypeOffsets.push(Update.MapJoinedEvent);
    }

    async handleSession(socket: WebSocket, playerId: PlayerId) {
        // Well this is our main game loop
        if (!this.intervalHandle) {
            console.log(`Player connected, starting up game tick ...`);
            this.intervalHandle = setInterval(this.onGameTick.bind(this), TICK_RATE);
        }

        socket.accept();

        let connection = {
            socket,
            player: undefined,
            quitting: false
        };
        this.connections[playerId] = connection;

        socket.addEventListener("message", async msg => {

            // TODO: check for rate limiting of playerId

            const data: ArrayBuffer = msg.data as ArrayBuffer;
            let bb = new ByteBuffer(new Uint8Array(data));

            const action = Command.getRootAsCommand(bb);

            const { player, quitting } = this.connections[playerId];
            if ((player && !quitting) || action.actionType() == Action.JoinCommand) {
                this.addCommandFromPlayer(playerId, action);
            } else {
                console.log(`Skipping command ${Action[action.actionType()]} from player ${playerId} because they are not ready or quitting`);
            }
        });

        // On "close" and "error" events, remove the WebSocket from the sessions list and broadcast
        // a quit message.
        let closeOrErrorHandler = (event: CloseEvent | MessageEvent | Event) => {
            // since the server can detect when a socket is closed rather than our clients
            // use this to inform other players we've left, using the LeaveCommand/LeaveEvent methodology
            const leaveBuilder = new Builder(32);
            const actionOffset = LeaveCommand.createLeaveCommand(leaveBuilder);
            const commandOffset = Command.createCommand(leaveBuilder, -1, Action.LeaveCommand, actionOffset);
            leaveBuilder.finish(commandOffset);
            this.addCommandFromPlayer(playerId, Command.getRootAsCommand(leaveBuilder.dataBuffer()));
            connection.quitting = true;
        };
        socket.addEventListener("close", closeOrErrorHandler);
        socket.addEventListener("error", closeOrErrorHandler);
    }

    addCommandFromPlayer(playerId: string, command: Command) {
        // TODO: should we keep this sorted, so that when the game ticks, we process all moves in the same way (e.g by type?)
        // This way, would all joins get processed, then moves, then attacks
        // positive is we group all actions that happen, regardless of time, into the same 'tick bucket' e.g 500ms
        // negatives is complexity of having to keep this sorted when we fan out from 1 command to n events
        this.commandQueue.push({ playerId, command });
    }

    async handleErrors(request: Request, func: () => Promise<Response>) {
        try {
            return await func();
        } catch (err: any) {
            if (request.headers.get("Upgrade") == "websocket") {
                // Annoyingly, if we return an HTTP error in response to a WebSocket request, Chrome devtools
                // won't show us the response body! So... let's send a WebSocket response with an error
                // frame instead.
                let pair = new WebSocketPair();
                pair[1].accept();
                pair[1].send(JSON.stringify({ error: err.stack }));
                pair[1].close(1011, "Uncaught exception during session setup");
                return new Response(null, { status: 101, webSocket: pair[0] });
            } else {
                return new Response(err.stack, { status: 500 });
            }
        }
    }
}
