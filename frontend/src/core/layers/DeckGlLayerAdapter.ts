import { BaseLayer, LayerInitContext } from '../sceneRegistry';
import { Deck, Layer } from '@deck.gl/core';

/**
 * DeckGlLayerAdapter
 * 将一个 deck.gl Deck 实例包装为 BaseLayer (只读 Three.js 背景, 不参与其渲染, 但可统一统计/生命周期)
 * 用途: 与其他 Three.js Layer 共存, 利用统一 PerformanceOverlay 的 layer 统计 + future picking 路由。
 */
export class DeckGlLayerAdapter implements BaseLayer {
  id: string;
  visible = true;
  private deck?: Deck;
  private create: () => Deck; // 延迟创建函数

  constructor(id: string, create: () => Deck) {
    this.id = id;
    this.create = create;
  }

  init(_ctx: LayerInitContext): void {
    // Three.js 渲染循环独立; deck 自行管理。
    this.deck = this.create();
  }
  update(): void {
    // deck 内部有自己的 RAF, 这里可加同步逻辑（暂空）
  }
  setVisible(v: boolean): void {
    this.visible = v;
    if (this.deck) this.deck.setProps({ visible: v } as any);
  }
  getDeck(): Deck | undefined { return this.deck; }
  dispose(): void {
    try { this.deck?.finalize(); } catch {}
  }
  setLayers(layers: Layer[]){ this.deck?.setProps({ layers }); }
}
