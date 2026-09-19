import {
  Eraser,
  Hammer,
  HelpCircle,
  PlusSquare,
  Redo2,
  RotateCw,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CATALOG, CATEGORIES, getCatalogItem } from "../catalog";
import { COLORS, type ColorId } from "../constants";
import { useCity } from "../store";
import type { CatalogItem, CategoryId } from "../types";

export function GameUI() {
  const phase = useCity((s) => s.phase);
  if (phase === "title") return <TitleScreen />;
  return <PlayHUD />;
}

function TitleScreen() {
  const startNew = useCity((s) => s.startNew);
  const continueSave = useCity((s) => s.continueSave);
  const hasExistingSave = useCity((s) => s.hasExistingSave);

  return (
    <div className="title-screen pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-8">
      <header className="max-w-xl rounded-xl bg-bg-elevated/95 p-5 shadow-panel">
        <p className="font-display text-xs font-semibold tracking-[0.22em] text-accent uppercase">
          Tablette · Construction
        </p>
        <h1 className="mt-2 font-display text-5xl leading-none font-bold tracking-tight text-fg sm:text-7xl">
          Brickville
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-fg-muted sm:text-lg">
          Pose des plaques à plots, clipse tes briques, et fais grandir une ville entière.
        </p>
      </header>

      <div className="title-actions pointer-events-auto flex w-full max-w-md flex-col gap-3">
        <button
          type="button"
          onClick={() => { if (!hasExistingSave || window.confirm("Effacer ta ville enregistrée et en créer une nouvelle ?")) startNew(); }}
          className="h-14 rounded-lg bg-accent px-6 text-base font-semibold text-accent-fg shadow-panel transition-transform duration-200 hover:bg-accent-hover active:scale-[0.98]"
        >
          Nouvelle ville
        </button>
        {hasExistingSave ? (
          <button
            type="button"
            onClick={continueSave}
            className="h-14 rounded-lg border border-border-strong bg-bg-elevated px-6 text-base font-semibold text-fg transition-transform duration-200 hover:bg-bg-sunken active:scale-[0.98]"
          >
            Continuer ma ville
          </button>
        ) : null}
        <p className="rounded-md bg-bg-elevated/95 px-3 py-2 text-sm text-fg-muted">
          Un doigt pour regarder · toucher pour clipser · pincer pour zoomer
        </p>
      </div>
    </div>
  );
}

function PlayHUD() {
  const [category, setCategory] = useState<CategoryId>(() => {
    const it = getCatalogItem(useCity.getState().selectedId);
    return it?.category ?? "plates";
  });
  const mode = useCity((s) => s.mode);
  const selectedId = useCity((s) => s.selectedId);
  const color = useCity((s) => s.color);
  const setMode = useCity((s) => s.setMode);
  const selectItem = useCity((s) => s.selectItem);
  const setColor = useCity((s) => s.setColor);
  const rotate = useCity((s) => s.rotate);
  const undo = useCity((s) => s.undo);
  const redo = useCity((s) => s.redo);
  const resetCity = useCity((s) => s.resetCity);
  const helpOpen = useCity((s) => s.helpOpen);
  const setHelp = useCity((s) => s.setHelp);
  const bricks = useCity((s) => s.bricks);
  const plates = useCity((s) => s.plates);
  const savedHint = useCity((s) => s.savedHint);
  const saveError = useCity((s) => s.saveError);
  const notice = useCity((s) => s.notice);
  const canUndo = useCity((s) => s.past.length > 0);
  const canRedo = useCity((s) => s.future.length > 0);
  useEffect(() => {
    const item = getCatalogItem(selectedId);
    if (item) setCategory(item.category);
  }, [selectedId]);
  const groups = useMemo(() => new Set(bricks.map((b) => b.groupId)).size, [bricks]);
  const items = useMemo(() => CATALOG.filter((c) => c.category === category), [category]);
  const selected = getCatalogItem(selectedId);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
      <div className="pointer-events-auto flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        <div className="rounded-lg border border-border bg-bg-elevated/92 px-3 py-2 shadow-panel backdrop-blur-sm">
          <p className="font-display text-lg leading-none font-semibold tracking-tight">Brickville</p>
          <p className="mt-1 text-xs text-fg-muted tabular-nums">
            {plates.length} plaque{plates.length > 1 ? "s" : ""} · {groups} élément
            {groups > 1 ? "s" : ""}
            {savedHint ? " · enregistré" : ""}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <IconBtn label="Annuler" onClick={undo} disabled={!canUndo}>
            <Undo2 className="size-5" />
          </IconBtn>
          <IconBtn label="Rétablir" onClick={redo} disabled={!canRedo}>
            <Redo2 className="size-5" />
          </IconBtn>
          <IconBtn label="Aide" onClick={() => setHelp(true)}>
            <HelpCircle className="size-5" />
          </IconBtn>
          <IconBtn
            label="Recommencer"
            onClick={() => {
              if (window.confirm("Effacer cette ville et recommencer ?")) resetCity();
            }}
          >
            <Trash2 className="size-5" />
          </IconBtn>
        </div>
      </div>

      <div className="pointer-events-auto mt-1 px-3 sm:px-4">
        <div className="flex w-fit gap-1 rounded-lg border border-border bg-bg-elevated/92 p-1 shadow-panel backdrop-blur-sm">
          <ToolBtn active={mode === "place"} onClick={() => setMode("place")} label="Construire">
            <Hammer className="size-4" />
            <span className="hidden sm:inline">Construire</span>
          </ToolBtn>
          <ToolBtn active={mode === "expand"} onClick={() => setMode("expand")} label="Agrandir">
            <PlusSquare className="size-4" />
            <span className="hidden sm:inline">Agrandir</span>
          </ToolBtn>
          <ToolBtn active={mode === "erase"} onClick={() => setMode("erase")} label="Retirer">
            <Eraser className="size-4" />
            <span className="hidden sm:inline">Retirer</span>
          </ToolBtn>
          <ToolBtn active={false} onClick={() => rotate(1)} label="Tourner">
            <RotateCw className="size-4" />
            <span className="hidden sm:inline">Tourner</span>
          </ToolBtn>
        </div>
      </div>

      <div className="flex-1" />

      {saveError || notice ? <p role="status" className="mx-3 mb-2 self-start rounded-md bg-bg-elevated px-3 py-2 text-sm text-fg shadow-panel">{saveError ? "La sauvegarde est bloquée sur cet appareil. Garde le jeu ouvert pour ne pas perdre ta ville." : notice}</p> : null}

      <div className="pointer-events-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
        {selected && selected.kind !== "baseplate" ? (
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {selected.colors.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={COLOR_NAMES[c]}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={`size-11 shrink-0 rounded-full border-2 ${
                  color === c ? "border-fg scale-110" : "border-bg-elevated"
                }`}
                style={{ background: COLORS[c] }}
              />
            ))}
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-bg-elevated/95 p-3 shadow-panel backdrop-blur-md">
          <div className="flex touch-pan-x gap-1.5 overflow-x-auto pb-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={`h-11 shrink-0 rounded-sm px-3 text-sm font-medium ${
                  category === c.id ? "bg-fg text-bg" : "bg-bg-sunken text-fg-muted hover:text-fg"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex touch-pan-x gap-2 overflow-x-auto pt-1 pb-1">
            {items.map((it) => (
              <CatalogCard
                key={it.id}
                item={it}
                active={selectedId === it.id}
                color={color}
                onSelect={() => selectItem(it.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {helpOpen ? <HelpModal onClose={() => setHelp(false)} /> : null}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-md border border-border bg-bg-elevated/92 text-fg shadow-panel backdrop-blur-sm active:scale-95 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function ToolBtn({
  children,
  onClick,
  active,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  active: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-11 min-w-11 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium ${
        active ? "bg-accent text-accent-fg" : "text-fg hover:bg-bg-sunken"
      }`}
    >
      {children}
    </button>
  );
}

function CatalogCard({
  item,
  active,
  color,
  onSelect,
}: {
  item: CatalogItem;
  active: boolean;
  color: ColorId;
  onSelect: () => void;
}) {
  const fill =
    item.kind === "baseplate"
      ? plateColor(item.id)
      : COLORS[item.colors.includes(color) ? color : item.colors[0]!];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex h-24 w-24 shrink-0 flex-col items-center justify-between rounded-md border px-1.5 py-1.5 text-center ${
        active ? "border-accent bg-bg-sunken" : "border-border bg-bg hover:bg-bg-sunken"
      }`}
    >
      <Thumb item={item} fill={fill} />
      <span className="w-full truncate text-xs leading-tight font-medium text-fg-muted">
        {item.name}
      </span>
    </button>
  );
}

function plateColor(id: string) {
  if (id.includes("sand")) return "#d9c089";
  if (id.includes("plaza")) return "#b9b6ae";
  if (id.includes("water")) return "#2f7f9c";
  if (id.includes("road")) return "#5c5f63";
  return "#4a8a4e";
}

function Thumb({ item, fill }: { item: CatalogItem; fill: string }) {
  const studs = Math.min(item.w, 4);
  const rows = Math.min(item.d, 3);
  return (
    <div className="grid h-12 w-full place-items-center">
      <div
        className="relative rounded-[3px] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.35)]"
        style={{
          background: fill,
          width: item.thumb === "house" || item.thumb === "tree" ? 36 : Math.min(44, 10 + item.w * 6),
          height: item.thumb === "house" || item.thumb === "tree" ? 28 : Math.min(28, 10 + item.d * 4),
        }}
      >
        {item.thumb === "house" ? <div className="absolute inset-x-1 top-0 h-2 bg-[#c91a09]" /> : null}
        {item.kind !== "baseplate" && item.thumb !== "house" ? (
          <div className="absolute inset-x-0.5 top-0.5 flex justify-center gap-0.5">
            {Array.from({ length: Math.max(1, Math.min(studs * rows, 6)) }).map((_, i) => (
              <span key={i} className="size-1.5 rounded-full bg-white/35" />
            ))}
          </div>
        ) : (
          <div className="absolute inset-1 grid grid-cols-4 gap-0.5 opacity-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="rounded-full bg-black/20" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-fg/35 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="help-title" className="max-h-[min(36rem,88dvh)] w-full max-w-lg touch-pan-y overflow-auto rounded-xl border border-border bg-bg-elevated p-5 shadow-panel sm:p-6">
        <h2 id="help-title" className="font-display text-2xl font-semibold tracking-tight">Comment jouer</h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-fg-muted">
          <li>
            <span className="font-semibold text-fg">1. Plaques — </span>
            Choisis une plaque (pelouse, route, eau…) puis touche un emplacement marqué d’une croix
            pour agrandir la ville. Les plaques se clipsent les unes aux autres.
          </li>
          <li>
            <span className="font-semibold text-fg">2. Briques — </span>
            Ouvre le bac, choisis une pièce ou un bâtiment, une couleur, puis touche le plan. Elle se
            cale sur les plots.
          </li>
          <li>
            <span className="font-semibold text-fg">3. Empiler — </span>
            Repose une pièce sur une autre pour monter. Tourne avec le bouton ou la touche R.
            Toute la base doit être soutenue à la même hauteur. Un bâtiment se retire en entier ; retire d’abord ce qui est posé dessus.
          </li>
          <li>
            <span className="font-semibold text-fg">4. Regarder — </span>
            Glisse un doigt pour orbiter, pince pour zoomer, deux doigts pour déplacer la table.
          </li>
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-12 w-full rounded-md bg-accent text-sm font-semibold text-accent-fg hover:bg-accent-hover"
        >
          C’est compris
        </button>
      </div>
    </div>
  );
}

const COLOR_NAMES: Record<ColorId, string> = {
  white: "Blanc", black: "Noir", lightGrey: "Gris clair", darkGrey: "Gris foncé", red: "Rouge", yellow: "Jaune", blue: "Bleu", green: "Vert", orange: "Orange", brown: "Marron", tan: "Beige", darkRed: "Rouge foncé", azure: "Turquoise", lime: "Vert citron", nougat: "Caramel", darkBlue: "Bleu foncé", transYellow: "Jaune clair", sandGreen: "Vert sauge",
};
