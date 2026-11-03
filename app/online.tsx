// Datei: app/online.tsx — Bereich „Online“ (Mehrspieler)
//
// Hinter der blauen Menü-Tonne: gegen den eigenen Rekord, den Besten von
// heute oder Freunde per Code (Ghost), zu zweit an einem Handy (Duell),
// Freunde (Freundes-Code, R4e) und die Rangliste. Zeit-Sprint (30 s, R4a), Survival (R4b); Parcours des Tages
// (für alle gleich, Vorstufe zum Trick-Battle R4c).

import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { HubCard, HubScreen } from "@/components/ui/hub";
import { Radius, Spacing } from "@/constants/theme";
import { readCode } from "@/game/ghost-track";
import { dailyParcoursId } from "@/game/parcours";
import { levelIcons, PARCOURS } from "@/game/trick-levels";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import { getBoolean, getParcoursBest, setBoolean, StorageKeys, todayKey } from "@/utils/storage";

/** Parcours des Tages zu einem Tag (für alle gleich). */
function parcoursOfDay(day: string) {
  const id = dailyParcoursId(day, PARCOURS.map((p) => p.id));
  return PARCOURS.find((p) => p.id === id) ?? PARCOURS[0];
}

export default function OnlineScreen() {
  const { t } = useI18n();
  const { scheme, colors } = useAppTheme();
  const [seenDuel, setSeenDuel] = useState(true);
  // Parcours des Tages: Tag beim Öffnen und bei jeder Rückkehr neu (über Mitternacht offen → neuer Parcours)
  const [day, setDay] = useState(todayKey);
  const today = parcoursOfDay(day);
  const [parcoursBest, setParcoursBest] = useState(0);

  // Code eines Freundes: hier prüfen, dann direkt ins Rennen gegen den Lauf
  const [entering, setEntering] = useState(false);
  const codeInput = useRef<TextInput>(null);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState<"invalid" | "update" | null>(null);
  const closeCode = () => {
    setEntering(false);
    setDraft("");
    setInvalid(null);
  };
  // Sperre gegen Doppeltippen (sonst zwei Rennen übereinander)
  const lockUntil = useRef(0);
  const acceptCode = () => {
    if (Date.now() < lockUntil.current) return;
    const found = readCode(draft);
    if (typeof found === "string") {
      setInvalid(found);
      return;
    }
    lockUntil.current = Date.now() + 900;
    const code = draft.trim();
    closeCode();
    router.push({ pathname: "/runde", params: { mode: "ghost", code } });
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getBoolean(StorageKeys.SEEN_DUEL, false)
        .then((seen) => active && setSeenDuel(seen))
        .catch(() => undefined);
      const now = todayKey();
      setDay(now);
      getParcoursBest()
        .then((best) => active && setParcoursBest(best[parcoursOfDay(now).id] ?? 0))
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <HubScreen title={t("hub.online.title")} subtitle={t("hub.online.subtitle")} emoji="🌍">
      <AppText variant="overline" tone="textSecondary" style={styles.group} accessibilityRole="header">
        {t("hub.group.quick")}
      </AppText>
      <HubCard
        index={0}
        emoji="⏱️"
        color="#2BB673"
        title={t("sprint.title")}
        desc={t("hub.sprint.desc")}
        onPress={() => router.push({ pathname: "/runde", params: { mode: "sprint" } })}
      />
      <HubCard
        index={1}
        emoji="🛡️"
        color="#E2574C"
        title={t("survival.title")}
        desc={t("hub.survival.desc")}
        onPress={() => router.push({ pathname: "/runde", params: { mode: "survival" } })}
      />
      <HubCard
        index={2}
        emoji={levelIcons(today)[0] ?? "🎯"}
        color="#F06BA8"
        title={t("hub.parcours.title")}
        desc={t("hub.parcours.desc", { task: t(today.task), s: today.seconds })}
        info={parcoursBest > 0 ? t("parcours.best", { n: parcoursBest }) : null}
        onPress={() => router.push({ pathname: "/runde", params: { mode: "parcours", level: String(today.id) } })}
      />
      <AppText variant="overline" tone="textSecondary" style={styles.group} accessibilityRole="header">
        {t("hub.group.friends")}
      </AppText>
      <HubCard
        index={3}
        emoji="👫"
        color="#2BB6A8"
        title={t("friends.title")}
        desc={t("hub.friends.desc")}
        onPress={() => router.push("/freunde")}
      />
      <HubCard
        index={4}
        emoji="🔑"
        color="#7C5CD6"
        title={t("ghost.code.enter")}
        desc={t("hub.code.desc")}
        // Öffnet nur – zu geht es mit „Abbrechen“ (eingefügter Text bleibt sonst erhalten)
        // Schon offen: Feld wieder in den Fokus (Tastatur kommt zurück)
        onPress={() => (entering ? codeInput.current?.focus() : setEntering(true))}
      />
      {entering && (
        <View style={[styles.codeBox, { backgroundColor: colors.surface }]}>
          <TextInput
            ref={codeInput}
            value={draft}
            onChangeText={(v) => {
              setDraft(v);
              setInvalid(null);
            }}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            multiline
            maxLength={600}
            placeholder={t("ghost.code.placeholder")}
            placeholderTextColor={colors.textMuted}
            keyboardAppearance={scheme}
            accessibilityLabel={t("ghost.code.enter")}
            style={[styles.input, { color: colors.text, borderColor: invalid ? colors.warning : colors.border }]}
          />
          {invalid && (
            <AppText variant="caption" tone="warning">
              {t(invalid === "update" ? "ghost.code.update" : "ghost.code.invalid")}
            </AppText>
          )}
          <View style={styles.row}>
            <Button title={t("ghost.code.go")} icon="check" onPress={acceptCode} disabled={!draft.trim()} />
            <Button title={t("common.cancel")} variant="secondary" onPress={closeCode} />
          </View>
        </View>
      )}
      <HubCard
        index={5}
        emoji="👻"
        color="#4DA3FF"
        title={t("home.ghostShort")}
        desc={t("home.ghostDesc")}
        onPress={() => router.push({ pathname: "/runde", params: { mode: "ghost" } })}
      />
      <HubCard
        index={6}
        emoji="🤝"
        color="#FF8A3D"
        title={t("hub.duel.title")}
        desc={t("hub.duel.desc")}
        dot={!seenDuel}
        onPress={() => {
          setBoolean(StorageKeys.SEEN_DUEL, true).catch(() => undefined);
          router.push({ pathname: "/runde", params: { mode: "duel" } });
        }}
      />
      <AppText variant="overline" tone="textSecondary" style={styles.group} accessibilityRole="header">
        {t("hub.group.rank")}
      </AppText>
      <HubCard
        index={7}
        emoji="🏆"
        color="#E3A92E"
        title={t("home.rank")}
        desc={t("rank.subtitle")}
        onPress={() => router.push("/rangliste")}
      />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  // Überschrift einer Gruppe: wenige, klare Abschnitte statt 7 gleicher Karten
  group: { marginTop: Spacing.sm },
  codeBox: { borderRadius: Radius.xl, padding: Spacing.md, gap: Spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    minHeight: 64,
    maxHeight: 120,
    textAlignVertical: "top",
  },
  row: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap" },
});
