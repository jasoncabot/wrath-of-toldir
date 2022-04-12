import { AttackResult } from "@/durable-objects/combat";
import { Connection } from "@/durable-objects/map";
import { MagicAttack, NormalAttack } from "@/models/attacks";
import { Action, MoveCommand, JoinCommand, AttackCommand, AttackData } from "@/models/commands";
import { Command } from "@/models/wrath-of-toldir/commands/command";
import { EntityId, MapTransition, NPC, PlayerId, ReceivedCommand, TiledJSON } from "../game";
import { EventBuilder } from "./event-builder";
import { Position, PositionKeeper } from "./position-keeper";

export class CommandQueue {
    private connections: Record<PlayerId, Connection>;
    private commands: ReceivedCommand[];
    private map: TiledJSON;
    private positionKeeper: PositionKeeper;
    private eventBuilder: EventBuilder;
    private npcs: Record<EntityId, NPC>;
    private combat: DurableObjectNamespace;

    constructor(map: TiledJSON, positionKeeper: PositionKeeper, eventBuilder: EventBuilder, connections: Record<PlayerId, Connection>, npcs: Record<EntityId, NPC>, combat: DurableObjectNamespace) {
        this.commands = [];
        this.map = map;
        this.positionKeeper = positionKeeper;
        this.eventBuilder = eventBuilder;
        this.connections = connections;
        this.npcs = npcs;
        this.combat = combat;
    }

    size() { return this.commands.length }

    push(playerId: PlayerId, command: Command) {
        // TODO: should we keep this sorted, so that when the game ticks, we process all moves in the same way (e.g by type?)
        // This way, would all joins get processed, then moves, then attacks
        // positive is we group all actions that happen, regardless of time, into the same 'tick bucket' e.g 500ms
        // negatives is complexity of having to keep this sorted when we fan out from 1 command to n events
        this.commands.push({ playerId, command });
    }

    async process(tickCount: number) {
        const players: PlayerId[] = Object.keys(this.connections);
        for (const { playerId, command } of this.commands) {
            console.log(`[id:${this.map.id}] [tick:${tickCount}] [${playerId}:${command.seq()}] ${Action[command.actionType()]}`);

            if (!this.connections[playerId]) {
                console.log(`Player with id ${playerId} has no socket, ignoring`);
                return;
            }

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
                    const oldPos = this.positionKeeper.getEntityPosition(playerId);
                    const pos = { ...oldPos, x: move.pos()!.x(), y: move.pos()!.y() };

                    // check if this new position should move us to a new zone
                    const transition: MapTransition | undefined = this.positionKeeper.getMapTransitionAtPosition(pos);
                    if (transition) {
                        this.eventBuilder.pushMapChangedEvent(playerId, transition.targetId, transition.target);
                        break; // skip processing a normal move
                    }

                    this.positionKeeper.setEntityPosition(playerId, { x: move.pos()!.x(), y: move.pos()!.y(), z: pos.z });

                    // inform other players
                    this.positionKeeper.findMovementWitnesses(playerId, players, oldPos, pos, (id: PlayerId) => {
                        this.eventBuilder.pushMovementEvent(id, pos, player!.key);
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
                    this.positionKeeper.spawnEntityAtFreePosition(playerId);

                    // inform other players
                    this.eventBuilder.pushCurrentMapState(playerId, this.map, this.npcs, this.positionKeeper);
                    const playerPos = this.positionKeeper.getEntityPosition(playerId);
                    this.positionKeeper.findJoinWitnesses(playerId, players, otherPlayerId => {
                        // tell the player who joined about other players who are already here
                        const otherPlayer = this.connections[otherPlayerId].player;
                        if (otherPlayer) {
                            const otherPlayerPos = this.positionKeeper.getEntityPosition(otherPlayerId);
                            this.eventBuilder.pushJoinEvent(playerId, otherPlayer, otherPlayerPos);
                        }

                        this.eventBuilder.pushJoinEvent(otherPlayerId, player!, playerPos);
                    });
                    break;
                }
                case Action.LeaveCommand: {
                    // we don't need to read client action here, we know that player.id is leaving

                    // update game state
                    delete this.connections[playerId];
                    this.positionKeeper.clearEntityPosition(playerId);

                    if (Object.keys(this.connections).length >= 0) {
                        // inform other players
                        players.forEach(otherPlayerId => {
                            if (otherPlayerId == playerId) return;
                            this.eventBuilder.pushLeaveEvent(otherPlayerId, player!.key);
                        });
                    }
                    break;
                }
                case Action.AttackCommand: {
                    // read client action
                    const attack: AttackCommand = command.action(new AttackCommand());

                    // update game state
                    const damages = await this.performAttack(playerId, attack);

                    // inform other players
                    damages.forEach(({ key, damage }) => {
                        this.eventBuilder.pushDamagedEvent(playerId, key, damage);
                    });
                    this.positionKeeper.findAttackWitnesses(playerId, players, (otherPlayerId) => {
                        this.eventBuilder.pushAttackEvent(otherPlayerId, player!.key, attack);
                        damages.forEach(({ key, damage }) => {
                            this.eventBuilder.pushDamagedEvent(otherPlayerId, key, damage);
                        });
                    });

                    break;
                }
            }
        }
        this.commands = [];
    }

    async performAttack(playerId: PlayerId, attack: AttackCommand) {
        let facingPosition: Position = this.positionKeeper.getEntityPosition(playerId);
        switch (attack.dataType()) {
            case AttackData.NormalAttack: {
                const atk = attack.data(new NormalAttack()) as NormalAttack;
                facingPosition = this.positionKeeper.getFacingPosition(playerId, atk.facing());
            } break;
            case AttackData.MagicAttack: {
                const atk = attack.data(new MagicAttack()) as MagicAttack;
                facingPosition = { x: atk.targetPos()!.x(), y: atk.targetPos()!.y(), z: "" };
            } break;
        }

        const targetEntityIds = this.positionKeeper.getEntitiesAtPosition(facingPosition, true);
        let damages: { key: number, damage: number }[] = [];
        if (targetEntityIds.size > 0) {
            const playerIdCombat = this.combat.idFromName(playerId);
            const stub = this.combat.get(playerIdCombat);
            const result = await stub.fetch(`http://combat/?action=attack`, {
                method: 'POST',
                body: JSON.stringify({ targets: Array.from(targetEntityIds.values()) })
            });
            (await result.json() as AttackResult[]).forEach(({ entityId, damage }) => {
                const npc = this.npcs[entityId];
                if (npc) damages.push({ key: npc.key, damage });
            });
        }

        return damages;
    }
}
