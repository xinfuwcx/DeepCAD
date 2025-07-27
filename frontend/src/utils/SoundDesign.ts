/**
 * DeepCAD 声音设计系统
 * 1号架构师 - 科技感音效和环境音设计
 */

interface SoundConfig {
  volume: number;
  enabled: boolean;
  contextEnabled: boolean;
}

interface AudioContextState {
  context: AudioContext | null;
  initialized: boolean;
  suspended: boolean;
}

class SoundDesignManager {
  private config: SoundConfig = {
    volume: 0.3,
    enabled: true,
    contextEnabled: false
  };

  private audioState: AudioContextState = {
    context: null,
    initialized: false,
    suspended: true
  };

  // 预定义的科技感音效参数
  private soundPresets = {
    // UI交互音效
    buttonHover: { freq: 800, duration: 0.1, type: 'sine' as OscillatorType, volume: 0.1 },
    buttonClick: { freq: 600, duration: 0.15, type: 'square' as OscillatorType, volume: 0.2 },
    menuOpen: { freq: 400, duration: 0.3, type: 'sawtooth' as OscillatorType, volume: 0.15 },
    menuClose: { freq: 300, duration: 0.2, type: 'triangle' as OscillatorType, volume: 0.1 },
    tabSwitch: { freq: 1000, duration: 0.08, type: 'sine' as OscillatorType, volume: 0.12 },
    
    // 数据操作音效
    dataLoad: { freq: 220, duration: 0.5, type: 'sawtooth' as OscillatorType, volume: 0.2 },
    dataProcess: { freq: 440, duration: 1.0, type: 'triangle' as OscillatorType, volume: 0.15 },
    dataComplete: { freq: 880, duration: 0.3, type: 'sine' as OscillatorType, volume: 0.25 },
    dataError: { freq: 150, duration: 0.4, type: 'square' as OscillatorType, volume: 0.3 },
    
    // 计算过程音效  
    computationStart: { freq: 300, duration: 0.6, type: 'sawtooth' as OscillatorType, volume: 0.2 },
    computationProgress: { freq: 500, duration: 0.2, type: 'sine' as OscillatorType, volume: 0.1 },
    computationComplete: { freq: 1200, duration: 0.8, type: 'triangle' as OscillatorType, volume: 0.3 },
    
    // 3D视口音效
    cameraMove: { freq: 180, duration: 0.1, type: 'sine' as OscillatorType, volume: 0.08 },
    modelLoad: { freq: 350, duration: 1.2, type: 'sawtooth' as OscillatorType, volume: 0.18 },
    selectionChange: { freq: 900, duration: 0.12, type: 'triangle' as OscillatorType, volume: 0.15 },
    
    // 环境音效
    ambientHum: { freq: 60, duration: -1, type: 'sine' as OscillatorType, volume: 0.05 },
    quantumResonance: { freq: 432, duration: -1, type: 'triangle' as OscillatorType, volume: 0.03 }
  };

  private activeOscillators = new Map<string, OscillatorNode>();
  private gainNodes = new Map<string, GainNode>();

  constructor() {
    // 监听用户交互以启用音频上下文
    this.setupUserInteractionListener();
  }

  /**
   * 设置用户交互监听器
   */
  private setupUserInteractionListener(): void {
    const enableAudio = () => {
      if (!this.config.enabled) return;
      
      this.initializeAudioContext();
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
    };

    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });
  }

  /**
   * 初始化Web Audio API上下文  
   */
  private async initializeAudioContext(): Promise<void> {
    if (this.audioState.initialized) return;

    try {
      this.audioState.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioState.context.state === 'suspended') {
        await this.audioState.context.resume();
      }

      this.audioState.initialized = true;
      this.audioState.suspended = false;
      this.config.contextEnabled = true;

      console.log('🔊 声音设计系统已启用');
      
      // 播放初始化成功音效
      this.playSound('buttonClick');
      
    } catch (error) {
      console.warn('声音系统初始化失败:', error);
      this.config.enabled = false;
    }
  }

  /**
   * 播放系统预设音效
   */
  public playSound(soundName: keyof typeof this.soundPresets, options?: { volume?: number; pitch?: number }): void {
    if (!this.config.enabled || !this.config.contextEnabled || !this.audioState.context) {
      return;
    }

    const preset = this.soundPresets[soundName];
    if (!preset) {
      console.warn(`未找到音效预设: ${soundName}`);
      return;
    }

    this.playTone({
      frequency: preset.freq * (options?.pitch || 1),
      duration: preset.duration,
      type: preset.type,
      volume: (preset.volume * this.config.volume) * (options?.volume || 1)
    });
  }

  /**
   * 播放自定义音调
   */
  public playTone(params: {
    frequency: number;
    duration: number;
    type: OscillatorType;
    volume: number;
    fadeIn?: number;
    fadeOut?: number;
  }): void {
    if (!this.audioState.context) return;

    const { frequency, duration, type, volume, fadeIn = 0.02, fadeOut = 0.1 } = params;
    const currentTime = this.audioState.context.currentTime;

    // 创建振荡器和增益节点
    const oscillator = this.audioState.context.createOscillator();
    const gainNode = this.audioState.context.createGain();

    // 设置音频参数
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, currentTime);

    // 连接音频节点
    oscillator.connect(gainNode);
    gainNode.connect(this.audioState.context.destination);

    // 设置音量包络
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, currentTime + fadeIn);
    
    if (duration > 0) {
      gainNode.gain.linearRampToValueAtTime(volume, currentTime + duration - fadeOut);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
    }

    // 启动和停止
    oscillator.start(currentTime);
    if (duration > 0) {
      oscillator.stop(currentTime + duration);
    }

    // 存储引用（用于持续音效）
    if (duration < 0) {
      const key = `${type}_${frequency}`;
      this.activeOscillators.set(key, oscillator);
      this.gainNodes.set(key, gainNode);
    }
  }

  /**
   * 播放数据流音效序列
   */
  public playDataSequence(dataCount: number, processingTime: number): void {
    if (!this.config.enabled) return;

    const interval = processingTime / dataCount;
    
    for (let i = 0; i < dataCount; i++) {
      setTimeout(() => {
        const pitch = 0.8 + (i / dataCount) * 0.4; // 音调逐渐升高
        this.playSound('dataProcess', { volume: 0.5, pitch });
      }, i * interval);
    }

    // 完成音效
    setTimeout(() => {
      this.playSound('dataComplete');
    }, processingTime);
  }

  /**
   * 播放计算进度音效
   */
  public playComputationProgress(progress: number): void {
    if (!this.config.enabled) return;

    const pitch = 0.7 + (progress / 100) * 0.6;
    const volume = 0.3 + (progress / 100) * 0.2;
    
    this.playSound('computationProgress', { pitch, volume });
  }

  /**
   * 启动环境音效
   */
  public startAmbientSound(type: 'ambientHum' | 'quantumResonance' = 'ambientHum'): void {
    if (!this.config.enabled || !this.audioState.context) return;

    const preset = this.soundPresets[type];
    const key = `ambient_${type}`;

    // 停止已存在的环境音
    this.stopAmbientSound(type);

    // 创建新的环境音
    const oscillator = this.audioState.context.createOscillator();
    const gainNode = this.audioState.context.createGain();
    const filter = this.audioState.context.createBiquadFilter();

    // 设置滤波器（让环境音更柔和）
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(preset.freq * 2, this.audioState.context.currentTime);

    // 连接节点
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioState.context.destination);

    // 设置参数
    oscillator.type = preset.type;
    oscillator.frequency.setValueAtTime(preset.freq, this.audioState.context.currentTime);
    
    // 缓慢淡入
    gainNode.gain.setValueAtTime(0, this.audioState.context.currentTime);
    gainNode.gain.linearRampToValueAtTime(preset.volume * this.config.volume, this.audioState.context.currentTime + 2);

    oscillator.start();

    // 存储引用
    this.activeOscillators.set(key, oscillator);
    this.gainNodes.set(key, gainNode);
  }

  /**
   * 停止环境音效  
   */
  public stopAmbientSound(type: 'ambientHum' | 'quantumResonance'): void {
    const key = `ambient_${type}`;
    
    const oscillator = this.activeOscillators.get(key);
    const gainNode = this.gainNodes.get(key);

    if (oscillator && gainNode && this.audioState.context) {
      // 缓慢淡出
      gainNode.gain.linearRampToValueAtTime(0, this.audioState.context.currentTime + 1);
      
      setTimeout(() => {
        oscillator.stop();
        this.activeOscillators.delete(key);
        this.gainNodes.delete(key);
      }, 1100);
    }
  }

  /**
   * 设置全局音量
   */
  public setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    
    // 更新所有活跃的增益节点
    this.gainNodes.forEach(gainNode => {
      if (this.audioState.context) {
        gainNode.gain.linearRampToValueAtTime(
          this.config.volume * 0.1, 
          this.audioState.context.currentTime + 0.1
        );
      }
    });
  }

  /**
   * 启用/禁用声音系统
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (!enabled) {
      // 停止所有音效
      this.activeOscillators.forEach(oscillator => {
        oscillator.stop();
      });
      this.activeOscillators.clear();
      this.gainNodes.clear();
    }
  }

  /**
   * 获取当前配置
   */
  public getConfig(): SoundConfig {
    return { ...this.config };
  }

  /**
   * 创建UI交互音效混合器
   */
  public createUIInteractionMixer(): {
    onHover: () => void;
    onClick: () => void;
    onFocus: () => void;
    onSuccess: () => void;
    onError: () => void;
  } {
    return {
      onHover: () => this.playSound('buttonHover'),
      onClick: () => this.playSound('buttonClick'),
      onFocus: () => this.playSound('tabSwitch'),
      onSuccess: () => this.playSound('dataComplete'),
      onError: () => this.playSound('dataError')
    };
  }
}

// 单例实例
export const soundDesign = new SoundDesignManager();

// React Hook封装
export const useSoundDesign = () => {
  return {
    playSound: soundDesign.playSound.bind(soundDesign),
    playDataSequence: soundDesign.playDataSequence.bind(soundDesign),
    playComputationProgress: soundDesign.playComputationProgress.bind(soundDesign),
    startAmbientSound: soundDesign.startAmbientSound.bind(soundDesign),
    stopAmbientSound: soundDesign.stopAmbientSound.bind(soundDesign),
    setVolume: soundDesign.setVolume.bind(soundDesign),
    setEnabled: soundDesign.setEnabled.bind(soundDesign),
    getConfig: soundDesign.getConfig.bind(soundDesign),
    uiMixer: soundDesign.createUIInteractionMixer()
  };
};

export default soundDesign;