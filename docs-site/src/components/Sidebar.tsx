'use client'

import { Menu } from 'antd'
import { FileTextOutlined, FolderOutlined, HomeOutlined } from '@ant-design/icons'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import type { MenuProps } from 'antd'

// 文档结构配置（硬编码以支持静态导出）
const docsStructure = {
  categories: [
    {
      key: '技术选型',
      label: '技术选型',
      icon: <FolderOutlined />,
      children: [
        { key: '技术选型/dify-spring-ai-alibaba-guide', label: 'Dify & Spring AI Alibaba 指南' },
        { key: '技术选型/docker-kubernetes-guide', label: 'Docker & Kubernetes 指南' },
        { key: '技术选型/langfuse-promptfoo-guide', label: 'LangFuse & Promptfoo 指南' },
        { key: '技术选型/nextjs-ant-design-x-guide', label: 'Next.js & Ant Design X 指南' },
        { key: '技术选型/ollama-vllm-guide', label: 'Ollama & vLLM 指南' },
        { key: '技术选型/postgresql-milvus-guide', label: 'PostgreSQL & Milvus 指南' },
        { key: '技术选型/spring-ai-langchain-guide', label: 'Spring AI & LangChain 指南' },
        { key: '技术选型/unstructured-etl-guide', label: 'Unstructured ETL 指南' },
        { key: '技术选型/vscode-copilot-cursor-guide', label: 'VS Code Copilot & Cursor 指南' },
      ],
    },
    {
      key: '开发计划',
      label: '开发计划',
      icon: <FolderOutlined />,
      children: [
        { key: '开发计划/backend-development-plan', label: '后端开发计划' },
        {
          key: '开发计划/服务设计',
          label: '服务设计',
          icon: <FolderOutlined />,
          children: [
            { key: '开发计划/服务设计/01-data-service-design', label: '01 数据服务设计' },
            { key: '开发计划/服务设计/02-inference-service-design', label: '02 推理服务设计' },
            { key: '开发计划/服务设计/03-ai-core-service-design', label: '03 AI 核心服务设计' },
            { key: '开发计划/服务设计/04-rag-service-design', label: '04 RAG 服务设计' },
            { key: '开发计划/服务设计/05-etl-service-design', label: '05 ETL 服务设计' },
            { key: '开发计划/服务设计/06-dify-service-design', label: '06 Dify 服务设计' },
            { key: '开发计划/服务设计/07-observability-service-design', label: '07 可观测性服务设计' },
          ],
        },
      ],
    },
  ],
}

// 转换为 Antd Menu items 格式
function buildMenuItems(items: any[]): MenuProps['items'] {
  return items.map((item) => {
    if (item.children) {
      return {
        key: item.key,
        label: item.label,
        icon: item.icon || <FolderOutlined />,
        children: buildMenuItems(item.children),
      }
    }
    return {
      key: item.key,
      label: <Link href={`/${item.key}`}>{item.label}</Link>,
      icon: <FileTextOutlined />,
    }
  })
}

export function Sidebar() {
  const pathname = usePathname()
  
  // 从路径中提取当前选中的 key
  const selectedKey = pathname.replace(/^\//, '').replace(/\/$/, '')
    
  const menuItems: MenuProps['items'] = [
    {
      key: 'home',
      label: <Link href="/">首页</Link>,
      icon: <HomeOutlined />,
    },
    ...(buildMenuItems(docsStructure.categories) ?? []),
  ]
  
  return (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey || 'home']}
      defaultOpenKeys={['技术选型', '开发计划', '开发计划/服务设计']}
      items={menuItems}
      className="sidebar-menu"
      style={{ 
        borderRight: 0,
        height: '100%',
        paddingTop: 16,
        paddingBottom: 16,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    />
  )
}
