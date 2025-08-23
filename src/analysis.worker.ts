// src/analysis.worker.ts

import { parentPort } from 'worker_threads';
import { analyzeText } from './analysis';

// Listen for a message from the main process.
// If analyzeText throws an error, the main process's `worker.on('error')`
// will catch it automatically.
parentPort.on('message', async (text: string) => {
  const result = await analyzeText(text);
  parentPort.postMessage(result);
});