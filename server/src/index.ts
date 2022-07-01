import { Router } from 'itty-router';
import Randomiser from './game/components/randomiser';

import { CharacterHandler, MapHandler } from './handlers';
import { allowCrossOriginRequests, notFound, RequestWithUser, requireUser, withUser } from './middleware';

const router = Router<RequestWithUser>({ base: '/api' })
  .get('/characters', withUser, requireUser, CharacterHandler.list)
  .post('/characters', withUser, requireUser, CharacterHandler.create)
  .get('/map/:id/connection', MapHandler.connect)
  .get('/map/:id', withUser, requireUser, MapHandler.show)
  .options('*', allowCrossOriginRequests)
  .get('*', notFound('Handler not registered'));

const worker: ExportedHandler<Bindings> = {
  fetch: async (request: Request, env: Bindings, context: ExecutionContext) => {
    env.dependencies = {
      randomiser: new Randomiser()
    }

    return router.handle(request, env, context);
  }
};

export { Character } from "./durable-objects/character";
export { Combat } from "./durable-objects/combat";
export { Item } from "./durable-objects/item";
export { Map } from "./durable-objects/map";

export default worker;
