// Datei: components/game/model-cache.tsx
// Fertig aufgebaute Item-Modelle als Vorlagen.
//
// Ein Modell per React aufzubauen kostet (Dutzende Meshes). Darum wird jedes
// Modell nur EINMAL aufgebaut und danach „gebacken“: alle einfarbigen Teile
// werden zu EINEM Mesh mit Vertex-Farben zusammengefasst, Sonderteile
// (durchsichtig, leuchtend …) zu je einem Mesh pro Material. Ein fliegender
// Gegenstand kostet so 1–3 Zeichenaufrufe statt 15–40 – entscheidend, wenn
// viele gleichzeitig fliegen (in Expo Go läuft jeder Aufruf über JS).
// Kopien entstehen per clone() und teilen Geometrie und Material.
// <ModelWarmup> baut die Vorlagen schon vor dem ersten Wurf auf (ein paar pro
// frame, winzig klein im Bild, damit Shader und GPU-Puffer gleich mit
// vorbereitet werden). Vorlagen bleiben über Runden erhalten.
// <Baked> backt genauso eine statische Kulisse (Wände, Bäume, Fenster …).

import { useFrame } from "@react-three/fiber/native";
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { type Item } from "@/constants/items";

import { lowpoly } from "./materials";
import { TrashObject3D } from "./models";

const templates = new Map<string, THREE.Object3D>();

/** Gemeinsames Material aller gebackenen, einfarbigen Teile. */
const VERTEX_COLORS = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
});

type Part = { mesh: THREE.Mesh; matrix: THREE.Matrix4 };

/** Einfarbig, deckend, ohne Leuchten → darf in das gemeinsame Mesh. */
function isPlain(material: THREE.Material): material is THREE.MeshLambertMaterial {
  if (!(material instanceof THREE.MeshLambertMaterial)) return false;
  return (
    !material.transparent &&
    material.side === THREE.FrontSide &&
    material.depthWrite &&
    !material.map &&
    material.emissive.getHex() === 0
  );
}

/** Teile zu einer Geometrie zusammenfassen (Position, Normale, optional Farbe). */
function mergeParts(parts: Part[], withColor: boolean): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  for (const { mesh, matrix } of parts) {
    const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const p = source.getAttribute("position");
    const no = source.getAttribute("normal");
    normalMatrix.getNormalMatrix(matrix);
    // Gespiegelte Teile (negative Skalierung) drehen die Dreiecke um
    const flip = matrix.determinant() < 0;
    const color = withColor ? (mesh.material as THREE.MeshLambertMaterial).color : null;
    for (let i = 0; i < p.count; i += 3) {
      for (const k of flip ? [0, 2, 1] : [0, 1, 2]) {
        const idx = i + k;
        v.fromBufferAttribute(p, idx).applyMatrix4(matrix);
        pos.push(v.x, v.y, v.z);
        if (no) n.fromBufferAttribute(no, idx).applyMatrix3(normalMatrix).normalize();
        else n.set(0, 1, 0);
        nor.push(n.x, n.y, n.z);
        if (color) col.push(color.r, color.g, color.b);
      }
    }
    if (source !== mesh.geometry) source.dispose();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  if (withColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

/** Modell → wenige Meshes (siehe oben). Ursprung bleibt der des Modells.
 *  InstancedMeshes bleiben außen vor (sind schon ein Zeichenaufruf). */
export function bake(model: THREE.Object3D): THREE.Object3D {
  model.updateWorldMatrix(true, true);
  const toLocal = model.matrixWorld.clone().invert();
  const plain: Part[] = [];
  const special = new Map<THREE.Material, Part[]>();

  model.traverseVisible((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material) || (o as THREE.InstancedMesh).isInstancedMesh)
      return;
    const part = { mesh, matrix: toLocal.clone().multiply(mesh.matrixWorld) };
    if (isPlain(mesh.material)) plain.push(part);
    else {
      const list = special.get(mesh.material) ?? [];
      list.push(part);
      special.set(mesh.material, list);
    }
  });

  const baked = new THREE.Group();
  if (plain.length > 0) baked.add(new THREE.Mesh(mergeParts(plain, true), VERTEX_COLORS));
  special.forEach((parts, material) => {
    baked.add(new THREE.Mesh(mergeParts(parts, false), material));
  });
  return baked;
}

/**
 * Statische Kulisse backen: Die Kinder werden einmal aufgebaut, zu wenigen
 * Meshes zusammengefasst und die Originale ausgeblendet. Aus ~30 Zeichen-
 * aufrufen (plus Schattenpass) werden 2–3. Nur für Teile, die sich nie
 * bewegen; InstancedMeshes bleiben, wie sie sind.
 */
export function Baked({ children }: { children: ReactNode }) {
  const source = useRef<THREE.Group>(null);
  const target = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const src = source.current;
    const dst = target.current;
    if (!src || !dst) return;
    const baked = bake(src);
    baked.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    dst.add(baked);
    const hidden: THREE.Object3D[] = [];
    src.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh && mesh.visible) {
        mesh.visible = false;
        hidden.push(mesh);
      }
    });
    return () => {
      dst.remove(baked);
      baked.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      hidden.forEach((o) => (o.visible = true));
    };
  }, []);
  return (
    <>
      <group ref={source}>{children}</group>
      <group ref={target} />
    </>
  );
}

function remember(name: string, model: THREE.Object3D): THREE.Object3D | null {
  if (templates.has(name)) return null;
  const template = bake(model);
  templates.set(name, template);
  return template;
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
  // Gebackene Vorlagen einmal mitzeichnen → Shader + GPU-Puffer bereit
  const bakedRef = useRef<THREE.Group>(null);
  // Neue Runde = neue 3D-Fläche: auch schon fertige Vorlagen einmal zeigen,
  // sonst werden ihre Shader erst mitten in der Runde übersetzt (Ruckler).
  const primeRef = useRef<THREE.Group>(null);
  const primed = useRef(0);
  const frames = useRef(0);
  const batch = todo.slice(start, start + perFrame);

  useFrame(() => {
    const prime = primeRef.current;
    if (prime && primed.current < 4) {
      primed.current += 1;
      if (primed.current === 1) {
        const seen = new Set<string>();
        items.forEach((item) => {
          const template = templates.get(item.name);
          if (!template || seen.has(item.name)) return;
          seen.add(item.name);
          prime.add(template.clone(true));
        });
      } else if (primed.current === 4) {
        prime.clear();
      }
    }
    const shown = bakedRef.current;
    if (batch.length === 0) {
      if (shown && shown.children.length > 0) shown.clear();
      return;
    }
    // Zwei Frames gezeichnet → Shader kompiliert, Puffer hochgeladen
    frames.current += 1;
    if (frames.current < 2) return;
    frames.current = 0;
    shown?.clear();
    batch.forEach((item, i) => {
      const g = refs.current[i];
      const template = g ? remember(item.name, g) : null;
      if (template && shown) shown.add(template.clone(true));
    });
    setStart((s) => s + perFrame);
  });

  return (
    // Position als Array (R3F-eigene three-Kopie erkennt unseren Vector3 nicht)
    <group position={[at.x, at.y, at.z]} scale={0.0001}>
      <group ref={bakedRef} />
      <group ref={primeRef} />
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
