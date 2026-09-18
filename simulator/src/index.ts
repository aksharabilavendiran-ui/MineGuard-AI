const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
let tick = 0;

async function run() {
  tick += 1;
  const response = await fetch(`${apiUrl}/api/nodes`);
  if (!response.ok) throw new Error(`Backend unavailable: ${response.status}`);
  if (tick % 20 === 0) console.log(`Standalone simulator heartbeat: ${new Date().toISOString()}`);
}

run().catch((error: unknown) => console.error(error));
setInterval(() => void run().catch((error: unknown) => console.error(error)), Number(process.env.SIMULATOR_INTERVAL_MS ?? 3000));