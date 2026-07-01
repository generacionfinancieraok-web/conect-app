import { EventEmitter } from 'events';

class ChatEmitter extends EventEmitter {}

declare global {
  // eslint-disable-next-line no-var
  var __chatEmitter: ChatEmitter | undefined;
}

// Single global instance — survives Hot Module Replacement in dev
const chatEmitter: ChatEmitter =
  globalThis.__chatEmitter ?? new ChatEmitter();

chatEmitter.setMaxListeners(500); // allow many concurrent SSE clients

if (!globalThis.__chatEmitter) {
  globalThis.__chatEmitter = chatEmitter;
}

export { chatEmitter };
