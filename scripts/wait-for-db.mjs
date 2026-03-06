import net from "node:net";

function parseDbTarget(databaseUrl) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForTcp({ host, port }, { timeoutMs, intervalMs }) {
  const start = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const elapsed = Date.now() - start;
    if (elapsed > timeoutMs) throw new Error(`Timed out waiting for ${host}:${port}`);

    const ok = await new Promise((resolve) => {
      const socket = net.connect({ host, port });
      socket.setTimeout(2000);
      socket.on("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.on("error", () => resolve(false));
    });

    if (ok) return;
    await sleep(intervalMs);
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const target = parseDbTarget(databaseUrl);
console.log(`Waiting for database at ${target.host}:${target.port}...`);

await waitForTcp(target, { timeoutMs: 60_000, intervalMs: 1000 });
console.log("Database is reachable.");

