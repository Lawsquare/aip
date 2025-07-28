import React, { useState, useEffect } from 'react'
import { Building2, Users, UserCheck, UserX } from 'lucide-react'
import { Organization, organizationAPI } from '@/lib/supabase'

interface OrganizationSelectionProps {
  userId: string
  onComplete: () => void
}

export function OrganizationSelection({ userId, onComplete }: OrganizationSelectionProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      const orgs = await organizationAPI.getAllOrganizations()
      setOrganizations(orgs)
    } catch (error) {
      console.error('加载组织列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleOrganization = (orgId: string) => {
    if (isGuest) return
    
    setSelectedOrganizations(prev => 
      prev.includes(orgId) 
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    )
  }

  const handleGuestMode = () => {
    setIsGuest(true)
    setSelectedOrganizations([])
  }

  const handleJoinMode = () => {
    setIsGuest(false)
  }

  const handleSubmit = async () => {
    setJoining(true)
    
    try {
      if (!isGuest && selectedOrganizations.length > 0) {
        // 加入选中的组织
        for (const orgId of selectedOrganizations) {
          await organizationAPI.joinOrganization(userId, orgId, 'member')
        }
      }
      
      onComplete()
    } catch (error) {
      console.error('加入组织失败:', error)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary-600 rounded-xl">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-secondary-900">
              选择组织
            </h1>
          </div>
          <p className="text-xl text-secondary-600">
            加入现有组织开始协作，或以游客身份浏览公开项目
          </p>
        </div>

        <div className="card mb-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleJoinMode}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                !isGuest 
                  ? 'border-primary-500 bg-primary-50 text-primary-900' 
                  : 'border-secondary-200 bg-white text-secondary-600 hover:border-secondary-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <UserCheck className="h-5 w-5" />
                <span className="font-medium">加入组织</span>
              </div>
            </button>
            
            <button
              onClick={handleGuestMode}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                isGuest 
                  ? 'border-primary-500 bg-primary-50 text-primary-900' 
                  : 'border-secondary-200 bg-white text-secondary-600 hover:border-secondary-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <UserX className="h-5 w-5" />
                <span className="font-medium">游客模式</span>
              </div>
            </button>
          </div>

          {isGuest ? (
            <div className="text-center py-8">
              <div className="p-4 bg-secondary-50 rounded-lg mb-4">
                <UserX className="h-12 w-12 text-secondary-400 mx-auto mb-2" />
                <h3 className="font-semibold text-secondary-900 mb-2">游客模式</h3>
                <p className="text-secondary-600">
                  您可以浏览所有组织和公开项目，但无法参与私有项目
                </p>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                可用组织 ({organizations.length})
              </h3>
              
              {organizations.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                  <p className="text-secondary-600">暂无可加入的组织</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      onClick={() => handleToggleOrganization(org.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedOrganizations.includes(org.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-secondary-200 bg-white hover:border-secondary-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          selectedOrganizations.includes(org.id)
                            ? 'bg-primary-100'
                            : 'bg-secondary-100'
                        }`}>
                          <Building2 className={`h-5 w-5 ${
                            selectedOrganizations.includes(org.id)
                              ? 'text-primary-600'
                              : 'text-secondary-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-secondary-900 mb-1">
                            {org.name}
                          </h4>
                          <p className="text-sm text-secondary-600 mb-2">
                            {org.description || '暂无描述'}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-secondary-500">
                            <Users className="h-3 w-3" />
                            <span>组织成员</span>
                          </div>
                        </div>
                        {selectedOrganizations.includes(org.id) && (
                          <div className="p-1 bg-primary-500 rounded-full">
                            <UserCheck className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isGuest && selectedOrganizations.length > 0 && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-primary-900 mb-2">
                    已选择 {selectedOrganizations.length} 个组织
                  </h4>
                  <p className="text-sm text-primary-700">
                    您将以成员身份加入这些组织，可以参与组织内的项目协作
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={joining || (!isGuest && selectedOrganizations.length === 0)}
            className="btn-primary px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {joining ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {isGuest ? '进入平台...' : '加入组织...'}
              </div>
            ) : (
              <>
                {isGuest ? '以游客身份进入' : `加入 ${selectedOrganizations.length} 个组织`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}