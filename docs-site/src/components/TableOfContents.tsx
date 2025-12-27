'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Anchor, Typography } from 'antd'
import { useTheme } from '@/lib/ThemeContext'

const { Title } = Typography

interface TocItem {
  key: string
  href: string
  title: string
  level: number
  children?: TocItem[]
}

interface TableOfContentsProps {
  readonly className?: string
}

// 从页面中提取标题
function extractHeadings(): TocItem[] {
  const headings: TocItem[] = []
  const article = document.querySelector('article')
  if (!article) return headings

  const headingElements = article.querySelectorAll('h1, h2, h3, h4')
  
  headingElements.forEach((heading, index) => {
    const text = heading.textContent || ''
    const level = Number.parseInt(heading.tagName[1])
    
    // 生成 ID（如果没有的话）
    let id = heading.id
    if (!id) {
      id = `heading-${index}-${text.replaceAll(/\s+/g, '-').toLowerCase()}`
      heading.id = id
    }
    
    headings.push({
      key: id,
      href: `#${id}`,
      title: text,
      level,
    })
  })

  return headings
}

// 将扁平的标题列表转换为树形结构
function buildTocTree(headings: TocItem[]): TocItem[] {
  if (headings.length === 0) return []

  const result: TocItem[] = []
  const stack: { item: TocItem; level: number }[] = []

  headings.forEach((heading) => {
    const newItem: TocItem = { ...heading, children: [] }

    while (stack.length > 0 && stack.at(-1)!.level >= heading.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      result.push(newItem)
    } else {
      const parent = stack.at(-1)!.item
      parent.children ??= []
      parent.children.push(newItem)
    }

    stack.push({ item: newItem, level: heading.level })
  })

  return result
}

// 转换为 Anchor 组件需要的格式
function toAnchorItems(items: TocItem[]): any[] {
  return items.map((item) => ({
    key: item.key,
    href: item.href,
    title: item.title,
    children: item.children && item.children.length > 0 
      ? toAnchorItems(item.children) 
      : undefined,
  }))
}

export function TableOfContents({ className }: Readonly<TableOfContentsProps>) {
  const { theme } = useTheme()
  const pathname = usePathname()
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [visible, setVisible] = useState(false)
  const [container, setContainer] = useState<HTMLElement | Window | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // 更新目录（不清空现有内容，适用于流式加载）
  const updateTocIncremental = useCallback(() => {
    const headings = extractHeadings()
    if (headings.length > 0) {
      const tree = buildTocTree(headings)
      setTocItems(tree)
      setVisible(true)
    }
  }, [])

  // 完全重置目录（页面切换时使用）
  const resetToc = useCallback(() => {
    setTocItems([])
    setVisible(false)
    setIsInitialLoad(true)
  }, [])

  useEffect(() => {
    // 获取滚动容器
    const contentContainer = document.querySelector('.app-content') as HTMLElement
    if (contentContainer) {
      setContainer(contentContainer)
    }
  }, [])

  // 路由变化时重置目录
  useEffect(() => {
    resetToc()
  }, [pathname, resetToc])

  // 监听 DOM 变化，流式加载时渐进式更新目录
  useEffect(() => {
    let throttleTimer: NodeJS.Timeout | null = null
    let isThrottled = false
    let pendingUpdate = false
    
    const handleMutation = () => {
      // 使用节流处理，保证流式加载时定期更新
      if (isThrottled) {
        pendingUpdate = true
        return
      }
      
      updateTocIncremental()
      setIsInitialLoad(false)
      isThrottled = true
      
      throttleTimer = setTimeout(() => {
        isThrottled = false
        if (pendingUpdate) {
          pendingUpdate = false
          updateTocIncremental()
        }
      }, 100) // 每 100ms 最多更新一次
    }

    const observer = new MutationObserver(handleMutation)

    // 立即开始观察，不等待
    const initTimer = setTimeout(() => {
      const article = document.querySelector('article')
      if (article) {
        // 先执行一次更新
        updateTocIncremental()
        setIsInitialLoad(false)
        
        observer.observe(article, {
          childList: true,
          subtree: true,
          characterData: true,
        })
      }
    }, 50) // 缩短初始延迟

    return () => {
      clearTimeout(initTimer)
      if (throttleTimer) {
        clearTimeout(throttleTimer)
      }
      observer.disconnect()
    }
  }, [pathname, updateTocIncremental])

  if (!visible || tocItems.length === 0) {
    return null
  }

  const anchorItems = toAnchorItems(tocItems)

  // 获取内容滚动容器
  const getContainer = () => {
    return container || document.querySelector('.app-content') as HTMLElement || globalThis
  }

  return (
    <div 
      className={`toc-container ${className || ''}`}
      style={{
        padding: '16px',
        background: theme === 'light' 
          ? 'rgba(255, 255, 255, 0.6)' 
          : 'rgba(30, 41, 59, 0.6)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderRadius: 'var(--radius-lg, 8px)',
        border: theme === 'light'
          ? '1px solid rgba(255, 255, 255, 0.8)'
          : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: theme === 'light'
          ? '0 4px 20px rgba(0, 0, 0, 0.05)'
          : '0 4px 20px rgba(0, 0, 0, 0.2)',
      }}
    >
      <Title 
        level={5} 
        style={{ 
          marginBottom: 12,
          fontSize: 14,
          fontWeight: 600,
          color: theme === 'light' ? '#64748b' : '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        目录
      </Title>
      <Anchor
        affix={false}
        getContainer={getContainer}
        targetOffset={100}
        items={anchorItems}
        style={{
          background: 'transparent',
        }}
      />
    </div>
  )
}
