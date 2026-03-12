import { startBridgeServer } from './bridge-server';

const port = parseInt(process.env.BRIDGE_PORT ?? '9876', 10);
if (!Number.isFinite(port) || port < 1 || port > 65535) {
  console.error(`[bridge] Invalid port: ${process.env.BRIDGE_PORT}. Must be 1-65535.`);
  process.exit(1);
}
startBridgeServer(port);
