import { Action, AttackCommand, LeaveCommand } from "@/models/commands";
import { ArtificialIntelligence } from "@/game/components/artificial-intelligence";
import { AttackData, MagicAttack, NormalAttack } from "@/models/attacks";
import { AttackResult } from "./combat";
import { Builder, ByteBuffer } from "flatbuffers";
import { Command } from "@/models/wrath-of-toldir/commands/command";
import { CommandQueue } from "@/game/components/command-queue";
import { EntityId, NPC, Player, PlayerId, TiledJSON } from "@/game/game";
import { EventBuilder } from "@/game/components/event-builder";
import { loadMapData, validMaps } from "@/data/maps";
import { Position, PositionKeeper } from "@/game/components/position-keeper";
import { v4 as uuidv4 } from 'uuid';

export type MapAction = 'store-key' | 'websocket';

export interface Connection {
    socket: WebSocket
    quitting: boolean
    player: Player | undefined // set after a player has 'joined' this connection
}

const TICK_RATE = 500;

export class Map implements DurableObject {
    connections: Record<PlayerId, Connection>;
    intervalHandle: number;
    commandQueue!: CommandQueue;
    mapData: TiledJSON | undefined;
    tickCount: number = 0;
    npcs: Record<EntityId, NPC>;
    positionKeeper!: PositionKeeper;
    eventBuilder: EventBuilder;
    ai!: ArtificialIntelligence;

    constructor(private readonly state: DurableObjectState, private readonly env: Bindings) {
        this.state = state;
        this.env = env;

        this.connections = {};
        this.intervalHandle = 0;
        this.mapData = undefined;
        this.npcs = {};
        this.eventBuilder = new EventBuilder();
    }

    initialiseMap(mapId: string) {
        this.mapData = loadMapData(mapId);
        // TODO: slice and dice these dependencies a bit better, perhaps put them in a context
        this.positionKeeper = new PositionKeeper(this.state.storage, this.mapData);
        this.commandQueue = new CommandQueue(this.mapData, this.positionKeeper, this.eventBuilder, this.connections, this.npcs, this.env.COMBAT);
        this.ai = new ArtificialIntelligence(this.mapData, this.positionKeeper, this.eventBuilder, this.connections, this.npcs);

        // Create NPCs
        // TODO: this is just temporary to see some stuff
        for (let i = 0; i < 10; i++) {
            const npcId = uuidv4();
            this.npcs[npcId] = {
                key: Math.floor(Math.random() * 2147483647),
                type: "slime1",
            };
            this.positionKeeper.spawnEntityAtFreePosition(npcId);
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
                    const socketKey = request.headers.get('X-Socket-Key')!;

                    // ensure that socketKey matches the key we stored earlier
                    if (!socketKey) {
                        return new Response("expected key", { status: 400 });
                    }
                    const playerId = await this.state.storage.get(socketKey) as string;
                    if (!playerId) {
                        return new Response("invalid key", { status: 401 });
                    }

                    if (validMaps.has(mapId) && !this.mapData) {
                        this.initialiseMap(mapId);
                    }

                    await this.handleSession(server, playerId);

                    // consume this token so it can't be re-used
                    this.state.storage.delete(socketKey);

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
                    await this.state.storage.put(socketKey, playerId);
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

    async onGameTick() {
        const start = new Date().getTime();

        // update game state
        this.commandQueue.process(this.tickCount++);
        this.ai.process();

        // emit events for affected clients
        this.eventBuilder.flush(this.connections);

        // check if it's time to shut down the game
        if (Object.keys(this.connections).length === 0) {
            // no one is connected, no point to carry on ticking
            console.log(`[id:${this.mapData!.id}] [tick:${this.tickCount}] No players are connected, shutting down game tick ...`);
            this.onGameEmpty();
        }

        const elapsed = (new Date().getTime() - start);
        if (elapsed > TICK_RATE * 0.8) {
            console.warn(`[id:${this.mapData?.id}] [tick:${this.tickCount}] queue-length:${this.commandQueue.size()} took too much time (${elapsed}ms) to process`);
        }
    }

    onGameEmpty() {
        clearInterval(this.intervalHandle);
        this.intervalHandle = 0;
        this.tickCount = 0;
    }

    async handleSession(socket: WebSocket, playerId: PlayerId) {
        // Well this is our main game loop
        if (!this.intervalHandle) {
            console.log(`[id:${this.mapData?.id}] Player connected, starting up game tick ...`);
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
                this.commandQueue.push(playerId, action);
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
            const commandOffset = Command.createCommand(leaveBuilder, 0, Action.LeaveCommand, actionOffset);
            leaveBuilder.finish(commandOffset);
            this.commandQueue.push(playerId, Command.getRootAsCommand(leaveBuilder.dataBuffer()));
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
