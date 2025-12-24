# AI 产品生产指南

本指南旨在提供一套完整的企业级 AI 产品开发、部署与运维的技术栈选型与最佳实践。涵盖了从开发环境、前后端框架、数据处理、模型服务到 LLMOps 的全链路解决方案。

## 🏗️ 全景架构图

```mermaid
graph TD
    subgraph "开发环境"
        Dev[VS Code / Cursor]
        Copilot[GitHub Copilot]
        Dev -.->|Agent 模式 / MCP| Copilot
    end

    subgraph "前端交互层"
        Next[Next.js 16.x]
        AntX["Ant Design X<br/>(Sender, Bubble, XStream)"]
        MD["@ant-design/x-markdown<br/>(流式渲染)"]
        Next --> AntX
        AntX --> MD
    end

    subgraph "应用编排层"
        Dify["Dify<br/>(可视化编排 / RAG)"]
        Spring["Spring AI Alibaba<br/>(Agent 框架)"]
        MultiAgent[多智能体编排]
        Dify <-->|API / MCP| Spring
        Spring --> MultiAgent
    end

    subgraph "数据处理层 (ETL)"
        Raw[原始文档]
        Unstructured["Unstructured.io<br/>(64+ 格式 / VLM)"]
        Chunks[语义切片]
        Raw --> Unstructured
        Unstructured --> Chunks
    end

    subgraph "存储层"
        Milvus[("Milvus<br/>(向量数据库)")]
        PG[("PostgreSQL<br/>+ pgvector")]
        Chunks --> Milvus
        Spring --> Milvus
        Spring --> PG
    end

    subgraph "模型推理层"
        vLLM["vLLM v1.0<br/>(生产部署 / MoE)"]
        Ollama["Ollama<br/>(本地开发 / GGUF)"]
        Qwen["通义千问 / DeepSeek"]
        Spring --> vLLM
        Spring --> Ollama
        Spring -.-> Qwen
    end

    subgraph "LLMOps 与质量保障"
        LangFuse["LangFuse<br/>(链路追踪 / MCP / 多模态)"]
        Promptfoo["Promptfoo<br/>(测试评估 / 护栏)"]
        Spring -.-> LangFuse
        Dify -.-> LangFuse
    end

    subgraph "基础设施层"
        Docker[Docker 24.x]
        K8s[Kubernetes 1.30.x]
        Helm[Helm Chart]
        Docker --> K8s
        K8s --> Helm
    end

    User((用户)) --> Next
    Next --> Dify
    Next --> Spring
    Promptfoo -.->|回归测试| Spring
```

## 📚 模块详解与指南

### 1. 开发环境与协同 (IDE)

- **工具**: [VS Code](https://code.visualstudio.com/) v1.107.x + [GitHub Copilot](https://github.com/features/copilot) v1.107.x, [Cursor](https://cursor.sh/) v2.1.x
- **定位**: 高效的 AI 辅助编程环境。前端推荐 VS Code，后端推荐 Cursor。
- **优势**: VS Code 生态丰富，支持 Copilot Chat、Inline Chat 及 Agent 模式与 MCP 服务器扩展；Cursor 深度集成 AI，提供代码库嵌入与 Bugbot 代码审查能力，支持 GPT-5.x / Claude 4.5 / Gemini 3 等多模型切换。
- 👉 [VS Code Copilot & Cursor：前后端高效开发协同指南](vscode-copilot-cursor-guide.md)

```mermaid
graph TD
    subgraph Frontend_Zone [前端开发: VS Code + Copilot]
        direction TB
        F1[UI 组件生成]
        F2[交互逻辑编写]
        F3[前端重构]
        F4[Agent 模式]
        F5[MCP 服务器扩展]
    end

    subgraph Backend_Zone [后端开发: Cursor]
        direction TB
        B1[API 接口定义]
        B2[核心业务逻辑]
        B3[单元测试 & 调试]
        B4[Agent 模式 & 代码库嵌入]
        B5[Bugbot 代码审查]
    end

    subgraph Models [多模型支持]
        M1[GPT-5.x / Claude 4.5 / Gemini 3]
    end

    subgraph Integration [协同联调]
        API{API 契约 / Swagger}
    end

    Frontend_Zone -->|API 调用| API
    Backend_Zone -->|接口实现| API
    Models -.->|模型切换| Frontend_Zone
    Models -.->|模型切换| Backend_Zone
```

### 2. 前端交互层 (Frontend)

- **工具**: [Next.js](https://nextjs.org/) 16.x, [Ant Design X](https://x.ant.design/) 2.x
- **定位**: 构建高性能、流式响应的 AI 对话界面。
- **优势**: Next.js 基于 React Server Components (RSC) 的 App Router 架构，支持 React 19 特性，提供 SSR/SSG/ISR 多种渲染模式；Ant Design X 专为 AI 场景设计，提供 `@ant-design/x-sdk`（useXChat, XStream）和 `@ant-design/x-markdown`（流式渲染）等开箱即用的对话组件。
- 👉 [Next.js & Ant Design X：构建现代化 AI 驱动的前端应用](nextjs-ant-design-x-guide.md)

```mermaid
graph TD
    User((用户))

    subgraph Client ["客户端 (Browser)"]
        UI["@ant-design/x<br/>(Sender, Bubble)"]
        SDK["@ant-design/x-sdk<br/>(useXChat, XStream)"]
        MD["@ant-design/x-markdown<br/>(XMarkdown 流式渲染)"]
    end

    subgraph Server ["服务端 (Next.js)"]
        API["API Route / Server Action"]
    end

    subgraph AI ["AI 服务"]
        LLM["大模型 API<br/>(OpenAI, DeepSeek...)"]
    end

    User -->|输入| UI
    UI -->|触发| SDK
    SDK -->|请求| API
    API -->|调用| LLM
    LLM -.->|流式响应 SSE| API
    API -.->|流式转发| SDK
    SDK -.->|解析流| MD
    MD -.->|实时渲染| UI
    UI -.->|展示| User
```

### 3. 应用编排与后端 (Backend)

- **工具**: [Dify](https://dify.ai/) v1.11.x, [Spring AI Alibaba](https://github.com/alibaba/spring-ai-alibaba) v1.1.x
- **定位**: Dify 负责可视化工作流编排与 RAG 引擎，Spring AI Alibaba 负责 Agent 智能体框架与多智能体编排。
- **优势**: Dify 降低了 AI 应用编排门槛，快速验证想法；Spring AI Alibaba 提供了 Agent Framework、多智能体编排能力，支持 MCP 协议，无缝对接阿里云通义大模型等国产算力。
- 👉 [Dify & Spring AI Alibaba：构建下一代 AI 应用的双重利器](dify-spring-ai-alibaba-guide.md)

```mermaid
graph TD
    subgraph User_Layer [用户交互层]
        User((用户))
    end

    subgraph Orchestration_Layer [Dify: 编排与认知层]
        DifyApp[Dify 应用/Agent]
        RAG[RAG 引擎]
        Workflow[可视化工作流]
    end

    subgraph Agent_Layer [Spring AI Alibaba: Agent 智能体层]
        SpringAgent[Agent Framework]
        MultiAgent[多智能体编排]
        BizLogic[业务逻辑/工具]
        DataAccess[数据库/API]
    end

    subgraph Admin_Layer [管理与可观测层]
        Admin[Admin 可视化平台]
    end

    subgraph Model_Layer [模型层]
        LLM((通义千问/其他 LLM))
    end

    User --> DifyApp
    DifyApp --> RAG
    DifyApp --> Workflow
    DifyApp <-->|API / MCP| SpringAgent
    SpringAgent --> MultiAgent
    MultiAgent --> BizLogic
    BizLogic --> DataAccess
    DifyApp -.-> LLM
    SpringAgent -.-> LLM
    Admin -.->|集成/迁移| DifyApp
    Admin -.->|管理/监控| SpringAgent

    style DifyApp fill:#e3f2fd,stroke:#1565c0
    style Workflow fill:#e3f2fd,stroke:#1565c0
    style SpringAgent fill:#e8f5e9,stroke:#2e7d32
    style MultiAgent fill:#e8f5e9,stroke:#2e7d32
    style LLM fill:#fff3e0,stroke:#ef6c00
    style Admin fill:#f3e5f5,stroke:#7b1fa2
```

### 4. 数据存储与 ETL (Data)

- **工具**: [PostgreSQL](https://www.postgresql.org/) v15.x + pgvector v0.8.1, [Milvus](https://milvus.io/) v2.5.x, [Unstructured.io](https://unstructured.io/) v0.18.x
- **定位**: Unstructured 处理 64+ 种格式的非结构化数据清洗（含 VLM 增强），Milvus 存储向量索引，PostgreSQL 存储业务元数据并支持轻量级向量检索。
- **优势**: Unstructured 支持语义切片（Semantic Chunking）与 OCR；Milvus 支持 Lite/Standalone/Distributed 三种部署模式，亿级向量毫秒级响应；PostgreSQL 通过 pgvector 插件实现向量与结构化数据混合查询，简化架构。
- 👉 [PostgreSQL & Milvus：结构化与非结构化数据的存储双雄](postgresql-milvus-guide.md)
- 👉 [Unstructured.io & ETL：构建 AI 时代的数据流水线](unstructured-etl-guide.md)

```mermaid
graph LR
    Data["AI 应用数据"] --> PG["PostgreSQL<br/>(结构化业务数据)"]
    Data --> Milvus["Milvus<br/>(非结构化向量数据)"]
    PG <-->|协同工作| Milvus
```

```mermaid
graph LR
    Docs["非结构化文档<br/>(PDF/Word/图片等 64+ 格式)"] -->|Extract| ETL["Unstructured.io<br/>(解析与分区)"]
    ETL -->|VLM 增强| VLM["图像描述/表格转换<br/>/OCR 优化"]
    VLM -->|Transform| Chunks["语义切片<br/>(Chunking)"]
    Chunks -->|Load| VDB[("向量数据库")]
    VDB <-->|Retrieval| App["LLM 应用<br/>(RAG)"]
```

### 5. 模型服务 (Inference)

- **工具**: [Ollama](https://ollama.com/) v0.13.5, [vLLM](https://github.com/vllm-project/vllm) v1.0.x (PyTorch Foundation 托管)
- **定位**: Ollama 用于本地快速验证与边缘计算，vLLM 用于生产环境的高并发推理与 MoE 模型部署。
- **优势**: Ollama 基于 GGUF 格式，支持 Llama 4、DeepSeek-R1、Qwen 等主流模型及多模态视觉模型；vLLM 采用 V1 架构与 PagedAttention 技术，支持 Expert Parallelism（适用于 DeepSeek-V3/Mixtral 等 MoE 模型），是工业界首选方案。
- 👉 [Ollama & vLLM：大模型推理的“简”与“强”](ollama-vllm-guide.md)

```mermaid
flowchart TD
    Start([🚀 开始选型]) --> Q1{你的主要目标是?}

    Q1 -->|个人娱乐 / 本地开发 / 边缘计算| PathA[客户端场景]
    Q1 -->|企业服务 / 高并发推理 / 降本增效| PathB[服务端场景]

    PathA --> Q2{硬件环境?}
    Q2 -->|Mac / Windows / 消费级显卡| ResA["✅ **选 Ollama**<br>(极致易用 / GGUF / 推理链支持)"]

    PathB --> Q3{核心诉求?}
    Q3 -->|高吞吐 & 低延迟| ResB["✅ **选 vLLM**<br>(V1架构 / PagedAttention)"]
    Q3 -->|MoE 模型部署<br>DeepSeek-V3 / Mixtral| ResC["✅ **选 vLLM**<br>(Expert Parallelism)"]

    ResB -.->|PyTorch Foundation 托管| Note[🏛️ 工业界首选方案]
    ResC -.-> Note

    style ResA fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style ResB fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style ResC fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style Note fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
```

### 6. 质量保障与运维 (LLMOps)

- **工具**: [LangFuse](https://langfuse.com/) v1.0.x, [Promptfoo](https://www.promptfoo.dev/) v0.9.x
- **定位**: Promptfoo 负责上线前的 Prompt 回归测试、红队测试与 Guardrails 验证，LangFuse 负责上线后的全链路追踪与 Prompt 版本管理。
- **优势**: Promptfoo 确保 Prompt 变更不引入回归问题；LangFuse 基于 OpenTelemetry，支持 Agent Graphs 可视化、MCP Tracing、多模态追踪，提供细粒度的 Token 消耗统计与成本分析。
- 👉 [LangFuse & Promptfoo：LLM 应用的观测与评估双壁](langfuse-promptfoo-guide.md)

```mermaid
flowchart TD
    %% Nodes
    Dev[开发者]
    LF_Prompt["LangFuse\n(提示词管理 / Playground)"]
    PF["Promptfoo\n(测试评估 / Guardrails)"]
    App["AI 应用\n(生产环境)"]
    LF_Trace["LangFuse\n(追踪分析 / MCP / 多模态)"]

    %% Workflow
    Dev -->|"1. 编写并打标 'Staging'"| LF_Prompt
    PF -->|"2. 拉取 'Staging' 提示词"| LF_Prompt
    PF -->|"3. 回归/红队/Guardrails 测试"| PF
    PF -->|"4. 通过: 晋升为 'Production'"| LF_Prompt

    App -.->|"5. 拉取 'Production' 提示词"| LF_Prompt
    App -->|"6. 记录链路与反馈"| LF_Trace

    LF_Trace -->|"7. 分析 Bad Cases"| Dev
    LF_Trace -.->|"8. 导出至测试集"| PF

    %% Styling
    classDef tool fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    class LF_Prompt,PF,LF_Trace tool
```

### 7. 基础设施 (Infra)

- **工具**: [Docker](https://www.docker.com/) 24.x, [Kubernetes](https://kubernetes.io/) 1.30.x
- **定位**: 容器化交付与集群编排，保障应用的高可用与弹性伸缩。
- **优势**: Docker 实现环境一致性，分层存储机制高效构建镜像；K8s 基于 containerd 运行时，结合 Helm Chart 进行应用打包分发，提供 Deployment、Service、Ingress 等强大的服务编排能力。
- 👉 [Docker & Kubernetes：云原生时代的基石](docker-kubernetes-guide.md)

```mermaid
graph LR
    subgraph Dev [开发构建]
        Code[源代码] --> Dockerfile
        Dockerfile -->|docker build| Image[Docker 镜像]
        Compose[docker-compose.yml] -->|本地编排| Image
    end

    subgraph Dist [分发]
        Image -->|docker push| Registry[镜像仓库]
        Chart[Helm Chart] -->|helm push| ChartRepo[Chart 仓库]
    end

    subgraph Run [K8s 生产环境]
        Registry -->|containerd pull| Node[K8s 节点]
        ChartRepo -->|helm install| Deployment

        Node --> Pod[Pod]
        Pod -->|运行于| Containerd[containerd]

        Deployment -->|管理| Pod
        Service -->|负载均衡| Pod
        Ingress -->|路由规则| Service
    end

    User[用户] -->|访问| Ingress
```

## 🔄 协作流程与搭配指南

本指南中的技术栈并非孤立存在，而是通过紧密的协作形成完整的 AI 生产力闭环：

```mermaid
flowchart TD
    subgraph Phase1["1️⃣ 开发与迭代"]
        Dev((开发者)) --> VSCode[VS Code<br/>前端开发]
        Dev --> Cursor[Cursor<br/>后端开发]
        VSCode --> Copilot[GitHub Copilot]
        Cursor --> Copilot
        Copilot --> Code[代码生成]
        Code --> Promptfoo[Promptfoo<br/>Prompt 单元测试]
    end

    subgraph Phase2["2️⃣ 数据处理链路"]
        RawDocs[原始文档] --> Unstructured[Unstructured.io<br/>清洗与切片]
        Unstructured --> VectorData[向量数据]
        Unstructured --> MetaData[业务元数据]
        VectorData --> Milvus[(Milvus)]
        MetaData --> PostgreSQL[(PostgreSQL)]
    end

    subgraph Phase3["3️⃣ 应用运行交互"]
        User((用户)) --> Frontend[Next.js +<br/>Ant Design X]
        Frontend --> Backend{编排层}
        Backend --> Spring[Spring AI Alibaba]
        Backend --> Dify[Dify]
        Spring --> RAG[RAG 检索]
        Dify --> RAG
        RAG --> Milvus
        Spring --> Inference{推理服务}
        Inference -->|生产| vLLM[vLLM]
        Inference -->|开发| Ollama[Ollama]
    end

    subgraph Phase4["4️⃣ 监控与优化"]
        Spring -.-> LangFuse[LangFuse<br/>Trace & Token]
        Dify -.-> LangFuse
        LangFuse --> Analysis[反馈分析]
        Analysis -.->|优化闭环| Dev
    end

    subgraph Phase5["5️⃣ 部署交付"]
        Code --> Docker[Docker<br/>容器化]
        Docker --> K8s[Kubernetes<br/>编排调度]
        K8s --> HA[高可用服务]
    end

    Promptfoo -->|测试通过| Docker
    HA --> Frontend

    style Phase1 fill:#e3f2fd,stroke:#1565c0
    style Phase2 fill:#fff3e0,stroke:#ef6c00
    style Phase3 fill:#e8f5e9,stroke:#2e7d32
    style Phase4 fill:#f3e5f5,stroke:#7b1fa2
    style Phase5 fill:#fce4ec,stroke:#c2185b
```

1. **开发与迭代**:

   - 开发者使用 **VS Code** (前端) 和 **Cursor** (后端) 编写代码，**GitHub Copilot** 辅助生成。
   - **Promptfoo** 用于在开发阶段对 Prompt 进行单元测试，确保变更不破坏现有逻辑。

2. **数据处理链路**:

   - 原始文档通过 **Unstructured.io** 进行清洗和切片 (ETL)。
   - 处理后的向量数据存入 **Milvus**，业务元数据存入 **PostgreSQL**。

3. **应用运行交互**:

   - 用户在 **Next.js** + **Ant Design X** 构建的前端界面发起对话。
   - 请求转发至 **Spring AI Alibaba** 或 **Dify** 进行编排。
   - 后端调用 **Milvus** 进行 RAG 检索，并请求 **vLLM** (生产) 或 **Ollama** (开发) 进行推理。

4. **监控与优化**:

   - 应用运行时的所有 Trace 和 Token 消耗实时上报至 **LangFuse**。
   - 基于 LangFuse 的反馈数据，开发者优化 Prompt 和代码，形成闭环。

5. **部署交付**:
   - 所有服务通过 **Docker** 容器化，最终由 **Kubernetes** 统一编排调度，保障高可用。
