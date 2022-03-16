import { Request } from 'itty-router'
import { v4 as uuidv4 } from 'uuid';

export interface User {
    id: string
}

export interface RequestWithUser extends Request {
    user: User
}

export const withUser = (request: RequestWithUser) => {
    request.user = { id: uuidv4() } // TODO: this isn't right - validate the request JWT and extract the user id
}

export const requireUser = (request: RequestWithUser) => {
    if (!request.user) {
        return new Response('Not Authenticated', { status: 401 })
    }
}
