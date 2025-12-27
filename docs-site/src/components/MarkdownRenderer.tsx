'use client'

import { useEffect, useState, useRef } from 'react'
import { XMarkdown } from '@ant-design/x-markdown'
import { Spin } from 'antd'

interface MarkdownRendererProps {
  content: string
  streaming?: boolean
  streamingSpeed?: number // 每次添加的字符数
}

export function MarkdownRenderer({ 
  content, 
  streaming = true,
  streamingSpeed = 20 
}: MarkdownRendererProps) {
  const [displayContent, setDisplayContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(streaming)
  const contentRef = useRef(content)
  const indexRef = useRef(0)
  
  useEffect(() => {
    // 如果内容变化，重置状态
    if (content !== contentRef.current) {
      contentRef.current = content
      indexRef.current = 0
      setDisplayContent('')
      setIsStreaming(streaming)
    }
    
    if (!streaming) {
      setDisplayContent(content)
      return
    }
    
    // 流式渲染效果
    const timer = setInterval(() => {
      if (indexRef.current < content.length) {
        const nextIndex = Math.min(indexRef.current + streamingSpeed, content.length)
        setDisplayContent(content.slice(0, nextIndex))
        indexRef.current = nextIndex
      } else {
        setIsStreaming(false)
        clearInterval(timer)
      }
    }, 16) // ~60fps
    
    return () => clearInterval(timer)
  }, [content, streaming, streamingSpeed])
  
  if (!displayContent && isStreaming) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }
  
  return (
    <div className={`markdown-body ${isStreaming ? 'streaming-cursor' : ''}`}>
      <XMarkdown>
        {displayContent}
      </XMarkdown>
    </div>
  )
}
