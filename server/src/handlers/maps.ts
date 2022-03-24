import { MapAction, validMaps } from "@/durable-objects/map";
import { RequestWithUser } from "@/middleware/auth";
import { v4 as uuidv4 } from 'uuid';

const durableObjectAction = (action: MapAction) => {
    return `http://map/?action=${action}`;
}

const show = async (request: RequestWithUser, env: Bindings, ctx: ExecutionContext) => {
    const mapId = (request.params || {}).id;
    if (!validMaps.has(mapId)) return new Response('Invalid map', { status: 404 });

    const webSocketKeyForUser = uuidv4();
    let id = env.MAP.idFromName(mapId);
    let obj = env.MAP.get(id);
    return obj.fetch(durableObjectAction('store-key'), {
        headers: {
            "X-PlayerId": request.user.id,
            "X-Socket-Key": webSocketKeyForUser,
            "X-MapId": mapId
        }
    });
};

const connect = async (request: RequestWithUser, env: Bindings, ctx: ExecutionContext) => {
    const mapId = (request.params || {}).id;
    if (!validMaps.has(mapId)) return new Response('Invalid map', { status: 404 });

    const id = env.MAP.idFromName(mapId);
    let obj = env.MAP.get(id);
    return obj.fetch(durableObjectAction('websocket'), {
        headers: {
            "X-PlayerId": request.user.id,
            "X-MapId": mapId,
            "Upgrade": "websocket"
        }
    });
}

export default { show, connect };
