import { EntityId } from "../game"

export interface Position {
    x: number
    y: number
    z: number
}

let positions: Record<EntityId, Position> = {};

export const setEntityPosition = (id: EntityId, position: Position) => {
    positions[id] = position;
}

export const getEntityPosition = (id: EntityId) => {
    return positions[id];
}