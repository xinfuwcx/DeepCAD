// 动画模块导出
export { AnimationManager, Animation } from './AnimationManager';
export { TransitionManager } from './TransitionManager';
export { AnimationPanel } from './AnimationPanel';

export type {
  AnimationConfig,
  CameraAnimationTarget,
  ObjectAnimationTarget,
  MaterialAnimationTarget,
  AnimationEventType,
  AnimationEvent
} from './AnimationManager';

export type {
  ViewTransition,
  SceneTransition,
  ModelLoadTransition
} from './TransitionManager';