import express from 'express';
import cors from 'cors';
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

// 启用CORS
app.use(cors());

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
app.listen(port, async () => {
  console.log(`API 服务器运行在 http://localhost:${port}`);
  await initBrowser();
}); 