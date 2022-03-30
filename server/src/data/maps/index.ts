import { MapTileSet, TiledJSON } from '@/game/game';
import fisherswatch from './fisherswatch.json';

const maps: Record<string, any> = {
    fisherswatch
}

const parseTileSets: (map: TiledJSON) => MapTileSet[] = (map: TiledJSON) => {
    return map.tilesets.map((x: any) => {
        return {
            key: x.source.match(/\/([^/]+)\.tsx/)[1],
            gid: x.firstgid
        }
    });
}

export const loadMapData = (mapId: string) => {
    const map = maps[mapId];
    if (!map) throw new Error("No map found with id");
    return {
        layers: map.layers.map((layer: any) => {
            return {
                key: layer.name,
                data: layer.data
            }
        }),
        tilesets: parseTileSets(map),
        width: map.width,
        height: map.height
    }

}

export const validMaps = new Set(Object.keys(maps));
