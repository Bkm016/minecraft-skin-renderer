import express from 'express';
import { getBrowser } from '../services/browser.js';
import { port } from '../server.js';

const router = express.Router();

// 渲染皮肤API
router.get('/:skinHash', async (req, res) => {
  try {
    const { skinHash } = req.params;
    const { width = 1024, height = 1024 } = req.query;
    
    // 验证参数
    const parsedWidth = Math.min(Math.max(parseInt(width) || 1024, 64), 1024);
    const parsedHeight = Math.min(Math.max(parseInt(height) || 1024, 64), 1024);
    
    // // 从Mojang API获取皮肤URL
    // const skinUrl = `https://textures.minecraft.net/texture/${skinHash}`;
    // const skinResponse = await fetch(skinUrl);
    
    // if (!skinResponse.ok) {
    //   return res.status(404).json({ error: '皮肤未找到' });
    // }
    
    // 获取浏览器实例
    const browser = await getBrowser();
    if (!browser) {
      return res.status(503).json({ error: '渲染服务暂时不可用' });
    }
    
    // 打开一个新页面
    const page = await browser.newPage();
    
    try {
      // 设置视口大小
      await page.setViewport({
        width: parsedWidth,
        height: parsedHeight,
        deviceScaleFactor: 1
      });
      
      // 加载 renderer
      const rendererUrl = `http://localhost:${port}/renderer?width=${parsedWidth}&height=${parsedHeight}&skin=${skinHash}`;
      await page.goto(rendererUrl, { waitUntil: 'networkidle0' });
      
      // 设置页面背景为透明
      await page.evaluate(() => {
        document.body.style.backgroundColor = 'transparent';
        document.documentElement.style.backgroundColor = 'transparent';
      });
      
      // 等待渲染完成
      await page.evaluate(() => {
        return new Promise(resolve => {
          if (document.readyState === 'complete') {
            // 给额外的时间让Three.js完成渲染
            setTimeout(resolve, 100);
          } else {
            window.addEventListener('load', () => setTimeout(resolve, 100));
          }
        });
      });
      
      // 计算中间60%的区域
      const clipWidth = Math.floor(parsedWidth * 0.5);
      const clipHeight = Math.floor(parsedHeight * 0.5);
      const clipX = Math.floor((parsedWidth - clipWidth) / 2);
      const clipY = Math.floor((parsedHeight - clipHeight) / 2);
      
      // 首先确保canvas在视口中央
      await page.evaluate((clipX, clipY, clipWidth, clipHeight) => {
        const canvas = document.querySelector('#container canvas');
        if (canvas) {
          // 确保canvas在截图区域内居中
          canvas.style.position = 'absolute';
          canvas.style.left = '50%';
          canvas.style.top = '50%';
          canvas.style.transform = 'translate(-50%, -50%)';
          
          // 确保容器也适当定位
          const container = document.getElementById('container');
          container.style.width = '100%';
          container.style.height = '100%';
          container.style.display = 'flex';
          container.style.justifyContent = 'center';
          container.style.alignItems = 'center';
          
          console.log('Canvas positioned for screenshot');
        }
      }, clipX, clipY, clipWidth, clipHeight);
      
      // 再次等待以确保位置调整生效
      await page.waitForTimeout(100);
      
      // 使用整个页面的截图
      const screenshot = await page.screenshot({
        type: 'png',
        clip: {
          x: clipX,
          y: clipY,
          width: clipWidth,
          height: clipHeight
        },
        omitBackground: true // 确保透明背景
      });
        
      // 返回PNG图像
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(screenshot);
    } finally {
      // 关闭页面
      await page.close();
    }
  } catch (error) {
    console.error('渲染错误:', error);
    res.status(500).json({ error: '渲染失败', details: error.message });
  }
});

export default router; 