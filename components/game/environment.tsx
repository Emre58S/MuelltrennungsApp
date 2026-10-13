import { useFrame } from "@react-three/fiber/native";
import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { type ColorScheme } from "@/constants/theme";

type Vec3 = [number, number, number];
type SceneKind = "garden" | "courtyard" | "park";
type Shape = "box" | "sphere" | "stone" | "leaf";

type Instance = {
  position: Vec3;
  scale: Vec3;
  color: string;
  rotation?: Vec3;
};

type Palette = {
  sky: string;
  floor: readonly string[];
  grout: string;
  curb: string;
  soil: string;
  grass: string;
  foliage: readonly string[];
  wood: string;
  trunk: string;
  brick: readonly string[];
  mortar: string;
  metal: string;
  leaves: readonly string[];
  ambient: number;
  sun: number;
  skyLight: string;
  groundLight: string;
};

const SCENES: SceneKind[] = ["garden", "courtyard", "park"];
let sceneCounter = 0;

function chooseScene(): SceneKind {
  const scene = SCENES[sceneCounter % SCENES.length];
  sceneCounter += 1;
  return scene;
}

function randomFrom(seed: number) {
  let value = seed;

  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function paletteFor(scene: SceneKind, dark: boolean): Palette {
  const base: Palette =
    scene === "courtyard"
      ? {
          sky: "#CCDADB",
          floor: ["#BDB9AF", "#C5C0B5", "#B9B6AD", "#C1BCB2"],
          grout: "#97968D",
          curb: "#AAA89D",
          soil: "#74634E",
          grass: "#87916A",
          foliage: ["#687C55", "#748761", "#5D714D"],
          wood: "#AA8E68",
          trunk: "#80654D",
          brick: ["#AD795D", "#B78061", "#A97459", "#BC8769"],
          mortar: "#968477",
          metal: "#586362",
          leaves: ["#A99565", "#978654", "#B09D72"],
          ambient: 0.85,
          sun: 1.25,
          skyLight: "#EEF2EC",
          groundLight: "#BAAC98",
        }
      : scene === "park"
        ? {
            sky: "#D1E4E8",
            floor: ["#D0CEC0", "#C8C7BA", "#D5D2C5", "#CCCBBD"],
            grout: "#ACAEA1",
            curb: "#BCBDB0",
            soil: "#82735B",
            grass: "#A0B783",
            foliage: ["#75936B", "#68855F", "#829F76"],
            wood: "#C6B38D",
            trunk: "#8C7658",
            brick: ["#AD795D"],
            mortar: "#968477",
            metal: "#5E6C68",
            leaves: ["#B4AC79", "#9E9C68", "#C0B586"],
            ambient: 0.85,
            sun: 1.3,
            skyLight: "#EDF4ED",
            groundLight: "#BAB49B",
          }
        : {
            sky: "#C5DFE7",
            floor: ["#D9CEB7", "#D2C7B1", "#DFD5BF", "#D6CBB5"],
            grout: "#B0A58F",
            curb: "#BFB39C",
            soil: "#8D775A",
            grass: "#A4BA82",
            foliage: ["#789963", "#6B8C58", "#88A66F"],
            wood: "#BAA47B",
            trunk: "#947452",
            brick: ["#AD795D"],
            mortar: "#968477",
            metal: "#657064",
            leaves: ["#B7A273", "#AA9564", "#C0AF80"],
            ambient: 0.85,
            sun: 1.3,
            skyLight: "#F0F5E9",
            groundLight: "#C4B293",
          };

  if (!dark) return base;

  // Dunkelmodus: Materialien bleiben warm und unterscheidbar.
  return {
    ...base,
    sky: scene === "courtyard" ? "#303B45" : "#30434D",
    ambient: 0.55,
    sun: 0.7,
    skyLight: "#A7B8C8",
    groundLight: "#857966",
  };
}

function Instances({
  data,
  shape = "box",
  shadow = false,
}: {
  data: Instance[];
  shape?: Shape;
  shadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    const object = new THREE.Object3D();
    const color = new THREE.Color();

    data.forEach((entry, index) => {
      object.position.set(...entry.position);
      object.scale.set(...entry.scale);
      object.rotation.set(...(entry.rotation ?? [0, 0, 0]));
      object.updateMatrix();

      mesh.setMatrixAt(index, object.matrix);
      mesh.setColorAt(index, color.set(entry.color));
    });

    mesh.instanceMatrix.needsUpdate = true;

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }

    mesh.computeBoundingSphere();
  }, [data]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, data.length]}
      castShadow={shadow}
      receiveShadow
    >
      {shape === "box" && <boxGeometry args={[1, 1, 1]} />}
      {shape === "sphere" && <sphereGeometry args={[1, 10, 8]} />}
      {shape === "stone" && <icosahedronGeometry args={[1, 0]} />}
      {shape === "leaf" && <circleGeometry args={[1, 6]} />}

      <meshStandardMaterial
        roughness={1}
        side={shape === "leaf" ? THREE.DoubleSide : THREE.FrontSide}
      />
    </instancedMesh>
  );
}

function Box({
  position,
  size,
  color,
  shadow = false,
}: {
  position: Vec3;
  size: Vec3;
  color: string;
  shadow?: boolean;
}) {
  return (
    <mesh position={position} castShadow={shadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function Ground({
  scene,
  p,
}: {
  scene: SceneKind;
  p: Palette;
}) {
  const tiles = useMemo(() => {
    const random = randomFrom(81);
    const result: Instance[] = [];
    const tileX = scene === "courtyard" ? 1.2 : 1;
    const tileZ = scene === "courtyard" ? 1.2 : 1.35;

    for (let row = 0; row < 17; row++) {
      for (let column = 0; column < 18; column++) {
        result.push({
          position: [
            (column - 8.5) * tileX,
            -0.035,
            -1.45 + row * tileZ,
          ],
          scale: [tileX - 0.018, 0.07, tileZ - 0.018],
          color: p.floor[Math.floor(random() * p.floor.length)],
        });
      }
    }

    return result;
  }, [p, scene]);

  return (
    <group>
      <mesh
        position={[0, -0.08, 5]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[60, 50]} />
        <meshStandardMaterial color={p.grout} roughness={1} />
      </mesh>

      <Instances data={tiles} />

      <Box
        position={[0, 0.025, -1.95]}
        size={[20, 0.05, 0.16]}
        color={p.curb}
      />

      {[-4.2, 4.2].map((x) => (
        <Box
          key={x}
          position={[x, 0.035, 3.8]}
          size={[0.16, 0.07, 11.5]}
          color={p.curb}
        />
      ))}
    </group>
  );
}

function EdgeDetails({
  scene,
  p,
}: {
  scene: SceneKind;
  p: Palette;
}) {
  const leaves = useMemo(() => {
    const random = randomFrom(24);
    const count = scene === "courtyard" ? 8 : 16;

    return Array.from({ length: count }, (_, index): Instance => {
      const side = index % 2 === 0 ? -1 : 1;
      const size = 0.04 + random() * 0.045;

      return {
        position: [
          side * (3.35 + random() * 0.65),
          0.009,
          -0.6 + random() * 7,
        ],
        scale: [size, size * 0.55, 1],
        rotation: [-Math.PI / 2, 0, random() * Math.PI * 2],
        color: p.leaves[index % p.leaves.length],
      };
    });
  }, [p, scene]);

  const stones = useMemo(() => {
    const random = randomFrom(36);

    return Array.from({ length: 14 }, (_, index): Instance => {
      const size = 0.025 + random() * 0.02;

      return {
        position: [
          (index % 2 === 0 ? -1 : 1) * (3.96 + random() * 0.1),
          size * 0.35,
          random() * 7,
        ],
        scale: [size, size * 0.55, size * 0.8],
        color: p.curb,
      };
    });
  }, [p]);

  return (
    <group>
      <Instances data={leaves} shape="leaf" />
      <Instances data={stones} shape="stone" />
    </group>
  );
}

function PlantBeds({ p }: { p: Palette }) {
  const plants = useMemo(() => {
    const random = randomFrom(52);
    const result: Instance[] = [];

    for (const side of [-1, 1]) {
      for (let index = 0; index < 18; index++) {
        result.push({
          position: [
            side * (4.55 + random() * 0.35),
            0.16 + random() * 0.08,
            -0.9 + index * 0.42,
          ],
          scale: [
            0.2 + random() * 0.08,
            0.18 + random() * 0.09,
            0.18 + random() * 0.08,
          ],
          color: p.foliage[index % p.foliage.length],
        });
      }
    }

    return result;
  }, [p]);

  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box
            position={[side * 5.2, -0.015, 3.1]}
            size={[1.8, 0.03, 10]}
            color={p.grass}
          />
          <Box
            position={[side * 4.65, 0.002, 3.1]}
            size={[0.75, 0.012, 9.8]}
            color={p.soil}
          />
        </group>
      ))}

      <Instances data={plants} shape="sphere" />
    </group>
  );
}

function Hedge({
  p,
  z,
}: {
  p: Palette;
  z: number;
}) {
  const data = useMemo(() => {
    const random = randomFrom(7);

    return Array.from({ length: 40 }, (_, index): Instance => ({
      position: [
        -9.75 + index * 0.5,
        0.58 + random() * 0.2,
        z - random() * 0.2,
      ],
      scale: [
        0.6 + random() * 0.1,
        0.52 + random() * 0.12,
        0.55 + random() * 0.1,
      ],
      color: p.foliage[index % p.foliage.length],
    }));
  }, [p, z]);

  return <Instances data={data} shape="sphere" />;
}

function Tree({
  x,
  z,
  size,
  p,
}: {
  x: number;
  z: number;
  size: number;
  p: Palette;
}) {
  const canopy = useMemo<Instance[]>(
    () => [
      {
        position: [0, 2.05, 0],
        scale: [0.8, 0.85, 0.8],
        color: p.foliage[0],
      },
      {
        position: [-0.45, 1.7, 0.1],
        scale: [0.6, 0.65, 0.6],
        color: p.foliage[1],
      },
      {
        position: [0.45, 1.75, -0.1],
        scale: [0.65, 0.65, 0.65],
        color: p.foliage[2],
      },
    ],
    [p],
  );

  return (
    <group position={[x, 0, z]} scale={size}>
      <mesh position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 1.56, 8]} />
        <meshStandardMaterial color={p.trunk} roughness={1} />
      </mesh>

      <Instances data={canopy} shape="sphere" shadow />
    </group>
  );
}

function Clouds({
  calm,
  dark,
}: {
  calm: boolean;
  dark: boolean;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, rawDelta) => {
    if (!ref.current || calm) return;

    const delta = Math.min(rawDelta, 0.05);

    ref.current.children.forEach((cloud, index) => {
      cloud.position.x += delta * (0.04 + index * 0.01);

      if (cloud.position.x > 12) {
        cloud.position.x = -12;
      }
    });
  });

  return (
    <group ref={ref}>
      {[
        [-4.5, 5.5, -11, 1.2],
        [3.5, 6.3, -13, 1.5],
      ].map(([x, y, z, size], index) => (
        <group key={index} position={[x, y, z]} scale={size}>
          {[
            [0, 0, 0.7],
            [-0.55, -0.1, 0.48],
            [0.55, -0.05, 0.5],
          ].map(([cx, cy, radius], part) => (
            <mesh
              key={part}
              position={[cx, cy, 0]}
              scale={[1, 0.6, 0.65]}
            >
              <sphereGeometry args={[radius, 10, 8]} />
              <meshBasicMaterial
                color={dark ? "#63747D" : "#F5F5EB"}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function NaturalBackground({
  scene,
  p,
  calm,
  dark,
}: {
  scene: "garden" | "park";
  p: Palette;
  calm: boolean;
  dark: boolean;
}) {
  const fence = useMemo<Instance[]>(
    () =>
      Array.from({ length: 31 }, (_, index) => ({
        position: [-9 + index * 0.6, 0.72, -2.75],
        scale: [0.47, 1.44, 0.1],
        color: p.wood,
      })),
    [p],
  );

  return (
    <group>
      <Box
        position={[0, -0.065, -9]}
        size={[60, 0.04, 14]}
        color={p.grass}
      />

      <PlantBeds p={p} />

      {scene === "park" && (
        <group>
          <Instances data={fence} />

          {[0.3, 1.05].map((y) => (
            <Box
              key={y}
              position={[0, y, -2.63]}
              size={[20, 0.09, 0.08]}
              color={p.trunk}
            />
          ))}

          <Bench p={p} />
        </group>
      )}

      <Hedge p={p} z={scene === "park" ? -4.4 : -3.2} />
      <Tree x={-5} z={-4.8} size={1.35} p={p} />
      <Tree x={5.2} z={-5} size={1.5} p={p} />
      <Clouds calm={calm} dark={dark} />
    </group>
  );
}

function Bench({ p }: { p: Palette }) {
  const parts = useMemo<Instance[]>(() => {
    const result: Instance[] = [];

    for (const x of [-0.55, 0.55]) {
      result.push({
        position: [x, 0.23, 0],
        scale: [0.08, 0.46, 0.45],
        color: p.metal,
      });
      result.push({
        position: [x, 0.72, -0.23],
        scale: [0.07, 0.65, 0.07],
        color: p.metal,
      });
    }

    for (const z of [-0.16, 0, 0.16]) {
      result.push({
        position: [0, 0.48, z],
        scale: [1.45, 0.07, 0.13],
        color: p.wood,
      });
    }

    for (const y of [0.72, 0.94]) {
      result.push({
        position: [0, y, -0.23],
        scale: [1.45, 0.16, 0.07],
        color: p.wood,
      });
    }

    return result;
  }, [p]);

  return (
    <group position={[-3.7, 0, -1.35]} rotation={[0, 0.1, 0]}>
      <Instances data={parts} shadow />
    </group>
  );
}

function Courtyard({
  p,
  dark,
}: {
  p: Palette;
  dark: boolean;
}) {
  const bricks = useMemo(() => {
    const random = randomFrom(21);
    const result: Instance[] = [];

    for (let row = 0; row < 12; row++) {
      for (let column = 0; column < 24; column++) {
        result.push({
          position: [
            -8.8 + column * 0.76 + (row % 2) * 0.38,
            0.29 + row * 0.32,
            -2.19 + random() * 0.008,
          ],
          scale: [0.732, 0.292, 0.1],
          color: p.brick[Math.floor(random() * p.brick.length)],
        });
      }
    }

    return result;
  }, [p]);

  return (
    <group>
      <Box
        position={[0, 1.98, -2.31]}
        size={[20, 4.1, 0.22]}
        color={p.mortar}
      />

      <Instances data={bricks} />

      <Box
        position={[0, 0.12, -2.09]}
        size={[20, 0.24, 0.22]}
        color={p.curb}
      />

      <Box
        position={[0, 4, -2.23]}
        size={[20, 0.12, 0.38]}
        color={p.metal}
      />

      <Box
        position={[3.55, 1.95, -2]}
        size={[0.085, 3.85, 0.085]}
        color={p.metal}
      />

      {[0.6, 1.8, 3.1].map((y) => (
        <Box
          key={y}
          position={[3.55, y, -1.975]}
          size={[0.16, 0.055, 0.1]}
          color={p.metal}
        />
      ))}

      <group position={[-2.9, 2.75, -2]}>
        <Box
          position={[0, 0, 0]}
          size={[0.4, 0.22, 0.2]}
          color={p.metal}
        />

        <mesh position={[0, -0.065, 0.11]}>
          <boxGeometry args={[0.3, 0.075, 0.018]} />
          <meshStandardMaterial
            color="#FFE4B9"
            emissive="#FFD5A0"
            emissiveIntensity={dark ? 1.25 : 0.15}
          />
        </mesh>

        <pointLight
          position={[0, -0.2, 0.4]}
          color="#FFE0B5"
          intensity={dark ? 5 : 0.3}
          distance={5}
          decay={2}
        />
      </group>

      <group position={[3.55, 0, 1.3]}>
        <Box
          position={[0, 0.01, 0]}
          size={[0.46, 0.02, 0.68]}
          color={p.metal}
        />

        {Array.from({ length: 6 }, (_, index) => (
          <Box
            key={index}
            position={[0, 0.023, -0.26 + index * 0.104]}
            size={[0.36, 0.005, 0.025]}
            color={p.grout}
          />
        ))}
      </group>

      <group position={[-3.7, 0, -1.25]}>
        <Box
          position={[0, 0.19, 0]}
          size={[0.58, 0.38, 0.52]}
          color={p.mortar}
          shadow
        />
        <Box
          position={[0, 0.385, 0]}
          size={[0.47, 0.01, 0.41]}
          color={p.soil}
        />
        <mesh position={[0, 0.54, 0]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.29, 10, 8]} />
          <meshStandardMaterial color={p.foliage[1]} roughness={1} />
        </mesh>
      </group>
    </group>
  );
}

const FEVER_COLOR = new THREE.Color("#D3AD80");

export const Environment = memo(function Environment({
  scheme,
  fever,
  calm,
}: {
  scheme: ColorScheme;
  fever: boolean;
  calm: boolean;
}) {
  const [scene] = useState(chooseScene);
  const dark = scheme === "dark";

  const p = useMemo(() => paletteFor(scene, dark), [scene, dark]);
  const baseSky = useMemo(() => new THREE.Color(p.sky), [p.sky]);

  const skyRef = useRef<THREE.Color>(null);
  const feverAmount = useRef(0);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);

    feverAmount.current = THREE.MathUtils.damp(
      feverAmount.current,
      fever ? 1 : 0,
      3,
      delta,
    );

    const pulse = calm
      ? 0.5
      : 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.5;

    skyRef.current
      ?.copy(baseSky)
      .lerp(FEVER_COLOR, feverAmount.current * (0.08 + pulse * 0.04));
  });

  return (
    <>
      <color ref={skyRef} attach="background" args={[p.sky]} />

      <ambientLight intensity={p.ambient} />

      <hemisphereLight
        args={[p.skyLight, p.groundLight, dark ? 0.6 : 0.55]}
      />

      <directionalLight
        position={[-3, 7, 5]}
        color={dark ? "#DCE5EB" : "#FFF3DD"}
        intensity={p.sun}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />

      <Ground scene={scene} p={p} />
      <EdgeDetails scene={scene} p={p} />

      {scene === "courtyard" ? (
        <Courtyard p={p} dark={dark} />
      ) : (
        <NaturalBackground
          scene={scene}
          p={p}
          dark={dark}
          calm={calm}
        />
      )}
    </>
  );
});