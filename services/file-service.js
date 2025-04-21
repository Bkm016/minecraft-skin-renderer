import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

/**
 * 确保目录存在
 * @param {string} dirPath 目录路径
 * @returns {Promise<boolean>} 是否成功创建
 */
export async function ensureDir(dirPath) {
  try {
    // 如果是相对路径，则相对于项目根目录
    const fullPath = dirPath.startsWith('/') ? dirPath : join(rootDir, dirPath);
    await fs.mkdir(fullPath, { recursive: true });
    return true;
  } catch (err) {
    console.error(`创建目录失败: ${dirPath}`, err);
    return false;
  }
}

/**
 * 获取缓存目录
 * @returns {string} 缓存目录路径
 */
export function getCacheDir() {
  return join(rootDir, 'cache');
}

/**
 * 初始化必要的目录
 */
export async function initDirectories() {
  // 创建public目录
  await ensureDir('public');
  
  // 创建缓存目录
  await ensureDir('cache');
}

/**
 * 写入文件
 * @param {string} filePath 文件路径
 * @param {string|Buffer} content 文件内容
 * @returns {Promise<boolean>} 是否成功写入
 */
export async function writeFile(filePath, content) {
  try {
    const fullPath = filePath.startsWith('/') ? filePath : join(rootDir, filePath);
    await fs.writeFile(fullPath, content);
    return true;
  } catch (err) {
    console.error(`写入文件失败: ${filePath}`, err);
    return false;
  }
} 