export const notFound = (message: string) => (_: Request) => new Response(message, { status: 404 });
