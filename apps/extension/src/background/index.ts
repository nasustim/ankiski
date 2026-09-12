import type { ServiceWorkerApi } from "./service-worker.ts";
import { startServiceWorker } from "./service-worker.ts";

// `chrome`'s generated types are broader than what the worker uses; ServiceWorkerApi
// is the contract, and the cast is the single place the two meet.
startServiceWorker(chrome as unknown as ServiceWorkerApi);
