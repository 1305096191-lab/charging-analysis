/**
 * 启动服务器 + ngrok 公网隧道
 * 用法: node server/start-public.js
 */
const ngrok = require('ngrok')
const { spawn } = require('child_process')
const path = require('path')

async function start() {
  // 启动 Express 服务
  const server = spawn('node', ['index.js'], {
    cwd: __dirname,
    stdio: 'inherit',
  })

  // 等待服务就绪后连接 ngrok
  await new Promise(resolve => setTimeout(resolve, 5000))

  try {
    const url = await ngrok.connect({
      addr: 3000,
      proto: 'http',
    })
    console.log('\n' + '='.repeat(60))
    console.log('  🎉 公网地址已生成（永久有效）')
    console.log('  📱 手机浏览器打开:')
    console.log(`     ${url}`)
    console.log('  📋 订单页:')
    console.log(`     ${url}/#/orders`)
    console.log('  📋 区域页:')
    console.log(`     ${url}/#/area`)
    console.log('='.repeat(60) + '\n')
  } catch (err) {
    console.error('ngrok 连接失败:', err.message)
    console.log('\n💡 提示: 首次使用需要注册 ngrok 免费账号')
    console.log('   1. 访问 https://ngrok.com 注册')
    console.log('   2. 获取 authtoken')
    console.log('   3. 运行: npx ngrok config add-authtoken <你的token>')
    console.log('   4. 重新运行: node server/start-public.js\n')
  }

  server.on('close', () => process.exit())
}

start()
