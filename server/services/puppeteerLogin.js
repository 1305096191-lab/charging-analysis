/**
 * Puppeteer 登录 — 让 Vue 表单正常提交（前端自动加密密码）
 */
const puppeteer = require('puppeteer')
const { config } = require('../config')
const { logger } = require('../utils/logger')

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function getTokenByBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()

  // 拦截登录响应
  let capturedToken = null
  page.on('response', async res => {
    if (res.url().includes('/login/phone/password') && res.status() === 200) {
      try {
        const data = await res.json()
        capturedToken = data.token || data.data?.token || data.data?.access_token
      } catch (e) {}
    }
  })

  try {
    await page.goto('https://sms.rhecube.com/', { waitUntil: 'networkidle2', timeout: 30000 })

    // 等 Vue 渲染
    await page.waitForSelector('input', { timeout: 10000 })
    await sleep(1000)

    // 切密码登录
    await page.evaluate(() => {
      const all = [...document.querySelectorAll('*')]
      const el = all.find(e => e.textContent?.trim() === '密码登录' && e.children.length === 0)
      if (el) el.click()
    })
    await sleep(2000)

    // 等密码框出现后，用原生键盘输入
    await page.waitForSelector('input[type="password"]', { timeout: 5000 })

    // 聚焦手机号输入框（通过 Tab 导航）
    await page.keyboard.press('Tab')
    await sleep(200)
    // 输入手机号
    for (const ch of (config.username || '15060389527')) {
      await page.keyboard.type(ch, { delay: 50 })
    }

    // Tab 到密码框
    await page.keyboard.press('Tab')
    await sleep(200)
    // 输入密码
    for (const ch of (config.password || '')) {
      await page.keyboard.type(ch, { delay: 50 })
    }

    logger.info('[Puppeteer] 已输入账号密码')

    // 按 Enter 提交
    await page.keyboard.press('Enter')
    logger.info('[Puppeteer] 已提交登录')

    // 等待结果
    await sleep(8000)

    // 从 cookie 获取 token
    const cookies = await page.cookies()
    const tc = cookies.find(c => /token/i.test(c.name))
    if (tc) capturedToken = capturedToken || tc.value

    // 从 localStorage 获取
    if (!capturedToken) {
      capturedToken = await page.evaluate(() => localStorage.getItem('token'))
    }

    await browser.close()

    if (capturedToken) {
      logger.info('[Puppeteer] ✅ 获取到 Token!')
      return { success: true, token: capturedToken }
    }

    return { success: false, message: '未获取到token', token: null }
  } catch (err) {
    await browser.close().catch(() => {})
    return { success: false, message: err.message, token: null }
  }
}

module.exports = { getTokenByBrowser }
