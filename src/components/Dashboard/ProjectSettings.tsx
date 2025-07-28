import React, { useState, useEffect } from 'react'
import { Save, Users, Calendar, Eye, EyeOff, Settings, ArrowLeft } from 'lucide-react'
import { Project, ProjectMember, supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface ProjectSettingsProps {
  project: Project
  onBack: () => void
  onSave: (updatedProject: Project) => void
}

interface ProjectFormData {
  name: string
  description: string
  is_public: boolean
  is_recruiting: boolean
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  start_date?: string
  end_date?: string
}

export function ProjectSettings({ project, onBack, onSave }: ProjectSettingsProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<ProjectFormData>({
    name: project.name,
    description: project.description || '',
    is_public: project.is_public,
    is_recruiting: project.is_recruiting,
    status: project.status,
    start_date: '',
    end_date: ''
  })
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isManager, setIsManager] = useState(false)

  useEffect(() => {
    checkManagerPermission()
    loadProjectMembers()
  }, [project.id, user])

  const checkManagerPermission = async () => {
    if (!user) return
    
    try {
      const { data } = await supabase
        .from('project_members')
        .select('role_in_project')
        .eq('project_id', project.id)
        .eq('user_id', user.id)
        .single()
      
      setIsManager(data?.role_in_project === 'manager')
    } catch (error) {
      console.error('检查管理权限失败:', error)
    }
  }

  const loadProjectMembers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          role_in_project,
          joined_at,
          users (
            id,
            name,
            email
          )
        `)
        .eq('project_id', project.id)
      
      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('加载项目成员失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!isManager) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: formData.name,
          description: formData.description,
          is_public: formData.is_public,
          is_recruiting: formData.is_recruiting,
          status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id)
      
      if (error) throw error
      
      const updatedProject: Project = {
        ...project,
        ...formData,
        updated_at: new Date().toISOString()
      }
      
      onSave(updatedProject)
    } catch (error) {
      console.error('保存项目设置失败:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'manager': return '项目经理'
      case 'developer': return '开发者'
      case 'tester': return '测试员'
      case 'designer': return '设计师'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-purple-100 text-purple-800'
      case 'developer': return 'bg-blue-100 text-blue-800'
      case 'tester': return 'bg-green-100 text-green-800'
      case 'designer': return 'bg-pink-100 text-pink-800'
      default: return 'bg-secondary-100 text-secondary-800'
    }
  }

  if (!user) {
    return (
      <div className="card text-center py-8">
        <Settings className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
        <h3 className="font-semibold text-secondary-900 mb-2">需要登录</h3>
        <p className="text-secondary-600">请登录后查看项目设置</p>
      </div>
    )
  }

  if (!isManager) {
    return (
      <div className="card text-center py-8">
        <Settings className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
        <h3 className="font-semibold text-secondary-900 mb-2">权限不足</h3>
        <p className="text-secondary-600">只有项目经理可以访问项目设置</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-secondary-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">项目设置</h1>
            <p className="text-secondary-600">{project.name}</p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          保存设置
        </button>
      </div>

      {/* 基本信息设置 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">基本信息</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              项目名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="input"
              placeholder="请输入项目名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              项目描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="input min-h-[100px]"
              placeholder="请输入项目描述和目标"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                项目状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="input"
              >
                <option value="active">进行中</option>
                <option value="paused">已暂停</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                项目时间
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-secondary-500" />
                <span className="text-sm text-secondary-600">设置开始和结束时间</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 可见性设置 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">可见性与权限</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
            <div className="flex items-center gap-3">
              {formData.is_public ? (
                <Eye className="h-5 w-5 text-green-500" />
              ) : (
                <EyeOff className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <h3 className="font-medium text-secondary-900">项目可见性</h3>
                <p className="text-sm text-secondary-600">
                  {formData.is_public 
                    ? '公开项目，所有人都可以看到' 
                    : '私有项目，仅项目成员可见'
                  }
                </p>
              </div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => handleInputChange('is_public', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <h3 className="font-medium text-secondary-900">招募状态</h3>
                <p className="text-sm text-secondary-600">
                  {formData.is_recruiting 
                    ? '正在招募新成员加入项目' 
                    : '暂不招募新成员'
                  }
                </p>
              </div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={formData.is_recruiting}
                onChange={(e) => handleInputChange('is_recruiting', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* 项目成员管理 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">
            项目成员 ({members.length})
          </h2>
          <button className="btn-secondary">
            <Users className="h-4 w-4 mr-2" />
            邀请成员
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
            <p className="text-secondary-600">暂无项目成员</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">
                      {member.users?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-secondary-900">
                      {member.users?.name || '未知用户'}
                    </h4>
                    <p className="text-sm text-secondary-600">
                      {member.users?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role_in_project)}`}>
                    {getRoleText(member.role_in_project)}
                  </span>
                  <button className="text-secondary-500 hover:text-secondary-700">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}