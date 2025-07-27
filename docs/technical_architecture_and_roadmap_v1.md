# 项目技术路线与开发规划 (V1.0)

#### **一、 总体愿景与核心原则**

**愿景：**
构建一个专业的、由 **“领域专家Agent”** 驱动的深基坑智能设计与分析平台。该平台旨在将复杂的岩土工程分析流程，转化为由AI引导的、可视化的、符合规范的“傻瓜式”人机交互体验，最终实现设计辅助、风险预警和方案优化的核心价值。

**核心原则：**
1.  **专家知识库驱动：** Agent 的智能不源于通用模型的凭空想象，而是严格基于一个结构化的 **“规则库”** (工程规范、物理公式)和一个非结构化的 **“知识库”** (设计案例、学术论文、标准图集)。这是系统专业性的基石。
2.  **混合智能，成本可控：** 采用分层智能策略。复杂推理和自然语言交互使用 **Gemini-Pro**；高频、固定的任务由**本地微调小模型**处理；确定性计算和校验由**代码规则引擎**完成，以实现最佳的性能、成本和可靠性。
3.  **人机回圈，持续学习：** 在关键决策点，系统必须将AI的建议呈现给用户进行**确认或修正**。用户的每一次交互都被视为宝贵的反馈数据，用于持续优化知识库和模型，形成数据飞轮。
4.  **结果可解释，决策可追溯：** 系统的任何输出（无论是模型、参数还是报告）都必须是可解释的。Agent 需要能够说明“为什么这么做”，其依据是哪条规范或哪个案例，确保用户信任。

#### **二、 最终技术架构**

我们采用面向未来的、分层解耦的云原生架构：

```mermaid
graph TD
    subgraph "用户交互层 (Frontend)"
        UI_Chat[💬 对话式界面]
        UI_Viewport[🖥️ 三维视窗 (React-Three-Fiber)]
        UI_Panel[📊 参数面板 (Ant Design)]
        Frontend_Agent[🧠 前端轻量Agent (Zustand状态管理)]
    end

    subgraph "智能决策层 (Expert Agent - The Brain)"
        API_Gateway[API 网关 (Nginx/Kong)]
        Orchestrator[智能编排器 (LangChain / LlamaIndex)]
        
        subgraph "混合智能核心"
            LLM_Gemini[☁️ Gemini-Pro (用于复杂推理/报告生成)]
            LLM_Local[🏠 本地微调模型 (用于参数提取/意图识别)]
            Rule_Engine[⚖️ 规则引擎 (用于规范校验/公式计算)]
        end

        subgraph "专家知识库 (The Knowledge)"
            VectorDB[📚 向量数据库 (PGVector) <br> 存储案例/论文/手册]
            SQLDB[📜 结构化数据库 (PostgreSQL) <br> 存储规范/参数/公式]
        end
    end

    subgraph "计算执行层 (Zhuque Microservices - The Hands)"
        Service_Geo[Geom Service (Gmsh/OCC)]
        Service_Mesh[Mesh Service (Gmsh)]
        Service_Solver[Solver Service (Kratos)]
        Service_Post[Post-Proc. Service (PyVista/VTK)]
    end

    subgraph "基础设施层 (Infrastructure)"
        Infra_K8s[☸️ Kubernetes (容器编排)]
        Infra_MinIO[📦 对象存储 (MinIO/S3)]
        Infra_Redis[⚡ 缓存与消息队列 (Redis)]
        Infra_CI_CD[🚀 CI/CD (GitLab-CI/GitHub Actions)]
        Infra_Monitor[📈 监控 (Prometheus/Grafana)]
    end

    UI_Chat & UI_Panel --> Frontend_Agent
    Frontend_Agent --> API_Gateway
    API_Gateway --> Orchestrator
    Orchestrator <--> LLM_Gemini & LLM_Local & Rule_Engine
    Orchestrator --> VectorDB & SQLDB
    Orchestrator --> Service_Geo & Service_Mesh & Service_Solver & Service_Post
    Service_Geo & Service_Mesh & Service_Solver & Service_Post --> UI_Viewport
```

#### **三、 核心技术选型**

*   **前端:** React 18+, Vite, TypeScript, Zustand, React-Three-Fiber, Ant Design
*   **后端:** Python 3.10+, FastAPI
*   **AI/LLM:**
    *   **云端大模型:** Google Gemini-Pro (通过 Vertex AI API)
    *   **本地小模型:** 待定 (可从 Llama-3-8B-Instruct 开始评估)
    *   **编排框架:** LangChain 或 LlamaIndex
    *   **嵌入模型:** Sentence-Transformers (开源)
*   **核心计算引擎:** Gmsh, Kratos Multiphysics, PyVista
*   **数据存储:**
    *   **主数据库/向量数据库:** PostgreSQL (配合 PostGIS 和 PGVector 插件)
    *   **对象存储:** MinIO
    *   **缓存/任务队列:** Redis
*   **基础设施:** Nginx, Prometheus, Grafana

#### **四、 详细开发规划 (12个月)**

我们将项目分为四个大的阶段，每个阶段都有明确的目标和交付成果。

**第一阶段 (1-3月): 基础设施搭建与知识库“冷启动”**
*   **目标:** 建立稳固的开发和部署环境，完成核心专家知识的数字化。
*   **关键任务:**
    1.  搭建 Kubernetes 集群，配置 CI/CD 流水线。
    2.  部署 PostgreSQL, MinIO, Redis 等基础存储服务。
    3.  **[核心]** **收集并处理第一批专家知识**：将《建筑基坑支护技术规程》等核心规范的关键条文录入结构化数据库；将 10-20 份高质量的设计案例和研究论文进行处理，构建初始向量知识库。
    4.  完成前后端代码仓库的初始化，搭建基础的微服务框架。
*   **交付成果:**
    *   一套可自动化部署和监控的开发环境。
    *   一个包含核心规范和初步案例的专家知识库。
    *   一个可以运行的、但功能为空的前后端应用骨架。

**第二阶段 (4-6月): MVP - “对话式参数化建模”闭环**
*   **目标:** 实现第一个核心用户故事：用户通过自然语言输入，系统能理解并创建出符合规范的、可视化的三维几何模型。
*   **关键任务:**
    1.  开发前端对话界面和三维视窗。
    2.  开发 `ParameterUnderstandingAgent`，集成 Gemini-Pro 和本地模型，实现对用户输入的参数提取。
    3.  开发 `IntelligentModelingAgent`，实现“知识库检索+规则校验+调用几何服务”的流程。
    4.  引入“人机回圈”：Agent 生成的几何方案需用户在前端确认后，才最终定稿。
*   **交付成果:**
    *   一个可交互的原型系统：用户能通过聊天，创建一个简单的、符合基本规范的基坑及支护几何模型，并能在3D视图中看到。
    *   验证“混合智能+RAG”技术路线的可行性。

**第三阶段 (7-9月): 全流程自动化与分析能力**
*   **目标:** 打通从建模到网格、再到求解的完整CAE分析链路。
*   **关键任务:**
    1.  完善 `Meshing Service` 和 `Solver Service` 的部署和API。
    2.  增强 Agent 的能力，使其能够根据几何模型自动推荐并配置网格参数和求解工况。
    3.  开发 `Post-Processing Service` 和前端结果可视化组件，能展示基本的云图和位移曲线。
*   **交付成果:**
    *   一个具备基本全流程分析能力的系统：用户可以对生成的模型进行网格划分和求解，并查看初步的计算结果。

**第四阶段 (10-12月): 智能增强与专家级体验**
*   **目标:** 让系统从一个“工具”进化为一个“助手”，提供智能建议和报告。
*   **关键任务:**
    1.  开发 **“自然语言分析报告”** 生成功能：Agent 调用 Gemini-Pro 对计算结果进行解读，并生成摘要报告。
    2.  基于积累的用户反馈数据，对本地模型进行初步微调，提升参数提取的准确率。
    3.  探索引入 PINN 等 AI 物理模型，对特定场景进行快速预测或“what-if”分析。
*   **交付成果:**
    *   系统能够在分析后自动生成一份包含关键数据解读和初步建议的分析报告。
    *   Agent 的交互更加智能和精准，初步具备“专家助手”的雏形。 