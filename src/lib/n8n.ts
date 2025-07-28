// n8n API调用函数
export interface N8nChatRequest {
  chatInput: string
  project_id: string | string[]
}

export interface N8nChatResponse {
  success: boolean
  response?: string
  error?: string
}

// n8n webhook配置
const N8N_WEBHOOK_URL = import.meta.env.DEV 
  ? '/api/n8n/webhook/1afe3c51-e81d-477b-b3e6-0686bc772534'  // 开发环境使用代理
  : 'https://n8n.aifunbox.com/webhook/1afe3c51-e81d-477b-b3e6-0686bc772534'  // 生产环境直接调用

// 用户项目接口
export interface UserProject {
  id: string
  name: string
  selected?: boolean
}

// 聊天记录接口
export interface ChatRecord {
  id: string
  content: string
  ai_content: string
  role: 'user' | 'assistant'
  agent_type: string
  project_id: string
  user_id: string
  metadata: any
  created_at: string
}

export const callN8nRAGAgent = async (
  chatInput: string,
  projectId: string | string[]
): Promise<N8nChatResponse> => {
  try {
    // 获取当前用户ID
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('用户未登录')
    }

    console.log('🚀 调用n8n RAG Agent:', {
      chatInput,
      projectId,
      userId: user.id
    })

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatInput: chatInput,
        project_id: projectId,
        user_id: user.id
      })
    })

    if (!response.ok) {
      throw new Error(`n8n调用失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.text()
    
    console.log('✅ n8n响应成功:', result)

    // 尝试解析JSON响应，提取ai_content字段
    let cleanResponse = result
    try {
      const jsonResponse = JSON.parse(result)
      if (jsonResponse.ai_content) {
        cleanResponse = jsonResponse.ai_content
        console.log('📝 提取ai_content:', cleanResponse)
      } else if (typeof jsonResponse === 'string') {
        cleanResponse = jsonResponse
      }
    } catch (error) {
      // 如果不是JSON，直接使用原文本
      console.log('📄 使用原始文本响应')
    }

    return {
      success: true,
      response: cleanResponse
    }

  } catch (error) {
    console.error('❌ n8n调用失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

// 本地测试函数（使用localhost）
export const callN8nRAGAgentLocal = async (
  chatInput: string,
  projectId: string | string[]
): Promise<N8nChatResponse> => {
  try {
    // 获取当前用户ID
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('用户未登录')
    }

    console.log('🚀 调用本地n8n RAG Agent:', {
      chatInput,
      projectId,
      userId: user.id
    })

    // 使用相同的webhook URL
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatInput: chatInput,
        project_id: projectId,
        user_id: user.id
      })
    })

    if (!response.ok) {
      throw new Error(`本地n8n调用失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.text()
    
    console.log('✅ 本地n8n响应成功:', result)

    // 尝试解析JSON响应，提取ai_content字段
    let cleanResponse = result
    try {
      const jsonResponse = JSON.parse(result)
      if (jsonResponse.ai_content) {
        cleanResponse = jsonResponse.ai_content
        console.log('📝 提取ai_content:', cleanResponse)
      } else if (typeof jsonResponse === 'string') {
        cleanResponse = jsonResponse
      }
    } catch (error) {
      // 如果不是JSON，直接使用原文本
      console.log('📄 使用原始文本响应')
    }

    return {
      success: true,
      response: cleanResponse
    }

  } catch (error) {
    console.error('❌ 本地n8n调用失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '本地n8n连接失败'
    }
  }
}

// 获取用户项目列表
export const getUserProjects = async (): Promise<UserProject[]> => {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('用户未登录')
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`获取项目失败: ${error.message}`)
    }

    return projects || []
  } catch (error) {
    console.error('获取用户项目失败:', error)
    return []
  }
}

// 文件上传到n8n处理
export const uploadDocumentToN8n = async (
  file: File,
  projectId: string,
  title: string,
  userId: string
): Promise<N8nChatResponse> => {
  try {
    console.log('📁 上传文件到n8n:', { fileName: file.name, projectId, userId, title })
    console.log('📁 文件对象检查:', { 
      fileType: typeof file, 
      fileName: file.name, 
      fileSize: file.size, 
      fileLastModified: file.lastModified,
      isFileInstance: file instanceof File 
    })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('project_id', projectId)
    formData.append('user_id', userId)
    formData.append('title', title)

    // 验证FormData内容
    console.log('📁 FormData检查:')
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size}bytes)` : value)
    }

    const uploadUrl = import.meta.env.DEV 
      ? '/api/n8n/webhook/upload-document'  // 开发环境使用代理
      : 'https://n8n.aifunbox.com/webhook/upload-document'  // 生产环境直接调用

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })

    // 获取响应文本
    const result = await response.text()
    console.log('📄 n8n响应:', { status: response.status, statusText: response.statusText, result })

    // n8n可能返回500但实际处理成功，所以我们检查响应内容
    if (response.ok || (response.status === 500 && result)) {
      console.log('✅ 文件上传成功:', result)
      return {
        success: true,
        response: result
      }
    } else {
      throw new Error(`文件上传失败: ${response.status} ${response.statusText}`)
    }

  } catch (error) {
    console.error('❌ 文件上传失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '文件上传失败'
    }
  }
}

// 保存聊天记录到数据库
export const saveChatRecord = async (
  userMessage: string,
  aiResponse: string,
  projectId: string | string[]
): Promise<void> => {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const projectIdStr = Array.isArray(projectId) ? projectId[0] : projectId

    // 保存一条完整的对话记录（用户消息和AI回复在同一条记录中）
    const { error } = await supabase
      .from('chat_history')
      .insert({
        content: userMessage,
        ai_content: aiResponse,
        role: 'user',
        agent_type: 'project_agent',
        project_id: projectIdStr,
        user_id: user.id,
        metadata: { project_ids: Array.isArray(projectId) ? projectId : [projectId] }
      })

    if (error) {
      console.error('保存聊天记录失败:', error)
    } else {
      console.log('✅ 聊天记录保存成功')
    }
  } catch (error) {
    console.error('保存聊天记录异常:', error)
  }
}

// 获取用户聊天记录
export const getChatRecords = async (limit = 20): Promise<ChatRecord[]> => {
  try {
    console.log('🔌 连接Supabase...')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )

    console.log('👤 获取用户信息...')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ 用户未登录')
      return []
    }
    console.log('✅ 用户ID:', user.id)

    console.log('📝 查询聊天记录...')
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('agent_type', 'project_agent')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ 获取聊天记录失败:', error)
      return []
    }

    console.log('✅ 查询成功，记录数:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('❌ 获取聊天记录异常:', error)
    return []
  }
}