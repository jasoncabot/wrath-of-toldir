import { Builder, ByteBuffer } from "flatbuffers";
import { EventLog } from "@/models/wrath-of-toldir/events/event-log";
import { JoinEvent, LeaveEvent, MapJoinedEvent, MoveEvent, TileMap, Update, Vec3 } from "@/models/events";
import { Command } from "@/models/wrath-of-toldir/commands/command";
import { Action, AttackCommand, JoinCommand, LeaveCommand, MoveCommand } from "@/models/commands";
import { AttackEvent } from "@/models/wrath-of-toldir/events/attack-event";
import { MapLayer } from "@/models/maps";

export type MapAction = 'store-key' | 'websocket';

type PlayerId = string

interface Connection {
    socket: WebSocket
    quitting: boolean
    player: Player | undefined // set after a player has 'joined' this connection
}

interface Player {
    key: number
    name: string
    position: { x: number, y: number, z: number }
}

interface ReceivedCommand {
    playerId: PlayerId,
    command: Command
}

export class Map implements DurableObject {
    connections: Record<PlayerId, Connection>;
    intervalHandle: number;
    commandQueue: ReceivedCommand[];
    mapData: {
        layers: { key: string, data: number[][] }[]
        width: number
        height: number
    };

    constructor(private readonly state: DurableObjectState, private readonly env: Bindings) {
        this.state = state;
        this.env = env;

        this.connections = {};
        this.commandQueue = [];
        this.intervalHandle = 0;

        const width = 40;
        const height = 40;
        this.mapData = {
            layers: [
                {
                    key: "terrain",
                    data: Array(height).fill(null).map((_, y) => Array(width).fill(null).map((_, x) => {
                        const tileIndex = Math.floor(Math.random() * 450);
                        return tileIndex;
                      }))
                }
            ],
            width, height
        }
    }

    async fetch(request: Request) {
        return await this.handleErrors(request, async () => {
            const searchParams = new URLSearchParams(new URL(request.url).search);
            const action = searchParams.get('action') as MapAction;

            switch (action) {
                case "websocket": {
                    const [client, server] = Object.values(new WebSocketPair());

                    const playerId = request.headers.get('X-PlayerId')!;
                    const socketKey = request.headers.get('X-Socket-Key')!;

                    // TODO: ensure that socketKey matches the key we stored earlier
                    await this.handleSession(server, playerId);

                    return new Response(null, {
                        status: 101,
                        headers: {
                            'Access-Control-Allow-Origin': this.env.FRONTEND_URI,
                            'Content-type': 'application/json',
                        },
                        webSocket: client
                    });
                    break;
                }

                case "store-key": {
                    const playerId = request.headers.get('X-PlayerId');
                    const socketKey = request.headers.get('X-Socket-Key');
                    return new Response(JSON.stringify({
                        map: this.state.id,
                        key: socketKey
                    }), {
                        headers: {
                            'Content-type': 'application/json'
                        }
                    });
                    break;
                }

                default:
                    return new Response("Not found", { status: 404 });
            }
        });
    }

    onGameTick() {
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

        this.commandQueue.forEach(({ playerId, command }) => {
            console.log(`Processing ${Action[command.actionType()]} (seq: ${command.seq()}) from ${playerId}`);

            let player = this.connections[playerId].player;
            if (!player && command.actionType() !== Action.JoinCommand) {
                console.log(`Player with id ${playerId} does not exist players.length = ${Object.keys(this.connections).length}`);
                return;
            }

            switch (command.actionType()) {
                case Action.MoveCommand: {
                    // read client command
                    const move: MoveCommand = command.action(new MoveCommand());

                    // update game state
                    const pos = player!.position;
                    pos.x = move.pos()!.x();
                    pos.y = move.pos()!.y();
                    pos.z = move.pos()!.z();

                    // inform other players
                    const players: PlayerId[] = Object.keys(this.connections); // canObserve(playerId, move);
                    players.forEach(otherPlayerId => {
                        if (otherPlayerId == playerId) return;
                        const { builder, eventOffsets, eventTypeOffsets } = findEventStore(otherPlayerId);

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
                        name: join.name()!,
                        position: { x: Math.floor(Math.random() * this.mapData.width), y: Math.floor(Math.random() * this.mapData.height), z: 0 }
                    };
                    this.connections[playerId].player = player;

                    // inform other players
                    const joined = findEventStore(playerId);
                    this.addCurrentMapState(joined, player);
                    const players: PlayerId[] = Object.keys(this.connections); // canObserve(playerId, move);
                    players.forEach(otherPlayerId => {
                        if (otherPlayerId == playerId) return;
                        const { builder, eventOffsets, eventTypeOffsets } = findEventStore(otherPlayerId);

                        // tell the player who joined about other players who are already here
                        const otherPlayer = this.connections[otherPlayerId].player;
                        if (otherPlayer) {
                            const otherPlayerName = joined.builder.createString(otherPlayer.name);
                            JoinEvent.startJoinEvent(joined.builder);
                            JoinEvent.addKey(joined.builder, otherPlayer.key);
                            JoinEvent.addName(joined.builder, otherPlayerName);
                            JoinEvent.addPos(joined.builder, Vec3.createVec3(joined.builder, otherPlayer.position.x, otherPlayer.position.y, otherPlayer.position.z));
                            joined.eventOffsets.push(JoinEvent.endJoinEvent(joined.builder));
                            joined.eventTypeOffsets.push(Update.JoinEvent);
                        }

                        const nameOffset = builder.createString(player!.name);

                        JoinEvent.startJoinEvent(builder);
                        JoinEvent.addKey(builder, player!.key);
                        JoinEvent.addName(builder, nameOffset);
                        JoinEvent.addPos(builder, Vec3.createVec3(builder, player!.position.x, player!.position.y, player!.position.z));
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

                    if (Object.keys(this.connections).length === 0) {
                        // no one is connected, no point to carry on ticking
                        console.log('No players are connected, shutting down game tick ...');
                        clearInterval(this.intervalHandle);
                        this.intervalHandle = 0;
                    } else {
                        // inform other players
                        const players: PlayerId[] = Object.keys(this.connections); // canObserve(playerId, move);
                        players.forEach(otherPlayerId => {
                            if (otherPlayerId == playerId) return;
                            const { builder, eventOffsets, eventTypeOffsets } = findEventStore(otherPlayerId);

                            LeaveEvent.startLeaveEvent(builder);
                            LeaveEvent.addKey(builder, player!.key);
                            eventOffsets.push(LeaveEvent.endLeaveEvent(builder));
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
                    const players: PlayerId[] = Object.keys(this.connections); // canObserve(playerId, move);
                    players.forEach(otherPlayerId => {
                        if (otherPlayerId == playerId) return;
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
    }

    addCurrentMapState(buffer: { builder: Builder; eventOffsets: number[]; eventTypeOffsets: number[]; }, player: Player) {

        const { builder, eventOffsets, eventTypeOffsets } = buffer;

        const layerOffsets = this.mapData.layers.map(layer => {
            const mapKeyOffset = builder.createString(layer.key);
            const flattenedMapData: number[] = layer.data.flat();
            const dataOffset = MapLayer.createDataVector(builder, flattenedMapData);
            return MapLayer.createMapLayer(builder, mapKeyOffset, dataOffset);
        });
        const layersVector = TileMap.createLayersVector(builder, layerOffsets);
        const tilemapOffset = TileMap.createTileMap(builder, this.mapData.width, this.mapData.height, layersVector);

        MapJoinedEvent.startMapJoinedEvent(builder);
        MapJoinedEvent.addPos(builder, Vec3.createVec3(builder, player.position.x, player.position.y, player.position.z));
        MapJoinedEvent.addTilemap(builder, tilemapOffset);
        const eventOffset = MapJoinedEvent.endMapJoinedEvent(builder);
        eventOffsets.push(eventOffset);
        eventTypeOffsets.push(Update.MapJoinedEvent);
    }

    async handleSession(socket: WebSocket, playerId: PlayerId) {
        // Well this is our main game loop
        if (!this.intervalHandle) {
            console.log(`Player connected, starting up game tick ...`);
            this.intervalHandle = setInterval(this.onGameTick.bind(this), 500);
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
