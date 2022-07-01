import { AttackDamageResult, AttackResult, SpawnResult } from "@/durable-objects/combat";
import { Connection } from "@/durable-objects/map";
import { MagicAttack, NormalAttack } from "@/models/attacks";
import { Action, AttackCommand, AttackData, ChatCommand, EntityTexture, JoinCommand, MoveCommand, PickupCommand, SpawnCommand } from "@/models/commands";
import { Elevation, Item } from "@/models/events";
import { Command } from "@/models/wrath-of-toldir/commands/command";
import { DamageState } from "@/models/wrath-of-toldir/events/damage-state";
import { stringify as uuidStringify, v4 as uuidv4 } from 'uuid';
import { Entity, EntityId, Health, MapTransition, PlayerId, ReceivedCommand, TiledJSON } from "../game";
import { EventBuilder } from "./event-builder";
import { ItemDrop, ItemHoarder } from "./item-hoarder";
import { PickupWitnessType, Position, PositionKeeper } from "./position-keeper";
import Randomiser from "./randomiser";

export type CharacterDetailLookup = (playerId: PlayerId, characterId: PlayerId) => Promise<{ name: string, texture: EntityTexture }>;

export class CommandQueue {
    private connections: Record<PlayerId, Connection>;
    private commands: ReceivedCommand[];
    private map: TiledJSON;
    private positionKeeper: PositionKeeper;
    private eventBuilder: EventBuilder;
    private npcs: Record<EntityId, Entity>;
    private healthRecords: Record<EntityId, Health>;
    private combat: DurableObjectNamespace;
    private itemHoarder: ItemHoarder;
    private randomiser: Randomiser;

    // TODO: This is horrid - still need to think about how to structure this and what it's responsibilities are
    constructor(map: TiledJSON, positionKeeper: PositionKeeper, eventBuilder: EventBuilder, connections: Record<PlayerId, Connection>, npcs: Record<EntityId, Entity>, healthRecords: Record<EntityId, Health>, combat: DurableObjectNamespace, itemHoarder: ItemHoarder, randomiser: Randomiser) {
        this.commands = [];
        this.map = map;
        this.positionKeeper = positionKeeper;
        this.eventBuilder = eventBuilder;
        this.connections = connections;
        this.npcs = npcs;
        this.healthRecords = healthRecords;
        this.combat = combat;
        this.itemHoarder = itemHoarder;
        this.randomiser = randomiser;
    }

    size() { return this.commands.length }

    push(characterId: PlayerId, command: Command) {
        // TODO: should we keep this sorted, so that when the game ticks, we process all moves in the same way (e.g by type?)
        // This way, would all joins get processed, then moves, then attacks
        // positive is we group all actions that happen, regardless of time, into the same 'tick bucket' e.g 500ms
        // negatives is complexity of having to keep this sorted when we fan out from 1 command to n events
        this.commands.push({ entityId: characterId, command });
    }

    async process(tickCount: number) {
        const players: PlayerId[] = Object.keys(this.connections);
        for (const { entityId, command } of this.commands) {
            console.log(`[id:${this.map.id}] [tick:${tickCount}] [${entityId}:${command.seq()}] ${Action[command.actionType()]}`);

            if (!this.connections[entityId]) {
                console.log(`Player with id ${entityId} has no socket, ignoring`);
                return;
            }

            let publicCharacterId = this.connections[entityId].publicCharacterId;
            if (!publicCharacterId) {
                if (command.actionType() === Action.LeaveCommand) {
                    // we don't need to close the socket, the user has already quit and will be processed by LeaveCommand
                    break;
                }
                if (command.actionType() !== Action.JoinCommand) {
                    if (players.length < 10) {
                        console.log(`Player with id ${entityId} does not exist players = ${JSON.stringify(players)}`);
                    } else {
                        console.log(`Player with id ${entityId} does not exist players.length = ${players.length}`);
                    }
                    this.connections[entityId].socket.close(1011, "Must send JoinCommand as first command");
                    return;
                }
            }

            switch (command.actionType()) {
                case Action.MoveCommand: {
                    // read client command
                    const move: MoveCommand = command.action(new MoveCommand());

                    // update game state
                    const oldPos = this.positionKeeper.getEntityPosition(entityId);
                    const pos = { ...oldPos, x: move.pos()!.x(), y: move.pos()!.y() };

                    // check if this new position should move us to a new zone
                    const transition: MapTransition | undefined = this.positionKeeper.getMapTransitionAtPosition(pos);
                    if (transition) {
                        this.eventBuilder.pushMapChangedEvent(entityId, transition.targetId, transition.target);
                        this.positionKeeper.applyTransition(this.connections[entityId].playerId, entityId, transition);
                        break; // skip processing a normal move
                    }
                    this.positionKeeper.setEntityPosition(entityId, { x: pos.x, y: pos.y, z: pos.z });

                    // inform other players
                    this.positionKeeper.findMovementWitnesses(entityId, players, oldPos, pos, (id: PlayerId) => {
                        this.eventBuilder.pushMovementEvent(id, pos, publicCharacterId!);
                    });
                    break;
                }
                case Action.JoinCommand: {
                    // read client command
                    const join: JoinCommand = command.action(new JoinCommand());

                    // update game state
                    // a key represents a characterId on a map and is a public reference to a particular entity
                    const publicCharId = this.randomiser.between(0, 2147483646);
                    this.connections[entityId].publicCharacterId = publicCharId;
                    await this.positionKeeper.spawnEntityAtFreePosition(entityId);
                    const character = this.connections[entityId].character;

                    // add character to our health records and the combat map
                    const npcCombatStatsId = this.combat.idFromName(entityId);
                    const npcCombatStats = this.combat.get(npcCombatStatsId);
                    const stats: SpawnResult = await npcCombatStats.fetch(`http://combat/?action=spawn`, {
                        method: 'POST'
                    }).then(spawn => spawn.json() as unknown as SpawnResult);
                    const health = {
                        current: stats.hp,
                        max: stats.hp
                    };
                    this.healthRecords[entityId] = health;

                    // inform other players
                    const playerData: Entity = {
                        key: publicCharId,
                        position: this.positionKeeper.getEntityPosition(entityId),
                        texture: character.texture
                    };
                    this.eventBuilder.pushCurrentMapState(entityId, character.name, playerData, this.map, this.npcs, this.healthRecords, this.positionKeeper);
                    this.positionKeeper.findJoinWitnesses(entityId, players, async otherPlayerId => {
                        // tell the player who joined about other players who are already here
                        const otherPublicCharacterId = this.connections[otherPlayerId].publicCharacterId;
                        const otherCharacter = this.connections[otherPlayerId].character;
                        if (otherPublicCharacterId) {
                            const otherPlayerData: Entity = {
                                key: otherPublicCharacterId,
                                position: this.positionKeeper.getEntityPosition(otherPlayerId),
                                texture: otherCharacter.texture
                            };
                            // push to the player who joined
                            this.eventBuilder.pushJoinEvent(entityId, otherCharacter.name, otherPlayerData, this.healthRecords[otherPlayerId]);
                        }

                        // push to other players that we joined
                        this.eventBuilder.pushJoinEvent(otherPlayerId, character.name, playerData, health);
                    });
                    break;
                }
                case Action.LeaveCommand: {
                    // we don't need to read client action here, we know that player.id is leaving

                    // update game state
                    delete this.connections[entityId];
                    this.positionKeeper.clearEntityPosition(entityId);

                    if (Object.keys(this.connections).length >= 0) {
                        // inform other players
                        players.forEach(otherPlayerId => {
                            if (otherPlayerId == entityId) return;
                            this.eventBuilder.pushLeaveEvent(otherPlayerId, publicCharacterId!);
                        });
                    }
                    break;
                }
                case Action.AttackCommand: {
                    // read client action
                    const attack: AttackCommand = command.action(new AttackCommand());

                    // update game state
                    const damages = await this.performAttack(entityId, attack);
                    // check if anything died
                    damages.forEach(damage => {
                        if (damage.state == DamageState.Dead) {
                            // Destroy this NPC
                            this.positionKeeper.removeEntity(damage.targetId);
                            delete this.npcs[damage.targetId];

                            // TODO: increase experience of player

                            // drop loot
                            const position = damage.position;
                            const item = this.itemHoarder.create(this.map.id, position);
                            this.positionKeeper.findDropWitnesses(damage.position, players, (otherPlayerId) => {
                                this.eventBuilder.pushItemDrop(otherPlayerId, damage.position, item);
                            });
                        }
                    });

                    // inform other players
                    damages.forEach(({ key, damage, remaining, state }) => {
                        this.eventBuilder.pushDamagedEvent(entityId, key, damage, remaining, state);
                    });
                    this.positionKeeper.findAttackWitnesses(entityId, players, (otherPlayerId) => {
                        this.eventBuilder.pushAttackEvent(otherPlayerId, publicCharacterId!, attack);
                        damages.forEach(({ key, damage, remaining, state }) => {
                            this.eventBuilder.pushDamagedEvent(otherPlayerId, key, damage, remaining, state);
                        });
                    });

                    break;
                }

                case Action.ChatCommand: {
                    // read client action
                    const chat: ChatCommand = command.action(new ChatCommand());

                    // inform other players
                    const safeMessage = chat.message()!; // TODO: sanitise message here

                    players.forEach(otherPlayerId => {
                        this.eventBuilder.pushChatEvent(otherPlayerId, publicCharacterId!, safeMessage);
                    });

                    break;
                }

                case Action.SpawnCommand: {
                    // read client action
                    const spawn: SpawnCommand = command.action(new SpawnCommand());

                    // update game state
                    const npcId = uuidv4();
                    const npcKey = this.randomiser.between(0, 2147483646);
                    const position: Position = {
                        x: spawn.pos()!.x(),
                        y: spawn.pos()!.y(),
                        z: Elevation.Level1
                    };
                    const entity = {
                        key: npcKey,
                        position: position,
                        texture: spawn.type()
                    };
                    this.npcs[npcId] = entity;

                    this.positionKeeper.spawnEntityAt(npcId, position);

                    // add character to our health records and the combat map
                    const npcCombatStatsId = this.combat.idFromName(npcId);
                    const npcCombatStats = this.combat.get(npcCombatStatsId);
                    const stats: SpawnResult = await npcCombatStats.fetch(`http://combat/?action=spawn`, {
                        method: 'POST'
                    }).then(spawn => spawn.json() as unknown as SpawnResult);
                    const health = {
                        current: stats.hp,
                        max: stats.hp
                    };
                    this.healthRecords[npcId] = health;

                    // inform other players
                    players.forEach(otherPlayerId => {
                        this.eventBuilder.pushJoinEvent(otherPlayerId, "", entity, health);
                    });

                    break;
                }

                case Action.PickupCommand: {
                    // read client action
                    const pickupCommand: PickupCommand = command.action(new PickupCommand());

                    // update game state
                    // TODO: handle someone else has already picked this up!
                    const { item, position } = (await this.itemHoarder.pickup(this.map.id, uuidStringify(pickupCommand.idArray()!))!)!;

                    // inform other players
                    this.positionKeeper.findPickupWitnesses(entityId, position, players, (otherPlayerId, details) => {
                        // Should these players be sent the full details or just the position that the item was picked up from
                        // this may have to change if we want to support more than 1 item on the ground in each position
                        this.eventBuilder.pushItemPickup(otherPlayerId, item, publicCharacterId!, position, details);
                    });
                    break;
                }
            }
        }
        this.commands = [];

        // TODO: Process any scheduled commands, for example an enemy moving or spawning or delayed cooldown
        // due to happen on a particular tick
    }

    async performAttack(playerId: PlayerId, attack: AttackCommand) {
        // TODO: Move this to another object (like position keeper)
        let facingPosition: Position = this.positionKeeper.getEntityPosition(playerId);
        const type = attack.dataType()!;
        switch (type) {
            case AttackData.NONE: break;
            case AttackData.NormalAttack: {
                const atk = attack.data(new NormalAttack()) as NormalAttack;
                facingPosition = this.positionKeeper.getFacingPosition(playerId, atk.facing());
            } break;
            case AttackData.MagicAttack: {
                const atk = attack.data(new MagicAttack()) as MagicAttack;
                facingPosition = { x: atk.targetPos()!.x(), y: atk.targetPos()!.y(), z: Elevation.Level1 };
            } break;
            default: ((_: never) => { throw new Error("Should handle every state") })(type);
        }

        const targetEntityIds = this.positionKeeper.getEntitiesAtPosition(facingPosition, true);
        let damages: AttackDamageResult[] = [];
        if (targetEntityIds.size > 0) {
            const playerIdCombat = this.combat.idFromName(playerId);
            const stub = this.combat.get(playerIdCombat);
            const result: AttackResult[] = await stub.fetch(`http://combat/?action=attack`, {
                method: 'POST',
                body: JSON.stringify({ targets: Array.from(targetEntityIds.values()) })
            }).then(attack => attack.json() as unknown as AttackResult[]);
            result.forEach(({ entityId, damage, hp, state }) => {
                const npc = this.npcs[entityId];
                if (!npc) return;
                damages.push({
                    attackerId: playerId,
                    targetId: entityId,
                    key: npc.key,
                    damage,
                    remaining: hp,
                    state,
                    position: facingPosition
                });
            });
        }

        return damages;
    }
}
