import { Router } from 'itty-router';

import { CharacterHandler, MapHandler } from './handlers';
import { withUser } from './middleware';
import { RequestWithUser, requireUser } from './middleware/auth';

const router = Router<RequestWithUser>({ base: '/api' })
  .get('/characters', withUser, requireUser, CharacterHandler.list)
  .get('/map/:id/connection', withUser, requireUser, MapHandler.connect)
  .get('/map/:id', withUser, requireUser, MapHandler.show)
  .get('*', (request: any) => new Response('Handler not registered', { status: 404 }));

const worker: ExportedHandler<Bindings> = {
  fetch: async (request: Request, env: Bindings, context: ExecutionContext) => {
    return router.handle(request, env, context);
  }
};

export { Map } from "./durable-objects/map";
export default worker;
