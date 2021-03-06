import { durableObjectActionMap } from "@/handlers/maps";
import { Entity } from "@/models/events";
import { Elevation } from "@/models/wrath-of-toldir/elevation";
import { EntityId, MapTransition, PlayerId, TiledJSON } from "../game";

type PositionKey = string

export interface Position {
    x: number
    y: number
    z: Elevation
}

export enum Direction {
    NONE = "none",
    LEFT = "left",
    UP_LEFT = "up-left",
    UP = "up",
    UP_RIGHT = "up-right",
    RIGHT = "right",
    DOWN_RIGHT = "down-right",
    DOWN = "down",
    DOWN_LEFT = "down-left"
}

interface Bounds {
    up: number
    right: number
    down: number
    left: number
}

export enum PickupWitnessType {
    Basic,
    Detailed
}

const Directions = [Direction.NONE, Direction.LEFT, Direction.UP_LEFT, Direction.UP, Direction.UP_RIGHT, Direction.RIGHT, Direction.DOWN_RIGHT, Direction.DOWN, Direction.DOWN_LEFT];

type EntityIndex = Set<EntityId>[];

const storageKey = (id: EntityId) => {
    return `${id}:pos`;
}

export const keyForElevation = (elevation: Elevation) => {
    switch (elevation) {
        case Elevation.Unknown: return undefined;
        case Elevation.Level1: return "charLevel1";
        default: ((_: never) => { throw new Error("Should handle every state") })(elevation);
    }
}

export const elevationForKey = (key: string | undefined) => {
    if (key === 'charLevel1') return Elevation.Level1;
    return Elevation.Unknown;
}

export class PositionKeeper {
    blockedTileIdentifiers: Set<number>
    charactersNamespace: DurableObjectNamespace
    map: TiledJSON | undefined
    mapsNamespace: DurableObjectNamespace
    positionIndex: Record<PositionKey, EntityIndex>
    positions: Record<EntityId, Position>
    storage: DurableObjectStorage

    constructor(storage: DurableObjectStorage, nsMap: DurableObjectNamespace, charactersNamespace: DurableObjectNamespace) {
        this.positions = {};
        this.positionIndex = {};

        this.storage = storage;
        this.mapsNamespace = nsMap;
        this.charactersNamespace = charactersNamespace;
        this.blockedTileIdentifiers = new Set<number>();
    }

    updateWithMap(map: TiledJSON) {
        this.map = map;
        // pre-populate the set of map tile identifiers that we can't walk on
        this.blockedTileIdentifiers.clear();
        for (let tileset of this.map.tilesets) {
            for (let collision of tileset.collisions) {
                const allDirections = 0b11111111; // this represents all directions are blocked, so we can't spawn here
                if (collision.directions === allDirections) {
                    this.blockedTileIdentifiers.add(collision.index);
                }
            }
        }
    }

    toKey(x: number, y: number) {
        return `${x}:${y}`;
    }

    fromKey(key: PositionKey) {
        const [x, y] = key.split(":");
        return { x: parseInt(x, 10), y: parseInt(y, 10) };
    }

    clearEntityPosition(id: EntityId) {
        const pos = this.getEntityPosition(id);
        if (!pos) return;
        this.positionIndex[this.toKey(pos.x, pos.y)][pos.z].delete(id);
        delete this.positions[id];
    }

    removeEntity(id: EntityId) {
        if (this.positions[id]) {
            const oldKey = this.toKey(this.positions[id].x, this.positions[id].y);
            this.positionIndex[oldKey][this.positions[id].z].delete(id);

            delete this.positions[id];
        }
        this.storage.delete(storageKey(id));
    }

    setEntityPosition(id: EntityId, position: Position) {
        if (this.positions[id]) {
            // we are going to assume this all exists as it should have been set after
            // a call to setEntityPosition
            const oldKey = this.toKey(this.positions[id].x, this.positions[id].y);
            this.positionIndex[oldKey][this.positions[id].z].delete(id);
        }

        // this is the bit that actually updates the state
        this.positions[id] = position;

        this.storage.put(storageKey(id), position);

        // keep a map of x,y positions with the set of entities that are occupying
        // that space at various heights for fast lookup, e.g:
        // * {x, y} => { "1:2" => [[], [player1, player2]], "1:3" => [[npc1], [npc2]] }
        let entityIndex = this.positionIndex[this.toKey(this.positions[id].x, this.positions[id].y)];
        if (!entityIndex) {
            entityIndex = [];
            this.positionIndex[this.toKey(this.positions[id].x, this.positions[id].y)] = entityIndex;
        }

        let entities = entityIndex[this.positions[id].z];
        if (!entities) {
            entities = new Set(); // TODO: we can likely avoid allocating a new object here and simply move the old one to the new key
            entityIndex[this.positions[id].z] = entities;
        }

        entities.add(id);
    }

    async spawnEntityAtFreePosition(entityId: EntityId) {
        if (!this.map) throw new Error(`Unable to spawn entity with id ${entityId} when map is undefined. Ensure map data has loaded.`);
        let spawnPosition: Position | undefined = await this.storage.get(storageKey(entityId));

        let retries = 5;
        while (!spawnPosition && retries > 0) {
            spawnPosition = {
                x: Math.floor(Math.random() * this.map.width),
                y: Math.floor(Math.random() * this.map.height),
                z: Elevation.Level1
            };
            if (this.isBlocked(spawnPosition)) {
                spawnPosition = undefined;
            }
            retries--;
        }

        if (!spawnPosition) {
            throw new Error("Failed to generate spawn position for entity with id " + entityId);
        }

        this.setEntityPosition(entityId, spawnPosition);
    }

    spawnEntityAt(entityId: EntityId, position: Position) {
        if (!this.map) throw new Error(`Unable to spawn entity with id ${entityId} when map is undefined. Ensure map data has loaded.`);

        this.setEntityPosition(entityId, position);
    }

    getEntitiesAtPosition(position: Position, ignoringElevation = false) {
        const key = this.toKey(position.x, position.y);
        const allElevations = this.positionIndex[key] || [];
        const entities: Set<EntityId> = new Set();
        const addToEntities = (entityId: EntityId) => entities.add(entityId);
        if (ignoringElevation) {
            for (const heightLayer of allElevations) {
                if (heightLayer) heightLayer.forEach(addToEntities);
            }
        } else {
            if (allElevations[position.z]) {
                allElevations[position.z].forEach(addToEntities);
            }
        }
        return entities;
    }

    getEntityPosition(id: EntityId) {
        return this.positions[id];
    }

    getFacingPosition(id: EntityId, facing: number) {
        const direction = Directions[facing];
        const position = this.getEntityPosition(id);
        // We don't need to worry about z here, we are only considered to be facing something if we are on the same plane as it
        switch (direction) {
            case Direction.NONE: return position;
            case Direction.LEFT: return { ...position, x: position.x - 1 };
            case Direction.UP_LEFT: return { ...position, x: position.x - 1, y: position.y - 1 };
            case Direction.UP: return { ...position, y: position.y - 1 };
            case Direction.UP_RIGHT: return { ...position, x: position.x + 1, y: position.y - 1 };
            case Direction.RIGHT: return { ...position, x: position.x + 1 };
            case Direction.DOWN_RIGHT: return { ...position, x: position.x + 1, y: position.y + 1 };
            case Direction.DOWN: return { ...position, y: position.y + 1 };
            case Direction.DOWN_LEFT: return { ...position, x: position.x - 1, y: position.y - 1 };
            default: ((_: never) => { throw new Error("Should handle every state") })(direction);
        }
    }

    isBlocked(position: Position) {
        if (!this.map) return false;
        if (this.getEntitiesAtPosition(position, true).size > 0) return true;

        const layer = this.map.layers.find(x => x.charLayer == position.z);
        if (!layer) return false;

        const tileId = layer!.data[position.x + (position.y * this.map.width)];

        return this.blockedTileIdentifiers.has(tileId);
    }

    getMapTransitionAtPosition(position: Position) {
        if (!this.map) return undefined;
        const transition = this.map.layers.find(l => l.charLayer === position.z)?.transitions.find(t => t.x === position.x && t.y === position.y);
        return transition;
    }

    async applyTransition(playerId: string, entityId: EntityId, transition: MapTransition) {
        // delete from this position keeper
        this.clearEntityPosition(entityId);

        // transfer to other map
        const nextMapId = this.mapsNamespace.idFromName(transition.targetId);
        const moveMapPromise = this.mapsNamespace.get(nextMapId)
            .fetch(durableObjectActionMap("store-pos"), {
                headers: { "X-EntityId": entityId },
                method: 'POST',
                body: JSON.stringify(transition.target)
            });

        const playersCharacters = this.charactersNamespace.idFromName(playerId);
        const updateCharRegionPromise = this.charactersNamespace.get(playersCharacters)
            .fetch(`https://character?action=setRegion&characterId=${entityId}`, {
                headers: { "X-EntityId": entityId },
                method: 'POST',
                body: transition.targetId
            });

        return Promise.all([moveMapPromise, updateCharRegionPromise]);
    }

    /**
     * Finds the viewable bounds of a particular entity
     * @param id The identifier of the entity being tested
     * @returns A region that represents which tiles an entity can view
     */
    viewableBounds(id: EntityId) {
        // Could probably do something smarter here, where we use a 'sight' component
        // that could be re-used for aggro e.t.c later on but meh not yet, hardcoded ftw
        const position = this.getEntityPosition(id);
        if (!position) return undefined;
        return {
            up: position.y - 8,
            left: position.x - 8,
            right: position.x + 8,
            down: position.y + 8
        } as Bounds;
    }

    /**
     * Determine if a point is within a set of bounds or not
     * @param point The point to test
     * @param bounds The region of tiles that should contain the point
     * @returns Whether or not the point is contained within the bounds provided
     */
    inBounds(point: Position, bounds: Bounds | undefined) {
        if (!bounds) return false;
        if (point.x < bounds.left) return false;
        if (point.x > bounds.right) return false;
        if (point.y < bounds.up) return false;
        if (point.y > bounds.down) return false;
        return true;
    }

    /**
     * Applies a function on all players who can observe movement of a particular entity
     * @param entityId The id of the entity that is moving
     * @param allPlayerIds The id of all players on the map
     * @param oldPosition Where entityId is moving from
     * @param newPosition Where entityId is moving to
     * @param callback This will be called for every witness
     */
    findMovementWitnesses(entityId: EntityId, allPlayerIds: PlayerId[], oldPosition: Position, newPosition: Position, callback: ((id: PlayerId) => void)) {
        allPlayerIds.forEach(otherPlayerId => {
            if (entityId === otherPlayerId) return;

            const viewBox = this.viewableBounds(otherPlayerId);
            if (!this.inBounds(oldPosition, viewBox)) return;
            if (!this.inBounds(newPosition, viewBox)) return;

            callback(otherPlayerId);
        });
    }

    /**
     * Applies a function on all players who can observe the joining of an entity
     * @param entityId The id of the entity that is joining
     * @param allPlayerIds The id of all players on the map
     * @param callback This will be called for every witness
     */
    findJoinWitnesses(entityId: EntityId, allPlayerIds: EntityId[], callback: ((id: PlayerId) => void)) {
        // everyone should observe a join, regardless
        allPlayerIds.forEach(otherPlayerId => {
            if (entityId === otherPlayerId) return;
            callback(otherPlayerId);
        });
    }

    /**
     * Applies a function on all players who can observe the attack of an entity
     * @param entityId The id of the entity that is attacking
     * @param allPlayerIds The id of all players on the map
     * @param callback This will be called for every witness
     */
    findAttackWitnesses(entityId: EntityId, allPlayerIds: EntityId[], callback: ((id: PlayerId) => void)) {
        // everyone should observe a join, regardless
        const point = this.getEntityPosition(entityId);
        allPlayerIds.forEach(otherPlayerId => {
            if (entityId === otherPlayerId) return;
            const bounds = this.viewableBounds(otherPlayerId);
            if (!this.inBounds(point, bounds)) return;
            callback(otherPlayerId);
        });
    }

    findDropWitnesses(position: Position, allPlayerIds: EntityId[], callback: ((id: PlayerId) => void)) {
        // everyone within range should see the drop
        allPlayerIds.forEach(otherPlayerId => {
            const viewBox = this.viewableBounds(otherPlayerId);
            if (!this.inBounds(position, viewBox)) return;
            callback(otherPlayerId);
        });
    }

    findPickupWitnesses(entityId: EntityId, position: Position, allPlayerIds: EntityId[], callback: ((id: PlayerId, detailed: PickupWitnessType) => void)) {
        // everyone within range should see the pickup
        allPlayerIds.forEach(otherPlayerId => {
            const viewBox = this.viewableBounds(otherPlayerId);
            if (!this.inBounds(position, viewBox)) return;

            const details = entityId === otherPlayerId ? PickupWitnessType.Detailed : PickupWitnessType.Basic;
            callback(otherPlayerId, details);
        });
    }
}
