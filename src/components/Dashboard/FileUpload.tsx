import React, { useState, useCallback } from 'react'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import { uploadDocumentToN8n } from '../../lib/n8n'

interface FileUploadProps {
  projectId: string
  userId: string
  onUploadSuccess: () => void
  onClose: () => void
}

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  title: string  // 添加自定义标题
}

export function FileUpload({ projectId, userId, onUploadSuccess, onClose }: FileUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const acceptedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️'
    if (file.type === 'application/pdf') return '📄'
    if (file.type.includes('word')) return '📝'
    if (file.type === 'text/plain') return '📰'
    return '📁'
  }

  const validateFile = (file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      return '不支持的文件类型。请上传PDF、图片、Word文档或文本文件。'
    }
    if (file.size > 50 * 1024 * 1024) { // 50MB
      return '文件大小不能超过50MB'
    }
    return null
  }

  const handleFiles = useCallback((files: FileList) => {
    const newFiles: UploadFile[] = []
    
    Array.from(files).forEach(file => {
      const error = validateFile(file)
      newFiles.push({
        file,
        id: `${Date.now()}-${Math.random()}`,
        status: error ? 'error' : 'pending',
        progress: 0,
        error,
        title: file.name  // 默认使用文件名作为标题
      })
    })
    
    setUploadFiles(prev => [...prev, ...newFiles])
  }, [])

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ))

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id && f.progress < 90
            ? { ...f, progress: f.progress + 10 }
            : f
        ))
      }, 300)

      // 调用n8n文件处理工作流
      const result = await uploadDocumentToN8n(
        uploadFile.file,
        projectId,
        uploadFile.title,  // 使用自定义标题
        userId
      )

      clearInterval(progressInterval)

      if (result.success) {
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'success', progress: 100 }
            : f
        ))
      } else {
        throw new Error(result.error || '上传失败')
      }

    } catch (error) {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'error', 
              progress: 0,
              error: error instanceof Error ? error.message : '上传失败'
            }
          : f
      ))
    }
  }

  const startUpload = () => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending')
    pendingFiles.forEach(uploadFile)
  }

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id))
  }

  const updateFileTitle = (id: string, newTitle: string) => {
    setUploadFiles(prev => prev.map(f => 
      f.id === id ? { ...f, title: newTitle } : f
    ))
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const allCompleted = uploadFiles.length > 0 && uploadFiles.every(f => f.status === 'success' || f.status === 'error')
  const hasSuccess = uploadFiles.some(f => f.status === 'success')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <h2 className="text-xl font-semibold text-secondary-900">上传文档</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-secondary-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* 拖拽上传区域 */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-6 ${
              isDragging 
                ? 'border-primary-400 bg-primary-50' 
                : 'border-secondary-300 hover:border-primary-400'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <Upload className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              拖拽文件到此处或点击选择
            </h3>
            <p className="text-sm text-secondary-500 mb-4">
              支持 PDF、图片、Word文档、文本文件 (最大50MB)
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt"
              onChange={onFileSelect}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="btn-primary cursor-pointer inline-flex items-center gap-2"
            >
              <File className="h-4 w-4" />
              选择文件
            </label>
          </div>

          {/* 文件列表 */}
          {uploadFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-secondary-900">
                文件列表 ({uploadFiles.length})
              </h3>
              
              {uploadFiles.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className="flex items-center gap-3 p-4 border border-secondary-200 rounded-lg"
                >
                  <span className="text-2xl">{getFileIcon(uploadFile.file)}</span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="mb-2">
                      <p className="text-xs text-secondary-500 mb-1">文件名: {uploadFile.file.name}</p>
                      <input
                        type="text"
                        value={uploadFile.title}
                        onChange={(e) => updateFileTitle(uploadFile.id, e.target.value)}
                        placeholder="输入文档标题..."
                        disabled={uploadFile.status === 'uploading' || uploadFile.status === 'success'}
                        className="w-full px-2 py-1 text-sm border border-secondary-300 rounded focus:outline-none focus:border-primary-500 disabled:bg-secondary-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <p className="text-sm text-secondary-500">
                      {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    
                    {/* 进度条 */}
                    {uploadFile.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-secondary-500 mb-1">
                          <span>上传中...</span>
                          <span>{uploadFile.progress}%</span>
                        </div>
                        <div className="w-full bg-secondary-200 rounded-full h-1.5">
                          <div
                            className="bg-primary-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${uploadFile.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* 错误信息 */}
                    {uploadFile.status === 'error' && (
                      <p className="text-sm text-red-600 mt-1">
                        {uploadFile.error}
                      </p>
                    )}
                  </div>

                  {/* 状态图标 */}
                  <div className="flex items-center gap-2">
                    {uploadFile.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {uploadFile.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    
                    <button
                      onClick={() => removeFile(uploadFile.id)}
                      className="p-1 hover:bg-red-50 rounded text-secondary-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex gap-3 p-6 border-t border-secondary-200">
          <button onClick={onClose} className="btn-secondary flex-1">
            {allCompleted ? '完成' : '取消'}
          </button>
          
          {!allCompleted && (
            <button
              onClick={startUpload}
              disabled={uploadFiles.filter(f => f.status === 'pending').length === 0}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              开始上传 ({uploadFiles.filter(f => f.status === 'pending').length})
            </button>
          )}
          
          {allCompleted && hasSuccess && (
            <button
              onClick={() => {
                onUploadSuccess()
                onClose()
              }}
              className="btn-primary flex-1"
            >
              刷新文档列表
            </button>
          )}
        </div>
      </div>
    </div>
  )
}