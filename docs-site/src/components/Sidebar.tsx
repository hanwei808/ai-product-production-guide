'use client'

import { Menu } from 'antd'
import { FileTextOutlined, FolderOutlined, HomeOutlined } from '@ant-design/icons'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useMemo } from 'react'
import type { MenuProps } from 'antd'

// 从构建时生成的 JSON 文件导入文档结构
import docsStructure from '@/lib/docs-structure.json'

// 转换为 Antd Menu items 格式
function buildMenuItems(items: any[], onItemClick?: () => void): MenuProps['items'] {
  return items.map((item) => {
    if (item.children) {
      return {
        key: item.key,
        label: item.label,
        icon: item.icon || <FolderOutlined />,
        children: buildMenuItems(item.children, onItemClick),
      }
    }
    return {
      key: item.key,
      label: (
        <Link href={`/${item.key}`} onClick={onItemClick}>
          {item.label}
        </Link>
      ),
      icon: <FileTextOutlined />,
    }
  })
}

// 根据当前选中的 key 计算需要展开的父级菜单 keys
function getOpenKeys(selectedKey: string, categories: any[]): string[] {
  const openKeys: string[] = []
  
  function findParentKeys(items: any[], parentKeys: string[] = []): boolean {
    for (const item of items) {
      if (item.key === selectedKey) {
        openKeys.push(...parentKeys)
        return true
      }
      if (item.children) {
        const newParentKeys = [...parentKeys, item.key]
        if (findParentKeys(item.children, newParentKeys)) {
          return true
        }
      }
    }
    return false
  }
  
  findParentKeys(categories)
  return openKeys
}

interface SidebarProps {
  collapsed?: boolean
  onItemClick?: () => void
}

export function Sidebar({ collapsed, onItemClick }: SidebarProps) {
  const pathname = usePathname()
  
  // 从路径中提取当前选中的 key（需要解码 URL 编码的中文字符）
  const selectedKey = useMemo(() => {
    try {
      return decodeURIComponent(pathname).replace(/^\//, '').replace(/\/$/, '')
    } catch {
      return pathname.replace(/^\//, '').replace(/\/$/, '')
    }
  }, [pathname])
  
  // 根据当前选中的 key 计算需要展开的父级菜单
  const openKeys = useMemo(() => {
    if (collapsed) return []
    return getOpenKeys(selectedKey, docsStructure.categories)
  }, [selectedKey, collapsed])
    
  const menuItems: MenuProps['items'] = [
    {
      key: 'home',
      label: <Link href="/" onClick={onItemClick}>首页</Link>,
      icon: <HomeOutlined />,
    },
    ...(buildMenuItems(docsStructure.categories, onItemClick) ?? []),
  ]
  
  return (
    <Menu
      mode="inline"
      inlineCollapsed={collapsed}
      selectedKeys={[selectedKey || 'home']}
      defaultOpenKeys={openKeys}
      items={menuItems}
      className="sidebar-menu"
      style={{ 
        borderRight: 0,
        height: '100%',
        paddingTop: 16,
        paddingBottom: 16,
        paddingRight: 10,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    />
  )
}
