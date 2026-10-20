import { Feather } from "@expo/vector-icons";
import { type ComponentProps, useState } from "react";
import { StyleSheet, View } from "react-native";

import { type GameMode } from "@/constants/modes";
import { useAppTheme } from "@/providers/app-settings";

type IconName = ComponentProps<typeof Feather>["name"];
type BinKind = "bio" | "gelb" | "rest";

type BinPalette = {
  body: string;
  side: string;
  lid: string;
  handle: string;
  badge: string;
  ink: string;
  icon: IconName;
};

const BIN_COLORS: Record<BinKind, BinPalette> = {
  bio: {
    body: "#A27453",
    side: "#896044",
    lid: "#C1946D",
    handle: "#80563D",
    badge: "#F7EBDB",
    ink: "#80583D",
    icon: "feather",
  },
  gelb: {
    body: "#E8BE3A",
    side: "#CDA12B",
    lid: "#F7D76C",
    handle: "#B78D23",
    badge: "#FFF4D2",
    ink: "#94711D",
    icon: "package",
  },
  rest: {
    body: "#72838E",
    side: "#5C6E7B",
    lid: "#95A5AE",
    handle: "#596C77",
    badge: "#EDF2F3",
    ink: "#526773",
    icon: "trash-2",
  },
};

/**
 * Dekorative Tonnenzeichnung.
 * Keine Verbindung zur Spielmechanik.
 */
function SceneBin({
  kind,
  scale = 1,
  rotation = 0,
}: {
  kind: BinKind;
  scale?: number;
  rotation?: number;
}) {
  const colors = BIN_COLORS[kind];

  return (
    <View
      style={[
        styles.bin,
        {
          transform: [{ rotate: `${rotation}deg` }, { scale }],
        },
      ]}
    >
      <View style={styles.binShadow} />

      <View style={[styles.binBody, { backgroundColor: colors.body }]}>
        <View style={[styles.binSide, { backgroundColor: colors.side }]} />

        <View style={styles.binReflection} />

        <View style={[styles.binBadge, { backgroundColor: colors.badge }]}>
          <Feather name={colors.icon} size={20} color={colors.ink} />
        </View>

        <View style={[styles.binBottom, { backgroundColor: colors.side }]} />
      </View>

      <View style={styles.lidShadow} />

      <View style={[styles.binHandle, { backgroundColor: colors.handle }]} />

      <View style={[styles.binLid, { backgroundColor: colors.lid }]}>
        <View style={styles.lidReflection} />
      </View>

      <View style={[styles.wheel, styles.wheelLeft]} />
      <View style={[styles.wheel, styles.wheelRight]} />
    </View>
  );
}

function Grass({ color, small = false }: { color: string; small?: boolean }) {
  return (
    <View style={[styles.grass, small && styles.grassSmall]}>
      <View
        style={[
          styles.grassBlade,
          styles.grassBladeLeft,
          { backgroundColor: color },
        ]}
      />

      <View
        style={[
          styles.grassBlade,
          styles.grassBladeMiddle,
          { backgroundColor: color },
        ]}
      />

      <View
        style={[
          styles.grassBlade,
          styles.grassBladeRight,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

function AppleCore() {
  return (
    <View style={styles.appleCore}>
      <View style={styles.appleStem} />
      <View style={styles.appleLeaf} />
      <View style={styles.appleFlesh} />
      <View style={styles.appleTop} />
      <View style={styles.appleBottom} />
      <View style={styles.appleSeed} />
    </View>
  );
}

function FlyingCarton() {
  return (
    <View style={styles.carton}>
      <View style={styles.cartonShadow} />

      <View style={styles.cartonBody}>
        <View style={styles.cartonSide} />

        <View style={styles.cartonLabel}>
          <Feather name="package" size={17} color="#8A652A" />
        </View>

        <View style={styles.cartonReflection} />
      </View>

      <View style={styles.cartonTop} />
      <View style={styles.cartonFold} />
    </View>
  );
}

/**
 * Üben:
 * Garteninsel, locker verteilte Tonnen und ein Apfelrest.
 */
function PracticeScene() {
  return (
    <View style={styles.canvas}>
      <View style={styles.gardenSunGlow} />
      <View style={styles.gardenSun} />

      <View style={styles.gardenBackLeafLeft} />
      <View style={styles.gardenBackLeafRight} />

      <View style={styles.gardenIslandSide} />
      <View style={styles.gardenIslandTop} />
      <View style={styles.gardenPath} />

      <View style={styles.gardenGrassLeft}>
        <Grass color="#69956C" />
      </View>

      <View style={styles.gardenGrassRight}>
        <Grass color="#78A679" />
      </View>

      <View style={styles.gardenGrassFront}>
        <Grass color="#587C58" small />
      </View>

      <View style={styles.gardenBio}>
        <SceneBin kind="bio" scale={0.9} rotation={-7} />
      </View>

      <View style={styles.gardenYellow}>
        <SceneBin kind="gelb" scale={0.84} rotation={2} />
      </View>

      <View style={styles.gardenRest}>
        <SceneBin kind="rest" scale={0.8} rotation={6} />
      </View>

      {/* Angedeuteter Lernwurf zum Biomüll */}
      <View style={styles.gardenApple}>
        <AppleCore />
      </View>

      <View style={[styles.throwDot, styles.throwDotOne]} />
      <View style={[styles.throwDot, styles.throwDotTwo]} />
      <View style={[styles.throwDot, styles.throwDotThree]} />

      <View style={styles.gardenArrow}>
        <Feather name="arrow-up" size={15} color="#B4D3A4" />
      </View>

      <View style={styles.gardenPebbleOne} />
      <View style={styles.gardenPebbleTwo} />
    </View>
  );
}

/**
 * Ohne Fehler:
 * Symmetrische Bühne mit Lichtkegel und dekorativer Check-Reihe.
 */
function ChallengeScene() {
  return (
    <View style={styles.canvas}>
      <View style={styles.challengeLightOuter} />
      <View style={styles.challengeLightInner} />

      <View style={styles.challengeFloorShadow} />
      <View style={styles.challengePlatformSide} />
      <View style={styles.challengePlatformTop} />
      <View style={styles.challengePlatformEdge} />

      <View style={styles.challengeChecks}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={[styles.checkDisc, index === 1 && styles.checkDiscMiddle]}
          >
            <Feather
              name="check"
              size={index === 1 ? 14 : 11}
              color="#A8DEC4"
            />
          </View>
        ))}
      </View>

      <View style={styles.challengeBio}>
        <SceneBin kind="bio" scale={0.9} />
      </View>

      <View style={styles.challengeYellow}>
        <SceneBin kind="gelb" scale={0.96} />
      </View>

      <View style={styles.challengeRest}>
        <SceneBin kind="rest" scale={0.9} />
      </View>

      <View style={styles.challengeMarkerLeft} />
      <View style={styles.challengeMarkerRight} />

      <View style={styles.challengeSparkLeft}>
        <Feather name="plus" size={12} color="#6E9E99" />
      </View>

      <View style={styles.challengeSparkRight}>
        <Feather name="plus" size={9} color="#6E9E99" />
      </View>
    </View>
  );
}

/**
 * Zeit:
 * Tonnen im Hintergrund, diagonale Wurfbahn und großer Karton.
 */
function TimeScene() {
  return (
    <View style={styles.canvas}>
      {/* Angeschnittener Uhrenring */}
      <View style={styles.timeClockRing}>
        <View style={styles.timeClockHandLong} />
        <View style={styles.timeClockHandShort} />
        <View style={styles.timeClockCenter} />
        <View style={styles.timeClockTickTop} />
        <View style={styles.timeClockTickRight} />
      </View>

      <View style={styles.timeGround} />

      <View style={[styles.laneDash, styles.laneDashOne]} />
      <View style={[styles.laneDash, styles.laneDashTwo]} />
      <View style={[styles.laneDash, styles.laneDashThree]} />

      {/* Nach hinten versetzte, diagonale Tonnengruppe */}
      <View style={styles.timeBio}>
        <SceneBin kind="bio" scale={0.64} rotation={-5} />
      </View>

      <View style={styles.timeYellow}>
        <SceneBin kind="gelb" scale={0.72} rotation={-2} />
      </View>

      <View style={styles.timeRest}>
        <SceneBin kind="rest" scale={0.79} rotation={3} />
      </View>

      {/* Bewegungsspuren gehören zur Illustration, nicht zum Spiel */}
      <View style={[styles.motionLine, styles.motionLineOne]} />
      <View style={[styles.motionLine, styles.motionLineTwo]} />
      <View style={[styles.motionLine, styles.motionLineThree]} />

      <View style={styles.timeCarton}>
        <FlyingCarton />
      </View>

      <View style={styles.timeSmallSpark}>
        <Feather name="plus" size={12} color="#F2D58A" />
      </View>
    </View>
  );
}

export function ModeScene({ mode }: { mode: GameMode }) {
  const { colors } = useAppTheme();
  const [width, setWidth] = useState(320);

  const scale = Math.min(width / 320, 1.15);

  const tint =
    mode === "endless"
      ? "#659A64"
      : mode === "survival"
        ? "#467C83"
        : "#368D94";

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;

        setWidth((previous) =>
          Math.abs(previous - nextWidth) > 1 ? nextWidth : previous,
        );
      }}
      style={[styles.frame, { backgroundColor: colors.surface }]}
    >
      <View style={[styles.frameTint, { backgroundColor: tint }]} />

      <View style={[styles.artboard, { transform: [{ scale }] }]}>
        {mode === "endless" ? (
          <PracticeScene />
        ) : mode === "survival" ? (
          <ChallengeScene />
        ) : (
          <TimeScene />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 182,
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  frameTint: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.1,
  },
  artboard: {
    width: 320,
    height: 182,
    flexShrink: 0,
  },
  canvas: {
    width: 320,
    height: 182,
  },

  // Gemeinsame Tonnen
  bin: {
    width: 60,
    height: 82,
  },
  binShadow: {
    position: "absolute",
    bottom: -2,
    left: 7,
    width: 47,
    height: 6,
    borderRadius: 24,
    backgroundColor: "#000000",
    opacity: 0.12,
  },
  binBody: {
    position: "absolute",
    top: 12,
    left: 5,
    right: 3,
    bottom: 5,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: "hidden",
  },
  binSide: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 7,
    opacity: 0.55,
  },
  binReflection: {
    position: "absolute",
    top: 10,
    left: 5,
    width: 3,
    height: 23,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    opacity: 0.15,
  },
  binBadge: {
    position: "absolute",
    left: 8,
    top: 18,
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  binBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    opacity: 0.2,
  },
  lidShadow: {
    position: "absolute",
    top: 13,
    left: 5,
    right: 3,
    height: 3,
    backgroundColor: "#000000",
    opacity: 0.12,
  },
  binHandle: {
    position: "absolute",
    top: 0,
    left: 22,
    width: 17,
    height: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  binLid: {
    position: "absolute",
    top: 5,
    left: 0,
    right: 0,
    height: 10,
    borderRadius: 4,
    overflow: "hidden",
  },
  lidReflection: {
    position: "absolute",
    top: 1,
    left: 6,
    width: 28,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    opacity: 0.2,
  },
  wheel: {
    position: "absolute",
    bottom: 0,
    width: 7,
    height: 7,
    borderRadius: 3,
    backgroundColor: "#304039",
  },
  wheelLeft: {
    left: 11,
  },
  wheelRight: {
    right: 8,
  },

  // Garten
  gardenSunGlow: {
    position: "absolute",
    top: 9,
    right: 35,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#D8CD91",
    opacity: 0.045,
  },
  gardenSun: {
    position: "absolute",
    top: 26,
    right: 54,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D8CD91",
    opacity: 0.35,
  },
  gardenBackLeafLeft: {
    position: "absolute",
    left: 33,
    top: 58,
    width: 44,
    height: 65,
    borderTopLeftRadius: 40,
    borderBottomRightRadius: 40,
    backgroundColor: "#6A956D",
    opacity: 0.13,
    transform: [{ rotate: "-28deg" }],
  },
  gardenBackLeafRight: {
    position: "absolute",
    right: 24,
    top: 69,
    width: 35,
    height: 51,
    borderTopRightRadius: 35,
    borderBottomLeftRadius: 35,
    backgroundColor: "#6A956D",
    opacity: 0.13,
    transform: [{ rotate: "25deg" }],
  },
  gardenIslandSide: {
    position: "absolute",
    left: 26,
    bottom: 17,
    width: 268,
    height: 47,
    borderRadius: 130,
    backgroundColor: "#4D6547",
    opacity: 0.65,
  },
  gardenIslandTop: {
    position: "absolute",
    left: 26,
    bottom: 25,
    width: 268,
    height: 47,
    borderRadius: 130,
    backgroundColor: "#73845B",
    opacity: 0.6,
  },
  gardenPath: {
    position: "absolute",
    left: 90,
    bottom: 31,
    width: 154,
    height: 24,
    borderRadius: 80,
    backgroundColor: "#B5A77C",
    opacity: 0.23,
    transform: [{ rotate: "-4deg" }],
  },
  gardenBio: {
    position: "absolute",
    left: 65,
    top: 59,
  },
  gardenYellow: {
    position: "absolute",
    left: 133,
    top: 42,
  },
  gardenRest: {
    position: "absolute",
    left: 199,
    top: 58,
  },
  gardenGrassLeft: {
    position: "absolute",
    left: 36,
    bottom: 45,
  },
  gardenGrassRight: {
    position: "absolute",
    right: 30,
    bottom: 41,
  },
  gardenGrassFront: {
    position: "absolute",
    left: 190,
    bottom: 24,
  },
  grass: {
    width: 20,
    height: 22,
  },
  grassSmall: {
    transform: [{ scale: 0.7 }],
  },
  grassBlade: {
    position: "absolute",
    bottom: 0,
    width: 4,
    borderRadius: 4,
  },
  grassBladeLeft: {
    left: 4,
    height: 15,
    transform: [{ rotate: "-26deg" }],
  },
  grassBladeMiddle: {
    left: 10,
    height: 21,
    transform: [{ rotate: "4deg" }],
  },
  grassBladeRight: {
    right: 0,
    height: 14,
    transform: [{ rotate: "31deg" }],
  },
  gardenApple: {
    position: "absolute",
    left: 132,
    top: 128,
    transform: [{ rotate: "17deg" }],
  },
  appleCore: {
    width: 24,
    height: 34,
  },
  appleFlesh: {
    position: "absolute",
    left: 8,
    top: 10,
    width: 9,
    height: 18,
    borderRadius: 5,
    backgroundColor: "#F5E8BE",
  },
  appleTop: {
    position: "absolute",
    left: 3,
    top: 8,
    width: 21,
    height: 8,
    borderRadius: 6,
    backgroundColor: "#D98A65",
  },
  appleBottom: {
    position: "absolute",
    left: 4,
    bottom: 3,
    width: 19,
    height: 7,
    borderRadius: 5,
    backgroundColor: "#D98A65",
  },
  appleStem: {
    position: "absolute",
    left: 12,
    top: 1,
    width: 3,
    height: 9,
    borderRadius: 2,
    backgroundColor: "#896241",
    transform: [{ rotate: "10deg" }],
  },
  appleLeaf: {
    position: "absolute",
    left: 15,
    top: 2,
    width: 9,
    height: 5,
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: "#8DA86A",
    transform: [{ rotate: "-20deg" }],
  },
  appleSeed: {
    position: "absolute",
    left: 11,
    top: 18,
    width: 3,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#936B45",
  },
  throwDot: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#B4D3A4",
    opacity: 0.65,
  },
  throwDotOne: {
    left: 124,
    top: 137,
  },
  throwDotTwo: {
    left: 111,
    top: 131,
  },
  throwDotThree: {
    left: 104,
    top: 119,
  },
  gardenArrow: {
    position: "absolute",
    left: 95,
    top: 99,
    opacity: 0.8,
    transform: [{ rotate: "-15deg" }],
  },
  gardenPebbleOne: {
    position: "absolute",
    left: 69,
    bottom: 30,
    width: 9,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#C1B895",
    opacity: 0.5,
  },
  gardenPebbleTwo: {
    position: "absolute",
    right: 63,
    bottom: 29,
    width: 6,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#C1B895",
    opacity: 0.4,
  },

  // Challenge
  challengeLightOuter: {
    position: "absolute",
    left: 49,
    top: 5,
    width: 222,
    height: 147,
    borderTopLeftRadius: 110,
    borderTopRightRadius: 110,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: "#7EB8B2",
    opacity: 0.045,
  },
  challengeLightInner: {
    position: "absolute",
    left: 83,
    top: 17,
    width: 154,
    height: 126,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    backgroundColor: "#9CCFC4",
    opacity: 0.04,
  },
  challengeFloorShadow: {
    position: "absolute",
    left: 39,
    bottom: 15,
    width: 242,
    height: 18,
    borderRadius: 120,
    backgroundColor: "#000000",
    opacity: 0.13,
  },
  challengePlatformSide: {
    position: "absolute",
    left: 36,
    bottom: 24,
    width: 248,
    height: 29,
    borderRadius: 12,
    backgroundColor: "#284B51",
  },
  challengePlatformTop: {
    position: "absolute",
    left: 36,
    bottom: 36,
    width: 248,
    height: 25,
    borderRadius: 12,
    backgroundColor: "#41666A",
  },
  challengePlatformEdge: {
    position: "absolute",
    left: 49,
    bottom: 37,
    width: 222,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#A7DAC8",
    opacity: 0.32,
  },
  challengeChecks: {
    position: "absolute",
    top: 19,
    left: 118,
    width: 84,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkDisc: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#355B59",
  },
  checkDiscMiddle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#427465",
  },
  challengeBio: {
    position: "absolute",
    top: 58,
    left: 59,
  },
  challengeYellow: {
    position: "absolute",
    top: 54,
    left: 130,
  },
  challengeRest: {
    position: "absolute",
    top: 58,
    left: 201,
  },
  challengeMarkerLeft: {
    position: "absolute",
    left: 45,
    bottom: 46,
    width: 3,
    height: 10,
    borderRadius: 2,
    backgroundColor: "#9BD4BD",
    opacity: 0.55,
  },
  challengeMarkerRight: {
    position: "absolute",
    right: 45,
    bottom: 46,
    width: 3,
    height: 10,
    borderRadius: 2,
    backgroundColor: "#9BD4BD",
    opacity: 0.55,
  },
  challengeSparkLeft: {
    position: "absolute",
    left: 54,
    top: 34,
    opacity: 0.65,
  },
  challengeSparkRight: {
    position: "absolute",
    right: 57,
    top: 28,
    opacity: 0.55,
  },

  // Zeit
  timeClockRing: {
    position: "absolute",
    top: -25,
    right: -14,
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 4,
    borderColor: "#74B5B5",
    opacity: 0.16,
  },
  timeClockHandLong: {
    position: "absolute",
    top: 29,
    left: 65,
    width: 4,
    height: 40,
    borderRadius: 2,
    backgroundColor: "#9BCAC2",
  },
  timeClockHandShort: {
    position: "absolute",
    top: 65,
    left: 66,
    width: 31,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#9BCAC2",
    transform: [{ rotate: "25deg" }],
  },
  timeClockCenter: {
    position: "absolute",
    top: 62,
    left: 62,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#9BCAC2",
  },
  timeClockTickTop: {
    position: "absolute",
    top: 8,
    left: 65,
    width: 3,
    height: 8,
    borderRadius: 2,
    backgroundColor: "#9BCAC2",
  },
  timeClockTickRight: {
    position: "absolute",
    top: 65,
    right: 8,
    width: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#9BCAC2",
  },
  timeGround: {
    position: "absolute",
    left: 31,
    bottom: 26,
    width: 280,
    height: 39,
    borderRadius: 100,
    backgroundColor: "#40838A",
    opacity: 0.13,
    transform: [{ rotate: "-13deg" }],
  },
  laneDash: {
    position: "absolute",
    height: 2,
    borderRadius: 2,
    backgroundColor: "#83BAB4",
    opacity: 0.23,
    transform: [{ rotate: "-24deg" }],
  },
  laneDashOne: {
    left: 76,
    bottom: 35,
    width: 21,
  },
  laneDashTwo: {
    left: 111,
    bottom: 51,
    width: 26,
  },
  laneDashThree: {
    left: 151,
    bottom: 69,
    width: 29,
  },
  timeBio: {
    position: "absolute",
    left: 128,
    top: 29,
  },
  timeYellow: {
    position: "absolute",
    left: 180,
    top: 42,
  },
  timeRest: {
    position: "absolute",
    left: 235,
    top: 58,
  },
  timeCarton: {
    position: "absolute",
    left: 69,
    top: 91,
    transform: [{ rotate: "-19deg" }],
  },
  carton: {
    width: 47,
    height: 52,
  },
  cartonShadow: {
    position: "absolute",
    bottom: -13,
    left: 7,
    width: 37,
    height: 7,
    borderRadius: 20,
    backgroundColor: "#000000",
    opacity: 0.08,
  },
  cartonBody: {
    position: "absolute",
    left: 3,
    right: 1,
    top: 11,
    bottom: 0,
    borderRadius: 4,
    backgroundColor: "#E8BC65",
    overflow: "hidden",
  },
  cartonSide: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 10,
    backgroundColor: "#C89541",
  },
  cartonLabel: {
    position: "absolute",
    top: 10,
    left: 7,
    width: 23,
    height: 22,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0C7",
  },
  cartonReflection: {
    position: "absolute",
    top: 5,
    left: 4,
    width: 2,
    height: 12,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    opacity: 0.2,
  },
  cartonTop: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 43,
    height: 12,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: "#F5D78C",
  },
  cartonFold: {
    position: "absolute",
    top: 3,
    left: 24,
    width: 3,
    height: 12,
    backgroundColor: "#C89C4F",
    opacity: 0.5,
  },
  motionLine: {
    position: "absolute",
    height: 3,
    borderRadius: 2,
    backgroundColor: "#F1D28A",
    opacity: 0.55,
    transform: [{ rotate: "-19deg" }],
  },
  motionLineOne: {
    left: 28,
    top: 105,
    width: 25,
  },
  motionLineTwo: {
    left: 14,
    top: 117,
    width: 36,
  },
  motionLineThree: {
    left: 33,
    top: 129,
    width: 22,
  },
  timeSmallSpark: {
    position: "absolute",
    left: 117,
    top: 69,
    opacity: 0.65,
  },
});
