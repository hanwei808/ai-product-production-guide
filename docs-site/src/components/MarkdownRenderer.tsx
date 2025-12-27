'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { XMarkdown, type ComponentProps } from '@ant-design/x-markdown'
import Latex from '@ant-design/x-markdown/plugins/Latex'
import { Mermaid, CodeHighlighter, Think, Sources } from '@ant-design/x'
import { Spin, Skeleton, Typography, Modal, Button, Tooltip, Image } from 'antd'
import { Line, Column, Pie, Area, Scatter } from '@antv/gpt-vis'
import { 
  LoadingOutlined, 
  FileImageOutlined, 
  LinkOutlined, 
  TableOutlined, 
  CodeOutlined,
  ExpandOutlined
} from '@ant-design/icons'

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
  enableAnimation?: boolean // 启用文本淡入动画
  animationConfig?: {
    fadeDuration?: number // 淡入动画持续时间（毫秒）
    easing?: string // 动画缓动函数
  }
}

// ============ 全屏查看组件 ============

interface FullscreenWrapperProps {
  children: React.ReactNode
  title?: string
  modalWidth?: string | number
  showButton?: boolean
}

// 全屏查看容器组件
const FullscreenWrapper: React.FC<FullscreenWrapperProps> = React.memo(({ 
  children, 
  title = '全屏查看',
  modalWidth = '90vw',
  showButton = true
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 全屏模式下的内容，添加高度自适应样式
  const fullscreenContent = (
    <div 
      className="fullscreen-content markdown-body"
      style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ 
        flex: 1, 
        minHeight: 0,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<{ style?: React.CSSProperties }>, {
              style: {
                ...(child.props as { style?: React.CSSProperties }).style,
                height: '100%',
                minHeight: 0,
                flex: 1
              }
            })
          }
          return child
        })}
      </div>
    </div>
  )

  return (
    <>
      <div className="fullscreen-wrapper">
        {showButton && (
          <div 
            className="fullscreen-toolbar"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '4px 0',
              marginBottom: 4
            }}
          >
            <Tooltip title="全屏查看">
              <Button
                type="text"
                size="small"
                icon={<ExpandOutlined />}
                onClick={() => setIsFullscreen(true)}
                style={{
                  background: 'var(--ant-color-fill-tertiary)',
                  color: 'var(--ant-color-text-secondary)',
                  borderRadius: 4
                }}
              >
                全屏
              </Button>
            </Tooltip>
          </div>
        )}
        {children}
      </div>
      <Modal
        title={title}
        open={isFullscreen}
        onCancel={() => setIsFullscreen(false)}
        footer={null}
        width={modalWidth}
        centered
        styles={{
          body: { 
            height: 'calc(90vh - 110px)',
            overflow: 'hidden',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        {fullscreenContent}
      </Modal>
    </>
  )
})

FullscreenWrapper.displayName = 'FullscreenWrapper'

// 自定义代码组件，用于处理 mermaid 图表和代码高亮
const Code: React.FC<ComponentProps> = React.memo((props) => {
  const { className, children } = props
  const lang = className?.match(/language-(\w+)/)?.[1] || ''

  if (typeof children !== 'string') return null
  
  // 判断是否是行内代码（没有 className 或内容不包含换行符且长度较短）
  const isInlineCode = !className && !children.includes('\n') && children.length < 100
  
  // 行内代码不添加全屏功能，直接使用 code 标签渲染
  if (isInlineCode) {
    return <code className="inline-code">{children}</code>
  }
  
  // 如果是 mermaid 代码块，使用 Mermaid 组件渲染，并添加全屏功能
  if (lang === 'mermaid') {
    return (
      <FullscreenWrapper title="Mermaid 图表" modalWidth="95vw">
        <Mermaid>{children}</Mermaid>
      </FullscreenWrapper>
    )
  }
  
  // 其他代码块使用 CodeHighlighter 组件渲染，实现语法高亮，并添加全屏功能
  return (
    <FullscreenWrapper title={`代码 - ${lang || '纯文本'}`} modalWidth="90vw">
      <CodeHighlighter lang={lang}>{children}</CodeHighlighter>
    </FullscreenWrapper>
  )
})

Code.displayName = 'Code'

// 自定义表格组件，添加水平滚动容器和全屏功能
const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = React.memo((props) => {
  return (
    <FullscreenWrapper title="表格" modalWidth="95vw">
      <div className="table-wrapper">
        <table {...props} />
      </div>
    </FullscreenWrapper>
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
    return (
      <FullscreenWrapper title="折线图" modalWidth="90vw">
        <Line data={data} axisXTitle={axisXTitle} axisYTitle={axisYTitle} />
      </FullscreenWrapper>
    )
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
    return (
      <FullscreenWrapper title="柱状图" modalWidth="90vw">
        <Column data={data} axisXTitle={axisXTitle} axisYTitle={axisYTitle} />
      </FullscreenWrapper>
    )
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
    return (
      <FullscreenWrapper title="饼图" modalWidth="80vw">
        <Pie data={data} />
      </FullscreenWrapper>
    )
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
    return (
      <FullscreenWrapper title="面积图" modalWidth="90vw">
        <Area data={data} axisXTitle={axisXTitle} axisYTitle={axisYTitle} />
      </FullscreenWrapper>
    )
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
    return (
      <FullscreenWrapper title="散点图" modalWidth="90vw">
        <Scatter data={data} axisXTitle={axisXTitle} axisYTitle={axisYTitle} />
      </FullscreenWrapper>
    )
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

// ============ 不完整语法处理组件 ============

// 不完整链接组件 - 用于处理流式输出中未闭合的链接语法
const IncompleteLink: React.FC<ComponentProps> = React.memo((props) => {
  const rawText = String(props['data-raw'] || '')
  
  // 提取链接文本，格式为 [text](url)
  const linkTextMatch = rawText.match(/^\[([^\]]*)\]?/)
  const displayText = linkTextMatch ? linkTextMatch[1] : rawText.slice(1)
  
  return (
    <Typography.Text type="secondary" style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: 4,
      opacity: 0.7 
    }}>
      <LinkOutlined spin />
      {displayText || '加载链接中...'}
    </Typography.Text>
  )
})

IncompleteLink.displayName = 'IncompleteLink'

// 不完整图片组件 - 用于处理流式输出中未闭合的图片语法
const IncompleteImage: React.FC<ComponentProps> = React.memo((props) => {
  const rawText = String(props['data-raw'] || '')
  
  // 提取图片 alt 文本，格式为 ![alt](src)
  const altMatch = rawText.match(/^!\[([^\]]*)\]?/)
  const altText = altMatch ? altMatch[1] : ''
  
  return (
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '16px 24px',
      background: 'var(--ant-color-fill-tertiary)',
      borderRadius: 8,
      border: '1px dashed var(--ant-color-border)',
      gap: 8,
      minWidth: 120
    }}>
      <FileImageOutlined style={{ fontSize: 20, color: 'var(--ant-color-text-secondary)' }} />
      <Typography.Text type="secondary">
        {altText || '图片加载中...'}
      </Typography.Text>
      <LoadingOutlined />
    </div>
  )
})

IncompleteImage.displayName = 'IncompleteImage'

// 不完整标题组件 - 用于处理流式输出中未闭合的标题语法
const IncompleteHeading: React.FC<ComponentProps> = React.memo((props) => {
  const rawText = String(props['data-raw'] || '')
  
  // 计算标题级别
  const headingMatch = rawText.match(/^(#{1,6})\s*(.*)/)
  const level = headingMatch ? headingMatch[1].length : 1
  const text = headingMatch ? headingMatch[2] : ''
  
  const fontSize = {
    1: 32, 2: 28, 3: 24, 4: 20, 5: 16, 6: 14
  }[level] || 24
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 8,
      fontSize,
      fontWeight: 600,
      color: 'var(--ant-color-text)',
      opacity: 0.7,
      margin: '16px 0 8px'
    }}>
      {text}
      <LoadingOutlined style={{ fontSize: 14 }} />
    </div>
  )
})

IncompleteHeading.displayName = 'IncompleteHeading'

// 不完整强调组件 - 用于处理流式输出中未闭合的强调语法（粗体/斜体）
const IncompleteEmphasis: React.FC<ComponentProps> = React.memo((props) => {
  const rawText = String(props['data-raw'] || '')
  
  // 判断是粗体还是斜体
  const isBold = rawText.startsWith('**') || rawText.startsWith('__')
  const text = rawText.replace(/^(\*{1,2}|_{1,2})/, '')
  
  return (
    <span style={{ 
      fontWeight: isBold ? 600 : 400,
      fontStyle: isBold ? 'normal' : 'italic',
      opacity: 0.8
    }}>
      {text}
      <LoadingOutlined style={{ fontSize: 12, marginLeft: 4 }} />
    </span>
  )
})

IncompleteEmphasis.displayName = 'IncompleteEmphasis'

// 不完整表格组件 - 用于处理流式输出中未闭合的表格语法
const IncompleteTable: React.FC<ComponentProps> = React.memo((props) => {
  const rawText = String(props['data-raw'] || '')
  
  return (
    <div style={{ 
      padding: '16px',
      background: 'var(--ant-color-fill-quaternary)',
      borderRadius: 8,
      border: '1px dashed var(--ant-color-border)',
      margin: '12px 0'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8,
        color: 'var(--ant-color-text-secondary)'
      }}>
        <TableOutlined />
        <Typography.Text type="secondary">表格加载中...</Typography.Text>
        <LoadingOutlined />
      </div>
      {rawText && (
        <pre style={{ 
          marginTop: 8, 
          fontSize: 12, 
          opacity: 0.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {rawText}
        </pre>
      )}
    </div>
  )
})

IncompleteTable.displayName = 'IncompleteTable'

// 不完整列表组件 - 用于处理流式输出中未闭合的列表语法
const IncompleteList: React.FC<ComponentProps> = React.memo((props) => {
  const rawText = String(props['data-raw'] || '')
  
  // 提取列表内容
  const text = rawText.replace(/^[-+*]\s*/, '')
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'flex-start', 
      gap: 8,
      padding: '4px 0',
      opacity: 0.8
    }}>
      <span style={{ color: 'var(--ant-color-text-secondary)' }}>•</span>
      <span>{text}</span>
      <LoadingOutlined style={{ fontSize: 12 }} />
    </div>
  )
})

IncompleteList.displayName = 'IncompleteList'

// 不完整 XML/HTML 标签组件 - 用于处理流式输出中未闭合的 XML 标签
const IncompleteXml: React.FC<ComponentProps> = React.memo((props) => {
  const rawText = String(props['data-raw'] || '')
  
  return (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: 4,
      padding: '2px 6px',
      background: 'var(--ant-color-fill-tertiary)',
      borderRadius: 4,
      fontFamily: 'monospace',
      fontSize: 13,
      opacity: 0.7
    }}>
      <CodeOutlined />
      {rawText}
      <LoadingOutlined style={{ fontSize: 10 }} />
    </span>
  )
})

IncompleteXml.displayName = 'IncompleteXml'

// 不完整代码块加载占位组件
const IncompleteCodeLoading: React.FC = React.memo(() => {
  return (
    <div style={{ 
      padding: '16px',
      background: 'var(--ant-color-fill-quaternary)',
      borderRadius: 8,
      border: '1px dashed var(--ant-color-border)',
      margin: '12px 0'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8,
        color: 'var(--ant-color-text-secondary)'
      }}>
        <CodeOutlined />
        <Typography.Text type="secondary">代码块加载中...</Typography.Text>
        <LoadingOutlined />
      </div>
      <Skeleton active paragraph={{ rows: 3 }} style={{ marginTop: 12 }} />
    </div>
  )
})

IncompleteCodeLoading.displayName = 'IncompleteCodeLoading'

// 链接加载骨架屏组件
const LinkLoadingSkeleton: React.FC = React.memo(() => {
  return (
    <Skeleton.Button active size="small" style={{ width: 80, height: 18, verticalAlign: 'middle' }} />
  )
})

LinkLoadingSkeleton.displayName = 'LinkLoadingSkeleton'

// 图片加载骨架屏组件
const ImageLoadingSkeleton: React.FC = React.memo(() => {
  return <Skeleton.Image active style={{ width: 120, height: 80 }} />
})

ImageLoadingSkeleton.displayName = 'ImageLoadingSkeleton'

// 自定义图片组件 - 支持全屏预览
const CustomImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = React.memo((props) => {
  const { src, alt } = props
  
  // 如果 src 不是字符串，则不渲染
  if (typeof src !== 'string') return null
  
  return (
    <Image
      src={src}
      alt={alt}
      style={{ maxWidth: '100%', cursor: 'pointer' }}
      preview={{
        mask: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExpandOutlined />
            <span>全屏查看</span>
          </div>
        )
      }}
    />
  )
})

CustomImage.displayName = 'CustomImage'

export function MarkdownRenderer({ 
  content, 
  streaming = true,
  streamingSpeed = 20,
  enableAnimation = true,
  animationConfig = {
    fadeDuration: 200,
    easing: 'ease-in-out'
  }
}: MarkdownRendererProps) {
  const [displayContent, setDisplayContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(streaming)
  const contentRef = useRef(content)
  const indexRef = useRef(0)
  const isMountedRef = useRef(true) // 跟踪组件是否已挂载
  const rafIdRef = useRef<number | null>(null) // 保存 requestAnimationFrame ID
  const lastTimeRef = useRef<number>(0) // 上次更新时间
  
  // 清理函数 - 立即停止所有渲染工作
  const cleanup = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [])
  
  // 组件卸载时立即清理
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      cleanup()
    }
  }, [cleanup])
  
  useEffect(() => {
    // 如果内容变化，重置状态
    if (content !== contentRef.current) {
      contentRef.current = content
      indexRef.current = 0
      lastTimeRef.current = 0
      setDisplayContent('')
      setIsStreaming(streaming)
    }
    
    if (!streaming) {
      setDisplayContent(content)
      return
    }
    
    // 清理之前的动画帧
    cleanup()
    
    // 使用 requestAnimationFrame 进行流式渲染，更流畅且易于中断
    const animate = (currentTime: number) => {
      // 立即检查是否需要停止
      if (!isMountedRef.current) {
        return
      }
      
      // 控制更新频率，约 60fps
      if (currentTime - lastTimeRef.current >= 16) {
        lastTimeRef.current = currentTime
        
        if (indexRef.current < content.length) {
          const nextIndex = Math.min(indexRef.current + streamingSpeed, content.length)
          setDisplayContent(content.slice(0, nextIndex))
          indexRef.current = nextIndex
        } else {
          setIsStreaming(false)
          rafIdRef.current = null
          return
        }
      }
      
      // 继续下一帧
      if (isMountedRef.current && indexRef.current < content.length) {
        rafIdRef.current = requestAnimationFrame(animate)
      }
    }
    
    // 启动动画
    rafIdRef.current = requestAnimationFrame(animate)
    
    return cleanup
  }, [content, streaming, streamingSpeed, cleanup])
  
  if (!displayContent && isStreaming) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }
  
  return (
    <div className={`markdown-body ${isStreaming ? 'streaming-cursor' : ''}`} style={{ padding: '16px' }}>
      <XMarkdown 
        config={{ extensions: Latex() }}
        components={{ 
          code: Code, 
          table: Table,
          img: CustomImage,
          think: ThinkComponent,
          sources: SourcesComponent,
          'sources-inline': SourcesInline,
          sup: SupComponent,
          'custom-line': CustomLine,
          'custom-column': CustomColumn,
          'custom-pie': CustomPie,
          'custom-area': CustomArea,
          'custom-scatter': CustomScatter,
          // 不完整语法处理组件
          'incomplete-link': IncompleteLink,
          'incomplete-image': IncompleteImage,
          'incomplete-heading': IncompleteHeading,
          'incomplete-emphasis': IncompleteEmphasis,
          'incomplete-table': IncompleteTable,
          'incomplete-list': IncompleteList,
          'incomplete-xml': IncompleteXml,
          // 加载占位骨架屏组件
          'link-loading': LinkLoadingSkeleton,
          'image-loading': ImageLoadingSkeleton,
          'code-loading': IncompleteCodeLoading,
        }}
        paragraphTag="div"
        streaming={{ 
          hasNextChunk: isStreaming,
          enableAnimation: enableAnimation,
          animationConfig: animationConfig,
          // 不完整语法映射配置 - 将未闭合的语法转换为对应的加载组件
          // 支持的类型: link, image, html, emphasis, list, table
          incompleteMarkdownComponentMap: {
            link: 'link-loading',      // 未完成链接显示骨架屏
            image: 'image-loading',    // 未完成图片显示骨架屏
            table: 'incomplete-table', // 未完成表格显示加载状态
            emphasis: 'incomplete-emphasis', // 未完成强调显示加载状态
            list: 'incomplete-list',   // 未完成列表显示加载状态
            html: 'incomplete-xml',    // 未完成HTML标签显示加载状态
          }
        }}
      >
        {displayContent}
      </XMarkdown>
    </div>
  )
}
