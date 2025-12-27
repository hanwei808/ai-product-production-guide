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
  const containerRef = useRef<HTMLDivElement>(null)
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({})

  // 处理鼠标移动实现3D倾斜效果
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // 计算鼠标相对于中心点的偏移（-1 到 1）
    const offsetX = (e.clientX - centerX) / (rect.width / 2)
    const offsetY = (e.clientY - centerY) / (rect.height / 2)
    
    // 限制最大倾斜角度为 8 度
    const maxTilt = 8
    const rotateY = offsetX * maxTilt
    const rotateX = -offsetY * maxTilt
    
    // 计算光泽效果位置
    const glareX = 50 + offsetX * 30
    const glareY = 50 + offsetY * 30

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      // 添加动态高光
      backgroundImage: theme === 'light'
        ? `
          linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(245, 245, 250, 0.5) 100%),
          radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.4) 0%, transparent 60%)
        `
        : `
          linear-gradient(180deg, rgba(45, 45, 50, 0.6) 0%, rgba(30, 30, 35, 0.5) 100%),
          radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.1) 0%, transparent 60%)
        `,
    })
  }, [theme])

  // 鼠标离开时恢复原状
  const handleMouseLeave = useCallback(() => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      backgroundImage: theme === 'light'
        ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(245, 245, 250, 0.5) 100%)'
        : 'linear-gradient(180deg, rgba(45, 45, 50, 0.6) 0%, rgba(30, 30, 35, 0.5) 100%)',
    })
  }, [theme])
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

    const headerHeight = 108

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
      const offset = 44
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
      ref={containerRef}
      className={`toc-container ${className || ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        padding: '16px',
        // 苹果风格透明玻璃效果（与 Sidebar 一致）
        background: theme === 'light' 
          ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(245, 245, 250, 0.5) 100%)' 
          : 'linear-gradient(180deg, rgba(45, 45, 50, 0.6) 0%, rgba(30, 30, 35, 0.5) 100%)',
        backdropFilter: 'saturate(200%) blur(40px)',
        WebkitBackdropFilter: 'saturate(200%) blur(40px)',
        borderRadius: '12px',
        border: theme === 'light'
          ? '1px solid rgba(255, 255, 255, 0.6)'
          : '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: theme === 'light'
          ? '0 4px 30px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
          : '0 4px 30px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
        // 3D 倾斜效果
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
        willChange: 'transform',
        ...tiltStyle,
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
      <nav 
        className="toc-nav"
        style={{ 
          maxHeight: 'calc(100vh - 200px)', 
          overflowY: 'auto',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}
      >
        {renderItems(tocItems)}
      </nav>
    </div>
  )
}
