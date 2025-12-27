'use client'

import React, { useEffect, useState, useRef } from 'react'
import { XMarkdown, type ComponentProps } from '@ant-design/x-markdown'
import { Mermaid } from '@ant-design/x'
import { Spin } from 'antd'

interface MarkdownRendererProps {
  content: string
  streaming?: boolean
  streamingSpeed?: number // 每次添加的字符数
}

// 自定义代码组件，用于处理 mermaid 图表
const Code: React.FC<ComponentProps> = React.memo((props) => {
  const { className, children } = props
  const lang = className?.match(/language-(\w+)/)?.[1] || ''

  if (typeof children !== 'string') return null
  
  // 如果是 mermaid 代码块，使用 Mermaid 组件渲染
  if (lang === 'mermaid') {
    return <Mermaid>{children}</Mermaid>
  }
  
  // 其他代码块使用默认渲染
  return (
    <code className={className}>
      {children}
    </code>
  )
})

Code.displayName = 'Code'

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
    }, 64) // 调整流式渲染速度
    
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
      <XMarkdown 
        components={{ code: Code }}
        paragraphTag="div"
      >
        {displayContent}
      </XMarkdown>
    </div>
  )
}
