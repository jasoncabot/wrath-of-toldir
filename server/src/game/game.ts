import { Command } from "@/models/wrath-of-toldir/commands/command"

export type EntityId = string
export type PlayerId = EntityId

export interface Player {
    key: number
    name: string
}

export interface ReceivedCommand {
    playerId: PlayerId,
    command: Command
}

export interface MapDataLayer {
    key: string
    data: number[]
    charLayer: string | undefined
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

export interface NPC {
    key: number
    type: string
    hp: number
}