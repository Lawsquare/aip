import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User } from '@/lib/supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  error: string | null
  needsOrganizationSelection: boolean
  isGuest: boolean
  retry: () => void
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  enterAsGuest: () => void
  completeOrganizationSelection: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false) // 改为false，避免初始loading
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false) // 添加初始化标记
  const [needsOrganizationSelection, setNeedsOrganizationSelection] = useState(false)
  const [isGuest, setIsGuest] = useState(false)

  const retry = () => {
    setError(null)
    setLoading(false)
    setSession(null)
    setUser(null)
  }

  // 简化的useEffect，只在第一次加载时运行
  useEffect(() => {
    if (!initialized) {
      console.log('🔄 首次初始化...')
      setInitialized(true)
      
      // 检查是否有现有会话
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error('❌ 获取会话失败:', error)
        }
        
        if (session) {
          console.log('✅ 发现现有会话，用户已登录')
          setSession(session)
          // 创建基本用户信息
          const basicUser: User = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
            role_in_org: 'member',
            is_ai_assist_enabled: false,
            settings: {},
            organization_id: '00000000-0000-0000-0000-000000000000',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          setUser(basicUser)
        } else {
          console.log('🚪 无现有会话，显示登录页面')
          setSession(null)
          setUser(null)
        }
        setLoading(false)
      })
      
      console.log('✅ 初始化完成')
    }

    // 添加认证状态监听
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 认证状态变化:', event, session ? '有会话' : '无会话')
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ 用户登录成功')
        setSession(session)
        setError(null)
        
        // 简化版本：创建基本用户信息
        const basicUser: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
          role_in_org: 'member',
          is_ai_assist_enabled: false,
          settings: {},
          organization_id: '00000000-0000-0000-0000-000000000000',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setUser(basicUser)
        
        // 检查是否需要组织选择
        const orgSelectionCompleted = localStorage.getItem('orgSelectionCompleted')
        if (!orgSelectionCompleted) {
          setNeedsOrganizationSelection(true)
        }
        
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 用户登出')
        setSession(null)
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [initialized])

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    // 暂时禁用用户资料获取，避免loading问题
    console.log('👤 跳过用户资料获取，避免loading问题')
    setLoading(false)
    return
  }

  const createUserProfile = async (authUser: SupabaseUser) => {
    // 暂时禁用用户资料创建
    console.log('🆕 跳过用户资料创建')
    return
  }

  const signUp = async (email: string, password: string, name: string) => {
    console.log('📝 开始注册用户:', email)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        }
      }
    })

    console.log('注册结果:', error ? '失败' : '成功')
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    console.log('🔑 开始登录用户:', email)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.log('登录结果:', error ? '失败' : '成功')
    return { error }
  }

  const signOut = async () => {
    console.log('🚪 用户登出')
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setNeedsOrganizationSelection(false)
    setIsGuest(false)
  }

  const enterAsGuest = () => {
    console.log('👥 进入游客模式')
    setIsGuest(true)
    setSession(null)
    setUser(null)
    setNeedsOrganizationSelection(false)
  }

  const completeOrganizationSelection = () => {
    setNeedsOrganizationSelection(false)
    localStorage.setItem('orgSelectionCompleted', 'true')
  }

  const value = {
    session,
    user,
    loading,
    error,
    needsOrganizationSelection,
    isGuest,
    retry,
    signIn,
    signUp,
    signOut,
    enterAsGuest,
    completeOrganizationSelection,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 