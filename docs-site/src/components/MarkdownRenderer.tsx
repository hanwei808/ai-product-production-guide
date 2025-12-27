'use client'

import React, { useEffect, useState, useRef } from 'react'
import { XMarkdown, type ComponentProps } from '@ant-design/x-markdown'
import Latex from '@ant-design/x-markdown/plugins/Latex'
import { Mermaid, CodeHighlighter, Think, Sources } from '@ant-design/x'
import { Spin, Skeleton } from 'antd'
import { Line, Column, Pie, Area, Scatter } from '@antv/gpt-vis'

// Sources 来源数据项接口
interface SourcesItem {
  key?: React.Key
  title: React.ReactNode
  url?: string
  icon?: React.ReactNode
  description?: React.ReactNode
}

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

// Think 思考过程组件 - 用于展示 AI 深度思考过程
const ThinkComponent: React.FC<ComponentProps> = React.memo((props) => {
  const { children, streamStatus } = props
  const [title, setTitle] = useState('正在思考中...')
  const [loading, setLoading] = useState(true)
  const [expand, setExpand] = useState(true)

  useEffect(() => {
    if (streamStatus === 'done') {
      setTitle('思考完成')
      setLoading(false)
      setExpand(false)
    }
  }, [streamStatus])

  if (typeof children !== 'string') {
    return null
  }

  return (
    <div style={{ padding: '12px 0' }}>
      <Think 
        title={title} 
        loading={loading} 
        expanded={expand} 
        onExpand={(value) => setExpand(value)}
      >
        {children.trim()}
      </Think>
    </div>
  )
})

ThinkComponent.displayName = 'ThinkComponent'

// Sources 来源引用组件 - 用于展示引用的数据来源地址（块级模式）
const SourcesComponent: React.FC<ComponentProps> = React.memo((props) => {
  const { children, streamStatus } = props

  if (typeof children !== 'string') {
    return null
  }

  try {
    const data = JSON.parse(children) as {
      title?: string
      items: SourcesItem[]
      expandIconPosition?: 'start' | 'end'
      defaultExpanded?: boolean
    }

    if (streamStatus === 'loading') {
      return <Skeleton active paragraph={{ rows: 2 }} />
    }

    return (
      <div style={{ padding: '12px 0' }}>
        <Sources
          title={data.title || `使用了 ${data.items?.length || 0} 个来源`}
          items={data.items || []}
          expandIconPosition={data.expandIconPosition || 'start'}
          defaultExpanded={data.defaultExpanded !== false}
          onClick={(item) => {
            if (item.url) {
              window.open(item.url, '_blank', 'noopener,noreferrer')
            }
          }}
        />
      </div>
    )
  } catch {
    return <div>来源数据解析错误</div>
  }
})

SourcesComponent.displayName = 'SourcesComponent'

// Sources 行内引用组件 - 用于在文本中嵌入来源引用标记
const SourcesInline: React.FC<ComponentProps> = React.memo((props) => {
  const { children } = props

  if (typeof children !== 'string') {
    return null
  }

  try {
    const data = JSON.parse(children) as {
      activeKey?: React.Key
      items: SourcesItem[]
      popoverOverlayWidth?: number | string
    }

    return (
      <Sources
        activeKey={data.activeKey}
        title={String(data.activeKey || '')}
        items={data.items || []}
        inline={true}
        popoverOverlayWidth={data.popoverOverlayWidth || 300}
      />
    )
  } catch {
    // 如果解析失败，可能是简单的引用标记
    return (
      <sup style={{ 
        color: '#1890ff', 
        cursor: 'pointer',
        fontWeight: 500 
      }}>
        [{children}]
      </sup>
    )
  }
})

SourcesInline.displayName = 'SourcesInline'

// 上标引用组件 - 用于配合 Sources 渲染来源引用（sup 标签）
const SupComponent: React.FC<ComponentProps & { sourcesData?: SourcesItem[] }> = React.memo((props) => {
  const { children, sourcesData } = props

  // 如果没有 sourcesData，使用默认的示例数据
  const defaultItems: SourcesItem[] = [
    {
      title: '1. 数据来源',
      key: 1,
      url: '#',
      description: '这是一个引用来源的描述信息。',
    },
    {
      title: '2. 数据来源',
      key: 2,
      url: '#',
    },
    {
      title: '3. 数据来源',
      key: 3,
      url: '#',
    },
  ]

  const items = sourcesData || defaultItems
  const childrenStr = typeof children === 'string' ? children : String(children ?? '0')
  const activeKey = Number.parseInt(childrenStr, 10)

  return (
    <Sources
      activeKey={activeKey}
      title={childrenStr}
      items={items}
      inline={true}
    />
  )
})

SupComponent.displayName = 'SupComponent'

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
          think: ThinkComponent,
          sources: SourcesComponent,
          'sources-inline': SourcesInline,
          sup: SupComponent,
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
