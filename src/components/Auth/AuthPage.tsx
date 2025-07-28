import React, { useState } from 'react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { Bot, Sparkles, UserX } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const { enterAsGuest } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* 左侧：品牌展示 */}
        <div className="lg:pr-12">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-8">
              <div className="p-3 bg-primary-600 rounded-xl">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-secondary-900">
                AI项目管理平台
              </h1>
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold text-secondary-900 mb-6 leading-tight">
              让AI成为您的
              <span className="text-primary-600 relative">
                项目伙伴
                <Sparkles className="absolute -top-2 -right-8 h-6 w-6 text-primary-500" />
              </span>
            </h2>
            
            <p className="text-xl text-secondary-600 mb-8 leading-relaxed">
              三级AI智能体深度参与项目管理全流程，从需求分析到任务执行，
              让每个项目都拥有AI的智慧加持。
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Bot className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-900 mb-1">
                    AI项目经理
                  </h3>
                  <p className="text-secondary-600">
                    自动分配任务、跟踪进度、优化资源配置
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-900 mb-1">
                    智能协作助手
                  </h3>
                  <p className="text-secondary-600">
                    任务细化、代码生成、文档整理，让工作更高效
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Bot className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-900 mb-1">
                    集体智慧宝库
                  </h3>
                  <p className="text-secondary-600">
                    每个项目的经验都成为平台的共享智慧
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 右侧：认证表单 */}
        <div className="lg:pl-12">
          <div className="card max-w-md mx-auto lg:mx-0">
            {isLogin ? (
              <LoginForm onToggleMode={() => setIsLogin(false)} />
            ) : (
              <RegisterForm onToggleMode={() => setIsLogin(true)} />
            )}
          </div>
          
          {/* 游客入口 */}
          <div className="mt-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-secondary-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-secondary-50 text-secondary-500">或者</span>
              </div>
            </div>
            
            <button
              onClick={enterAsGuest}
              className="mt-4 w-full max-w-md mx-auto flex items-center justify-center gap-2 px-4 py-3 border border-secondary-300 rounded-lg text-secondary-700 bg-white hover:bg-secondary-50 transition-colors"
            >
              <UserX className="h-5 w-5" />
              <span className="font-medium">以游客身份浏览</span>
            </button>
            
            <p className="mt-2 text-xs text-secondary-500">
              游客模式下可以浏览公开项目，但无法参与项目协作
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 