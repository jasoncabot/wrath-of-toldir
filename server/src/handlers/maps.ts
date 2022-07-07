import { validMaps } from "@/data/maps";
import { PlayableCharacter } from "@/durable-objects/character";
import { MapAction } from "@/durable-objects/map";
import { PlayerId } from "@/game/game";
import { corsHeaders, notFound } from "@/middleware";
import { RequestWithUser } from "@/middleware/auth";
import { Request } from "itty-router";
import { v4 as uuidv4 } from 'uuid';

export const durableObjectActionMap = (action: MapAction) => {
    return `http://map/?action=${action}`;
}

const show = async (request: RequestWithUser, env: Bindings, ctx: ExecutionContext) => {
    const mapId = (request.params || {}).id;
    const characterId = (request.query || {}).characterId;
    if (!validMaps.has(mapId)) return new Response('Invalid map', { status: 404 });
    const character = await findCharacterForUser(env.CHARACTER, request.user!.id, characterId);
    if (!character) return new Response('Character not found', { status: 404 });

    // This is where we switch from a player (who has multiple characters) to a single websocket connection
    // which is associated with a single map and a single character
    // we swap keying commands/events from playerId to characterId instead
    let id = env.MAP.idFromName(mapId);
    let obj = env.MAP.get(id);
    return obj.fetch(durableObjectActionMap('store-key'), {
        headers: {
            "X-PlayerId": request.user!.id,
            "X-CharacterId": characterId,
            "X-Socket-Key": uuidv4(),
            "X-MapId": mapId,
            ...corsHeaders(env)
        }
    });
};

const connect = async (request: Request, env: Bindings, ctx: ExecutionContext) => {
    const mapId = (request.params || {}).id;
    const token = (request.query || {}).token;
    if (!validMaps.has(mapId)) return notFound('Invalid map');
    if (!token) return new Response('Invalid token', { status: 400 });

    const id = env.MAP.idFromName(mapId);
    let obj = env.MAP.get(id);
    return obj.fetch(durableObjectActionMap('websocket'), {
        headers: {
            "X-Socket-Key": token,
            "X-MapId": mapId,
            "Upgrade": "websocket"
        }
    });
}

const findCharacterForUser = async (CHARACTER: DurableObjectNamespace, playerId: PlayerId, characterId: PlayerId) => {
    let id = CHARACTER.idFromName(playerId);
    let obj = CHARACTER.get(id);
    return obj.fetch(`https://character?action=show&characterId=${characterId}`)
        .then(resp => resp.text())
        .then(resp => JSON.parse(resp)) as Promise<PlayableCharacter | undefined>;

}

export default { show, connect };
