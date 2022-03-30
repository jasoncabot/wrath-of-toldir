import { validMaps } from "@/data/maps";
import { MapAction } from "@/durable-objects/map";
import { RequestWithUser } from "@/middleware/auth";
import { Request } from "itty-router";
import { v4 as uuidv4 } from 'uuid';

const durableObjectAction = (action: MapAction) => {
    return `http://map/?action=${action}`;
}

const show = async (request: RequestWithUser, env: Bindings, ctx: ExecutionContext) => {
    const mapId = (request.params || {}).id;
    if (!validMaps.has(mapId)) return new Response('Invalid map', { status: 404 });

    let id = env.MAP.idFromName(mapId);
    let obj = env.MAP.get(id);
    return obj.fetch(durableObjectAction('store-key'), {
        headers: {
            "X-PlayerId": request.user!.id,
            "X-Socket-Key": uuidv4(),
            "X-MapId": mapId
        }
    });
};

const connect = async (request: Request, env: Bindings, ctx: ExecutionContext) => {
    const mapId = (request.params || {}).id;
    const token = (request.query || {}).token;
    if (!validMaps.has(mapId)) return new Response('Invalid map', { status: 404 });
    if (!token) return new Response('Invalid token', { status: 400 });

    const id = env.MAP.idFromName(mapId);
    let obj = env.MAP.get(id);
    return obj.fetch(durableObjectAction('websocket'), {
        headers: {
            "X-Socket-Key": token,
            "X-MapId": mapId,
            "Upgrade": "websocket"
        }
    });
}

export default { show, connect };
