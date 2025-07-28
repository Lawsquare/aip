import React, { useState } from 'react'
import { Building2, Users, Home, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Organization, Project } from '@/lib/supabase'
import { Dashboard } from './Dashboard'
import { OrganizationList } from './OrganizationList'
import { OrganizationDetail } from './OrganizationDetail'
import { ProjectSettings } from './ProjectSettings'
import { ProjectDetailPage } from './ProjectDetailPage'

type ViewType = 'dashboard' | 'organizations' | 'organization-detail' | 'project-settings' | 'project-detail'

export function MainDashboard() {
  const { user, signOut, isGuest } = useAuth()
  const [currentView, setCurrentView] = useState<ViewType>(isGuest ? 'organizations' : 'dashboard')
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const handleNavigateToOrganizations = () => {
    setCurrentView('organizations')
    setSelectedOrganization(null)
  }

  const handleSelectOrganization = (org: Organization) => {
    setSelectedOrganization(org)
    setCurrentView('organization-detail')
  }

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
    setCurrentView('project-settings')
  }

  const handleViewProject = (project: Project) => {
    setSelectedProject(project)
    setCurrentView('project-detail')
  }

  const handleBackToOrganizations = () => {
    setCurrentView('organizations')
    setSelectedOrganization(null)
  }

  const handleBackToOrganizationDetail = () => {
    if (selectedOrganization) {
      setCurrentView('organization-detail')
    } else {
      setCurrentView('organizations')
    }
    setSelectedProject(null)
  }

  const handleBackToDashboard = () => {
    // 游客用户无法访问工作台，重定向到组织列表
    if (isGuest) {
      setCurrentView('organizations')
    } else {
      setCurrentView('dashboard')
    }
    setSelectedOrganization(null)
    setSelectedProject(null)
  }

  const handleProjectSave = (updatedProject: Project) => {
    setSelectedProject(updatedProject)
    // 可以选择返回组织详情或保持在设置页面
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        // 游客用户无法访问工作台，重定向到组织列表
        if (isGuest) {
          return (
            <OrganizationList 
              onSelectOrganization={handleSelectOrganization}
            />
          )
        }
        return <Dashboard />
      
      case 'organizations':
        return (
          <OrganizationList 
            onSelectOrganization={handleSelectOrganization}
          />
        )
      
      case 'organization-detail':
        return selectedOrganization ? (
          <OrganizationDetail
            organization={selectedOrganization}
            onBack={handleBackToOrganizations}
            onSelectProject={handleSelectProject}
            onViewProject={handleViewProject}
          />
        ) : null
      
      case 'project-settings':
        // 游客用户无法访问项目设置
        if (isGuest) {
          return (
            <OrganizationList 
              onSelectOrganization={handleSelectOrganization}
            />
          )
        }
        return selectedProject ? (
          <ProjectSettings
            project={selectedProject}
            onBack={handleBackToOrganizationDetail}
            onSave={handleProjectSave}
          />
        ) : null
      
      case 'project-detail':
        return selectedProject ? (
          <ProjectDetailPage
            project={selectedProject}
            onBack={handleBackToOrganizationDetail}
            readOnly={isGuest || !user} // 游客或未登录用户为只读模式
          />
        ) : null
      
      default:
        return isGuest ? (
          <OrganizationList 
            onSelectOrganization={handleSelectOrganization}
          />
        ) : <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white border-b border-secondary-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-600 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-secondary-900">
                AI项目管理平台
              </h1>
            </div>
            
            <div className="flex items-center gap-1">
              {/* 游客用户不显示工作台按钮 */}
              {!isGuest && (
                <button
                  onClick={handleBackToDashboard}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100'
                  }`}
                >
                  <Home className="h-4 w-4 mr-2 inline" />
                  我的工作台
                </button>
              )}
              
              <button
                onClick={handleNavigateToOrganizations}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'organizations' || currentView === 'organization-detail'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100'
                }`}
              >
                <Building2 className="h-4 w-4 mr-2 inline" />
                探索组织
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-secondary-900">{user.name}</p>
                  <p className="text-xs text-secondary-600">{user.email}</p>
                </div>
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600">
                    {user.name?.charAt(0) || '?'}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="text-secondary-600 hover:text-secondary-900 transition-colors"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            ) : isGuest ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-secondary-500" />
                  <span className="text-sm text-secondary-600">游客模式</span>
                </div>
                <span className="text-xs text-secondary-500">
                  登录后可查看更多组织与项目
                </span>
                <button
                  onClick={signOut}
                  className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                >
                  登录
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-secondary-500" />
                <span className="text-sm text-secondary-600">未登录</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 主内容区域 */}
      <main className="px-6 py-8">
        {renderContent()}
      </main>
    </div>
  )
}