import { MapDataLayer, MapTileSet, MapTileSetCollision, TiledJSON } from '@/game/game';
import fisherswatch from './fisherswatch.json';
import testroom1 from './fisherswatch.json';

const maps: Record<string, any> = {
    fisherswatch,
    testroom1
}

const toCollisionBitMask = (properties: { name: string, type: string, value: boolean }[]) => {
    let collisions: number = 0b00000000;
    properties.forEach(({ name, value }) => {
        if (!value) return;
        switch (name) {
            case "ge_collide_up":
                collisions |= 0b10000000;
                break;
            case "ge_collide_down":
                collisions |= 0b01000000;
                break;
            case "ge_collide_left":
                collisions |= 0b00100000;
                break;
            case "ge_collide_right":
                collisions |= 0b00010000;
                break;
            case "ge_collide_up-left":
                collisions |= 0b00001000;
                break;
            case "ge_collide_up-right":
                collisions |= 0b00000100;
                break;
            case "ge_collide_down-left":
                collisions |= 0b00000010;
                break;
            case "ge_collide_down-right":
                collisions |= 0b00000001;
                break;
        }
    });
    return collisions as number;
}

const parseTileSets: (map: TiledJSON) => MapTileSet[] = (map: TiledJSON) => {
    return map.tilesets.map((set: any) => {
        return {
            key: set.name,
            gid: set.firstgid,
            collisions: (set.tiles || []).map((tile: { id: number, properties: { name: string, type: string, value: boolean }[] | undefined }) => {
                return {
                    // we calculate the global index here to save the 
                    // client from having to do so
                    // e.g tile 4 in the collisions tileset has collisions in all directions
                    // this tile set is used as tileset number 5 (with gid 1422) so
                    // the global index of collidable tiles is 1422 + 4 = 1426 
                    index: set.firstgid + tile.id,
                    directions: toCollisionBitMask(tile.properties || [])
                } as MapTileSetCollision;
            }).filter((x: any) => x.collisions !== 0)

        } as MapTileSet
    });
}

export const loadMapData = (mapId: string) => {
    const map = maps[mapId];
    if (!map) throw new Error("No map found with id");
    return {
        layers: map.layers.map((layer: any) => {
            return {
                key: layer.name,
                data: layer.data,
                charLayer: (layer.properties || []).find((x: any) => x.name == "ge_charLayer")?.value
            } as MapDataLayer
        }),
        tilesets: parseTileSets(map),
        width: map.width,
        height: map.height
    }

}

export const validMaps = new Set(Object.keys(maps));
