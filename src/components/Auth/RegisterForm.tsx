import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Mail, Lock, User, UserPlus } from 'lucide-react'

interface RegisterFormProps {
  onToggleMode: () => void
}

export function RegisterForm({ onToggleMode }: RegisterFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const { signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('密码确认不匹配')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('密码长度至少为6位')
      setLoading(false)
      return
    }

    const { error } = await signUp(email, password, name)
    
    if (error) {
      setError(error.message || '注册失败，请稍后重试')
    } else {
      setSuccess('注册成功！请检查您的邮箱并验证账户后登录选择组织。')
    }
    
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">
          创建账户
        </h1>
        <p className="text-secondary-600">
          加入AI项目管理平台，开启智能协作
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            姓名
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
            <input
              type="text"
              required
              className="input pl-10"
              placeholder="请输入您的姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            邮箱地址
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
            <input
              type="email"
              required
              className="input pl-10"
              placeholder="请输入您的邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            密码
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
            <input
              type="password"
              required
              className="input pl-10"
              placeholder="至少6位密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            确认密码
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
            <input
              type="password"
              required
              className="input pl-10"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              创建账户
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-secondary-600">
          已有账户？{' '}
          <button
            onClick={onToggleMode}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            立即登录
          </button>
        </p>
      </div>
    </div>
  )
} 