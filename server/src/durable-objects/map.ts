import { loadMapData, validMaps } from "@/data/maps";
import { ArtificialIntelligence } from "@/game/components/artificial-intelligence";
import { CommandQueue } from "@/game/components/command-queue";
import { EventBuilder } from "@/game/components/event-builder";
import { Position, PositionKeeper } from "@/game/components/position-keeper";
import { Entity, EntityId, PlayerId, TiledJSON } from "@/game/game";
import { Action, LeaveCommand } from "@/models/commands";
import { Command } from "@/models/wrath-of-toldir/commands/command";
import { Builder, ByteBuffer } from "flatbuffers";
import { PlayableCharacter } from "./character";

export type MapAction = 'store-key' | 'websocket' | 'store-pos';

export interface Connection {
    socket: WebSocket
    quitting: boolean
    character: PlayableCharacter
    publicCharacterId: number | undefined // set after a player has 'joined' this connection
    playerId: string // identifies a player who may have up to n characters
}

const TICK_RATE = 500;

export class Map implements DurableObject {
    connections: Record<PlayerId, Connection>;
    intervalHandle: number;
    commandQueue!: CommandQueue;
    mapData: TiledJSON | undefined;
    tickCount: number = 0;
    npcs: Record<EntityId, Entity>;
    positionKeeper: PositionKeeper;
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
        this.positionKeeper = new PositionKeeper(this.state.storage, this.env.MAP, this.env.CHARACTER);
    }

    initialiseMap(mapId: string) {
        // TODO: check if we are already initialised...
        this.mapData = loadMapData(mapId);
        // TODO: slice and dice these dependencies a bit better, perhaps put them in a context
        this.positionKeeper.updateWithMap(this.mapData);
        this.commandQueue = new CommandQueue(this.mapData, this.positionKeeper, this.eventBuilder, this.connections, this.npcs, this.env.COMBAT);
        this.ai = new ArtificialIntelligence(this.mapData, this.positionKeeper, this.eventBuilder, this.connections, this.npcs);
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
                    const dataAssociatedWithSocket = await this.state.storage.get(socketKey)
                        .then(data => {
                            const parsed = JSON.parse(data as string) as { playerId: string, playableCharacter: string };
                            return {
                                playerId: parsed.playerId,
                                playableCharacter: JSON.parse(parsed.playableCharacter) as PlayableCharacter
                            }
                        });
                    if (!dataAssociatedWithSocket || !dataAssociatedWithSocket.playerId || !dataAssociatedWithSocket.playableCharacter) {
                        return new Response("Unable to load character", { status: 401 });
                    }
                    if (dataAssociatedWithSocket.playableCharacter.region != mapId) {
                        return new Response("Invalid map id", { status: 400 });
                    }

                    if (validMaps.has(mapId) && !this.mapData) {
                        this.initialiseMap(mapId);
                    }

                    await this.handleSession(server, dataAssociatedWithSocket.playerId, dataAssociatedWithSocket.playableCharacter);

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

                case "store-pos": {
                    const playerId = request.headers.get('X-EntityId')!;
                    let pos: Position = await request.json() as Position;
                    this.positionKeeper.setEntityPosition(playerId, pos);
                    return new Response(JSON.stringify(pos), {
                        status: 200,
                        headers: {
                            'Access-Control-Allow-Origin': this.env.FRONTEND_URI,
                            'Content-type': 'application/json'
                        }
                    });
                }

                case "store-key": {
                    const playerId = request.headers.get('X-PlayerId')!;
                    const characterId = request.headers.get('X-CharacterId')!;
                    const socketKey = request.headers.get('X-Socket-Key')!;

                    // one player has many characters
                    let id = this.env.CHARACTER.idFromName(playerId);
                    let obj = this.env.CHARACTER.get(id);
                    const playableCharacter: string = await obj.fetch(`https://character?action=show&characterId=${characterId}`)
                        .then(resp => resp.text());

                    await this.state.storage.put(socketKey, JSON.stringify({ playerId, playableCharacter }));
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
        await this.commandQueue.process(this.tickCount++);
        await this.ai.process(this.tickCount);

        // emit events for affected clients
        for (const [playerId, player] of Object.entries(this.connections)) {
            const socket = player.socket;
            try {
                if (player.quitting && socket.readyState !== WebSocket.READY_STATE_CLOSED) {
                    socket.close(1011, "WebSocket broken.");
                    continue;
                }

                const data = this.eventBuilder.buildEventLog(playerId);
                if (!data) continue;

                socket.send(data);
            } catch (err: any) {
                console.log(`[id:${this.mapData!.id}] [tick:${this.tickCount}] [${err.message}] Error flushing socket ...`);
            }
        };

        // check if it's time to shut down the game
        if (Object.keys(this.connections).length === 0) {
            // no one is connected, no point to carry on ticking
            console.log(`[id:${this.mapData!.id}] [tick:${this.tickCount}] No players are connected, shutting down game tick ...`);
            this.onGameEmpty();
        }

        const elapsed = (new Date().getTime() - start);
        if (elapsed > TICK_RATE * 0.8) {
            console.warn(`[id:${this.mapData?.id}] [tick:${this.tickCount}] [queue-length:${this.commandQueue.size()}] took too much time (${elapsed}ms) to process`);
        }
    }

    onGameEmpty() {
        clearInterval(this.intervalHandle);
        this.intervalHandle = 0;
        this.tickCount = 0;
    }

    async handleSession(socket: WebSocket, playerId: string, character: PlayableCharacter) {
        const characterId = character.id;

        // Well this is our main game loop
        if (!this.intervalHandle) {
            console.log(`[id:${this.mapData?.id}] Player connected with character [id:${characterId}], starting up game tick ...`);
            this.intervalHandle = setInterval(this.onGameTick.bind(this), TICK_RATE);
        }

        socket.accept();

        const connection = {
            socket,
            publicCharacterId: undefined,
            character: character,
            quitting: false,
            playerId: playerId
        };
        this.connections[characterId] = connection;

        socket.addEventListener("message", async msg => {

            // TODO: check for rate limiting of playerId / character

            if (!this.connections[characterId]) {
                console.log(`No connection data found for character ${characterId}`);
                return;
            };

            const data: ArrayBuffer = msg.data as ArrayBuffer;
            let bb = new ByteBuffer(new Uint8Array(data));

            const action = Command.getRootAsCommand(bb);

            const { publicCharacterId, quitting } = this.connections[characterId];
            if ((publicCharacterId && !quitting) || action.actionType() == Action.JoinCommand) {
                this.commandQueue.push(characterId, action);
            } else {
                console.log(`Skipping command ${Action[action.actionType()]} from character ${characterId} because they are not ready or quitting`);
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
            this.commandQueue.push(characterId, Command.getRootAsCommand(leaveBuilder.dataBuffer()));
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
