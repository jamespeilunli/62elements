// /app/api/hello/route.ts
export async function GET(request: Request) {
  return new Response(JSON.stringify({ message: 'Hello from backend!' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
