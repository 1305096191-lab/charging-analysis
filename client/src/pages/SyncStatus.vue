<template>
  <div class="sync-page">
    <van-nav-bar title="管理" fixed />

    <div class="content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <!-- ========== 未登录：显示登录表单 ========== -->
        <div v-if="!authStore.isLoggedIn" class="login-section">
          <div class="login-card">
            <div class="login-icon">⚡</div>
            <h3>登录企业账号</h3>
            <p class="login-desc">登录后可获取实时订单数据</p>

            <van-form @submit="handleLogin" class="login-form">
              <van-cell-group inset>
                <van-field
                  v-model="form.username"
                  label="账号"
                  placeholder="请输入手机号"
                  :rules="[{ required: true, message: '请输入账号' }]"
                />
                <van-field
                  v-model="form.password"
                  type="password"
                  label="密码"
                  placeholder="请输入密码"
                  :rules="[{ required: true, message: '请输入密码' }]"
                />
              </van-cell-group>
              <div style="margin: 12px 0">
                <van-button round block type="primary" native-type="submit" :loading="loggingIn">
                  登 录
                </van-button>
              </div>
            </van-form>

            <div v-if="loginError" class="login-error">
              <van-notice-bar :text="loginError" mode="closeable" color="#ee0a24" background="#fff2f3" />
            </div>
          </div>
        </div>

        <!-- ========== 已登录：显示同步管理 ========== -->
        <template v-else>
          <!-- 当前状态卡片 -->
          <div class="sync-status-card">
            <div class="card-header">
              <span class="label">登录账号</span>
              <van-tag type="success" size="medium">{{ authStore.username }}</van-tag>
            </div>
            <div class="card-header" style="margin-top: 12px">
              <span class="label">最近同步</span>
              <van-tag :type="statusTagType" size="medium">
                {{ lastSync?.status || '无记录' }}
              </van-tag>
            </div>
            <div class="card-info" v-if="lastSync">
              <div class="info-row">
                <span>开始时间</span>
                <span>{{ lastSync.started_at || '--' }}</span>
              </div>
              <div class="info-row">
                <span>结束时间</span>
                <span>{{ lastSync.finished_at || '--' }}</span>
              </div>
              <div class="info-row">
                <span>新增订单</span>
                <span class="highlight">{{ lastSync.new_count || 0 }}</span>
              </div>
              <div class="info-row" v-if="lastSync.error_message">
                <span>错误信息</span>
                <span class="error-msg">{{ lastSync.error_message }}</span>
              </div>
            </div>
            <div v-else class="card-empty">暂无同步记录</div>
          </div>

          <!-- 手动同步 -->
          <div class="sync-action">
            <van-button
              type="primary" block round :loading="triggering"
              loading-text="同步中..." @click="handleTrigger" size="large"
            >
              手动同步数据
            </van-button>
            <p class="sync-note">系统每 30 分钟自动同步一次</p>
          </div>

          <!-- 同步记录 -->
          <div class="log-list">
            <div class="log-title">最近同步记录</div>
            <van-cell
              v-for="log in recentLogs" :key="log.id"
              :title="`#${log.id} ${log.started_at || '--'}`"
              :label="log.error_message || `新增 ${log.new_count} 条 / 总计 ${log.total_count} 条`"
            >
              <template #value>
                <van-tag :type="log.status === 'success' ? 'success' : log.status === 'failed' ? 'danger' : 'warning'" size="small">
                  {{ log.status }}
                </van-tag>
              </template>
            </van-cell>
            <van-empty v-if="!recentLogs.length" description="暂无记录" />
          </div>

          <!-- 退出 -->
          <div class="logout-section">
            <van-button plain type="danger" block round @click="handleLogout" size="small">
              退出登录
            </van-button>
          </div>
        </template>
      </van-pull-refresh>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { useSyncStore } from '../stores/sync'
import { useAuthStore } from '../stores/auth'

const syncStore = useSyncStore()
const authStore = useAuthStore()

const { recentLogs, lastSync, loading, triggering } = syncStore
const refreshing = ref(false)
const loggingIn = ref(false)
const loginError = ref('')

const form = reactive({
  username: '',
  password: '',
})

const statusTagType = computed(() => {
  const s = (lastSync.value?.status || '').toLowerCase()
  if (s === 'success') return 'success'
  if (s === 'failed') return 'danger'
  if (s === 'running') return 'warning'
  return 'default'
})

async function handleLogin() {
  loggingIn.value = true
  loginError.value = ''

  const result = await authStore.login(form.username, form.password)

  if (result.success) {
    showToast({ message: '登录成功', icon: 'success', duration: 1500 })
    // 刷新同步数据
    setTimeout(() => {
      syncStore.fetchStatus()
    }, 500)
  } else {
    loginError.value = result.message || '登录失败'
  }

  loggingIn.value = false
}

async function fetchData() {
  if (authStore.isLoggedIn) {
    await syncStore.fetchStatus()
  }
}

function handleTrigger() {
  syncStore.triggerSync().then((data) => {
    if (data?.code === 0) {
      showToast({ message: '同步完成', icon: 'success' })
    } else {
      showToast({ message: data?.message || '同步失败', icon: 'fail' })
    }
  })
}

function onRefresh() {
  refreshing.value = true
  fetchData().finally(() => { refreshing.value = false })
}

function handleLogout() {
  showConfirmDialog({
    title: '确认退出',
    message: '退出后需要重新登录',
  }).then(() => {
    authStore.logout()
    showToast({ message: '已退出', icon: 'success' })
  }).catch(() => {})
}

onMounted(fetchData)
</script>

<style scoped>
.sync-page {
  padding-top: 46px;
  padding-bottom: 50px;
}
.content {
  padding: 12px;
}

/* ===== 登录区域 ===== */
.login-section {
  padding: 20px 0;
}
.login-card {
  background: #fff;
  border-radius: 16px;
  padding: 32px 20px;
  text-align: center;
}
.login-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.login-card h3 {
  font-size: 18px;
  margin-bottom: 6px;
  color: #323233;
}
.login-desc {
  font-size: 13px;
  color: #999;
  margin-bottom: 20px;
}
.login-form {
  text-align: left;
}
.login-error {
  margin-top: 8px;
}

/* ===== 同步区域 ===== */
.sync-status-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-header .label {
  font-size: 15px;
  font-weight: 600;
}
.card-info .info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid #f5f5f5;
  color: #666;
}
.card-info .info-row:last-child { border-bottom: none; }
.info-row .highlight { font-weight: 600; color: #1989fa; }
.info-row .error-msg { color: #ee0a24; font-size: 12px; max-width: 180px; text-align: right; }
.card-empty { text-align: center; padding: 20px; color: #999; font-size: 14px; }

.sync-action { margin-bottom: 20px; }
.sync-note { text-align: center; font-size: 12px; color: #999; margin-top: 8px; }

.log-list {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}
.log-title {
  font-size: 15px;
  font-weight: 600;
  padding: 16px 16px 8px;
}

.logout-section {
  padding: 20px 0;
}
</style>
