// Datei: components/game/models.tsx
// 3D-Modelle der Müllobjekte. Die eigentlichen Modelle liegen pro Kategorie
// in ./models/, die Zusatzmodelle für Papier/Glas/Sondermüll in models-extra.

import { memo, useMemo } from "react";

import { type Item } from "@/constants/items";

import { renderBioModel } from "./models/bio";
import { renderGelberSackModel } from "./models/gelber-sack";
import { renderRestmuellModel } from "./models/restmuell";
import { normalizeName, resolveModelKey } from "./models/rules";
import { EXTRA_MODEL_RULES, renderExtraModel } from "./models-extra";

export const TrashObject3D = memo(function TrashObject3D({
  item,
}: {
  item: Item;
}) {
  const { key, name } = useMemo(() => {
    const normalized = normalizeName(item.name);
    const extra = EXTRA_MODEL_RULES.find(([re]) => re.test(normalized))?.[1];
    return { key: extra ?? resolveModelKey(normalized), name: normalized };
  }, [item.name]);

  return (
    renderExtraModel(key) ??
    renderBioModel(key, name) ??
    renderGelberSackModel(key, name) ??
    renderRestmuellModel(key, name)
  );
});
