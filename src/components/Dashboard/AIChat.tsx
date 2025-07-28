import React, { useState, useEffect } from 'react'
import { X, Send, Bot, User, ChevronDown, ChevronUp, Trash2, RotateCcw } from 'lucide-react'
import { ProjectSelector } from './ProjectSelector'
import { callN8nRAGAgent, callN8nRAGAgentLocal, getChatRecords, saveChatRecord } from '../../lib/n8n'

interface AIChatProps {
  onClose: () => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AIChat({ onClose }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [isProjectSelectorExpanded, setIsProjectSelectorExpanded] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  // 获取清空点时间戳
  const getClearTimestamp = (): string | null => {
    return localStorage.getItem('chatClearTimestamp')
  }

  // 设置清空点时间戳
  const setClearTimestamp = (timestamp: string) => {
    localStorage.setItem('chatClearTimestamp', timestamp)
  }

  // 初始化聊天窗口 - 显示清空点之后的历史记录
  useEffect(() => {
    const initializeChat = async () => {
      try {
        console.log('🔍 初始化聊天窗口...')
        const records = await getChatRecords(20)
        
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: '您好！我是您的AI项目管理助手。我可以帮您分析项目进度、分配任务、回答问题。请选择要查询的项目，然后输入您的问题。',
          timestamp: new Date()
        }
        
        // 获取清空点时间戳
        const clearTimestamp = getClearTimestamp()
        
        if (records.length > 0) {
          let filteredRecords = records
          
          // 如果有清空点，只显示清空点之后的记录
          if (clearTimestamp) {
            const clearTime = new Date(clearTimestamp)
            filteredRecords = records.filter(record => {
              const recordTime = new Date(record.created_at)
              return recordTime > clearTime
            })
            console.log(`🔄 过滤记录: 清空点${clearTimestamp}之后有${filteredRecords.length}条记录`)
          }
          
          if (filteredRecords.length > 0) {
            const historyMessages: ChatMessage[] = []
            
            filteredRecords.reverse().forEach((record) => {
              // 添加用户消息
              historyMessages.push({
                id: `user-${record.id}`,
                role: 'user',
                content: record.content,
                timestamp: new Date(record.created_at)
              })
              
              // 添加AI回复
              if (record.ai_content) {
                historyMessages.push({
                  id: `ai-${record.id}`,
                  role: 'assistant',
                  content: record.ai_content,
                  timestamp: new Date(record.created_at)
                })
              }
            })
            
            setMessages([welcomeMessage, ...historyMessages])
            console.log('✅ 历史记录加载完成')
          } else {
            setMessages([welcomeMessage])
            console.log('✅ 清空点之后无新记录，显示欢迎消息')
          }
        } else {
          setMessages([welcomeMessage])
          console.log('✅ 无历史记录，显示欢迎消息')
        }
      } catch (error) {
        console.error('❌ 初始化失败:', error)
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: '您好！我是您的AI项目管理助手。我可以帮您分析项目进度、分配任务、回答问题。请选择要查询的项目，然后输入您的问题。',
          timestamp: new Date()
        }])
      } finally {
        setIsLoadingHistory(false)
      }
    }

    initializeChat()
  }, [])

  // 清空聊天记录（设置清空点）
  const handleClearSession = () => {
    const currentTime = new Date().toISOString()
    setClearTimestamp(currentTime)
    
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: '您好！我是您的AI项目管理助手。这是一个全新的对话会话。请选择要查询的项目，然后输入您的问题。',
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
    console.log('✅ 清空点已设置:', currentTime)
  }

  const handleSend = async () => {
    if (!input.trim()) return
    
    if (selectedProjects.length === 0) {
      alert('请先选择至少一个项目')
      return
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInput('')
    setIsLoading(true)

    try {
      const projectId = selectedProjects.length === 1 ? selectedProjects[0] : selectedProjects
      
      // 调用n8n RAG系统
      const result = await callN8nRAGAgentLocal(input.trim(), projectId)

      const aiResponseContent = result.success ? result.response || '收到回复但内容为空' : `调用失败: ${result.error}`
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseContent,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiResponse])

      // 前端不再保存聊天记录到数据库，由n8n工作流处理
      // if (result.success) {
      //   await saveChatRecord(input.trim(), aiResponseContent, projectId)
      // }
    } catch (error) {
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `系统错误: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[600px] flex flex-col mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-secondary-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Bot className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-medium text-secondary-900">AI项目助手</h3>
              <p className="text-sm text-secondary-500">智能项目管理顾问</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearSession}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors group"
              title="清空聊天记录"
            >
              <Trash2 className="h-4 w-4 text-secondary-500 group-hover:text-red-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-secondary-600" />
            </button>
          </div>
        </div>

        {/* 聊天消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-secondary-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent"></div>
                <span>加载中...</span>
              </div>
            </div>
          ) : (
            <>
              
              {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Bot className="h-4 w-4 text-primary-600" />
                </div>
              )}
              
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-100 text-secondary-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>

              {message.role === 'user' && (
                <div className="p-2 bg-secondary-200 rounded-lg">
                  <User className="h-4 w-4 text-secondary-600" />
                </div>
              )}
            </div>
          ))}
            </>
          )}
          
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Bot className="h-4 w-4 text-primary-600" />
              </div>
              <div className="bg-secondary-100 px-4 py-2 rounded-lg">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t border-secondary-200">
          {/* 可折叠项目选择器 */}
          <div className="mb-3">
            <button
              onClick={() => setIsProjectSelectorExpanded(!isProjectSelectorExpanded)}
              className="flex items-center justify-between w-full p-2 bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-colors text-sm"
            >
              <span className="font-medium text-secondary-700">
                选择项目 {selectedProjects.length > 0 && `(${selectedProjects.length}个已选择)`}
              </span>
              {isProjectSelectorExpanded ? (
                <ChevronUp className="h-4 w-4 text-secondary-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-secondary-500" />
              )}
            </button>
            
            {isProjectSelectorExpanded && (
              <div className="mt-2">
                <ProjectSelector
                  selectedProjects={selectedProjects}
                  onProjectsChange={setSelectedProjects}
                />
              </div>
            )}
          </div>
          
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="请输入您的问题..."
                className="input resize-none"
                rows={2}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || selectedProjects.length === 0}
              className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 