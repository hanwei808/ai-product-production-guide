'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Typography } from 'antd'
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

// 获取所有标题的扁平列表（用于滚动检测）
function flattenTocItems(items: TocItem[]): TocItem[] {
  const result: TocItem[] = []
  items.forEach(item => {
    result.push(item)
    if (item.children) {
      result.push(...flattenTocItems(item.children))
    }
  })
  return result
}

export function TableOfContents({ className }: Readonly<TableOfContentsProps>) {
  const { theme } = useTheme()
  const pathname = usePathname()
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [visible, setVisible] = useState(false)
  const [activeKey, setActiveKey] = useState<string>('')
  const rafRef = useRef<number>(0)
  const flatItemsRef = useRef<TocItem[]>([])

  // 更新目录
  const updateTocIncremental = useCallback(() => {
    const headings = extractHeadings()
    if (headings.length > 0) {
      const tree = buildTocTree(headings)
      setTocItems(tree)
      flatItemsRef.current = flattenTocItems(tree)
      setVisible(true)
    }
  }, [])

  // 完全重置目录
  const resetToc = useCallback(() => {
    setTocItems([])
    setVisible(false)
    setActiveKey('')
    flatItemsRef.current = []
  }, [])

  // 路由变化时重置目录
  useEffect(() => {
    resetToc()
  }, [pathname, resetToc])

  // 监听 DOM 变化
  useEffect(() => {
    let throttleTimer: NodeJS.Timeout | null = null
    let isThrottled = false
    let pendingUpdate = false
    
    const handleMutation = () => {
      if (isThrottled) {
        pendingUpdate = true
        return
      }
      
      updateTocIncremental()
      isThrottled = true
      
      throttleTimer = setTimeout(() => {
        isThrottled = false
        if (pendingUpdate) {
          pendingUpdate = false
          updateTocIncremental()
        }
      }, 100)
    }

    const observer = new MutationObserver(handleMutation)

    const initTimer = setTimeout(() => {
      const article = document.querySelector('article')
      if (article) {
        updateTocIncremental()
        observer.observe(article, {
          childList: true,
          subtree: true,
          characterData: true,
        })
      }
    }, 50)

    return () => {
      clearTimeout(initTimer)
      if (throttleTimer) {
        clearTimeout(throttleTimer)
      }
      observer.disconnect()
    }
  }, [pathname, updateTocIncremental])

  // 使用 RAF 优化滚动监听
  useEffect(() => {
    if (!visible || flatItemsRef.current.length === 0) return

    const headerHeight = 88

    const updateActiveKey = () => {
      const items = flatItemsRef.current
      let currentActive = ''
      
      // 检查是否滚动到页面底部
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const isAtBottom = scrollTop + windowHeight >= documentHeight - 50 // 50px 容差
      
      // 如果滚动到底部，激活最后一个节点
      if (isAtBottom && items.length > 0) {
        currentActive = items[items.length - 1].key
      } else {
        // 正常逻辑：从后往前找第一个进入视口的标题
        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i]
          const element = document.getElementById(item.key)
          if (element) {
            const rect = element.getBoundingClientRect()
            if (rect.top <= headerHeight + 20) {
              currentActive = item.key
              break
            }
          }
        }
      }
      
      // 如果没有找到，选择第一个
      if (!currentActive && items.length > 0) {
        currentActive = items[0].key
      }
      
      setActiveKey(prev => prev !== currentActive ? currentActive : prev)
    }

    const handleScroll = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      rafRef.current = requestAnimationFrame(updateActiveKey)
    }

    // 初始化激活状态
    updateActiveKey()

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [visible, tocItems])

  // 处理点击
  const handleClick = useCallback((e: React.MouseEvent, key: string) => {
    e.preventDefault()
    const targetElement = document.getElementById(key)
    
    if (targetElement) {
      const headerHeight = 64
      const offset = 24
      const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight - offset
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      })
      
      history.pushState(null, '', `#${key}`)
      setActiveKey(key)
    }
  }, [])

  if (!visible || tocItems.length === 0) {
    return null
  }

  // 渲染目录项
  const renderItems = (items: TocItem[], level = 0) => {
    return items.map((item) => {
      const isActive = activeKey === item.key
      return (
        <div key={item.key} style={{ paddingLeft: level * 12 }}>
          <a
            href={item.href}
            onClick={(e) => handleClick(e, item.key)}
            className={`toc-link ${isActive ? 'toc-link-active' : ''}`}
            style={{
              display: 'block',
              padding: '4px 8px',
              marginBottom: 2,
              fontSize: 13,
              lineHeight: 1.5,
              textDecoration: 'none',
              borderRadius: 4,
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.2s ease',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              // 选中状态渐变效果
              background: isActive 
                ? (theme === 'light' 
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)' 
                    : 'linear-gradient(135deg, rgba(96, 165, 250, 0.2) 0%, rgba(167, 139, 250, 0.2) 100%)')
                : 'transparent',
              // 选中状态文字渐变
              ...(isActive ? {
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundImage: theme === 'light'
                  ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                  : 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
              } : {
                color: theme === 'light' ? '#64748b' : '#94a3b8',
              }),
            }}
          >
            <span style={isActive ? {
              background: theme === 'light'
                ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                : 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            } : undefined}>
              {item.title}
            </span>
          </a>
          {item.children && item.children.length > 0 && renderItems(item.children, level + 1)}
        </div>
      )
    })
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
      <nav style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        {renderItems(tocItems)}
      </nav>
    </div>
  )
}
