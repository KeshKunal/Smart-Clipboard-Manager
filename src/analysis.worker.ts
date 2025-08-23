// src/analysis.worker.ts

import { parentPort } from 'worker_threads';
import { analyzeText } from './analysis';
import path from 'path';

// Listen for a message from the main process.
// If analyzeText throws an error, the main process's `worker.on('error')`
// will catch it automatically.
parentPort.on('message', async (text: string) => {
  const result = await analyzeText(text);
  parentPort.postMessage(result);
});

const MAX_WORKERS = 2;
const workerPool: Worker[] = [];

const getWorker = () => {
  if (workerPool.length < MAX_WORKERS) {
    const worker = new Worker(path.join(__dirname, 'analysis.worker.js'));
    workerPool.push(worker);
    return worker;
  }
  return workerPool[0]; // Reuse existing worker
};