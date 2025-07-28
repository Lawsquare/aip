import { createClient } from '@supabase/supabase-js'

// 从环境变量读取配置，如果没有则使用开发环境的默认值
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wfkazzdlfgurfmucuoqf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indma2F6emRsZmd1cmZtdWN1b3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNjI5NjQsImV4cCI6MjA2ODczODk2NH0.B-132nJtoXCKIuHmCHehnhOac8JohGs6rg4GjoV4v5M'

console.log('🔧 Supabase配置:')
console.log('URL:', supabaseUrl)
console.log('Key前6位:', supabaseAnonKey.substring(0, 6) + '...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 测试连接
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase连接测试失败:', error)
  } else {
    console.log('✅ Supabase连接测试成功')
  }
})

// 数据库类型定义
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  role_in_org: 'admin' | 'member'
  is_ai_assist_enabled: boolean
  settings: Record<string, any>
  organization_id: string
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  description?: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description?: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  is_public: boolean
  is_recruiting: boolean
  creator_id: string
  organization_id: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  project_id: string
  assignee_id?: string
  created_by_id: string
  created_by_ai: boolean
  estimated_hours?: number
  actual_hours?: number
  due_date?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role_in_project: 'manager' | 'developer' | 'tester' | 'designer'
  joined_at: string
}

export interface ChatHistory {
  id: string
  content: string
  role: 'user' | 'assistant'
  agent_type: 'org_agent' | 'project_agent' | 'member_agent'
  project_id?: string
  user_id: string
  metadata: Record<string, any>
  created_at: string
}

// 用户-组织关联表
export interface UserOrganization {
  user_id: string
  organization_id: string
  role_in_org: 'admin' | 'member'
  joined_at: string
}

// 项目加入申请表
export interface ProjectJoinRequest {
  id: string
  project_id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  message?: string
  created_at: string
  reviewed_at?: string
  reviewed_by?: string
}

// 组织管理API
export const organizationAPI = {
  // 获取所有组织（公开访问）
  async getAllOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // 获取用户所属的组织
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role_in_org,
        organizations (*)
      `)
      .eq('user_id', userId)
    
    if (error) throw error
    return data?.map(item => item.organizations).filter(Boolean) || []
  },

  // 加入组织
  async joinOrganization(userId: string, organizationId: string, role: 'admin' | 'member' = 'member') {
    const { error } = await supabase
      .from('user_organizations')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        role_in_org: role,
        joined_at: new Date().toISOString()
      })
    
    if (error) throw error
  },

  // 获取组织的项目（根据权限过滤）
  async getOrganizationProjects(organizationId: string, userId?: string): Promise<Project[]> {
    let query = supabase
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)

    // 如果用户未登录，只显示公开项目
    if (!userId) {
      query = query.eq('is_public', true)
    } else {
      // 如果用户已登录，显示公开项目 + 用户参与的私有项目
      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)
      
      const memberProjectIds = memberProjects?.map(p => p.project_id) || []
      
      query = query.or(`is_public.eq.true,id.in.(${memberProjectIds.join(',')})`)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // 检查用户是否为项目成员
  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()
    
    if (error) return false
    return !!data
  },

  // 获取用户在项目中的角色
  async getUserProjectRole(projectId: string, userId: string): Promise<'manager' | 'developer' | 'tester' | 'designer' | null> {
    const { data, error } = await supabase
      .from('project_members')
      .select('role_in_project')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()
    
    if (error) return null
    return data?.role_in_project || null
  },

  // 检查用户是否为项目经理
  async isProjectManager(projectId: string, userId: string): Promise<boolean> {
    const role = await this.getUserProjectRole(projectId, userId)
    return role === 'manager'
  },

  // 获取项目成员列表
  async getProjectMembers(projectId: string): Promise<Array<{
    user_id: string,
    role_in_project: string,
    joined_at: string,
    // 这里需要关联用户信息，但先返回基本数据
  }>> {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        user_id,
        role_in_project,
        joined_at
      `)
      .eq('project_id', projectId)
      .order('joined_at', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // 项目加入申请相关API
  
  // 提交加入申请
  async submitJoinRequest(projectId: string, userId: string, message?: string): Promise<ProjectJoinRequest> {
    const { data, error } = await supabase
      .from('project_join_requests')
      .insert({
        project_id: projectId,
        user_id: userId,
        message: message || '',
        status: 'pending'
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 检查用户是否已申请加入项目
  async hasJoinRequest(projectId: string, userId: string): Promise<ProjectJoinRequest | null> {
    const { data, error } = await supabase
      .from('project_join_requests')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()
    
    if (error) return null
    return data
  },

  // 获取项目的待审核申请（项目经理用）
  async getPendingJoinRequests(projectId: string): Promise<ProjectJoinRequest[]> {
    const { data, error } = await supabase
      .from('project_join_requests')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // 审核加入申请
  async reviewJoinRequest(requestId: string, status: 'approved' | 'rejected', reviewerId: string): Promise<void> {
    const { error } = await supabase
      .from('project_join_requests')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId
      })
      .eq('id', requestId)
    
    if (error) throw error

    // 如果批准，则添加到项目成员
    if (status === 'approved') {
      const { data: request } = await supabase
        .from('project_join_requests')
        .select('project_id, user_id')
        .eq('id', requestId)
        .single()
      
      if (request) {
        await supabase
          .from('project_members')
          .insert({
            project_id: request.project_id,
            user_id: request.user_id,
            role_in_project: 'developer', // 默认角色
            joined_at: new Date().toISOString()
          })
      }
    }
  }
} 