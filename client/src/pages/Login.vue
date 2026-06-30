<template>
  <div class="login-page">
    <div class="login-header">
      <div class="logo-icon">⚡</div>
      <h1>充电订单分析系统</h1>
      <p>请登录企业账号以获取数据</p>
    </div>

    <van-form @submit="handleLogin" class="login-form">
      <van-cell-group inset>
        <van-field
          v-model="form.username"
          name="username"
          label="账号"
          placeholder="请输入手机号"
          :rules="[{ required: true, message: '请输入账号' }]"
          left-icon="user-o"
        />
        <van-field
          v-model="form.password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请输入密码' }]"
          left-icon="lock"
        />
      </van-cell-group>

      <div style="margin: 16px">
        <van-button round block type="primary" native-type="submit" :loading="loading">
          登 录
        </van-button>
      </div>
    </van-form>

    <div v-if="errorMsg" class="error-msg">
      <van-notice-bar :text="errorMsg" mode="closeable" color="#ee0a24" background="#fff2f3" />
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''

  const result = await authStore.login(form.username, form.password)

  if (result.success) {
    showToast({ message: '登录成功', icon: 'success', duration: 1500 })
    setTimeout(() => router.replace('/'), 800)
  } else {
    errorMsg.value = result.message || '登录失败'
  }

  loading.value = false
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
  color: #fff;
}

.logo-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.login-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.login-header p {
  font-size: 14px;
  opacity: 0.85;
}

.login-form {
  width: 100%;
  max-width: 360px;
}

.error-msg {
  margin-top: 12px;
  width: 100%;
  max-width: 360px;
}
</style>
