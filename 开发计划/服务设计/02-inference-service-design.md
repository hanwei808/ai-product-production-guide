# Inference Service 详细设计文档

> 版本：v1.0 | 优先级：P0 | 技术栈：Ollama (开发) / vLLM (生产)

## 1. 服务概述

### 1.1 服务定位

**inference-service** 是 AI 产品后端架构中的**模型推理网关层**，作为统一的 LLM 推理入口，屏蔽底层推理引擎的差异，为上层应用提供标准化的 OpenAI 兼容 API。

### 1.2 核心职责

```mermaid
mindmap
  root((inference-service))
    统一接口
      OpenAI 兼容 API
      流式/非流式响应
      多模态支持
    模型管理
      模型注册
      健康检查
      版本管理
    路由策略
      负载均衡
      模型路由
      故障转移
    资源管理
      GPU 调度
      并发控制
      队列管理
```

### 1.3 服务边界

| 属于本服务职责     | 不属于本服务职责               |
| ------------------ | ------------------------------ |
| 统一推理 API 接口  | 业务逻辑处理 (ai-core-service) |
| 模型加载与管理     | Prompt 编排 (ai-core-service)  |
| 请求路由与负载均衡 | 向量检索 (rag-service)         |
| 推理性能优化       | 对话历史存储 (data-service)    |
| 开发/生产环境切换  | 链路追踪展示 (observability)   |
| Token 计数与限流   | 用户认证授权 (data-service)    |

---

## 2. 系统架构

### 2.1 整体架构图

```mermaid
graph TD
    subgraph 调用方
        Core[ai-core-service]
        Dify[dify-service]
        Admin[管理后台]
    end

    subgraph inference-service
        Gateway[API Gateway Layer]
        Router[Model Router]
        LB[Load Balancer]
        Queue[Request Queue]
        Monitor[Health Monitor]
    end

    subgraph 开发环境
        Ollama[Ollama Server]
        OllamaModels[(本地模型<br/>GGUF)]
    end

    subgraph 生产环境
        vLLM1[vLLM Instance 1]
        vLLM2[vLLM Instance 2]
        vLLMN[vLLM Instance N]
        ModelStore[(模型存储<br/>AWQ/GPTQ)]
    end

    Core -->|OpenAI API| Gateway
    Dify -->|OpenAI API| Gateway
    Admin -->|Management API| Gateway

    Gateway --> Router
    Router --> LB
    LB --> Queue

    Queue -->|开发| Ollama
    Ollama --> OllamaModels

    Queue -->|生产| vLLM1
    Queue -->|生产| vLLM2
    Queue -->|生产| vLLMN
    vLLM1 --> ModelStore
    vLLM2 --> ModelStore
    vLLMN --> ModelStore

    Monitor -.->|健康检查| Ollama
    Monitor -.->|健康检查| vLLM1
    Monitor -.->|健康检查| vLLM2
```

### 2.2 环境差异化架构

```mermaid
graph LR
    subgraph 统一接口
        API[OpenAI Compatible API]
    end

    subgraph 开发环境 Dev
        direction TB
        Ollama[Ollama]
        GGUF[GGUF 量化模型]
        CPU_GPU[CPU / 消费级 GPU]
        Ollama --> GGUF
        GGUF --> CPU_GPU
    end

    subgraph 生产环境 Prod
        direction TB
        vLLM[vLLM Cluster]
        AWQ[AWQ/GPTQ 量化]
        A100[A100/H100 GPU]
        vLLM --> AWQ
        AWQ --> A100
    end

    API -->|INFERENCE_ENV=dev| Ollama
    API -->|INFERENCE_ENV=prod| vLLM
```

---

## 3. 模型管理设计

### 3.1 支持的模型类型

```mermaid
graph TD
    subgraph 模型分类
        Chat[对话模型]
        Embed[Embedding 模型]
        Rerank[重排序模型]
        VLM[视觉语言模型]
    end

    subgraph 对话模型
        Qwen[Qwen 2.5 系列]
        DeepSeek[DeepSeek 系列]
        Llama[Llama 系列]
    end

    subgraph Embedding 模型
        BGE[BGE 系列]
        M3E[M3E 系列]
    end

    Chat --> Qwen
    Chat --> DeepSeek
    Chat --> Llama
    Embed --> BGE
    Embed --> M3E
```

### 3.2 模型注册表设计

| 字段           | 类型   | 说明                            |
| -------------- | ------ | ------------------------------- |
| `model_id`     | string | 模型唯一标识                    |
| `model_name`   | string | 模型显示名称                    |
| `model_type`   | enum   | chat / embedding / rerank / vlm |
| `provider`     | enum   | ollama / vllm / openai          |
| `endpoint`     | string | 推理端点地址                    |
| `max_tokens`   | int    | 最大上下文长度                  |
| `capabilities` | array  | 支持的能力 (streaming, tools)   |
| `status`       | enum   | active / inactive / loading     |
| `priority`     | int    | 路由优先级                      |
| `quota`        | object | 并发限制配置                    |

### 3.3 模型配置示例

```mermaid
graph TD
    subgraph 模型配置层级
        Global[全局默认配置]
        Provider[Provider 级配置]
        Model[模型级配置]
        Request[请求级覆盖]
    end

    Global --> Provider
    Provider --> Model
    Model --> Request
```

| 配置层级 | 配置项示例                            |
| -------- | ------------------------------------- |
| 全局     | 默认超时、重试策略、日志级别          |
| Provider | Ollama/vLLM 特有参数                  |
| 模型     | temperature、top_p、max_tokens 默认值 |
| 请求     | 单次请求覆盖参数                      |

---

## 4. 路由策略设计

### 4.1 路由决策流程

```mermaid
flowchart TD
    Request[推理请求] --> Parse[解析请求]
    Parse --> ModelMatch{模型匹配}

    ModelMatch -->|指定模型| Direct[直接路由]
    ModelMatch -->|模型别名| Resolve[解析别名]
    ModelMatch -->|未指定| Default[默认模型]

    Resolve --> Direct
    Default --> Direct

    Direct --> HealthCheck{健康检查}
    HealthCheck -->|健康| LoadBalance[负载均衡]
    HealthCheck -->|不健康| Fallback[故障转移]

    LoadBalance --> SelectInstance[选择实例]
    Fallback --> SelectInstance

    SelectInstance --> RateLimit{限流检查}
    RateLimit -->|通过| Execute[执行推理]
    RateLimit -->|拒绝| Queue[进入队列]

    Queue --> Execute
    Execute --> Response[返回响应]
```

### 4.2 负载均衡策略

| 策略                     | 说明                | 适用场景       |
| ------------------------ | ------------------- | -------------- |
| **Round Robin**          | 轮询分发            | 实例规格一致   |
| **Weighted Round Robin** | 加权轮询            | 实例规格不同   |
| **Least Connections**    | 最少连接            | 长连接场景     |
| **Least Latency**        | 最低延迟            | 延迟敏感场景   |
| **Consistent Hash**      | 一致性哈希 (按用户) | 会话亲和性需求 |

### 4.3 故障转移策略

```mermaid
sequenceDiagram
    participant Client as 调用方
    participant Router as 路由器
    participant Primary as 主实例
    participant Backup as 备份实例

    Client->>Router: 推理请求
    Router->>Primary: 转发请求
    Primary--xRouter: 超时/错误

    Note over Router: 故障检测 & 重试

    Router->>Backup: 故障转移
    Backup-->>Router: 成功响应
    Router-->>Client: 返回结果

    Note over Router: 标记 Primary 为不健康
```

| 故障类型   | 检测方式     | 处理策略        |
| ---------- | ------------ | --------------- |
| 连接超时   | TCP 连接失败 | 立即转移        |
| 请求超时   | 响应超时     | 重试 1 次后转移 |
| 5xx 错误   | HTTP 状态码  | 重试 1 次后转移 |
| 模型未加载 | 模型状态检查 | 等待或转移      |
| GPU OOM    | 错误信息解析 | 转移到其他实例  |

---

## 5. API 设计

### 5.1 OpenAI 兼容 API

服务提供完全兼容 OpenAI API 规范的接口，确保与现有生态无缝集成。

```mermaid
graph LR
    subgraph 核心 API
        Chat["/v1/chat/completions"]
        Embed["/v1/embeddings"]
        Models["/v1/models"]
    end

    subgraph 扩展 API
        Health["/health"]
        Metrics["/metrics"]
        Admin["/admin/models"]
    end
```

### 5.2 API 端点清单

#### 5.2.1 推理 API (OpenAI 兼容)

| 方法 | 端点                    | 说明                |
| ---- | ----------------------- | ------------------- |
| POST | `/v1/chat/completions`  | 对话补全 (支持流式) |
| POST | `/v1/completions`       | 文本补全            |
| POST | `/v1/embeddings`        | 向量嵌入            |
| GET  | `/v1/models`            | 模型列表            |
| GET  | `/v1/models/{model_id}` | 模型详情            |

#### 5.2.2 管理 API

| 方法   | 端点                        | 说明         |
| ------ | --------------------------- | ------------ |
| GET    | `/admin/models`             | 模型管理列表 |
| POST   | `/admin/models`             | 注册模型     |
| PUT    | `/admin/models/{id}`        | 更新模型配置 |
| DELETE | `/admin/models/{id}`        | 注销模型     |
| POST   | `/admin/models/{id}/load`   | 加载模型     |
| POST   | `/admin/models/{id}/unload` | 卸载模型     |

#### 5.2.3 运维 API

| 方法 | 端点            | 说明            |
| ---- | --------------- | --------------- |
| GET  | `/health`       | 健康检查        |
| GET  | `/health/live`  | 存活探针        |
| GET  | `/health/ready` | 就绪探针        |
| GET  | `/metrics`      | Prometheus 指标 |

### 5.3 请求/响应格式

#### Chat Completions 请求

```json
{
  "model": "qwen2.5-72b-instruct",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": true,
  "tools": [...]  // 可选：Function Calling
}
```

#### Chat Completions 响应 (流式)

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion.chunk",
  "created": 1234567890,
  "model": "qwen2.5-72b-instruct",
  "choices": [
    {
      "index": 0,
      "delta": { "content": "Hello" },
      "finish_reason": null
    }
  ]
}
```

---

## 6. 性能优化设计

### 6.1 推理优化技术栈

```mermaid
graph TD
    subgraph vLLM 优化技术
        PA[PagedAttention<br/>显存优化]
        CB[Continuous Batching<br/>连续批处理]
        TP[Tensor Parallelism<br/>张量并行]
        PP[Pipeline Parallelism<br/>流水线并行]
        Quant[量化<br/>AWQ/GPTQ/FP8]
    end

    subgraph 效果
        PA --> E1[显存利用率 ↑]
        CB --> E2[吞吐量 ↑]
        TP --> E3[大模型支持]
        PP --> E3
        Quant --> E4[推理速度 ↑]
    end
```

### 6.2 关键性能指标

| 指标                | 开发环境目标 | 生产环境目标 |
| ------------------- | ------------ | ------------ |
| Time to First Token | < 2s         | < 500ms      |
| Tokens per Second   | > 20 tok/s   | > 100 tok/s  |
| 并发请求数          | 5            | 100+         |
| GPU 显存利用率      | -            | > 90%        |
| 请求成功率          | > 95%        | > 99.9%      |

### 6.3 批处理策略

```mermaid
sequenceDiagram
    participant R1 as Request 1
    participant R2 as Request 2
    participant R3 as Request 3
    participant Batch as Batch Scheduler
    participant GPU as GPU

    R1->>Batch: 到达
    R2->>Batch: 到达
    Note over Batch: 等待窗口 (5ms)
    R3->>Batch: 到达

    Batch->>GPU: 批量推理 [R1, R2, R3]
    GPU-->>Batch: 批量结果

    Batch-->>R1: 响应 1
    Batch-->>R2: 响应 2
    Batch-->>R3: 响应 3
```

| 参数                 | 说明              | 推荐值 |
| -------------------- | ----------------- | ------ |
| `max_batch_size`     | 最大批处理大小    | 32-64  |
| `batch_timeout_ms`   | 批处理等待超时    | 5-10ms |
| `max_waiting_tokens` | 最大等待 Token 数 | 8192   |

---

## 7. 开发/生产环境配置

### 7.1 环境对比

```mermaid
graph TB
    subgraph 开发环境
        direction LR
        Dev_HW[消费级 GPU<br/>RTX 4090 24GB]
        Dev_Engine[Ollama]
        Dev_Model[GGUF 量化<br/>Q4_K_M / Q8_0]
        Dev_Scale[单实例]
    end

    subgraph 生产环境
        direction LR
        Prod_HW[数据中心 GPU<br/>A100 80GB x4]
        Prod_Engine[vLLM Cluster]
        Prod_Model[AWQ 量化<br/>4-bit]
        Prod_Scale[多实例 + 自动扩缩]
    end
```

### 7.2 Ollama 开发配置

| 配置项                     | 值            | 说明           |
| -------------------------- | ------------- | -------------- |
| `OLLAMA_HOST`              | 0.0.0.0:11434 | 监听地址       |
| `OLLAMA_NUM_PARALLEL`      | 2             | 并行请求数     |
| `OLLAMA_MAX_LOADED_MODELS` | 2             | 最大加载模型数 |
| `OLLAMA_KEEP_ALIVE`        | 5m            | 模型保持时间   |

### 7.3 vLLM 生产配置

| 配置项                     | 值    | 说明           |
| -------------------------- | ----- | -------------- |
| `--tensor-parallel-size`   | 4     | 张量并行度     |
| `--max-model-len`          | 32768 | 最大上下文长度 |
| `--quantization`           | awq   | 量化方法       |
| `--gpu-memory-utilization` | 0.95  | GPU 显存利用率 |
| `--enable-chunked-prefill` | true  | 分块预填充     |
| `--max-num-seqs`           | 256   | 最大并发序列   |

---

## 8. 服务集成

### 8.1 被调用关系

```mermaid
sequenceDiagram
    participant Core as ai-core-service
    participant Inference as inference-service
    participant Router as Model Router
    participant vLLM as vLLM Instance

    Core->>Inference: POST /v1/chat/completions
    Inference->>Router: 路由决策
    Router->>vLLM: 转发请求

    loop 流式响应
        vLLM-->>Router: SSE chunk
        Router-->>Inference: SSE chunk
        Inference-->>Core: SSE chunk
    end

    vLLM-->>Router: [DONE]
    Router-->>Inference: [DONE]
    Inference-->>Core: [DONE]
```

### 8.2 与其他服务的集成点

| 调用方              | 调用场景          | 接口                   |
| ------------------- | ----------------- | ---------------------- |
| **ai-core-service** | 对话推理          | `/v1/chat/completions` |
| **ai-core-service** | 文本嵌入          | `/v1/embeddings`       |
| **rag-service**     | 向量化 (可选直连) | `/v1/embeddings`       |
| **dify-service**    | 模型调用          | `/v1/chat/completions` |
| **etl-service**     | 文档向量化        | `/v1/embeddings`       |
| **管理后台**        | 模型管理          | `/admin/models`        |

### 8.3 外部依赖

| 依赖服务              | 类型       | 用途             |
| --------------------- | ---------- | ---------------- |
| Ollama Server         | 必需(开发) | 开发环境推理引擎 |
| vLLM Cluster          | 必需(生产) | 生产环境推理引擎 |
| 模型存储 (S3/NFS)     | 必需       | 模型文件存储     |
| Redis                 | 可选       | 请求去重、限流   |
| observability-service | 可选       | 指标上报         |

---

## 9. 可观测性设计

### 9.1 关键指标

```mermaid
graph LR
    subgraph 请求指标
        RPS[请求 QPS]
        Latency[响应延迟]
        ErrorRate[错误率]
    end

    subgraph 推理指标
        TTFT[首 Token 延迟]
        TPS[Token 吞吐量]
        BatchSize[批处理大小]
    end

    subgraph 资源指标
        GPU_Util[GPU 利用率]
        GPU_Mem[GPU 显存]
        Queue_Len[队列长度]
    end
```

### 9.2 Prometheus 指标

| 指标名称                                | 类型      | 说明            |
| --------------------------------------- | --------- | --------------- |
| `inference_requests_total`              | Counter   | 请求总数        |
| `inference_request_duration_seconds`    | Histogram | 请求延迟分布    |
| `inference_time_to_first_token_seconds` | Histogram | 首 Token 延迟   |
| `inference_tokens_generated_total`      | Counter   | 生成 Token 总数 |
| `inference_tokens_per_second`           | Gauge     | 实时 Token 吞吐 |
| `inference_active_requests`             | Gauge     | 活跃请求数      |
| `inference_queue_length`                | Gauge     | 等待队列长度    |
| `inference_model_loaded`                | Gauge     | 已加载模型数    |
| `inference_gpu_memory_used_bytes`       | Gauge     | GPU 显存使用    |
| `inference_gpu_utilization_percent`     | Gauge     | GPU 利用率      |

### 9.3 日志规范

| 日志级别 | 场景                         |
| -------- | ---------------------------- |
| ERROR    | 推理失败、模型加载失败       |
| WARN     | 请求超时、重试、限流触发     |
| INFO     | 请求开始/结束、模型加载/卸载 |
| DEBUG    | 路由决策、批处理详情         |

---

## 10. 安全设计

### 10.1 认证授权

```mermaid
graph TD
    Request[API 请求] --> AuthN[认证]
    AuthN -->|API Key| Validate[校验 Key]
    AuthN -->|JWT| JWTValidate[校验 Token]

    Validate --> AuthZ[授权]
    JWTValidate --> AuthZ

    AuthZ --> ModelAccess{模型访问权限}
    ModelAccess -->|允许| Execute[执行推理]
    ModelAccess -->|拒绝| Deny[拒绝 403]
```

### 10.2 安全措施

| 安全措施 | 实现方式                    |
| -------- | --------------------------- |
| API 认证 | API Key / JWT Token         |
| 请求限流 | 滑动窗口限流 (按用户/租户)  |
| 输入校验 | Prompt 长度限制、敏感词过滤 |
| 输出过滤 | 有害内容检测 (可选)         |
| 传输加密 | TLS 1.3                     |
| 内网隔离 | 推理引擎仅内网可访问        |

### 10.3 限流策略

| 维度 | 限制                 | 说明           |
| ---- | -------------------- | -------------- |
| 全局 | 1000 req/s           | 服务总容量     |
| 租户 | 100 req/min          | 防止单租户过载 |
| 用户 | 20 req/min           | 防止滥用       |
| 模型 | 基于模型容量动态调整 | 保护大模型     |

---

## 11. 部署架构

### 11.1 开发环境

```mermaid
graph LR
    Dev[开发者] --> Proxy[inference-service<br/>代理层]
    Proxy --> Ollama[Ollama Docker]
    Ollama --> GPU[本地 GPU]
```

### 11.2 生产环境

```mermaid
graph TD
    subgraph Kubernetes Cluster
        Ingress[Ingress]

        subgraph inference-service
            Proxy1[Proxy Pod 1]
            Proxy2[Proxy Pod 2]
        end

        Service[K8s Service]
    end

    subgraph GPU Node Pool
        vLLM1[vLLM Pod 1<br/>GPU x4]
        vLLM2[vLLM Pod 2<br/>GPU x4]
    end

    subgraph Storage
        NFS[(NFS/S3<br/>模型存储)]
    end

    Ingress --> Service
    Service --> Proxy1
    Service --> Proxy2

    Proxy1 --> vLLM1
    Proxy1 --> vLLM2
    Proxy2 --> vLLM1
    Proxy2 --> vLLM2

    vLLM1 --> NFS
    vLLM2 --> NFS
```

### 11.3 资源配置建议

#### 代理层 (inference-service)

| 环境 | 副本数 | CPU Request | Memory Request |
| ---- | ------ | ----------- | -------------- |
| 开发 | 1      | 0.5 核      | 512 MB         |
| 生产 | 2-3    | 1 核        | 1 GB           |

#### 推理层 (vLLM)

| 模型规模 | GPU 配置          | 显存需求     |
| -------- | ----------------- | ------------ |
| 7B       | 1x A100 40GB      | ~20GB (AWQ)  |
| 14B      | 1x A100 80GB      | ~40GB (AWQ)  |
| 72B      | 4x A100 80GB (TP) | ~160GB (AWQ) |

---

## 12. 开发里程碑

```mermaid
gantt
    title inference-service 开发计划
    dateFormat  YYYY-MM-DD
    axisFormat  Week %W

    section 基础架构
    项目骨架搭建           :a1, 2025-01-06, 2d
    Ollama 集成            :a2, after a1, 2d
    OpenAI API 适配        :a3, after a2, 3d

    section 核心功能
    模型路由实现           :b1, after a3, 2d
    流式响应支持           :b2, after b1, 2d
    负载均衡实现           :b3, after b2, 2d

    section 生产就绪
    vLLM 集成              :c1, after b3, 3d
    性能优化               :c2, after c1, 2d
    监控指标接入           :c3, after c2, 2d

    section 高级功能
    多模型并行             :d1, after c3, 2d
    自动扩缩容             :d2, after d1, 2d
    故障转移完善           :d3, after d2, 2d
```

---

## 13. 技术选型摘要

| 类别           | 技术选型            | 版本   | 说明           |
| -------------- | ------------------- | ------ | -------------- |
| 代理框架       | Go / Python FastAPI | -      | 高性能代理层   |
| 开发推理引擎   | Ollama              | 0.13.x | 本地开发       |
| 生产推理引擎   | vLLM                | 1.0.x  | 高性能生产推理 |
| 模型格式(开发) | GGUF                | -      | Ollama 专用    |
| 模型格式(生产) | AWQ / GPTQ          | -      | vLLM 量化      |
| 负载均衡       | 内置 / Envoy        | -      | 请求分发       |
| 指标暴露       | Prometheus          | -      | 可观测性       |

---

## 14. 相关文档

- [后端开发计划总览](../backend-development-plan.md)
- [Ollama & vLLM 推理指南](../../技术选型/ollama-vllm-guide.md)
- [Docker & Kubernetes 基础设施](../../技术选型/docker-kubernetes-guide.md)

---

## 附录 A：模型推荐列表

### 对话模型

| 模型名称                     | 参数量 | 量化格式 | 显存需求 | 推荐场景   |
| ---------------------------- | ------ | -------- | -------- | ---------- |
| qwen2.5-7b-instruct          | 7B     | Q4_K_M   | 6GB      | 开发测试   |
| qwen2.5-14b-instruct         | 14B    | AWQ      | 12GB     | 轻量生产   |
| qwen2.5-72b-instruct         | 72B    | AWQ      | 48GB     | 高质量生产 |
| deepseek-r1-distill-qwen-32b | 32B    | AWQ      | 24GB     | 推理任务   |

### Embedding 模型

| 模型名称          | 维度 | 显存需求 | 推荐场景 |
| ----------------- | ---- | -------- | -------- |
| bge-m3            | 1024 | 2GB      | 多语言   |
| bge-large-zh-v1.5 | 1024 | 2GB      | 中文专用 |

---

## 附录 B：错误码定义

| 错误码 | HTTP Status | 说明             |
| ------ | ----------- | ---------------- |
| 40001  | 400         | 请求参数无效     |
| 40002  | 400         | 模型不存在       |
| 40101  | 401         | API Key 无效     |
| 40301  | 403         | 无权访问该模型   |
| 42901  | 429         | 请求频率超限     |
| 50001  | 500         | 推理引擎内部错误 |
| 50002  | 500         | 模型加载失败     |
| 50301  | 503         | 服务暂时不可用   |
| 50302  | 503         | 模型未就绪       |
| 50401  | 504         | 推理超时         |
