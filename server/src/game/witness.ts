import { getEntityPosition, Position } from "./components/positions";
import { EntityId, PlayerId } from "./game";

interface Bounds {
    up: number
    right: number
    down: number
    left: number
}

/**
 * Finds the viewable bounds of a particular entity
 * @param id The identifier of the entity being tested
 * @returns A region that represents which tiles an entity can view
 */
const viewableBounds: (id: EntityId) => Bounds = (id: EntityId) => {
    // Could probably do something smarter here, where we use a 'sight' component
    // that could be re-used for aggro e.t.c later on but meh not yet, hardcoded ftw
    const b = getEntityPosition(id);
    return { up: b.y - 8, left: b.x - 8, right: b.x + 8, down: b.y + 8 };
}

/**
 * Determine if a point is within a set of bounds or not
 * @param point The point to test
 * @param bounds The region of tiles that should contain the point
 * @returns Whether or not the point is contained within the bounds provided
 */
const inBounds = (point: Position, bounds: Bounds) => {
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
export const findMovementWitnesses = (entityId: EntityId, allPlayerIds: PlayerId[], oldPosition: Position, newPosition: Position, callback: ((id: PlayerId) => void)) => {
    allPlayerIds.forEach(otherPlayerId => {
        if (entityId === otherPlayerId) return;

        const viewBox = viewableBounds(otherPlayerId);
        if (!inBounds(oldPosition, viewBox)) return;
        if (!inBounds(newPosition, viewBox)) return;

        callback(otherPlayerId);
    });
}

/**
 * Applies a function on all players who can observe the joining of an entity
 * @param entityId The id of the entity that is joining
 * @param allPlayerIds The id of all players on the map
 * @param callback This will be called for every witness
 */
export const findJoinWitnesses = (entityId: EntityId, allPlayerIds: EntityId[], callback: ((id: PlayerId) => void)) => {
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
export const findAttackWitnesses = (entityId: EntityId, allPlayerIds: EntityId[], callback: ((id: PlayerId) => void)) => {
    // everyone should observe a join, regardless
    const point = getEntityPosition(entityId);
    allPlayerIds.forEach(otherPlayerId => {
        if (entityId === otherPlayerId) return;
        const bounds = viewableBounds(otherPlayerId);
        if (!inBounds(point, bounds)) return;
        callback(otherPlayerId);
    });
}