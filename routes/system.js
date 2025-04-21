import express from 'express';
import { getBrowserStatus } from '../services/browser.js';

const router = express.Router();

// 状态检查接口
router.get('/status', (req, res) => {
  const status = getBrowserStatus();
  res.json({ status });
});

export default router;