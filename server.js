import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 导入服务模块
import { initBrowser } from './services/browser.js';
import { initDirectories } from './services/file-service.js';

// 导入路由
import skinRoutes from './routes/skins.js';
import systemRoutes from './routes/system.js';
import faceRoutes from './routes/face.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
export const port = process.env.PORT || 3001;
export const host = process.env.HOST || '0.0.0.0';

// CORS 配置（可通过环境变量限制来源）
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 速率限制配置
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: process.env.RATE_LIMIT || 60, // 每分钟最多 60 次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' }
});

// 对渲染 API 应用速率限制
app.use('/render', limiter);
app.use('/face', limiter);

// 初始化必要的目录
await initDirectories();

// 注册路由
app.use('/render', skinRoutes);
app.get('/renderer', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'renderer.html'));
});
app.use('/face', faceRoutes);
app.use('/api', systemRoutes);

// 主页
app.get('/', (req, res) => {
  res.send('Minecraft 皮肤渲染服务已启动');
});

// 启动服务器
app.listen(port, host, async () => {
  console.log(`API 服务器运行在 http://${host}:${port}`);
  await initBrowser();
});