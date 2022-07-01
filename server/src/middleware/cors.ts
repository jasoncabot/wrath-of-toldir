export const allowCrossOriginRequests = (_: Request, env: Bindings) => new Response(null, {
    status: 204,
    headers: {
        'Access-Control-Allow-Origin': env.FRONTEND_URI,
        'Access-Control-Allow-Headers': 'Authorization, Upgrade-Insecure-Requests'
    }
});

