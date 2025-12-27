'use client'

import React, { useEffect, useState, useRef } from 'react'
import { XMarkdown, type ComponentProps } from '@ant-design/x-markdown'
import Latex from '@ant-design/x-markdown/plugins/Latex'
import { Mermaid, CodeHighlighter } from '@ant-design/x'
import { Spin, Skeleton } from 'antd'
import { Line, Column, Pie, Area, Scatter } from '@antv/gpt-vis'

interface MarkdownRendererProps {
  content: string
  streaming?: boolean
  streamingSpeed?: number // 每次添加的字符数
}

// 自定义代码组件，用于处理 mermaid 图表和代码高亮
const Code: React.FC<ComponentProps> = React.memo((props) => {
  const { className, children } = props
  const lang = className?.match(/language-(\w+)/)?.[1] || ''

  if (typeof children !== 'string') return null
  
  // 如果是 mermaid 代码块，使用 Mermaid 组件渲染
  if (lang === 'mermaid') {
    return <Mermaid>{children}</Mermaid>
  }
  
  // 其他代码块使用 CodeHighlighter 组件渲染，实现语法高亮
  return <CodeHighlighter lang={lang}>{children}</CodeHighlighter>
})

Code.displayName = 'Code'

// 自定义表格组件，添加水平滚动容器
const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = React.memo((props) => {
  return (
    <div className="table-wrapper">
      <table {...props} />
    </div>
  )
})

Table.displayName = 'Table'

// GPT-VIS 图表组件 - 折线图
const CustomLine: React.FC<ComponentProps & { axisXTitle?: string; axisYTitle?: string }> = React.memo((props) => {
  const { children, axisXTitle, axisYTitle, streamStatus } = props

  if (streamStatus === 'loading') {
    return <Skeleton.Image active style={{ width: '100%', height: 300 }} />
  }

  if (typeof children !== 'string') return null

  try {
    const data = JSON.parse(children)
    return <Line data={data} axisXTitle={axisXTitle} axisYTitle={axisYTitle} />
  } catch {
    return <div>图表数据解析错误</div>
  }
})

CustomLine.displayName = 'CustomLine'

// GPT-VIS 图表组件 - 柱状图
const CustomColumn: React.FC<ComponentProps & { axisXTitle?: string; axisYTitle?: string }> = React.memo((props) => {
  const { children, axisXTitle, axisYTitle, streamStatus } = props

  if (streamStatus === 'loading') {
    return <Skeleton.Image active style={{ width: '100%', height: 300 }} />
  }

  if (typeof children !== 'string') return null

  try {
    const data = JSON.parse(children)
    return <Column data={data} axisXTitle={axisXTitle} axisYTitle={axisYTitle} />
  } catch {
    return <div>图表数据解析错误</div>
  }
})

CustomColumn.displayName = 'CustomColumn'

// GPT-VIS 图表组件 - 饼图
const CustomPie: React.FC<ComponentProps> = React.memo((props) => {
  const { children, streamStatus } = props

  if (streamStatus === 'loading') {
    return <Skeleton.Image active style={{ width: '100%', height: 300 }} />
  }

  if (typeof children !== 'string') return null

  try {
    const data = JSON.parse(children)
    return <Pie data={data} />
  } catch {
    return <div>图表数据解析错误</div>
  }
})

CustomPie.displayName = 'CustomPie'

// GPT-VIS 图表组件 - 面积图
const CustomArea: React.FC<ComponentProps & { axisXTitle?: string; axisYTitle?: string }> = React.memo((props) => {
  const { children, axisXTitle, axisYTitle, streamStatus } = props

  if (streamStatus === 'loading') {
    return <Skeleton.Image active style={{ width: '100%', height: 300 }} />
  }

  if (typeof children !== 'string') return null

  try {
    const data = JSON.parse(children)
    return <Area data={data} axisXTitle={axisXTitle} axisYTitle={axisYTitle} />
  } catch {
    return <div>图表数据解析错误</div>
  }
})

CustomArea.displayName = 'CustomArea'

// GPT-VIS 图表组件 - 散点图
const CustomScatter: React.FC<ComponentProps & { axisXTitle?: string; axisYTitle?: string }> = React.memo((props) => {
  const { children, axisXTitle, axisYTitle, streamStatus } = props

  if (streamStatus === 'loading') {
    return <Skeleton.Image active style={{ width: '100%', height: 300 }} />
  }

  if (typeof children !== 'string') return null

  try {
    const data = JSON.parse(children)
    return <Scatter data={data} axisXTitle={axisXTitle} axisYTitle={axisYTitle} />
  } catch {
    return <div>图表数据解析错误</div>
  }
})

CustomScatter.displayName = 'CustomScatter'

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
        config={{ extensions: Latex() }}
        components={{ 
          code: Code, 
          table: Table,
          'custom-line': CustomLine,
          'custom-column': CustomColumn,
          'custom-pie': CustomPie,
          'custom-area': CustomArea,
          'custom-scatter': CustomScatter,
        }}
        paragraphTag="div"
        streaming={{ hasNextChunk: isStreaming }}
      >
        {displayContent}
      </XMarkdown>
    </div>
  )
}
