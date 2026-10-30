// Datei: app/online.tsx — Bereich „Online“ (Mehrspieler)
//
// Hinter der blauen Menü-Tonne: gegen den eigenen Rekord, den Besten von
// heute oder Freunde per Code (Ghost), zu zweit an einem Handy (Duell) und
// die Rangliste. Später: Zeit-Sprint, Survival, Trick-Battle (ROADMAP.md, R4).

import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { HubCard, HubScreen } from "@/components/ui/hub";
import { Radius, Spacing } from "@/constants/theme";
import { readCode } from "@/game/ghost-track";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import { getBoolean, setBoolean, StorageKeys } from "@/utils/storage";

export default function OnlineScreen() {
  const { t } = useI18n();
  const { scheme, colors } = useAppTheme();
  const [seenDuel, setSeenDuel] = useState(true);

  // Code eines Freundes: hier prüfen, dann direkt ins Rennen gegen den Lauf
  const [entering, setEntering] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState<"invalid" | "update" | null>(null);
  const closeCode = () => {
    setEntering(false);
    setDraft("");
    setInvalid(null);
  };
  const acceptCode = () => {
    const found = readCode(draft);
    if (typeof found === "string") {
      setInvalid(found);
      return;
    }
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
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <HubScreen title={t("hub.online.title")} subtitle={t("hub.online.subtitle")} emoji="🌍">
      <HubCard
        index={0}
        emoji="👻"
        color="#4DA3FF"
        title={t("home.ghostShort")}
        desc={t("home.ghostDesc")}
        onPress={() => router.push({ pathname: "/runde", params: { mode: "ghost" } })}
      />
      <HubCard
        index={1}
        emoji="🔑"
        color="#7C5CD6"
        title={t("ghost.code.enter")}
        desc={t("hub.code.desc")}
        onPress={() => (entering ? closeCode() : setEntering(true))}
      />
      {entering && (
        <View style={[styles.codeBox, { backgroundColor: colors.surface }]}>
          <TextInput
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
        index={2}
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
      <HubCard
        index={3}
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
