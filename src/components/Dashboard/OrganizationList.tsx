import React, { useState, useEffect } from 'react'
import { Building2, Users, Eye, Lock, ChevronRight } from 'lucide-react'
import { Organization, Project, organizationAPI } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface OrganizationListProps {
  onSelectOrganization: (org: Organization) => void
}

export function OrganizationList({ onSelectOrganization }: OrganizationListProps) {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [orgProjects, setOrgProjects] = useState<Record<string, Project[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrganizationsAndProjects()
  }, [user])

  const loadOrganizationsAndProjects = async () => {
    try {
      const orgs = await organizationAPI.getAllOrganizations()
      setOrganizations(orgs)

      // 为每个组织加载项目
      const projectsData: Record<string, Project[]> = {}
      for (const org of orgs) {
        const projects = await organizationAPI.getOrganizationProjects(
          org.id, 
          user?.id
        )
        projectsData[org.id] = projects
      }
      setOrgProjects(projectsData)
    } catch (error) {
      console.error('加载组织数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">
          探索组织
        </h1>
        <p className="text-secondary-600">
          浏览所有组织，发现感兴趣的项目并参与协作
        </p>
      </div>

      {organizations.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 text-secondary-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">
            暂无组织
          </h3>
          <p className="text-secondary-600">
            还没有任何组织，等待管理员创建第一个组织
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => {
            const projects = orgProjects[org.id] || []
            const publicProjects = projects.filter(p => p.is_public)
            const privateProjects = projects.filter(p => !p.is_public)

            return (
              <div
                key={org.id}
                onClick={() => onSelectOrganization(org)}
                className="card hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-primary-100 rounded-xl">
                    <Building2 className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-secondary-900 mb-1 group-hover:text-primary-600 transition-colors">
                      {org.name}
                    </h3>
                    <p className="text-sm text-secondary-600 line-clamp-2">
                      {org.description || '暂无描述'}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-secondary-400 group-hover:text-primary-600 transition-colors" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-secondary-500" />
                      <span className="text-sm text-secondary-600">项目总数</span>
                    </div>
                    <span className="font-medium text-secondary-900">
                      {projects.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-secondary-600">公开项目</span>
                    </div>
                    <span className="font-medium text-green-600">
                      {publicProjects.length}
                    </span>
                  </div>

                  {user && privateProjects.length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-secondary-600">我的项目</span>
                      </div>
                      <span className="font-medium text-amber-600">
                        {privateProjects.length}
                      </span>
                    </div>
                  )}

                </div>

                {projects.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-secondary-200">
                    <p className="text-xs text-secondary-500 mb-2">最新项目:</p>
                    <div className="space-y-1">
                      {projects.slice(0, 2).map((project) => (
                        <div key={project.id} className="flex items-center gap-2">
                          {project.is_public ? (
                            <Eye className="h-3 w-3 text-green-500" />
                          ) : (
                            <Lock className="h-3 w-3 text-amber-500" />
                          )}
                          <span className="text-xs text-secondary-600 truncate">
                            {project.name}
                          </span>
                        </div>
                      ))}
                      {projects.length > 2 && (
                        <p className="text-xs text-secondary-500 italic">
                          +{projects.length - 2} 个更多项目
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}