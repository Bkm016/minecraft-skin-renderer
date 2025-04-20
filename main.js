import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// 创建场景
const scene = new THREE.Scene();
// 将背景颜色改为深灰色，方便观察透明效果
scene.background = new THREE.Color(0x222222);

// 创建相机
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 3;

// 创建渲染器
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    precision: 'highp', // 使用高精度渲染
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.LinearEncoding; // 使用线性编码
renderer.toneMapping = THREE.NoToneMapping; // 禁用色调映射
// 启用物理正确的光照
renderer.physicallyCorrectLights = true;
// 设置设备像素比，避免模糊
renderer.setPixelRatio(window.devicePixelRatio);
// 启用透明度排序
renderer.sortObjects = true;
// 设置背景为透明，便于观察
renderer.setClearColor(0x222222, 1.0);
document.getElementById('container').appendChild(renderer.domElement);

// 添加轨道控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 创建均匀白光环境
// 环境光 - 使用中等强度保持颜色准确
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

// 加载皮肤纹理
const textureLoader = new THREE.TextureLoader();
const skinTexture = textureLoader.load('huaihei.png', (texture) => {
    // 纹理加载完成后的处理
    texture.magFilter = THREE.NearestFilter; // 保持像素风格的放大过滤
    texture.minFilter = THREE.NearestFilter; // 保持像素风格的缩小过滤
    texture.encoding = THREE.LinearEncoding; // 使用线性编码保持颜色准确
    texture.wrapS = THREE.ClampToEdgeWrapping; // 边缘包裹模式
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.premultiplyAlpha = true; // 预乘alpha
    texture.generateMipmaps = false; // 禁用mipmap
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // 设置最大各向异性过滤
    
    // 纹理加载完成后，重新渲染场景
    renderer.render(scene, camera);
});

// 直接创建贴图函数，确保精确的UV映射
function createTexture(offsetX, offsetY) {
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
    tex.minFilter = THREE.NearestFilter; // 对像素艺术风格重要
    tex.magFilter = THREE.NearestFilter; // 对像素艺术风格重要
    tex.generateMipmaps = false; // 禁用mipmap对像素艺术至关重要
    tex.needsUpdate = true;
    
    return tex;
}

// 创建头部
function createMinecraftHead() {
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
        new THREE.MeshBasicMaterial({ map: createTexture(baseCoords.right.x, baseCoords.right.y) }),   // 右面
        new THREE.MeshBasicMaterial({ map: createTexture(baseCoords.left.x, baseCoords.left.y) }),     // 左面
        new THREE.MeshBasicMaterial({ map: createTexture(baseCoords.top.x, baseCoords.top.y) }),       // 顶面
        new THREE.MeshBasicMaterial({ map: createTexture(baseCoords.bottom.x, baseCoords.bottom.y) }), // 底面
        new THREE.MeshBasicMaterial({ map: createTexture(baseCoords.front.x, baseCoords.front.y) }),   // 前面
        new THREE.MeshBasicMaterial({ map: createTexture(baseCoords.back.x, baseCoords.back.y) })      // 后面
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
            map: createTexture(overlayCoords.right.x, overlayCoords.right.y), // 右面
            transparent: true, 
            alphaTest: 0.15,
            side: THREE.FrontSide,
            depthWrite: false,
            blending: THREE.NormalBlending
        }),
        new THREE.MeshBasicMaterial({ 
            map: createTexture(overlayCoords.left.x, overlayCoords.left.y), // 左面
            transparent: true, 
            alphaTest: 0.15,
            side: THREE.FrontSide,
            depthWrite: false,
            blending: THREE.NormalBlending
        }),
        new THREE.MeshBasicMaterial({ 
            map: createTexture(overlayCoords.top.x, overlayCoords.top.y), // 顶面
            transparent: true, 
            alphaTest: 0.15,
            side: THREE.FrontSide,
            depthWrite: false,
            blending: THREE.NormalBlending
        }),
        new THREE.MeshBasicMaterial({ 
            map: createTexture(overlayCoords.bottom.x, overlayCoords.bottom.y), // 底面
            transparent: true, 
            alphaTest: 0.15,
            side: THREE.FrontSide,
            depthWrite: false,
            blending: THREE.NormalBlending
        }),
        new THREE.MeshBasicMaterial({ 
            map: createTexture(overlayCoords.front.x, overlayCoords.front.y), // 前面
            transparent: true, 
            alphaTest: 0.15,
            side: THREE.FrontSide,
            depthWrite: false,
            blending: THREE.NormalBlending
        }),
        new THREE.MeshBasicMaterial({ 
            map: createTexture(overlayCoords.back.x, overlayCoords.back.y), // 后面
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

const head = createMinecraftHead();
scene.add(head);

// 添加动画效果
head.rotation.y = Math.PI / 5; // 初始旋转角度
head.rotation.x = Math.PI / 10;
let rotationSpeed = 0.0;

// 处理窗口大小变化
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    head.rotation.y += rotationSpeed;
    controls.update();
    
    // 渲染前进行额外设置
    renderer.setRenderTarget(null);
    renderer.clear(true, true, true);
    
    // 渲染场景
    renderer.render(scene, camera);
}

animate();