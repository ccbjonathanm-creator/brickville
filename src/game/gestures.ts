/** A build action is a single, short, primary-pointer tap, never a camera gesture. */
export class TapGesture {
  private active = new Set<number>();
  private candidate: { id: number; x: number; y: number } | null = null;
  down(e: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY' | 'button'>) {
    this.active.add(e.pointerId);
    if (this.active.size !== 1 || e.button !== 0) { this.candidate = null; return; }
    this.candidate = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }
  move(e: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>) {
    const c = this.candidate;
    if (c?.id === e.pointerId && Math.hypot(e.clientX - c.x, e.clientY - c.y) > 10) this.candidate = null;
  }
  up(e: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>) {
    this.move(e);
    const tapped = this.active.size === 1 && this.candidate?.id === e.pointerId;
    this.active.delete(e.pointerId);
    this.candidate = null;
    return tapped;
  }
  cancel(id: number) { this.active.delete(id); this.candidate = null; }
}
