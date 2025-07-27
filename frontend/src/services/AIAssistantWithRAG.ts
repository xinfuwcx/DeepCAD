/**
 * RAG增强AI助手系统 - 1号专家智能对话服务
 * 集成检索增强生成(RAG)功能
 * 与CAE知识库深度融合，提供专业级AI问答
 */

import { KnowledgeBaseAPI, KnowledgeEntry, KnowledgeCategory } from './caeKnowledgeBase';

// ======================= 接口定义 =======================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    retrievedKnowledge?: RetrievedKnowledge[];
    confidence?: number;
    sources?: string[];
    category?: KnowledgeCategory;
  };
}

export interface RetrievedKnowledge {
  entry: KnowledgeEntry;
  relevanceScore: number;
  matchedKeywords: string[];
}

export interface RAGResponse {
  answer: string;
  confidence: number;
  retrievedKnowledge: RetrievedKnowledge[];
  sources: string[];
  suggestedQuestions: string[];
}

export interface AIAssistantConfig {
  maxRetrievedEntries: number;
  relevanceThreshold: number;
  enableContextMemory: boolean;
  maxContextLength: number;
  responseLanguage: 'zh' | 'en';
}

// ======================= 向量相似度计算器 =======================

class VectorSimilarityCalculator {
  // 简化的TF-IDF向量计算
  private calculateTFIDF(text: string, corpus: string[]): Map<string, number> {
    const words = this.tokenize(text);
    const wordFreq = new Map<string, number>();
    const tfidf = new Map<string, number>();
    
    // 计算词频(TF)
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // 计算TF-IDF
    wordFreq.forEach((tf, word) => {
      const df = corpus.filter(doc => doc.includes(word)).length;
      const idf = Math.log(corpus.length / (df + 1));
      tfidf.set(word, (tf / words.length) * idf);
    });
    
    return tfidf;
  }
  
  private tokenize(text: string): string[] {
    // 中英文分词（简化版）
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1);
  }
  
  public calculateSimilarity(query: string, document: string, corpus: string[]): number {
    const queryVector = this.calculateTFIDF(query, corpus);
    const docVector = this.calculateTFIDF(document, corpus);
    
    // 余弦相似度计算
    let dotProduct = 0;
    let queryMagnitude = 0;
    let docMagnitude = 0;
    
    const allWords = new Set([...queryVector.keys(), ...docVector.keys()]);
    
    allWords.forEach(word => {
      const queryValue = queryVector.get(word) || 0;
      const docValue = docVector.get(word) || 0;
      
      dotProduct += queryValue * docValue;
      queryMagnitude += queryValue * queryValue;
      docMagnitude += docValue * docValue;
    });
    
    if (queryMagnitude === 0 || docMagnitude === 0) return 0;
    
    return dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(docMagnitude));
  }
}

// ======================= 知识检索器 =======================

class KnowledgeRetriever {
  private knowledgeBase: typeof KnowledgeBaseAPI;
  private similarityCalculator: VectorSimilarityCalculator;
  private corpus: string[] = [];
  
  constructor(knowledgeBase: typeof KnowledgeBaseAPI) {
    this.knowledgeBase = knowledgeBase;
    this.similarityCalculator = new VectorSimilarityCalculator();
  }
  
  public async initializeCorpus(): Promise<void> {
    const allEntries = await this.knowledgeBase.getAllEntries();
    this.corpus = allEntries.map(entry => 
      `${entry.title} ${entry.content} ${entry.tags.join(' ')}`
    );
    console.log(`📚 知识库语料库初始化完成，共 ${this.corpus.length} 条记录`);
  }
  
  public async retrieveRelevantKnowledge(
    query: string, 
    maxResults: number = 5,
    threshold: number = 0.1
  ): Promise<RetrievedKnowledge[]> {
    const allEntries = await this.knowledgeBase.getAllEntries();
    const results: RetrievedKnowledge[] = [];
    
    for (const entry of allEntries) {
      const document = `${entry.title} ${entry.content} ${entry.tags.join(' ')}`;
      const relevanceScore = this.similarityCalculator.calculateSimilarity(
        query, 
        document, 
        this.corpus
      );
      
      if (relevanceScore >= threshold) {
        const matchedKeywords = this.extractMatchedKeywords(query, entry);
        
        results.push({
          entry,
          relevanceScore,
          matchedKeywords
        });
      }
    }
    
    // 按相关性排序并限制结果数量
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }
  
  private extractMatchedKeywords(query: string, entry: KnowledgeEntry): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const entryText = `${entry.title} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase();
    
    return queryWords.filter(word => 
      word.length > 1 && entryText.includes(word)
    );
  }
}

// ======================= AI响应生成器 =======================

class AIResponseGenerator {
  private generateAnswerFromKnowledge(
    query: string, 
    retrievedKnowledge: RetrievedKnowledge[]
  ): string {
    if (retrievedKnowledge.length === 0) {
      return this.generateFallbackResponse(query);
    }
    
    // 基于检索到的知识生成回答
    const topKnowledge = retrievedKnowledge[0];
    const entry = topKnowledge.entry;
    
    let answer = `根据我的专业知识库，关于"${query}"的问题：\n\n`;
    
    // 主要回答
    answer += `**${entry.title}**\n\n`;
    answer += this.extractRelevantContent(entry.content, query) + '\n\n';
    
    // 添加参数信息
    if (entry.parameters && Object.keys(entry.parameters).length > 0) {
      answer += '**关键参数：**\n';
      Object.entries(entry.parameters).slice(0, 3).forEach(([key, param]) => {
        answer += `• ${key}: ${param.value}${param.unit || ''} - ${param.description}\n`;
      });
      answer += '\n';
    }
    
    // 添加公式信息
    if (entry.formulas && entry.formulas.length > 0) {
      answer += '**相关公式：**\n';
      entry.formulas.slice(0, 2).forEach(formula => {
        answer += `• ${formula.name}: ${formula.description}\n`;
      });
      answer += '\n';
    }
    
    // 添加案例信息
    if (entry.caseStudies && entry.caseStudies.length > 0) {
      const caseStudy = entry.caseStudies[0];
      answer += `**工程案例：**\n`;
      answer += `• ${caseStudy.projectName}（${caseStudy.location}）\n`;
      if (caseStudy.lessons.length > 0) {
        answer += `• 经验总结：${caseStudy.lessons[0]}\n`;
      }
      answer += '\n';
    }
    
    // 添加相关知识
    if (retrievedKnowledge.length > 1) {
      answer += '**相关知识：**\n';
      retrievedKnowledge.slice(1, 3).forEach(knowledge => {
        answer += `• ${knowledge.entry.title}\n`;
      });
    }
    
    return answer;
  }
  
  private extractRelevantContent(content: string, query: string): string {
    // 提取与查询最相关的内容片段
    const sentences = content.split(/[。！？.!?]/);
    const queryWords = query.toLowerCase().split(/\s+/);
    
    let bestSentence = sentences[0];
    let maxRelevance = 0;
    
    sentences.forEach(sentence => {
      const relevance = queryWords.reduce((score, word) => {
        return score + (sentence.toLowerCase().includes(word) ? 1 : 0);
      }, 0);
      
      if (relevance > maxRelevance) {
        maxRelevance = relevance;
        bestSentence = sentence;
      }
    });
    
    return bestSentence.trim() || content.substring(0, 200) + '...';
  }
  
  private generateFallbackResponse(query: string): string {
    const fallbackResponses = [
      `抱歉，我在知识库中没有找到关于"${query}"的直接信息。但我可以为您提供相关的深基坑工程通用知识。`,
      `关于"${query}"，我建议您查看以下相关领域的专业资料，或者尝试更具体的关键词搜索。`,
      `这个问题可能涉及到深基坑工程的专业细节。建议您咨询具体的技术规范或联系专业工程师。`
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
  
  public generateSuggestedQuestions(retrievedKnowledge: RetrievedKnowledge[]): string[] {
    if (retrievedKnowledge.length === 0) {
      return [
        "深基坑支护结构有哪些类型？",
        "如何计算土压力？",
        "地连墙施工工艺流程是什么？"
      ];
    }
    
    const suggestions: string[] = [];
    const entry = retrievedKnowledge[0].entry;
    
    // 基于分类生成建议问题
    switch (entry.category) {
      case 'deep_excavation':
        suggestions.push(
          "深基坑变形监测方案如何制定？",
          "支护结构安全系数如何确定？",
          "基坑降水方案设计要点？"
        );
        break;
      case 'soil_mechanics':
        suggestions.push(
          "土体强度参数如何确定？",
          "地基承载力计算方法？",
          "土压力分布规律？"
        );
        break;
      case 'structural_analysis':
        suggestions.push(
          "结构内力分析方法？",
          "支撑轴力计算？",
          "结构优化设计原则？"
        );
        break;
      default:
        suggestions.push(
          "相关技术标准有哪些？",
          "施工注意事项？",
          "质量控制要点？"
        );
    }
    
    return suggestions.slice(0, 3);
  }
  
  public async generateResponse(
    query: string, 
    retrievedKnowledge: RetrievedKnowledge[]
  ): Promise<RAGResponse> {
    const answer = this.generateAnswerFromKnowledge(query, retrievedKnowledge);
    const confidence = retrievedKnowledge.length > 0 ? 
      Math.min(retrievedKnowledge[0].relevanceScore * 100, 95) : 30;
    
    const sources = retrievedKnowledge.map(knowledge => knowledge.entry.title);
    const suggestedQuestions = this.generateSuggestedQuestions(retrievedKnowledge);
    
    return {
      answer,
      confidence,
      retrievedKnowledge,
      sources,
      suggestedQuestions
    };
  }
}

// ======================= 主AI助手类 =======================

export class AIAssistantWithRAG {
  private knowledgeBase: typeof KnowledgeBaseAPI;
  private retriever: KnowledgeRetriever;
  private responseGenerator: AIResponseGenerator;
  private chatHistory: ChatMessage[] = [];
  private config: AIAssistantConfig;
  
  constructor(config: Partial<AIAssistantConfig> = {}) {
    this.config = {
      maxRetrievedEntries: 5,
      relevanceThreshold: 0.1,
      enableContextMemory: true,
      maxContextLength: 10,
      responseLanguage: 'zh',
      ...config
    };
    
    this.knowledgeBase = KnowledgeBaseAPI; // 使用静态类
    this.retriever = new KnowledgeRetriever(this.knowledgeBase);
    this.responseGenerator = new AIResponseGenerator();
  }
  
  public async initialize(): Promise<void> {
    console.log('🤖 正在初始化RAG增强AI助手...');
    
    // KnowledgeBaseAPI是静态类，不需要初始化
    // await this.knowledgeBase.initialize();
    await this.retriever.initializeCorpus();
    
    // 添加系统消息
    this.addMessage({
      id: this.generateMessageId(),
      role: 'system',
      content: '您好！我是DeepCAD智能AI助手，专门为深基坑工程提供专业技术支持。我可以回答关于深基坑设计、施工、监测等方面的问题。',
      timestamp: new Date(),
      metadata: {
        confidence: 100,
        sources: ['系统初始化']
      }
    });
    
    console.log('✅ RAG增强AI助手初始化完成');
  }
  
  public async askQuestion(query: string): Promise<ChatMessage> {
    console.log(`🔍 用户提问: ${query}`);
    
    // 添加用户消息
    const userMessage: ChatMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    this.addMessage(userMessage);
    
    // 检索相关知识
    const retrievedKnowledge = await this.retriever.retrieveRelevantKnowledge(
      query,
      this.config.maxRetrievedEntries,
      this.config.relevanceThreshold
    );
    
    console.log(`📚 检索到 ${retrievedKnowledge.length} 条相关知识`);
    
    // 生成AI回答
    const ragResponse = await this.responseGenerator.generateResponse(
      query,
      retrievedKnowledge
    );
    
    // 创建助手回答消息
    const assistantMessage: ChatMessage = {
      id: this.generateMessageId(),
      role: 'assistant',
      content: ragResponse.answer,
      timestamp: new Date(),
      metadata: {
        retrievedKnowledge: ragResponse.retrievedKnowledge,
        confidence: ragResponse.confidence,
        sources: ragResponse.sources,
        category: retrievedKnowledge[0]?.entry.category
      }
    };
    
    this.addMessage(assistantMessage);
    
    console.log(`🤖 AI回答生成完成，置信度: ${ragResponse.confidence.toFixed(1)}%`);
    
    return assistantMessage;
  }
  
  public getSuggestedQuestions(): string[] {
    const recentMessages = this.chatHistory
      .filter(msg => msg.role === 'assistant')
      .slice(-1);
    
    if (recentMessages.length > 0) {
      const lastResponse = recentMessages[0];
      if (lastResponse.metadata?.retrievedKnowledge) {
        return this.responseGenerator.generateSuggestedQuestions(
          lastResponse.metadata.retrievedKnowledge
        );
      }
    }
    
    return [
      "深基坑支护方案如何选择？",
      "地连墙设计参数确定方法？",
      "基坑监测预警值如何设定？"
    ];
  }
  
  public getChatHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }
  
  public clearHistory(): void {
    this.chatHistory = [];
    console.log('🗑️ 对话历史已清空');
  }
  
  public async searchKnowledge(
    query: string,
    category?: KnowledgeCategory
  ): Promise<RetrievedKnowledge[]> {
    return await this.retriever.retrieveRelevantKnowledge(query, 10, 0.05);
  }
  
  private addMessage(message: ChatMessage): void {
    this.chatHistory.push(message);
    
    // 限制历史长度
    if (this.config.enableContextMemory && 
        this.chatHistory.length > this.config.maxContextLength) {
      // 保留系统消息和最近的消息
      const systemMessages = this.chatHistory.filter(msg => msg.role === 'system');
      const recentMessages = this.chatHistory
        .filter(msg => msg.role !== 'system')
        .slice(-this.config.maxContextLength + systemMessages.length);
      
      this.chatHistory = [...systemMessages, ...recentMessages];
    }
  }
  
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  public getConfig(): AIAssistantConfig {
    return { ...this.config };
  }
  
  public updateConfig(newConfig: Partial<AIAssistantConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ AI助手配置已更新');
  }
}

// ======================= 导出单例实例 =======================

export const aiAssistantWithRAG = new AIAssistantWithRAG();

export default AIAssistantWithRAG;