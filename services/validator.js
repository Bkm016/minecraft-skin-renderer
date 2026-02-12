/**
 * 输入验证工具
 */

// Mojang 材质哈希格式：32-64位十六进制字符
const SKIN_HASH_REGEX = /^[a-fA-F0-9]{32,64}$/;

/**
 * 验证 skinHash 格式
 * @param {string} skinHash - 皮肤哈希值
 * @returns {boolean} 是否有效
 */
export function isValidSkinHash(skinHash) {
  if (!skinHash || typeof skinHash !== 'string') {
    return false;
  }
  return SKIN_HASH_REGEX.test(skinHash);
}

/**
 * 解析并验证尺寸参数
 * @param {string|number} value - 输入值
 * @param {number} defaultValue - 默认值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 解析后的值
 */
export function parseSize(value, defaultValue = 1024, min = 64, max = 1024) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  return Math.min(Math.max(parsed, min), max);
}
