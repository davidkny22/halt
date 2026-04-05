export async function POST() {
  return Response.json(
    { error: "Enterprise features require a halt Enterprise license. Contact david@halt.dev" },
    { status: 403 }
  );
}
