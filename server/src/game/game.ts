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
}

export interface MapTileSet {
    key: string
    gid: number
}

export interface TiledJSON {
    layers: MapDataLayer[]
    tilesets: MapTileSet[]
    width: number
    height: number
}

export interface NPC {
    key: number
    type: string
    hp: number
}