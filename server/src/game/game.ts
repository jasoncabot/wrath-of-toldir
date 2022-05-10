import { EntityTexture } from "@/models/commands"
import { Command } from "@/models/wrath-of-toldir/commands/command"
import { Position } from "./components/position-keeper"

export type EntityId = string
export type PlayerId = EntityId

export interface Player {
    key: number
    userId: string
}

export interface ReceivedCommand {
    entityId: PlayerId,
    command: Command
}

export interface MapTransition {
    x: number
    y: number
    targetId: string
    target: Position
}

export interface MapDataLayer {
    key: string
    data: number[]
    charLayer: string | undefined
    transitions: MapTransition[]
}

export interface MapTileSetCollision {
    index: number
    directions: number // 0b00000000 (none) to 0b11111111 (all)
}

export interface MapTileSet {
    key: string
    gid: number
    collisions: MapTileSetCollision[]
}

export interface TiledJSON {
    id: string
    width: number
    height: number
    layers: MapDataLayer[]
    tilesets: MapTileSet[]
}

export interface Entity {
    key: number
    texture: EntityTexture
    position: Position
}
