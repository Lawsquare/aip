import React, { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Check, Trash2, ChevronDown, ChevronRight, Users, Calendar, BarChart3, Upload, UserCog } from 'lucide-react'
import { Project, Task, supabase, organizationAPI } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { FileUpload } from './FileUpload'

interface ProjectDetailPageProps {
  project: Project
  onBack: () => void
  readOnly?: boolean  // 是否为只读模式（游客或非成员）
}

export function ProjectDetailPage({ project, onBack, readOnly }: ProjectDetailPageProps) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [isTaskListExpanded, setIsTaskListExpanded] = useState(true)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingDescription, setEditingDescription] = useState('')
  const [updatingTask, setUpdatingTask] = useState(false)
  const [isProjectMember, setIsProjectMember] = useState(false)
  const [isProjectManager, setIsProjectManager] = useState(false)
  const [checkingMembership, setCheckingMembership] = useState(true)
  const [projectMembers, setProjectMembers] = useState<Array<{user_id: string, role_in_project: string}>>([])

  useEffect(() => {
    loadTasks()
    checkProjectMembership()
    loadProjectMembers()
  }, [project.id, user])

  const checkProjectMembership = async () => {
    if (!user) {
      setIsProjectMember(false)
      setIsProjectManager(false)
      setCheckingMembership(false)
      return
    }

    try {
      const [isMember, isManager] = await Promise.all([
        organizationAPI.isProjectMember(project.id, user.id),
        organizationAPI.isProjectManager(project.id, user.id)
      ])
      setIsProjectMember(isMember)
      setIsProjectManager(isManager)
    } catch (error) {
      console.error('检查项目成员身份失败:', error)
      setIsProjectMember(false)
      setIsProjectManager(false)
    } finally {
      setCheckingMembership(false)
    }
  }

  const loadProjectMembers = async () => {
    try {
      const members = await organizationAPI.getProjectMembers(project.id)
      setProjectMembers(members)
    } catch (error) {
      console.error('加载项目成员失败:', error)
    }
  }

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('加载任务失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const addTask = async () => {
    if (!newTaskTitle.trim() || !user || effectiveReadOnly) return

    setAddingTask(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: newTaskTitle.trim(),
          description: '',
          status: 'pending',
          priority: 'medium',
          project_id: project.id,
          assignee_id: user.id, // 默认分配给创建者
          created_by_id: user.id,
          created_by_ai: false,
          estimated_hours: null,
          actual_hours: null,
          due_date: null,
          metadata: {}
        })
        .select()
        .single()

      if (error) throw error

      setTasks(prev => [data, ...prev])
      setNewTaskTitle('')
    } catch (error) {
      console.error('添加任务失败:', error)
      alert('添加任务失败，请重试')
    } finally {
      setAddingTask(false)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || !canChangeTaskStatus(task)) return
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ))
    } catch (error) {
      console.error('更新任务状态失败:', error)
    }
  }

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || !canChangeTaskStatus(task)) return
    
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    await updateTaskStatus(taskId, newStatus)
  }

  const startEditingDescription = (task: Task) => {
    if (!canEditTask(task)) return
    
    setEditingTaskId(task.id)
    setEditingDescription(task.description || '')
  }

  const saveTaskDescription = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (updatingTask || !task || !canEditTask(task)) return // 防止重复提交
    
    setUpdatingTask(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ description: editingDescription })
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, description: editingDescription } : task
      ))
      
      setEditingTaskId(null)
      setEditingDescription('')
    } catch (error) {
      console.error('更新任务描述失败:', error)
      alert('更新任务描述失败，请重试')
    } finally {
      setUpdatingTask(false)
    }
  }

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, taskId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveTaskDescription(taskId)
    }
  }

  const handleDescriptionBlur = (taskId: string) => {
    saveTaskDescription(taskId)
  }

  const assignTask = async (taskId: string, assigneeId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || (!isProjectManager && task.created_by_id !== user?.id)) {
      return // 只有项目经理或任务创建者可以分配任务
    }

    try {
      // 将空字符串转换为null，以便正确处理"未分配"状态
      const assigneeValue = assigneeId === '' ? null : assigneeId
      
      const { error } = await supabase
        .from('tasks')
        .update({ assignee_id: assigneeValue })
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, assignee_id: assigneeValue } : t
      ))
    } catch (error) {
      console.error('分配任务失败:', error)
      alert('分配任务失败，请重试')
    }
  }

  const deleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || !canDeleteTask(task) || !confirm('确定要删除这个任务吗？')) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.filter(task => task.id !== taskId))
    } catch (error) {
      console.error('删除任务失败:', error)
      alert('删除任务失败，请重试')
    }
  }

  // 计算有效的只读状态：手动传入的readOnly或者根据成员身份计算
  const effectiveReadOnly = readOnly !== undefined ? readOnly : (!user || !isProjectMember)
  
  // 检查任务权限
  const canEditTask = (task: Task) => {
    if (effectiveReadOnly) return false
    if (isProjectManager) return true // 项目经理可以编辑所有任务
    return task.created_by_id === user?.id // 成员只能编辑自己创建的任务
  }
  
  const canDeleteTask = (task: Task) => {
    if (effectiveReadOnly) return false
    if (isProjectManager) return true // 项目经理可以删除所有任务
    return task.created_by_id === user?.id // 成员只能删除自己创建的任务
  }
  
  const canChangeTaskStatus = (task: Task) => {
    if (effectiveReadOnly) return false
    if (isProjectManager) return true // 项目经理可以修改所有任务状态
    // 成员可以修改分配给自己的任务或自己创建的任务
    return (task.assignee_id && task.assignee_id === user?.id) || task.created_by_id === user?.id
  }
  
  const canAssignTask = (task: Task) => {
    if (effectiveReadOnly) return false
    if (isProjectManager) return true // 项目经理可以分配所有任务
    return task.created_by_id === user?.id // 任务创建者可以分配自己创建的任务
  }
  
  const completedTasks = tasks.filter(task => task.status === 'completed').length
  const totalTasks = tasks.length
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-secondary-100 text-secondary-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '进行中'
      case 'completed': return '已完成'
      case 'paused': return '已暂停'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-secondary-100 text-secondary-700'
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'review': return 'bg-yellow-100 text-yellow-700'
      case 'completed': return 'bg-green-100 text-green-700'
      case 'blocked': return 'bg-red-100 text-red-700'
      default: return 'bg-secondary-100 text-secondary-700'
    }
  }

  const getTaskStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待处理'
      case 'in_progress': return '进行中'
      case 'review': return '待审核'
      case 'completed': return '已完成'
      case 'blocked': return '已阻塞'
      default: return status
    }
  }

  return (
    <div className="space-y-6">
      {/* 项目头部 */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-secondary-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-secondary-900">{project.name}</h1>
          <p className="text-secondary-600">{project.description || '暂无描述'}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
          {getStatusText(project.status)}
        </span>
      </div>

      {/* 项目概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-secondary-900">项目进度</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-secondary-600">完成进度</span>
              <span className="font-medium text-secondary-900">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-secondary-500">
              {completedTasks} / {totalTasks} 个任务已完成
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-secondary-900">项目信息</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary-600">创建时间</span>
              <span className="text-secondary-900">{formatDate(project.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">项目状态</span>
              <span className="text-secondary-900">{getStatusText(project.status)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">可见性</span>
              <span className="text-secondary-900">{project.is_public ? '公开' : '私有'}</span>
            </div>
          </div>
        </div>

        <div className={`card ${effectiveReadOnly ? 'bg-secondary-100 border-secondary-200' : ''}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${effectiveReadOnly ? 'bg-secondary-200' : 'bg-purple-100'}`}>
              <Users className={`h-5 w-5 ${effectiveReadOnly ? 'text-secondary-500' : 'text-purple-600'}`} />
            </div>
            <h3 className={`font-semibold ${effectiveReadOnly ? 'text-secondary-600' : 'text-secondary-900'}`}>团队协作</h3>
          </div>
          <div className="space-y-3">
            <button 
              className={`w-full text-sm ${effectiveReadOnly ? 'btn-disabled' : 'btn-secondary'}`}
              disabled={effectiveReadOnly}
            >
              <Users className="h-4 w-4 mr-2" />
              {effectiveReadOnly ? '团队成员仅限成员查看' : '查看团队成员'}
            </button>
            {!effectiveReadOnly && (
              <button 
                onClick={() => setShowFileUpload(true)}
                className="w-full btn-secondary text-sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                上传文档
              </button>
            )}
            
            {effectiveReadOnly && (
              <div className="text-xs text-secondary-500 text-center p-2">
                {!user ? '作为游客，您无法上传文档' : !isProjectMember ? '您不是项目成员，无法上传文档' : '您没有上传权限'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 任务管理 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setIsTaskListExpanded(!isTaskListExpanded)}
            className="flex items-center gap-2 hover:bg-secondary-50 p-2 rounded-lg transition-colors"
          >
            {isTaskListExpanded ? (
              <ChevronDown className="h-5 w-5 text-secondary-600" />
            ) : (
              <ChevronRight className="h-5 w-5 text-secondary-600" />
            )}
            <h2 className="text-xl font-semibold text-secondary-900">
              项目任务 ({totalTasks})
            </h2>
          </button>
          
          {isTaskListExpanded && !effectiveReadOnly && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="添加新任务..."
                className="input text-sm"
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
              <button
                onClick={addTask}
                disabled={!newTaskTitle.trim() || addingTask}
                className="btn-primary btn-sm"
              >
                {addingTask ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
          
          {isTaskListExpanded && effectiveReadOnly && (
            <div className="text-sm text-secondary-500 italic">
              {!user ? '作为游客，您只可查看任务列表' : !isProjectMember ? '您不是此项目成员，只可查看任务列表' : '您没有权限添加任务'}
            </div>
          )}
        </div>

        {isTaskListExpanded && (
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-secondary-600 mb-4">还没有任何任务</p>
                <p className="text-xs text-secondary-500">添加第一个任务开始项目管理</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex flex-col gap-3 p-4 rounded-lg border transition-all ${
                    task.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  {/* 任务主要信息行 */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleTaskStatus(task.id, task.status)}
                      disabled={!canChangeTaskStatus(task)}
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        task.status === 'completed'
                          ? 'bg-green-500 border-green-500 text-white'
                          : !canChangeTaskStatus(task) 
                            ? 'border-secondary-200 cursor-not-allowed'
                            : 'border-secondary-300 hover:border-green-400'
                      }`}
                    >
                      {task.status === 'completed' && (
                        <Check className="h-3 w-3" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <p className={`font-medium ${
                        task.status === 'completed'
                          ? 'line-through text-secondary-500'
                          : 'text-secondary-900'
                      }`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-secondary-500">
                          {formatDate(task.created_at)}
                        </span>
                        {task.created_by_id === user?.id && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">
                            我创建
                          </span>
                        )}
                        {task.assignee_id && task.assignee_id === user?.id && task.assignee_id !== task.created_by_id && (
                          <span className="text-xs bg-green-100 text-green-700 px-1 rounded">
                            分配给我
                          </span>
                        )}
                        {!canChangeTaskStatus(task) ? (
                          <span className={`text-xs px-2 py-1 rounded-full ${getTaskStatusColor(task.status)}`}>
                            {getTaskStatusText(task.status)}
                          </span>
                        ) : (
                          <select
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border-none outline-none cursor-pointer ${getTaskStatusColor(task.status)}`}
                          >
                            <option value="pending">待处理</option>
                            <option value="in_progress">进行中</option>
                            <option value="review">待审核</option>
                            <option value="completed">已完成</option>
                            <option value="blocked">已阻塞</option>
                          </select>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {canAssignTask(task) && (
                        <select
                          value={task.assignee_id || ''}
                          onChange={(e) => assignTask(task.id, e.target.value)}
                          className="text-xs p-1 border border-secondary-300 rounded hover:border-primary-400 focus:outline-none focus:border-primary-500"
                          title="分配任务"
                        >
                          <option value="">未分配</option>
                          {projectMembers.map((member) => (
                            <option key={member.user_id} value={member.user_id}>
                              {member.user_id === user?.id ? '我' : `用户${member.user_id.slice(-4)}`}
                            </option>
                          ))}
                        </select>
                      )}
                      
                      {!canAssignTask(task) && task.assignee_id && (
                        <span className="text-xs text-secondary-500 flex items-center gap-1">
                          <UserCog className="h-3 w-3" />
                          {task.assignee_id === user?.id ? '分配给我' : '已分配'}
                        </span>
                      )}
                      
                      {canDeleteTask(task) && (
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="flex-shrink-0 p-1 hover:bg-red-50 rounded-md transition-colors group"
                          title="删除任务"
                        >
                          <Trash2 className="h-4 w-4 text-secondary-400 group-hover:text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* 任务描述编辑区域 */}
                  {editingTaskId === task.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        onKeyDown={(e) => handleDescriptionKeyDown(e, task.id)}
                        onBlur={() => handleDescriptionBlur(task.id)}
                        placeholder="添加任务描述...（回车保存，Shift+回车换行）"
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md text-sm resize-none focus:outline-none focus:border-blue-500"
                        rows={2}
                        autoFocus
                      />
                      {updatingTask && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-secondary-500">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" />
                          保存中...
                        </div>
                      )}
                    </div>
                  ) : task.description ? (
                    <div 
                      className={`ml-8 text-sm text-secondary-600 bg-secondary-50 p-2 rounded border-l-3 border-blue-200 transition-colors ${
                        !canEditTask(task) 
                          ? 'cursor-default' 
                          : 'cursor-pointer hover:bg-secondary-100'
                      }`}
                      onClick={() => canEditTask(task) && startEditingDescription(task)}
                      title={!canEditTask(task) ? '' : '点击编辑描述'}
                    >
                      {task.description}
                    </div>
                  ) : !canEditTask(task) ? (
                    <div className="ml-8 text-xs text-secondary-400 italic">
                      暂无描述
                    </div>
                  ) : (
                    <div 
                      className="ml-8 text-xs text-secondary-400 italic cursor-pointer hover:text-secondary-600 transition-colors"
                      onClick={() => startEditingDescription(task)}
                      title="点击添加描述"
                    >
                      点击编辑添加描述...
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 文件上传弹窗 */}
      {showFileUpload && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFileUpload(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-secondary-200">
              <h2 className="text-xl font-semibold text-secondary-900">
                上传项目文档
              </h2>
              <button
                onClick={() => setShowFileUpload(false)}
                className="p-2 hover:bg-secondary-100 rounded-lg transition-colors text-xl font-semibold text-secondary-500 hover:text-secondary-700"
              >
                ×
              </button>
            </div>
            <FileUpload 
              projectId={project.id}
              userId={user?.id || ''}
              onUploadSuccess={() => {
                setShowFileUpload(false)
                // 可以在这里添加成功提示或刷新数据
              }}
              onClose={() => setShowFileUpload(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}