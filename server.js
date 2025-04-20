import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3001;

// 启用CORS
app.use(cors());

// 缓存目录
const CACHE_DIR = join(__dirname, 'cache');
try {
  await fs.mkdir(CACHE_DIR, { recursive: true });
} catch (err) {
  console.error('创建缓存目录失败:', err);
}

// 静态文件服务
app.use(express.static('public'));

// 创建renderer.html文件，用于在puppeteer中渲染皮肤
const rendererPath = join(__dirname, 'public', 'renderer.html');
try {
  await fs.mkdir(join(__dirname, 'public'), { recursive: true });
  
  const rendererHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minecraft Skin Renderer</title>
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
    }
  }
  </script>
  <style>
    body { 
      margin: 0; 
      overflow: hidden; 
      background-color: transparent; 
    }
    #container { 
      width: 100%;
      height: 100%;
      background-color: transparent;
      position: absolute;
    }
    canvas { 
      display: block; 
      background-color: transparent !important;
    }
  </style>
</head>
<body>
  <div id="container"></div>
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // 解析URL参数
    const params = new URLSearchParams(window.location.search);
    let width = parseInt(params.get('width') || '1024');
    let height = parseInt(params.get('height') || '1024');
    let skinUrl = params.get('skin') || '';
    
    // 创建场景
    const scene = new THREE.Scene();
    // 将背景颜色设为透明
    scene.background = null;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 3; // 增加相机距离
    camera.position.y = 0.1;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      precision: 'highp',
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.outputEncoding = THREE.LinearEncoding;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.physicallyCorrectLights = true;
    renderer.setPixelRatio(1);
    renderer.sortObjects = true;
    renderer.setClearColor(0x000000, 0);
    document.getElementById('container').appendChild(renderer.domElement);

    // 添加光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    // 添加定向光以增强立体感
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // 加载皮肤纹理
    const textureLoader = new THREE.TextureLoader();
    
    // 直接创建贴图函数，确保精确的UV映射
    function createTexture(skinTexture, offsetX, offsetY) {
      const tex = skinTexture.clone();
      
      // 确保一致的纹理区域大小
      const size = 0.125;
      const padding = 0.0005; // 内边距，防止相邻像素混合
      
      // 设置精确的重复缩放和偏移
      tex.repeat.set(size - padding*2, size - padding*2);
      tex.offset.set(offsetX + padding, offsetY + padding);
      
      // 纹理包装和过滤设置
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.premultiplyAlpha = true;
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      
      return tex;
    }

    // 创建头部
    function createMinecraftHead(skinTexture) {
      // 创建立方体几何体
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      
      // 第一层纹理坐标定义
      const baseCoords = {
        right: {x: 0.25, y: 0.75},   // 右面 (x+)
        left: {x: 0, y: 0.75},        // 左面 (x-)
        top: {x: 0.125, y: 0.875},    // 顶面 (y+)
        bottom: {x: 0.25, y: 0.875},  // 底面 (y-)
        front: {x: 0.125, y: 0.75},   // 前面 (z+)
        back: {x: 0.375, y: 0.75}     // 后面 (z-)
      };
      
      // 第二层纹理坐标定义
      const overlayCoords = {
        right: {x: 0.625, y: 0.75},   // 右面 (x+)
        left: {x: 0.5, y: 0.75},      // 左面 (x-)
        top: {x: 0.625, y: 0.875},    // 顶面 (y+)
        bottom: {x: 0.75, y: 0.875},  // 底面 (y-)
        front: {x: 0.625, y: 0.75},   // 前面 (z+)
        back: {x: 0.875, y: 0.75}     // 后面 (z-)
      };
      
      // 创建基础材质数组 - 使用BaseCoords
      const materials = [
        new THREE.MeshBasicMaterial({ map: createTexture(skinTexture, baseCoords.right.x, baseCoords.right.y) }),   // 右面
        new THREE.MeshBasicMaterial({ map: createTexture(skinTexture, baseCoords.left.x, baseCoords.left.y) }),     // 左面
        new THREE.MeshBasicMaterial({ map: createTexture(skinTexture, baseCoords.top.x, baseCoords.top.y) }),       // 顶面
        new THREE.MeshBasicMaterial({ map: createTexture(skinTexture, baseCoords.bottom.x, baseCoords.bottom.y) }), // 底面
        new THREE.MeshBasicMaterial({ map: createTexture(skinTexture, baseCoords.front.x, baseCoords.front.y) }),   // 前面
        new THREE.MeshBasicMaterial({ map: createTexture(skinTexture, baseCoords.back.x, baseCoords.back.y) })      // 后面
      ];
      
      // 创建网格 (第一层 - 基础皮肤)
      const head = new THREE.Mesh(geometry, materials);
      
      // 添加帽子层 (第二层 - 外层皮肤)
      const outerLayerScale = 1.1; // 外层稍大
      const innerLayerScale = 1.09; // 内层比例
      
      // 手动创建几何体，确保面顺序正确
      const hatGeometry = new THREE.BoxGeometry(
        outerLayerScale, 
        outerLayerScale, 
        outerLayerScale
      );
      
      // 创建第二层材质 - 使用OverlayCoords
      const hatMaterials = [
        new THREE.MeshBasicMaterial({ 
          map: createTexture(skinTexture, overlayCoords.right.x, overlayCoords.right.y), // 右面
          transparent: true, 
          alphaTest: 0.15,
          side: THREE.FrontSide,
          depthWrite: false,
          blending: THREE.NormalBlending
        }),
        new THREE.MeshBasicMaterial({ 
          map: createTexture(skinTexture, overlayCoords.left.x, overlayCoords.left.y), // 左面
          transparent: true, 
          alphaTest: 0.15,
          side: THREE.FrontSide,
          depthWrite: false,
          blending: THREE.NormalBlending
        }),
        new THREE.MeshBasicMaterial({ 
          map: createTexture(skinTexture, overlayCoords.top.x, overlayCoords.top.y), // 顶面
          transparent: true, 
          alphaTest: 0.15,
          side: THREE.FrontSide,
          depthWrite: false,
          blending: THREE.NormalBlending
        }),
        new THREE.MeshBasicMaterial({ 
          map: createTexture(skinTexture, overlayCoords.bottom.x, overlayCoords.bottom.y), // 底面
          transparent: true, 
          alphaTest: 0.15,
          side: THREE.FrontSide,
          depthWrite: false,
          blending: THREE.NormalBlending
        }),
        new THREE.MeshBasicMaterial({ 
          map: createTexture(skinTexture, overlayCoords.front.x, overlayCoords.front.y), // 前面
          transparent: true, 
          alphaTest: 0.15,
          side: THREE.FrontSide,
          depthWrite: false,
          blending: THREE.NormalBlending
        }),
        new THREE.MeshBasicMaterial({ 
          map: createTexture(skinTexture, overlayCoords.back.x, overlayCoords.back.y), // 后面
          transparent: true, 
          alphaTest: 0.15,
          side: THREE.FrontSide,
          depthWrite: false,
          blending: THREE.NormalBlending
        })
      ];
      
      // 创建第二层网格
      const hat = new THREE.Mesh(hatGeometry, hatMaterials);
      
      // 为内层创建材质 - 直接基于外层材质，确保完全对应
      const innerMaterials = hatMaterials.map(mat => {
        // 通过克隆外层材质，确保UV和其他属性完全一致
        const innerMat = mat.clone();
        
        // 只更改必要的属性
        innerMat.side = THREE.BackSide; // 渲染背面
        innerMat.alphaTest = 0.001; // 更低的alphaTest
        innerMat.depthTest = true;
        innerMat.depthWrite = false;
        innerMat.blending = THREE.NormalBlending;
        // 使用完全不透明
        innerMat.opacity = 1.0;
        innerMat.transparent = true;
        innerMat.needsUpdate = true;
        
        // 确保纹理属性也完全匹配
        if (innerMat.map) {
          innerMat.map.minFilter = THREE.NearestFilter;
          innerMat.map.magFilter = THREE.NearestFilter;
          innerMat.map.needsUpdate = true;
        }
        
        return innerMat;
      });
      
      // 给内层创建一个复制版本
      const hatInner = new THREE.Mesh(
        new THREE.BoxGeometry(innerLayerScale, innerLayerScale, innerLayerScale),
        innerMaterials
      );
      
      // 确保渲染顺序正确
      hatInner.renderOrder = 1;
      hat.renderOrder = 2;
      
      // 微调头部位置，确保完全可见
      hat.position.set(0, 0, 0);
      hatInner.position.set(0, 0, 0);
      
      // 将两层都添加到头部
      head.add(hat);
      head.add(hatInner);
      
      return head;
    }

    // 创建完整的角色模型
    function createPlayerModel(skinTexture) {
      const group = new THREE.Group();
      
      // 创建头部
      const head = createMinecraftHead(skinTexture);
      head.position.y = 0.2; // 调整头部位置上移一点
      // head.scale.set(1.2, 1.2, 1.2); // 放大头部
      group.add(head);
      
      return group;
    }

    // 主渲染函数
    async function renderSkin() {
      if (!skinUrl) {
        console.error('无皮肤URL提供');
        return;
      }
      
      try {
        // 加载皮肤纹理
        const skinTexture = await new Promise((resolve, reject) => {
          textureLoader.load(skinUrl, (texture) => {
            // 纹理加载完成后的处理
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.encoding = THREE.LinearEncoding;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.premultiplyAlpha = true;
            texture.generateMipmaps = false;
            resolve(texture);
          }, undefined, reject);
        });
        
        // 创建玩家模型
        const playerModel = createPlayerModel(skinTexture);
        
        // 设置初始旋转角度
        playerModel.rotation.y = Math.PI / 5; // 初始旋转角度
        playerModel.rotation.x = Math.PI / 10;

        // 将模型添加到场景
        scene.add(playerModel);
        
        // 渲染前进行额外设置
        renderer.setRenderTarget(null);
        renderer.clear(true, true, true);
        
        // 渲染场景
        renderer.render(scene, camera);
        
        // 通知父窗口渲染完成
        window.parent.postMessage('render-complete', '*');
      } catch (error) {
        console.error('渲染皮肤出错:', error);
      }
    }
    
    // 立即开始渲染
    renderSkin();
  </script>
</body>
</html>`;

  await fs.writeFile(rendererPath, rendererHtml);
  console.log('renderer.html文件已创建');
} catch (err) {
  console.error('创建renderer.html文件失败:', err);
}

// 创建一个浏览器实例池
let browser;
async function initBrowser() {
  try {
    browser = await puppeteer.launch({
      headless: "new",  // 使用新的无头模式
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    console.log('浏览器实例已初始化');
  } catch (err) {
    console.error('初始化浏览器失败:', err);
    setTimeout(initBrowser, 5000); // 尝试重新初始化
  }
}

// 关闭浏览器实例
process.on('SIGINT', async () => {
  if (browser) {
    await browser.close();
  }
  process.exit();
});

// 渲染皮肤API
app.get('/render/:skinHash', async (req, res) => {
  try {
    const { skinHash } = req.params;
    const { width = 1024, height = 1024 } = req.query;
    
    // 验证参数
    const parsedWidth = Math.min(Math.max(parseInt(width) || 1024, 64), 1024);
    const parsedHeight = Math.min(Math.max(parseInt(height) || 1024, 64), 1024);
    
    // // 从缓存中检查是否已有该皮肤的渲染结果
    // const cacheFilePath = join(CACHE_DIR, `${skinHash}_${parsedWidth}_${parsedHeight}.png`);
    
    // try {
    //   const cachedImage = await fs.readFile(cacheFilePath);
    //   console.log(`从缓存返回皮肤 ${skinHash}`);
    //   res.set('Content-Type', 'image/png');
    //   res.set('Cache-Control', 'public, max-age=86400');
    //   return res.send(cachedImage);
    // } catch (err) {
    //   // 缓存不存在，继续处理
    // }

    // 从Mojang API获取皮肤URL
    const skinUrl = `https://textures.minecraft.net/texture/${skinHash}`;
    const skinResponse = await fetch(skinUrl);
    
    if (!skinResponse.ok) {
      return res.status(404).json({ error: '皮肤未找到' });
    }
    
    // 确保浏览器实例已初始化
    if (!browser) {
      await initBrowser();
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
      
      // 加载renderer.html
      const rendererUrl = `http://localhost:${port}/renderer.html?width=${parsedWidth}&height=${parsedHeight}&skin=${encodeURIComponent(skinUrl)}`;
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
            setTimeout(resolve, 500);
          } else {
            window.addEventListener('load', () => setTimeout(resolve, 500));
          }
        });
      });
      
      // 获取canvas截图，确保透明背景
      // 由于canvas.screenshot()的clip有时不可靠，改用页面截图
      
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
      
      // 缓存渲染结果
      // await fs.writeFile(cacheFilePath, screenshot);
      
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

// 状态检查接口
app.get('/status', (req, res) => {
  const status = browser ? 'ready' : 'initializing';
  res.json({ status });
});

// 启动服务器
app.listen(port, async () => {
  console.log(`API服务器运行在 http://localhost:${port}`);
  await initBrowser();
}); 