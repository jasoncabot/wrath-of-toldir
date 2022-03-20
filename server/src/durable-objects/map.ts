import { Builder, ByteBuffer } from "flatbuffers";
import { EventLog } from "@/models/wrath-of-toldir/events/event-log";
import { JoinEvent, LeaveEvent, MoveEvent, Update, Vec3 } from "@/models/events";
import { Command } from "@/models/wrath-of-toldir/commands/command";
import { Action, AttackCommand, JoinCommand, LeaveCommand, MoveCommand } from "@/models/commands";
import { AttackEvent } from "@/models/wrath-of-toldir/events/attack-event";

export type MapAction = 'store-key' | 'websocket';

type PlayerId = string

interface Connection {
    socket: WebSocket
    quitting: boolean
    player: Player | undefined
}

interface Player {
    key: number
    name: string
    position: { x: number, y: number, z: number }
}

interface ICommand {
    actionType(): Action;
    action(command: any): any;
}

interface ReceivedCommand {
    playerId: PlayerId,
    command: ICommand
}

export class Map implements DurableObject {
    connections: Record<PlayerId, Connection>;
    intervalHandle: number;
    commandQueue: ReceivedCommand[];

    constructor(private readonly state: DurableObjectState, private readonly env: Bindings) {
        this.state = state;
        this.env = env;

        this.connections = {};
        this.commandQueue = [];

        // Well this is our main game loop
        this.intervalHandle = setInterval(this.onGameTick.bind(this), 500);
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

                    return new Response("", {
                        status: 101,
                        headers: {
                            'Access-Control-Allow-Origin': 'http://localhost:8080',
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

        const createEventStore = (playerId: PlayerId) => {
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
            switch (command.actionType()) {
                case Action.MoveCommand: {
                    // read client command
                    const move: MoveCommand = command.action(new MoveCommand());

                    // update game state
                    const pos = this.connections[playerId].player?.position;
                    if (!pos) {
                        console.log("No position found for player with id " + playerId);
                        return;
                    }
                    pos.x = move.pos()?.x() || 0;
                    pos.y = move.pos()?.y() || 0;
                    pos.z = move.pos()?.z() || 0;

                    // inform other players
                    const players: PlayerId[] = Object.keys(this.connections); // canObserve(playerId, move);
                    players.forEach(otherPlayerId => {
                        if (otherPlayerId == playerId) return;
                        const { builder, eventOffsets, eventTypeOffsets } = createEventStore(otherPlayerId);

                        MoveEvent.startMoveEvent(builder);
                        MoveEvent.addKey(builder, this.connections[playerId].player!.key);
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
                    const key = Math.floor(Math.random() * 2147483647);
                    this.connections[playerId].player = {
                        key,
                        name: join.name() || "Unknown",
                        position: { x: join.pos()!.x(), y: join.pos()!.y(), z: join.pos()!.z() }
                    }

                    // inform other players
                    const joined = createEventStore(playerId);
                    const players: PlayerId[] = Object.keys(this.connections); // canObserve(playerId, move);
                    players.forEach(otherPlayerId => {
                        if (otherPlayerId == playerId) return;
                        const { builder, eventOffsets, eventTypeOffsets } = createEventStore(otherPlayerId);

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

                        const name = builder.createString(join.name());
                        JoinEvent.startJoinEvent(builder);
                        JoinEvent.addKey(builder, key);
                        JoinEvent.addName(builder, name);
                        JoinEvent.addPos(builder, Vec3.createVec3(builder, join.pos()?.x() || 0, join.pos()?.y() || 0, 0));
                        eventOffsets.push(JoinEvent.endJoinEvent(builder));
                        eventTypeOffsets.push(Update.JoinEvent);
                    });
                    break;
                }
                case Action.LeaveCommand: {
                    // read client action
                    const leave: LeaveEvent = command.action(new LeaveCommand());

                    const player = this.connections[playerId].player;
                    if (!player) {
                        console.log(`Player with id ${playerId} no longer exists players.length = ${Object.keys(this.connections).length}`);
                        break;
                    }

                    // update game state
                    delete this.connections[playerId];

                    // inform other players
                    const players: PlayerId[] = Object.keys(this.connections); // canObserve(playerId, move);
                    players.forEach(otherPlayerId => {
                        if (otherPlayerId == playerId) return;
                        const { builder, eventOffsets, eventTypeOffsets } = createEventStore(otherPlayerId);

                        LeaveEvent.startLeaveEvent(builder);
                        LeaveEvent.addKey(builder, player.key);
                        eventOffsets.push(LeaveEvent.endLeaveEvent(builder));
                        eventTypeOffsets.push(Update.LeaveEvent);
                    });
                    break;
                }
                case Action.AttackCommand: {
                    // read client action
                    const attack: AttackEvent = command.action(new AttackCommand());

                    // update game state
                    const player = this.connections[playerId].player;
                    if (!player) {
                        console.log(`Player with id ${playerId} no longer exists players.length = ${Object.keys(this.connections).length}`);
                        return;
                    }

                    // inform other players
                    const players: PlayerId[] = Object.keys(this.connections); // canObserve(playerId, move);
                    players.forEach(otherPlayerId => {
                        if (otherPlayerId == playerId) return;
                        const { builder, eventOffsets, eventTypeOffsets } = createEventStore(otherPlayerId);

                        AttackEvent.startAttackEvent(builder);
                        AttackEvent.addKey(builder, player.key);
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
                if (player.quitting) {
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

    async handleSession(socket: WebSocket, playerId: PlayerId) {
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
            if (player && !quitting || action.actionType() == Action.JoinCommand) {
                this.commandQueue.push({ playerId, command: action });
            } else {
                console.log(`Skipping command ${action.actionType().toString()} from player because they are not ready or quitting`);
            }
        });

        // On "close" and "error" events, remove the WebSocket from the sessions list and broadcast
        // a quit message.
        let closeOrErrorHandler = (event: CloseEvent | MessageEvent | Event) => {
            // since the server can detect when a socket is closed rather than our clients
            // use this to inform other players we've left, using the LeaveCommand/LeaveEvent methodology
            this.commandQueue.push({
                playerId,
                command: {
                    actionType: () => Action.LeaveCommand,
                    action: (_o: any) => new LeaveCommand()
                }
            });

            connection.quitting = true;
        };
        socket.addEventListener("close", closeOrErrorHandler);
        socket.addEventListener("error", closeOrErrorHandler);

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
