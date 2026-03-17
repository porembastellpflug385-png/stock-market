import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server-app.js';

const app = createApp();

export const config = {
  maxDuration: 120,
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
