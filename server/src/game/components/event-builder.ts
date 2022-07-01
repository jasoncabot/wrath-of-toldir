import { AttackData, MagicAttack, NormalAttack } from "@/models/attacks";
import { AttackCommand } from "@/models/commands";
import { EntityInteraction } from "@/models/entities";
import { AttackEvent, Character, DamagedEvent, Entity as EntityEvent, Item, ItemCollectedEvent, ItemDropEvent, ItemTexture, JoinEvent, LeaveEvent, MapChangedEvent, MapJoinedEvent, MoveEvent, TileMap, Update, Vec2 } from "@/models/events";
import { DurabilityComponent, QualityComponent } from "@/models/items";
import { MapLayer, TileCollision, TileSet } from "@/models/maps";
import { ChatEvent } from "@/models/wrath-of-toldir/events/chat-event";
import { DamageState } from "@/models/wrath-of-toldir/events/damage-state";
import { EventLog } from "@/models/wrath-of-toldir/events/event-log";
import { Component } from "@/models/wrath-of-toldir/items/component";
import { DamageComponent } from "@/models/wrath-of-toldir/items/damage-component";
import { PrivateStats } from "@/models/wrath-of-toldir/private-stats";
import { Builder } from "flatbuffers";
import { parse as uuidParse } from 'uuid';
import { Entity, EntityId, Health, PlayerId, TiledJSON } from "../game";
import { ItemDrop } from "./item-hoarder";
import { PickupWitnessType, Position, PositionKeeper } from "./position-keeper";

type Effects = { builder: Builder, eventOffsets: number[], eventTypeOffsets: number[] };

export class EventBuilder {
    private tickEvents: Record<PlayerId, Effects>;

    constructor() {
        this.tickEvents = {};
    }

    private tickEventsForPlayer(playerId: PlayerId) {
        let data = this.tickEvents[playerId];
        if (!data) {
            data = {
                builder: new Builder(1024),
                eventOffsets: [],
                eventTypeOffsets: []
            };
            this.tickEvents[playerId] = data;
        }
        return data;
    }

    private popEventsForPlayer(playerId: PlayerId) {
        const events = this.tickEvents[playerId];
        delete this.tickEvents[playerId];
        return events;
    }


    private createItem = (builder: Builder, idOffset: number, item: Item) => {
        const componentTypeOffsets: number[] = [];
        const componentOffsets: number[] = [];
        for (let i = 0; i < item.componentsLength(); i++) {
            const type = item.componentsType(i)!;
            if (type === Component.NONE) continue;
            componentTypeOffsets.push(type);
            switch (type) {
                case Component.DamageComponent:
                    const damage: DamageComponent = item.components(i, new DamageComponent());
                    componentOffsets.push(DamageComponent.createDamageComponent(builder, damage.min()!, damage.max()!));
                    break;
                case Component.DurabilityComponent:
                    const durability: DurabilityComponent = item.components(i, new DurabilityComponent());
                    componentOffsets.push(DurabilityComponent.createDurabilityComponent(builder, durability.current()!, durability.maximum()!));
                    break;
                case Component.QualityComponent:
                    const quality: QualityComponent = item.components(i, new QualityComponent());
                    componentOffsets.push(QualityComponent.createQualityComponent(builder, quality.quality()!));
                    break;
                default: ((_: never) => { throw new Error("Should handle every state") })(type);
            }
        };

        const componentTypesOffset = Item.createComponentsTypeVector(builder, componentTypeOffsets);
        const componentsOffset = Item.createComponentsVector(builder, componentOffsets);
        return Item.createItem(builder, idOffset, item.template()!, componentTypesOffset, componentsOffset);
    }

    private createCharacter = (builder: Builder, playerId: PlayerId, playerName: string, playerData: Entity, healthRecords: Record<EntityId, Health>) => {

        // Name
        const nameOffset = builder.createString(playerName);

        // Player
        EntityEvent.startEntity(builder);
        EntityEvent.addCharLayer(builder, playerData.position.z);
        EntityEvent.addInteraction(builder, EntityInteraction.Default); // TODO: interaction
        EntityEvent.addKey(builder, playerData.key);
        EntityEvent.addPos(builder, Vec2.createVec2(builder, playerData.position.x, playerData.position.y));
        EntityEvent.addTexture(builder, playerData.texture);
        EntityEvent.addHp(builder, healthRecords[playerId].current);
        EntityEvent.addMaxHp(builder, healthRecords[playerId].max);
        const playerOffset = EntityEvent.endEntity(builder);

        // items
        const items: Item[] = []; // TODO: this should be read from the player's inventory
        const itemOffsets = items.map(item => this.createItem(builder, 0, item));
        const itemsOffset = Character.createItemsVector(builder, itemOffsets);

        Character.startCharacter(builder);
        Character.addName(builder, nameOffset);
        Character.addPlayer(builder, playerOffset);
        Character.addStats(builder, PrivateStats.createPrivateStats(builder, 100, 100, 0, 1000, 1)); // TODO: Read from the player's character
        Character.addGold(builder, 0); // TODO: read from the player's inventory
        Character.addItems(builder, itemsOffset);
        return Character.endCharacter(builder)
    }

    buildEventLog(playerId: string): Uint8Array | undefined {
        const events = this.popEventsForPlayer(playerId);
        if (!events) return undefined;
        const { builder, eventOffsets, eventTypeOffsets } = events;
        const eventVector = EventLog.createEventsVector(builder, eventOffsets);
        const eventTypeVector = EventLog.createEventsTypeVector(builder, eventTypeOffsets);
        EventLog.startEventLog(builder);
        EventLog.addEvents(builder, eventVector);
        EventLog.addEventsType(builder, eventTypeVector);
        const update = EventLog.endEventLog(builder);
        builder.finish(update);

        return builder.asUint8Array();
    }

    pushMovementEvent(playerId: PlayerId, pos: Position, key: number) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        MoveEvent.startMoveEvent(builder);
        MoveEvent.addKey(builder, key);
        MoveEvent.addPos(builder, Vec2.createVec2(builder, pos.x, pos.y));
        MoveEvent.addCharLayer(builder, pos.z);

        eventOffsets.push(MoveEvent.endMoveEvent(builder));
        eventTypeOffsets.push(Update.MoveEvent);
    }

    pushJoinEvent(playerId: PlayerId, name: string, other: Entity, health: Health) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        const otherPlayerName = builder.createString(name);

        EntityEvent.startEntity(builder);
        EntityEvent.addCharLayer(builder, other.position.z);
        EntityEvent.addInteraction(builder, EntityInteraction.Default); // TODO: interaction
        EntityEvent.addKey(builder, other.key);
        EntityEvent.addPos(builder, Vec2.createVec2(builder, other.position.x, other.position.y));
        EntityEvent.addTexture(builder, other.texture);
        EntityEvent.addHp(builder, health.current);
        EntityEvent.addMaxHp(builder, health.max);
        const entityOffset = EntityEvent.endEntity(builder);

        JoinEvent.startJoinEvent(builder);
        JoinEvent.addName(builder, otherPlayerName);
        JoinEvent.addEntity(builder, entityOffset);
        eventOffsets.push(JoinEvent.endJoinEvent(builder));
        eventTypeOffsets.push(Update.JoinEvent);
    }

    pushCurrentMapState(playerId: PlayerId, playerName: string, playerData: Entity, mapData: TiledJSON, npcs: Record<EntityId, Entity>, healthRecords: Record<EntityId, Health>, positionKeeper: PositionKeeper) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        // TODO: can we load the (static) map data earlier and just merge the byte buffer here
        // rather than re-creating each time to save on copying bits around - probably!

        const layerOffsets = mapData.layers.map(layer => {
            const mapKeyOffset = builder.createString(layer.key);
            const dataOffset = MapLayer.createDataVector(builder, layer.data);
            return MapLayer.createMapLayer(builder, mapKeyOffset, dataOffset, layer.charLayer);
        });
        const tilesetOffsets = mapData.tilesets.map(set => {
            const mapKeyOffset = builder.createString(set.key);
            const tileCollisionOffsets = set.collisions.map(c => TileCollision.createTileCollision(builder, c.index, c.directions));
            const collisionsOffset = TileSet.createCollisionsVector(builder, tileCollisionOffsets);
            return TileSet.createTileSet(builder, mapKeyOffset, set.gid, collisionsOffset);
        });
        const layersVector = TileMap.createLayersVector(builder, layerOffsets);
        const tilesetsVector = TileMap.createTilesetsVector(builder, tilesetOffsets);
        const tilemapOffset = TileMap.createTileMap(builder, mapData.width, mapData.height, layersVector, tilesetsVector);

        const npcOffsets = Object.keys(npcs).map(npcId => {
            const npc = npcs[npcId];
            const hp = healthRecords[npcId];
            if (!hp) {
                throw new Error(`failed to read HP (npcs: ${Object.keys(npcs).length}, hp: ${Object.keys(healthRecords).length})`);
            }
            const pos = positionKeeper.getEntityPosition(npcId);

            EntityEvent.startEntity(builder);
            EntityEvent.addCharLayer(builder, pos.z);
            EntityEvent.addInteraction(builder, EntityInteraction.Default); // TODO: interaction
            EntityEvent.addKey(builder, npc.key);
            EntityEvent.addPos(builder, Vec2.createVec2(builder, pos.x, pos.y));
            EntityEvent.addTexture(builder, npc.texture);
            EntityEvent.addHp(builder, hp.current);
            EntityEvent.addMaxHp(builder, hp.max);
            return EntityEvent.endEntity(builder);
        })
        const npcsVectorOffset = MapJoinedEvent.createNpcsVector(builder, npcOffsets);

        const characterOffset = this.createCharacter(builder, playerId, playerName, playerData, healthRecords);

        MapJoinedEvent.startMapJoinedEvent(builder);
        MapJoinedEvent.addTilemap(builder, tilemapOffset);
        MapJoinedEvent.addNpcs(builder, npcsVectorOffset);
        MapJoinedEvent.addCharacter(builder, characterOffset);
        eventOffsets.push(MapJoinedEvent.endMapJoinedEvent(builder));
        eventTypeOffsets.push(Update.MapJoinedEvent);
    }

    pushMapChangedEvent(playerId: PlayerId, mapId: string, position: Position) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        const newMapIdOffset = builder.createString(mapId);
        MapChangedEvent.startMapChangedEvent(builder);
        MapChangedEvent.addId(builder, newMapIdOffset);
        MapChangedEvent.addPos(builder, Vec2.createVec2(builder, position.x, position.y));
        MapChangedEvent.addCharLayer(builder, position.z);
        const mapChangedEventOffset = MapChangedEvent.endMapChangedEvent(builder);

        eventOffsets.push(mapChangedEventOffset);
        eventTypeOffsets.push(Update.MapChangedEvent);
    }

    pushLeaveEvent(playerId: PlayerId, key: number) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        eventOffsets.push(LeaveEvent.createLeaveEvent(builder, key));
        eventTypeOffsets.push(Update.LeaveEvent);
    }

    pushDamagedEvent(playerId: PlayerId, key: number, damage: number, hp: number, state: DamageState) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        const damagedEventOffset = DamagedEvent.createDamagedEvent(builder, key, damage, hp, state);

        eventOffsets.push(damagedEventOffset);
        eventTypeOffsets.push(Update.DamagedEvent);
    }

    pushAttackEvent(playerId: PlayerId, key: number, attack: AttackCommand) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        let dataOffset = 0;
        const type = attack.dataType()!;
        switch (type) {
            case AttackData.NONE: break;
            case AttackData.NormalAttack:
                const normal = attack.data(new NormalAttack()) as NormalAttack;
                dataOffset = NormalAttack.createNormalAttack(builder, normal.facing());
                break;
            case AttackData.MagicAttack:
                const magic = attack.data(new MagicAttack()) as MagicAttack;
                MagicAttack.startMagicAttack(builder);
                MagicAttack.addTargetKey(builder, magic.targetKey());
                MagicAttack.addTargetPos(builder, Vec2.createVec2(builder, magic.targetPos()!.x(), magic.targetPos()!.y()));
                dataOffset = MagicAttack.endMagicAttack(builder);
                break;
            default: ((_: never) => { throw new Error("Should handle every state") })(type);
        }
        AttackEvent.startAttackEvent(builder);
        AttackEvent.addKey(builder, key);
        AttackEvent.addDataType(builder, attack.dataType());
        AttackEvent.addData(builder, dataOffset);
        eventOffsets.push(AttackEvent.endAttackEvent(builder));
        eventTypeOffsets.push(Update.AttackEvent);
    }

    pushChatEvent(playerId: PlayerId, key: number, message: string) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);
        const messageOffset = builder.createString(message);
        eventOffsets.push(ChatEvent.createChatEvent(builder, key, messageOffset));
        eventTypeOffsets.push(Update.ChatEvent);
    }

    pushItemDrop(playerId: PlayerId, position: Position, item: ItemDrop) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        const idOffset = ItemDropEvent.createIdVector(builder, Uint8Array.from(uuidParse(item.id)));

        const itemDropOffset = ItemDropEvent.createItemDropEvent(builder, Vec2.createVec2(builder, position.x, position.y), idOffset, item.template);
        eventOffsets.push(itemDropOffset);
        eventTypeOffsets.push(Update.ItemDropEvent);
    }

    pushItemPickup(playerId: PlayerId, item: Item, key: number, position: Position, type: PickupWitnessType) {
        const { builder, eventOffsets, eventTypeOffsets } = this.tickEventsForPlayer(playerId);

        const idOffset = ItemCollectedEvent.createIdVector(builder, item.idArray()!);
        let itemOffset = 0;
        if (type === PickupWitnessType.Detailed) {
            itemOffset = this.createItem(builder, idOffset, item);
        }

        ItemCollectedEvent.startItemCollectedEvent(builder);
        ItemCollectedEvent.addKey(builder, key);
        ItemCollectedEvent.addPos(builder, Vec2.createVec2(builder, position.x, position.y));
        ItemCollectedEvent.addId(builder, idOffset);
        if (type === PickupWitnessType.Detailed) {
            ItemCollectedEvent.addItem(builder, itemOffset);
        }
        eventOffsets.push(ItemCollectedEvent.endItemCollectedEvent(builder));
        eventTypeOffsets.push(Update.ItemCollectedEvent);

    }
}
