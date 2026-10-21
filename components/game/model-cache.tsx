// Datei: components/game/model-cache.tsx
// Fertig aufgebaute Item-Modelle als Vorlagen.
//
// Ein Modell per React aufzubauen kostet (Dutzende Meshes). Darum wird jedes
// Modell nur EINMAL aufgebaut und als Vorlage gemerkt; danach entstehen
// Kopien per clone() – die teilen Geometrie und Material und kosten fast
// nichts. <ModelWarmup> baut die Vorlagen schon vor dem ersten Wurf auf
// (ein paar pro Frame, winzig klein im Bild, damit Shader und GPU-Puffer
// gleich mit vorbereitet werden). Vorlagen bleiben über Runden erhalten.

import { useFrame } from "@react-three/fiber/native";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { type Item } from "@/constants/items";

import { lowpoly } from "./materials";
import { TrashObject3D } from "./models";

const templates = new Map<string, THREE.Object3D>();

function remember(name: string, model: THREE.Object3D) {
  if (templates.has(name)) return;
  const copy = model.clone(true);
  copy.position.set(0, 0, 0);
  copy.rotation.set(0, 0, 0);
  copy.scale.set(1, 1, 1);
  copy.visible = true;
  templates.set(name, copy);
}

export function hasModel(name: string) {
  return templates.has(name);
}

/** Kopie der Vorlage (oder ein schlichter Ersatz, falls noch keine da ist). */
export function cloneModel(name: string): THREE.Object3D {
  const template = templates.get(name);
  if (template) return template.clone(true);
  return new THREE.Mesh(FALLBACK_GEO, lowpoly("#94A3B8"));
}

const FALLBACK_GEO = new THREE.DodecahedronGeometry(0.28, 0);

/** Baut die Vorlagen für `items` nach und nach auf (unsichtbar klein bei `at`). */
export function ModelWarmup({
  items,
  at,
  perFrame = 3,
}: {
  items: Item[];
  at: THREE.Vector3;
  perFrame?: number;
}) {
  const todo = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((i) => {
      if (templates.has(i.name) || seen.has(i.name)) return false;
      seen.add(i.name);
      return true;
    });
  }, [items]);
  const [start, setStart] = useState(0);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const frames = useRef(0);
  const batch = todo.slice(start, start + perFrame);

  useFrame(() => {
    if (batch.length === 0) return;
    // Zwei Frames gezeichnet → Shader kompiliert, Puffer hochgeladen
    frames.current += 1;
    if (frames.current < 2) return;
    frames.current = 0;
    batch.forEach((item, i) => {
      const g = refs.current[i];
      if (g) remember(item.name, g);
    });
    setStart((s) => s + perFrame);
  });

  if (batch.length === 0) return null;
  return (
    // Position als Array (R3F-eigene three-Kopie erkennt unseren Vector3 nicht)
    <group position={[at.x, at.y, at.z]} scale={0.0001}>
      {batch.map((item, i) => (
        <group
          key={item.name}
          ref={(g) => {
            refs.current[i] = g;
          }}
        >
          <TrashObject3D item={item} />
        </group>
      ))}
    </group>
  );
}
