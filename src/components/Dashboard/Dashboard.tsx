import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Project, Task } from '@/lib/supabase'
import { Sidebar } from './Sidebar'
import { ProjectGrid } from './ProjectGrid'
import { TaskList } from './TaskList'
import { AIChat } from './AIChat'
import { CreateProjectModal } from './CreateProjectModal'
import { EditDescriptionModal } from './EditDescriptionModal'
import { ProjectDetailPage } from './ProjectDetailPage'
import { Plus, MessageSquare } from 'lucide-react'

export function Dashboard() {
  const { user, signOut } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showAIChat, setShowAIChat] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [showEditDescription, setShowEditDescription] = useState(false)
  const [editingProject, setEditingProject] = useState<{id: string, name: string, description: string} | null>(null)
  const [updatingDescription, setUpdatingDescription] = useState(false)
  const [showProjectDetail, setShowProjectDetail] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      console.log('📊 开始加载仪表板数据 (Supabase模式)...')
      
      // 获取用户创建的项目
      console.log('📁 获取用户创建的项目...')
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })

      if (projectError) {
        console.error('❌ 获取项目失败:', projectError)
        setProjects([])
      } else {
        console.log('✅ 项目获取成功:', projectData)
        setProjects(projectData || [])
      }

      // 暂时跳过任务加载，保持简化
      console.log('📋 暂时跳过任务加载')
      setMyTasks([])
      
    } catch (error) {
      console.error('❌ 加载仪表板数据失败:', error)
      setProjects([])
      setMyTasks([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (projectName: string, description?: string) => {
    if (!user) return

    setCreatingProject(true)
    console.log('🚀 开始创建项目 (Supabase模式):', projectName, description)
    
    try {
      // 第一步：创建项目
      console.log('📁 创建项目...')
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([
          {
            name: projectName,
            description: description || '',
            status: 'active',
            is_public: false,
            is_recruiting: false,
            creator_id: user.id,
            organization_id: '658bb306-8e32-407e-9d5b-0c68603e8a73',
            settings: {}
          }
        ])
        .select()
        .single()

      if (projectError) {
        console.error('❌ 项目创建失败:', projectError)
        throw projectError
      }

      console.log('✅ 项目创建成功:', project)
      console.log('📊 项目数据详情:', JSON.stringify(project, null, 2))

      // 第二步：添加创建者为项目成员
      console.log('👥 添加项目成员...')
      const { error: memberError } = await supabase
        .from('project_members')
        .insert([
          {
            project_id: project.id,
            user_id: user.id,
            role_in_project: 'manager'
          }
        ])

      if (memberError) {
        console.error('⚠️ 项目成员添加失败:', memberError)
        // 不抛出错误，项目已创建成功
      } else {
        console.log('✅ 项目成员添加成功')
      }

      // 重新加载数据
      console.log('🔄 重新加载数据...')
      await loadDashboardData()
      setShowCreateProject(false)
      console.log('🎉 项目创建完成!')
      
    } catch (error) {
      console.error('❌ 创建项目过程中出错:', error)
      alert(`创建项目失败: ${error.message || '未知错误'}`)
    } finally {
      setCreatingProject(false)
    }
  }

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!user) return
    
    // 确认删除
    const confirmDelete = window.confirm(`确定要删除项目"${projectName}"吗？此操作将同时删除项目中的所有文档，且无法恢复。`)
    if (!confirmDelete) return

    try {
      console.log('🗑️ 开始删除项目:', projectId)
      
      // 第一步：删除documents表中的相关数据
      console.log('📄 删除项目文档...')
      const { data: deletedDocs, error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('project_id', projectId)
        .select()

      if (documentsError) {
        console.error('❌ 删除文档失败:', documentsError)
        throw documentsError
      }
      console.log('📄 删除的文档数量:', deletedDocs?.length || 0)

      // 第二步：删除project_members表中的相关数据
      console.log('👥 删除项目成员...')
      const { data: deletedMembers, error: membersError } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .select()

      if (membersError) {
        console.error('❌ 删除项目成员失败:', membersError)
        throw membersError
      }
      console.log('👥 删除的成员数量:', deletedMembers?.length || 0)

      // 第三步：删除projects表中的项目
      console.log('📁 删除项目...')
      const { data: deletedProject, error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('creator_id', user.id) // 确保只能删除自己创建的项目
        .select()

      if (projectError) {
        console.error('❌ 删除项目失败:', projectError)
        throw projectError
      }
      console.log('📁 删除的项目:', deletedProject)

      console.log('✅ 项目删除成功！')
      
      // 重新加载数据
      console.log('🔄 开始重新加载数据...')
      await loadDashboardData()
      console.log('🔄 数据重新加载完成')
      
    } catch (error) {
      console.error('❌ 删除项目失败:', error)
      alert('删除项目失败，请重试')
    }
  }

  const handleEditDescription = (projectId: string, projectName: string, currentDescription: string) => {
    setEditingProject({ id: projectId, name: projectName, description: currentDescription })
    setShowEditDescription(true)
  }

  const handleUpdateDescription = async (newDescription: string) => {
    if (!user || !editingProject) return

    setUpdatingDescription(true)
    try {
      console.log('✏️ 更新项目描述:', editingProject.id, newDescription)
      
      const { error } = await supabase
        .from('projects')
        .update({ description: newDescription })
        .eq('id', editingProject.id)
        .eq('creator_id', user.id) // 确保只能编辑自己的项目

      if (error) {
        console.error('❌ 更新描述失败:', error)
        throw error
      }

      console.log('✅ 描述更新成功！')
      
      // 重新加载数据
      await loadDashboardData()
      setShowEditDescription(false)
      setEditingProject(null)
      
    } catch (error) {
      console.error('❌ 更新描述失败:', error)
      alert('更新描述失败，请重试')
    } finally {
      setUpdatingDescription(false)
    }
  }

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setShowProjectDetail(true)
  }

  const handleBackToProjects = () => {
    setShowProjectDetail(false)
    setSelectedProject(null)
  }

  const handleTogglePublic = async (projectId: string, isPublic: boolean) => {
    if (!user) return

    try {
      console.log('🔄 切换项目可见性:', projectId, isPublic ? '公开' : '私有')
      
      const { error } = await supabase
        .from('projects')
        .update({ is_public: isPublic })
        .eq('id', projectId)
        .eq('creator_id', user.id) // 确保只能修改自己的项目

      if (error) {
        console.error('❌ 切换项目可见性失败:', error)
        throw error
      }

      console.log('✅ 项目可见性切换成功！')
      
      // 重新加载数据
      await loadDashboardData()
      
    } catch (error) {
      console.error('❌ 切换项目可见性失败:', error)
      alert('切换项目可见性失败，请重试')
    }
  }

  const handleToggleRecruiting = async (projectId: string, isRecruiting: boolean) => {
    if (!user) return

    try {
      console.log('🔄 切换项目招募状态:', projectId, isRecruiting ? '招募中' : '停止招募')
      
      const { error } = await supabase
        .from('projects')
        .update({ is_recruiting: isRecruiting })
        .eq('id', projectId)
        .eq('creator_id', user.id) // 确保只能修改自己的项目

      if (error) {
        console.error('❌ 切换项目招募状态失败:', error)
        throw error
      }

      console.log('✅ 项目招募状态切换成功！')
      
      // 重新加载数据
      await loadDashboardData()
      
    } catch (error) {
      console.error('❌ 切换项目招募状态失败:', error)
      alert('切换项目招募状态失败，请重试')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50 flex">
      {/* 侧边栏 */}
      <Sidebar user={user} onSignOut={signOut} />
      
      {/* 主内容区 */}
      <div className="flex-1 lg:ml-64">
        <div className="p-6">
          {showProjectDetail && selectedProject ? (
            <ProjectDetailPage 
              project={selectedProject}
              onBack={handleBackToProjects}
            />
          ) : (
            <>
              {/* 页头 */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-secondary-900 mb-2">
                  欢迎回来，{user?.name || '用户'}！
                </h1>
                <p className="text-secondary-600">
                  您有 {myTasks.length} 个待处理任务，{projects.length} 个活跃项目
                </p>
              </div>

              {/* 快速操作按钮 */}
              <div className="flex flex-wrap gap-4 mb-8">
                <button 
                  onClick={() => setShowCreateProject(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  创建项目
                </button>
                <button 
                  onClick={() => setShowAIChat(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  与AI对话
                </button>
              </div>

              {/* 主要内容网格 */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* 我的任务 */}
                <div className="xl:col-span-1">
                  <TaskList tasks={myTasks} onTaskUpdate={loadDashboardData} />
                </div>
                
                {/* 我的项目 */}
                <div className="xl:col-span-2">
                  <ProjectGrid 
                    projects={projects} 
                    onCreateProject={() => setShowCreateProject(true)}
                    onDeleteProject={handleDeleteProject}
                    onEditDescription={handleEditDescription}
                    onProjectClick={handleProjectClick}
                    onTogglePublic={handleTogglePublic}
                    onToggleRecruiting={handleToggleRecruiting}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI聊天弹窗 */}
      {showAIChat && (
        <AIChat onClose={() => setShowAIChat(false)} />
      )}

      {/* 创建项目弹窗 */}
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onConfirm={handleCreateProject}
        loading={creatingProject}
      />

      {/* 编辑描述弹窗 */}
      {showEditDescription && editingProject && (
        <EditDescriptionModal
          isOpen={showEditDescription}
          onClose={() => {
            setShowEditDescription(false)
            setEditingProject(null)
          }}
          onConfirm={handleUpdateDescription}
          projectName={editingProject.name}
          currentDescription={editingProject.description}
          loading={updatingDescription}
        />
      )}

    </div>
  )
} 