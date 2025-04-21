import puppeteer from 'puppeteer';

// 浏览器实例
let browser;
let browserStatus = 'initializing';

/**
 * 初始化浏览器实例
 */
export async function initBrowser() {
  try {
    browser = await puppeteer.launch({
      headless: "new",  // 使用新的无头模式
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    console.log('浏览器实例已初始化');
    browserStatus = 'ready';
    return browser;
  } catch (err) {
    console.error('初始化浏览器失败:', err);
    browserStatus = 'error';
    setTimeout(initBrowser, 5000); // 尝试重新初始化
    return null;
  }
}

/**
 * 获取浏览器实例
 * @returns {Promise<Browser>} 浏览器实例
 */
export async function getBrowser() {
  if (!browser) {
    await initBrowser();
  }
  return browser;
}

/**
 * 获取浏览器状态
 * @returns {string} 浏览器状态
 */
export function getBrowserStatus() {
  return browserStatus;
}

/**
 * 关闭浏览器
 */
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    browserStatus = 'closed';
  }
}

// 处理进程退出时关闭浏览器
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit();
});

process.on('exit', async () => {
  await closeBrowser();
}); 