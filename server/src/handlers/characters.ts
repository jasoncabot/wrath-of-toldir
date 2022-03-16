import { RequestWithUser } from "@/middleware/auth";

const list = async (request: RequestWithUser, env: Bindings, ctx: ExecutionContext) => {
    const body = JSON.stringify([]);
    const headers = { 'Content-type': 'application/json' };
    return new Response(body, { headers });
};

export default { list };
