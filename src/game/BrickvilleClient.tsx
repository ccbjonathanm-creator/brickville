import { useEffect, useRef } from "react";
import { GameUI } from "./overlay/GameUI";
import { mountCity } from "./scene/engine";
import { useCity } from "./store";
import { unlockAudio } from "./audio";

export function BrickvilleClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotate = useCity((s) => s.rotate);
  const undo = useCity((s) => s.undo);
  const redo = useCity((s) => s.redo);
  const setMode = useCity((s) => s.setMode);
  const setHelp = useCity((s) => s.setHelp);
  const persist = useCity((s) => s.persist);
  const phase = useCity((s) => s.phase);
  const startDemo = useCity((s) => s.startDemo);

  useEffect(() => {
    startDemo();
  }, [startDemo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return mountCity(canvas);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "play") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.code === "KeyR") {
        e.preventDefault();
        rotate(e.shiftKey ? -1 : 1);
      } else if (e.code === "KeyZ" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.code === "KeyE") {
        setMode("expand");
      } else if (e.code === "KeyB") {
        setMode("place");
      } else if (e.code === "KeyX" || e.code === "Delete" || e.code === "Backspace") {
        e.preventDefault();
        setMode("erase");
      } else if (e.code === "Escape") {
        setHelp(false);
      }
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", persist);
    };
  }, [phase, persist, redo, rotate, setHelp, setMode, undo]);

  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-sky select-none"
      style={{ touchAction: "none" }}
      onPointerDown={unlockAudio}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        style={{ touchAction: "none" }}
      />
      <GameUI />
    </div>
  );
}
