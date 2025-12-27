# AI 产品后端开发计划

本计划基于 [README.md](README.md) 全景架构，将后端系统拆分为 **7 个核心服务**，按依赖关系分 **5 个阶段**渐进式交付。

## 📋 技术决策摘要

| 决策项     | 选择                               | 理由                               |
| ---------- | ---------------------------------- | ---------------------------------- |
| 向量数据库 | **Milvus Standalone** (起步即部署) | 避免后期迁移成本，支持亿级向量扩展 |
| Dify 定位  | **长期保留**                       | 作为非技术人员的低代码编排入口     |
| RAG 服务   | **独立拆分 rag-service**           | 解耦复杂检索逻辑，便于独立优化     |

---

## 🏗️ 服务架构总览

```mermaid
graph TD
    subgraph 前端层
        UI[Next.js + Ant Design X]
    end

    subgraph 网关层
        Gateway[API Gateway]
    end

    subgraph 编排层
        Dify[dify-service<br/>低代码编排]
    end

    subgraph 应用层
        Core[ai-core-service<br/>Agent 框架]
        RAG[rag-service<br/>高级检索]
    end

    subgraph 数据层
        ETL[etl-service<br/>文档处理]
        Data[data-service<br/>结构化存储]
    end

    subgraph 推理层
        Inference[inference-service<br/>模型网关]
    end

    subgraph 可观测层
        Obs[observability-service<br/>监控追踪]
    end

    subgraph 存储层
        PG[(PostgreSQL)]
        Milvus[(Milvus)]
    end

    UI --> Gateway
    Gateway --> Dify
    Gateway --> Core
    Dify <-->|MCP| Core
    Core --> RAG
    Core --> Inference
    RAG --> Milvus
    ETL --> Milvus
    ETL --> PG
    Core --> Data
    Data --> PG
    Core -.-> Obs
    Dify -.-> Obs
```

---

## 📦 服务清单与职责

| #   | 服务名                    | 技术栈                          | 职责                                   | 通信方式            | 优先级 |
| --- | ------------------------- | ------------------------------- | -------------------------------------- | ------------------- | ------ |
| 1   | **data-service**          | PostgreSQL 15.x                 | 业务元数据、用户数据、会话历史         | REST / JDBC         | P0     |
| 2   | **inference-service**     | Ollama (dev) / vLLM (prod)      | 统一模型推理网关，屏蔽底层差异         | OpenAI 兼容 API     | P0     |
| 3   | **ai-core-service**       | Spring AI Alibaba 1.1.x         | Agent 框架、多智能体编排、Tool Calling | REST / gRPC / MCP   | P0     |
| 4   | **rag-service**           | LangChain 1.x (Python 独立服务) | 多路召回、重排序、高级 RAG 策略        | gRPC / REST         | P1     |
| 5   | **etl-service**           | Unstructured.io 0.18.x (Python) | 64+ 格式文档解析、语义切片、VLM 增强   | REST / 消息队列     | P2     |
| 6   | **dify-service**          | Dify 1.11.x                     | 低代码工作流、知识库管理、Prompt 灰度  | REST / MCP          | P2     |
| 7   | **observability-service** | LangFuse 1.0.x + Promptfoo      | 链路追踪、Token 统计、Prompt 测试      | OpenTelemetry / SDK | P1     |

> ⚠️ **跨语言通信说明**: `rag-service` 和 `etl-service` 为 Python 服务，与 Java 服务（ai-core-service）通过 gRPC 或 REST API 通信。建议使用 Protocol Buffers 定义接口契约。

---

## 🔗 服务间通信矩阵

```mermaid
flowchart LR
    subgraph 同步通信
        A[REST API]
        B[gRPC]
        C[MCP 协议]
    end

    subgraph 异步通信
        D[消息队列<br/>RabbitMQ/Kafka]
    end
```

| 调用方          | 被调用方              | 协议               | 场景                 |
| --------------- | --------------------- | ------------------ | -------------------- |
| ai-core-service | inference-service     | REST (OpenAI 兼容) | 模型推理调用         |
| ai-core-service | rag-service           | gRPC               | 向量检索             |
| ai-core-service | data-service          | REST               | 业务数据 CRUD        |
| dify-service    | ai-core-service       | MCP                | 工具互调、Agent 协作 |
| etl-service     | rag-service           | REST               | 文档入库             |
| etl-service     | 消息队列              | AMQP               | 异步任务分发         |
| 所有服务        | observability-service | OpenTelemetry      | 链路追踪上报         |

---

## 📅 开发阶段规划

### 阶段一：基础设施搭建 (Week 1-2)

**目标**: 搭建开发环境，部署核心依赖服务

```mermaid
gantt
    title 阶段一：基础设施
    dateFormat  YYYY-MM-DD
    axisFormat  Week %W
    section 存储
    PostgreSQL 部署与初始化     :a1, 2025-01-06, 2d
    Milvus Standalone 部署     :a2, after a1, 2d
    section 推理
    Ollama 环境配置            :b1, 2025-01-06, 1d
    模型下载与测试             :b2, after b1, 1d
    section 可观测
    LangFuse 部署              :c1, after a2, 2d
    Promptfoo CLI 安装         :c2, after c1, 1d
```

> 📅 **时间说明**: 甘特图中的日期为示意，实际开发请根据项目启动时间调整。各阶段周期为参考值。

#### 任务清单

| 任务              | 技术要点                                 | 交付物                         |
| ----------------- | ---------------------------------------- | ------------------------------ |
| PostgreSQL 部署   | Docker, 初始化脚本, 连接池配置           | `docker-compose.yml`, DDL 脚本 |
| Milvus Standalone | Docker, Collection 设计, 索引策略        | Milvus 配置, Collection Schema |
| Ollama 配置       | GPU 驱动, 模型拉取 (qwen2.5/deepseek-r1) | 模型列表, 健康检查脚本         |
| LangFuse 部署     | Docker Compose, 环境变量                 | 观测平台可访问                 |

#### 关键配置

```yaml
# docker-compose.infra.yml
services:
  # ============ 存储层 ============
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ai_product
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${PG_PASSWORD}
    ports:
      - '5432:5432'
    volumes:
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
      - postgres_data:/var/lib/postgresql/data

  # Milvus 依赖：etcd
  etcd:
    image: quay.io/coreos/etcd:v3.5.16
    environment:
      ETCD_AUTO_COMPACTION_MODE: revision
      ETCD_AUTO_COMPACTION_RETENTION: '1000'
      ETCD_QUOTA_BACKEND_BYTES: '4294967296'
    command: etcd -advertise-client-urls=http://etcd:2379 -listen-client-urls=http://0.0.0.0:2379 --data-dir /etcd
    volumes:
      - etcd_data:/etcd

  # Milvus 依赖：minio
  minio:
    image: minio/minio:RELEASE.2024-12-18T13-15-44Z
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    command: minio server /minio_data --console-address ":9001"
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/minio_data

  milvus:
    image: milvusdb/milvus:v2.5-latest
    command: ['milvus', 'run', 'standalone']
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
      MINIO_ACCESS_KEY_ID: minioadmin
      MINIO_SECRET_ACCESS_KEY: ${MINIO_PASSWORD}
    ports:
      - '19530:19530' # gRPC
      - '9091:9091' # Metrics
    depends_on:
      - etcd
      - minio
    volumes:
      - milvus_data:/var/lib/milvus

  # ============ 推理层 ============
  ollama:
    image: ollama/ollama:latest
    ports:
      - '11434:11434'
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  # ============ 可观测层 ============
  langfuse:
    image: langfuse/langfuse:latest
    environment:
      DATABASE_URL: postgresql://admin:${PG_PASSWORD}@postgres:5432/langfuse
      NEXTAUTH_SECRET: ${LANGFUSE_SECRET}
      NEXTAUTH_URL: http://localhost:3000
      SALT: ${LANGFUSE_SALT}
    ports:
      - '3000:3000'
    depends_on:
      - postgres

  # ============ 消息队列（可选）============
  rabbitmq:
    image: rabbitmq:3.13-management
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    ports:
      - '5672:5672'
      - '15672:15672' # Management UI

volumes:
  postgres_data:
  etcd_data:
  minio_data:
  milvus_data:
  ollama_data:
```

> 💡 **环境变量说明**: 创建 `.env` 文件配置敏感信息：
>
> ```bash
> PG_PASSWORD=your_secure_password
> MINIO_PASSWORD=your_minio_password
> LANGFUSE_SECRET=your_langfuse_secret
> LANGFUSE_SALT=your_langfuse_salt
> RABBITMQ_PASSWORD=your_rabbitmq_password
> ```

---

### 阶段二：核心应用开发 (Week 3-5)

**目标**: 完成 ai-core-service 基础功能，实现单轮对话与简单 RAG

```mermaid
gantt
    title 阶段二：核心应用
    dateFormat  YYYY-MM-DD
    section ai-core-service
    项目骨架搭建              :a1, 2025-01-13, 2d
    ChatClient 基础对话       :a2, after a1, 3d
    Tool Calling 实现         :a3, after a2, 3d
    section inference-service
    推理网关封装              :b1, 2025-01-13, 2d
    模型路由策略              :b2, after b1, 2d
    section data-service
    数据模型设计              :c1, 2025-01-20, 2d
    CRUD API 实现             :c2, after c1, 3d
```

#### ai-core-service 技术架构

```mermaid
graph TD
    subgraph ai-core-service
        Controller[REST Controller]
        ChatService[ChatService]
        AgentService[AgentService]
        ToolRegistry[Tool Registry]

        Controller --> ChatService
        Controller --> AgentService
        AgentService --> ToolRegistry
        ChatService --> LLMClient[ChatClient]
        AgentService --> LLMClient
    end

    subgraph External
        Inference[inference-service]
        RAG[rag-service]
        Data[data-service]
    end

    LLMClient --> Inference
    ToolRegistry --> RAG
    ToolRegistry --> Data
```

#### 核心依赖

```xml
<!-- pom.xml -->
<dependencies>
    <!-- Spring AI Alibaba -->
    <dependency>
        <groupId>com.alibaba.cloud.ai</groupId>
        <artifactId>spring-ai-alibaba-starter</artifactId>
        <version>1.1.0.0-RC2</version>
    </dependency>

    <!-- Milvus Client -->
    <dependency>
        <groupId>io.milvus</groupId>
        <artifactId>milvus-sdk-java</artifactId>
        <version>2.5.4</version>
    </dependency>

    <!-- OpenTelemetry (用于 LangFuse 链路追踪) -->
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-api</artifactId>
        <version>1.43.0</version>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-sdk</artifactId>
        <version>1.43.0</version>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-exporter-otlp</artifactId>
        <version>1.43.0</version>
    </dependency>
</dependencies>
```

> ⚠️ **注意**: LangFuse 目前无官方 Java SDK，推荐通过 OpenTelemetry 协议将链路数据导出至 LangFuse。详见 [LangFuse OpenTelemetry 集成文档](https://langfuse.com/docs/integrations/opentelemetry)。

#### 关键代码示例

```java
// ChatController.java
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatClient chatClient;
    private final Tracer tracer; // OpenTelemetry Tracer

    @PostMapping("/completions")
    public Flux<String> chat(@RequestBody ChatRequest request) {
        Span span = tracer.spanBuilder("chat-completion")
            .setAttribute("user.message", request.getMessage())
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            return chatClient.prompt()
                .user(request.getMessage())
                .advisors(new QuestionAnswerAdvisor(vectorStore))
                .stream()
                .content()
                .doOnComplete(() -> span.end())
                .doOnError(e -> {
                    span.recordException(e);
                    span.end();
                });
        }
    }
}
```

> 💡 **OpenTelemetry 配置**: 在 `application.yml` 中配置 OTLP 导出器将链路数据发送至 LangFuse：
>
> ```yaml
> otel:
>   exporter:
>     otlp:
>       endpoint: http://langfuse:4318
>       headers:
>         Authorization: Bearer ${LANGFUSE_PUBLIC_KEY}
> ```

---

### 阶段三：RAG 与 ETL 服务 (Week 6-8)

**目标**: 完成文档处理管道与高级检索能力

```mermaid
gantt
    title 阶段三：RAG 与 ETL
    dateFormat  YYYY-MM-DD
    section rag-service
    项目初始化               :a1, 2025-01-27, 2d
    多路召回实现             :a2, after a1, 3d
    重排序策略               :a3, after a2, 3d
    gRPC 接口定义            :a4, after a3, 2d
    section etl-service
    Unstructured 集成        :b1, 2025-01-27, 3d
    语义切片策略             :b2, after b1, 3d
    VLM 增强 (可选)          :b3, after b2, 2d
    向量入库流程             :b4, after b3, 2d
```

#### rag-service 架构

```mermaid
graph TD
    subgraph rag-service [rag-service - Python]
        API[gRPC/REST API]
        Retriever[Multi-Retriever]
        Reranker[Reranker]

        API --> Retriever
        Retriever --> Dense[Dense 向量检索]
        Retriever --> Sparse[Sparse BM25]
        Retriever --> Hybrid[混合检索]
        Dense --> Milvus[(Milvus)]
        Sparse --> Milvus
        Hybrid --> Reranker
        Reranker --> Response[排序结果]
    end
```

#### 关键技术点

| 能力       | 实现方式                | 说明       |
| ---------- | ----------------------- | ---------- |
| 多路召回   | Dense + Sparse + Hybrid | 提升召回率 |
| 重排序     | BGE-Reranker / Cohere   | 提升精度   |
| Query 改写 | HyDE / Multi-Query      | 语义扩展   |
| 上下文压缩 | LongContextReorder      | 长文本优化 |

#### etl-service 处理流程

```mermaid
flowchart LR
    Input[原始文档] --> Partition[Unstructured<br/>分区解析]
    Partition --> Clean[清洗规范化]
    Clean --> Chunk[语义切片]
    Chunk --> Embed[向量化]
    Embed --> Store[存储]
    Store --> Milvus[(Milvus)]
    Store --> PG[(PostgreSQL<br/>元数据)]
```

#### Unstructured 配置示例

```python
# etl_service/processor.py
from unstructured.partition.auto import partition
from unstructured.chunking.title import chunk_by_title

def process_document(file_path: str) -> list:
    # 1. 解析文档 (支持 64+ 格式)
    elements = partition(
        filename=file_path,
        strategy="hi_res",  # 高精度模式
        languages=["chi_sim", "eng"],  # OCR 语言
        extract_images_in_pdf=True,
    )

    # 2. 语义切片
    chunks = chunk_by_title(
        elements,
        max_characters=1000,
        overlap=100,
        combine_text_under_n_chars=200,
    )

    return chunks
```

---

### 阶段四：编排与智能体进阶 (Week 9-11)

**目标**: 实现多智能体编排，完成 Dify 集成

```mermaid
gantt
    title 阶段四：编排与智能体
    dateFormat  YYYY-MM-DD
    section 多智能体
    Agent Graph 设计          :a1, 2025-02-17, 3d
    ReAct 模式实现            :a2, after a1, 3d
    A2A 通信 (Nacos)          :a3, after a2, 3d
    section Dify 集成
    Dify 部署                 :b1, 2025-02-17, 2d
    MCP Server 开发           :b2, after b1, 3d
    工作流模板设计            :b3, after b2, 3d
```

#### 多智能体架构

```mermaid
graph TD
    User((用户)) --> Supervisor[Supervisor Agent<br/>任务分发]

    Supervisor --> Research[Research Agent<br/>信息检索]
    Supervisor --> Analysis[Analysis Agent<br/>数据分析]
    Supervisor --> Writer[Writer Agent<br/>内容生成]

    Research --> RAG[rag-service]
    Analysis --> Data[data-service]
    Writer --> LLM[inference-service]

    Research --> Supervisor
    Analysis --> Supervisor
    Writer --> Supervisor

    Supervisor --> User
```

#### Dify MCP 集成

```mermaid
sequenceDiagram
    participant User as 用户
    participant Dify as dify-service
    participant MCP as MCP Server
    participant Core as ai-core-service

    User->>Dify: 发起对话
    Dify->>MCP: 调用工具 (MCP 协议)
    MCP->>Core: 转发请求
    Core->>Core: Agent 执行
    Core-->>MCP: 返回结果
    MCP-->>Dify: 工具响应
    Dify-->>User: 展示结果
```

#### MCP Server 实现

```java
// McpServerConfig.java
@Configuration
public class McpServerConfig {

    @Bean
    public McpServer mcpServer(ToolRegistry toolRegistry) {
        return McpServer.builder()
            .name("ai-core-mcp")
            .version("1.0.0")
            .tools(toolRegistry.getAllTools())
            .build();
    }
}

// 工具定义示例
@Tool(name = "search_knowledge", description = "搜索知识库")
public class SearchKnowledgeTool {

    @Autowired
    private RagServiceClient ragClient;

    public String execute(String query, int topK) {
        return ragClient.search(query, topK);
    }
}
```

---

### 阶段五：生产就绪 (Week 12-14)

**目标**: 完成生产环境部署准备，性能优化与测试

```mermaid
gantt
    title 阶段五：生产就绪
    dateFormat  YYYY-MM-DD
    section 推理优化
    vLLM 部署                :a1, 2025-03-10, 3d
    模型量化 (AWQ/GPTQ)       :a2, after a1, 2d
    推理性能调优             :a3, after a2, 3d
    section 质量保障
    Promptfoo 测试集成       :b1, 2025-03-10, 2d
    回归测试用例编写         :b2, after b1, 3d
    CI/CD 集成               :b3, after b2, 2d
    section 部署
    K8s Helm Chart 编写      :c1, 2025-03-17, 3d
    灰度发布策略             :c2, after c1, 2d
    监控告警配置             :c3, after c2, 2d
```

#### vLLM 生产配置

```yaml
# vllm-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-inference
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: vllm
          image: vllm/vllm-openai:latest
          args:
            - --model=/models/qwen2.5-72b-instruct-awq
            - --tensor-parallel-size=4
            - --max-model-len=32768
            - --quantization=awq
            - --enable-chunked-prefill
          resources:
            limits:
              nvidia.com/gpu: 4
          ports:
            - containerPort: 8000
```

#### Promptfoo CI 集成

```yaml
# .github/workflows/prompt-test.yml
name: Prompt Regression Test

on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'src/**/prompt*.java'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Promptfoo
        run: npm install -g promptfoo

      - name: Run Tests
        run: promptfoo eval -c promptfooconfig.yaml
        env:
          LANGFUSE_API_KEY: ${{ secrets.LANGFUSE_API_KEY }}

      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: promptfoo-results
          path: output/
```

---

## 📊 资源规划

### 开发环境 (单机)

| 资源 | 规格          | 用途          |
| ---- | ------------- | ------------- |
| CPU  | 16 核         | 服务运行      |
| 内存 | 64 GB         | Milvus + 应用 |
| GPU  | RTX 4090 24GB | Ollama 推理   |
| 存储 | 1 TB SSD      | 模型 + 数据   |

### 生产环境 (K8s 集群)

| 节点类型 | 数量 | 规格            | 用途        |
| -------- | ---- | --------------- | ----------- |
| Master   | 3    | 8C16G           | K8s 控制面  |
| Worker   | 3    | 16C64G          | 应用服务    |
| GPU Node | 2    | 8C64G + A100\*4 | vLLM 推理   |
| Storage  | 3    | 8C32G + 2TB SSD | Milvus + PG |

---

## 🔍 风险与缓解

| 风险                   | 影响 | 缓解措施                                              |
| ---------------------- | ---- | ----------------------------------------------------- |
| Milvus 运维复杂度      | 中   | 使用 Helm Chart 标准化部署，配置监控告警              |
| 多服务通信延迟         | 中   | 关键路径使用 gRPC，非关键异步化                       |
| Prompt 劣化            | 高   | Promptfoo 强制集成 CI，阻断问题合并                   |
| 模型推理成本           | 高   | 开发用量化小模型，生产按需扩缩容                      |
| Java-Python 跨语言通信 | 中   | 使用 Protocol Buffers 定义接口契约，gRPC 保证类型安全 |
| LangFuse Java 集成     | 低   | 采用 OpenTelemetry 标准协议，避免 SDK 依赖            |

---

## 🔧 补充：跨语言服务通信

### gRPC 接口定义示例 (rag-service)

```protobuf
// proto/rag_service.proto
syntax = "proto3";

package rag;

option java_package = "com.example.rag.grpc";
option java_outer_classname = "RagServiceProto";

service RagService {
  // 向量检索
  rpc Search(SearchRequest) returns (SearchResponse);
  // 多路召回
  rpc HybridSearch(HybridSearchRequest) returns (SearchResponse);
}

message SearchRequest {
  string query = 1;
  int32 top_k = 2;
  string collection_name = 3;
  map<string, string> filters = 4;
}

message SearchResponse {
  repeated Document documents = 1;
  float latency_ms = 2;
}

message Document {
  string id = 1;
  string content = 2;
  float score = 3;
  map<string, string> metadata = 4;
}

message HybridSearchRequest {
  string query = 1;
  int32 top_k = 2;
  float dense_weight = 3;  // 稠密向量权重
  float sparse_weight = 4; // 稀疏向量权重 (BM25)
}
```

### 服务发现配置 (Nacos)

```yaml
# application-nacos.yml (ai-core-service)
spring:
  cloud:
    nacos:
      discovery:
        server-addr: ${NACOS_SERVER:nacos:8848}
        namespace: ${NACOS_NAMESPACE:ai-product}
      config:
        server-addr: ${NACOS_SERVER:nacos:8848}
        file-extension: yaml

  # 服务注册
  application:
    name: ai-core-service

# gRPC 客户端配置
grpc:
  client:
    rag-service:
      address: 'discovery:///rag-service'
      negotiationType: plaintext
```

---

## 📎 相关文档

- [Dify & Spring AI Alibaba 指南](dify-spring-ai-alibaba-guide.md)
- [Spring AI vs LangChain 对比](spring-ai-langchain-guide.md)
- [PostgreSQL & Milvus 存储指南](postgresql-milvus-guide.md)
- [Unstructured ETL 指南](unstructured-etl-guide.md)
- [Ollama & vLLM 推理指南](ollama-vllm-guide.md)
- [LangFuse & Promptfoo 观测指南](langfuse-promptfoo-guide.md)
- [Docker & Kubernetes 基础设施](docker-kubernetes-guide.md)
