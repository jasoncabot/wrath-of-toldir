import { RequestWithUser } from "@/middleware/auth";

const list = async (request: RequestWithUser, env: Bindings, ctx: ExecutionContext) => {

    let id = env.CHARACTER.idFromName(request.user!.id);
    let obj = env.CHARACTER.get(id);
    let characterList = await obj.fetch('https://character?action=list').then(resp => resp.text());

    return new Response(characterList, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': env.FRONTEND_URI,
            'Content-type': 'application/json',
        },
    });
};

const create = async (request: RequestWithUser, env: Bindings, ctx: ExecutionContext) => {

    const createRequest = await request.text!();
    let id = env.CHARACTER.idFromName(request.user!.id);
    let obj = env.CHARACTER.get(id);

    const created = await obj.fetch('https://character?action=create', {
        method: 'POST',
        body: createRequest
    }).then(resp => resp.text());

    return new Response(created, {
        status: 201,
        headers: {
            'Access-Control-Allow-Origin': env.FRONTEND_URI,
            'Content-type': 'application/json',
        },
    });
}

export default { create, list };
