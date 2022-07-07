import { Router } from 'itty-router';

import { CharacterHandler, MapHandler } from './handlers';
import { allowCrossOriginRequests, notFound, RequestWithUser, requireUser, withUser } from './middleware';

const router = Router<RequestWithUser>({ base: '/api' })
  .get('/characters', withUser, requireUser, CharacterHandler.list)
  .post('/characters', withUser, requireUser, CharacterHandler.create)
  .get('/map/:id/connection', MapHandler.connect)
  .get('/map/:id', withUser, requireUser, MapHandler.show)
  .options('*', allowCrossOriginRequests)
  ;

const baseRouter = Router()
  .all('/api/*', router.handle)
  .all('*', notFound('Route not registered'))
  ;

const worker: ExportedHandler<Bindings> = {
  fetch: async (request: Request, env: Bindings, context: ExecutionContext) => {
    return baseRouter.handle(request, env, context);
  }
};

export * from "./durable-objects";

export default worker;
