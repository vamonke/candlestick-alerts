export const POST = async (request) => {
  const json = await request.json();
  console.log(`Received body: ${JSON.stringify(json, null, 2)}`);
  return Response.json({ ok: true });
};
