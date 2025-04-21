import fetch from 'node-fetch';
import express from 'express';
import sharp from 'sharp';

const router = express.Router();

// 获取16x16玩家正脸API
router.get('/:skinHash', async (req, res) => {
  try {
    const { skinHash } = req.params;
    
    // 从Mojang API获取皮肤URL
    const skinUrl = `https://textures.minecraft.net/texture/${skinHash}`;
    const skinResponse = await fetch(skinUrl);
    
    if (!skinResponse.ok) {
      return res.status(404).json({ error: '皮肤未找到' });
    }

    // 获取皮肤图像的buffer
    const skinBuffer = await skinResponse.arrayBuffer();
    
    // 使用sharp加载图像并提取第一层面部区域
    const baseLayer = await sharp(Buffer.from(skinBuffer))
      .extract({ left: 8, top: 8, width: 8, height: 8 }) // 提取基础面部区域
      .resize(16, 16, { 
        kernel: 'nearest' // 使用最近邻插值以保持像素风格
      })
      .png()
      .toBuffer();

    // 提取第二层面部区域
    const overlayLayer = await sharp(Buffer.from(skinBuffer))
      .extract({ left: 40, top: 8, width: 8, height: 8 }) // 提取第二层面部区域
      .resize(16, 16, { 
        kernel: 'nearest' // 使用最近邻插值以保持像素风格
      })
      .png()
      .toBuffer();

    // 合并两层图像
    const finalImage = await sharp(baseLayer)
      .composite([
        {
          input: overlayLayer,
          blend: 'over' // 使用alpha混合
        }
      ])
      .png()
      .toBuffer();
    
    // 返回PNG图像
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400'); // 缓存一天
    res.send(finalImage);
    
  } catch (error) {
    console.error('处理玩家面部图像出错:', error);
    res.status(500).json({ error: '处理面部图像失败', details: error.message });
  }
});

export default router; 