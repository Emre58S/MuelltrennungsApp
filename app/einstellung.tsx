// Datei: app/einstellung.tsx — Design v2
//
// Aussehen und Sprache stehen oben: Wer kein Deutsch kann, muss die
// Sprache sofort finden. Sprachen werden in ihrer eigenen Schrift gezeigt.

import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import { type ComponentProps, useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { tapHaptic } from "@/components/ui/press";
import { Segmented } from "@/components/ui/segmented";
import { PageHeader } from "@/components/ui/page-header";
import { legalUrl } from "@/constants/legal";
import { Radius, Spacing, TOUCH_MIN } from "@/constants/theme";
import { LANGUAGES } from "@/i18n";
import {
  type LanguageSetting,
  type ThemeMode,
  useAppSettings,
  useAppTheme,
  useI18n,
} from "@/providers/app-settings";
import {
  getBoolean,
  removeItems,
  resetSeenTips,
  setBoolean,
  StorageKeys,
} from "@/utils/storage";
import { deleteOnlineData } from "@/utils/leaderboard";
import { setSfxEnabled } from "@/utils/sfx";
import { setMusicEnabled } from "@/utils/music";

type IconName = ComponentProps<typeof Feather>["name"];

export default function EinstellungenScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const {
    scheme,
    setThemeMode,
    lang,
    setLanguage,
    reduceMotionSetting,
    setReduceMotion,
    learnReason,
    setLearnReason,
  } = useAppSettings();
  const privacyUrl = legalUrl("privacy", lang);
  const imprintUrl = legalUrl("imprint", lang);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabledState] = useState(true);

  useEffect(() => {
    let active = true;
    getBoolean(StorageKeys.SOUND_ENABLED, true).then((sound) => {
      if (active) setSoundEnabled(sound);
    });
    getBoolean(StorageKeys.MUSIC_ENABLED, true).then((music) => {
      if (active) setMusicEnabledState(music);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggleSound = (value: boolean) => {
    setSoundEnabled(value);
    setSfxEnabled(value);
    setBoolean(StorageKeys.SOUND_ENABLED, value);
  };

  const toggleMusic = (value: boolean) => {
    setMusicEnabledState(value);
    setMusicEnabled(value);
    setBoolean(StorageKeys.MUSIC_ENABLED, value);
  };

  const confirmDelete = (
    title: string,
    message: string,
    keys: Parameters<typeof removeItems>[0],
  ) => {
    Alert.alert(title, message, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.reset.button"),
        style: "destructive",
        onPress: async () => {
          await removeItems(keys);
          Alert.alert(t("settings.done"));
        },
      },
    ]);
  };

  const highscoreKeys = [
    StorageKeys.HIGHSCORE_RUNDEN,
    StorageKeys.HIGHSCORE_ZEIT,
    StorageKeys.HIGHSCORE_ENDLOS,
    StorageKeys.HIGHSCORE_ZIELWURF,
  ];

  const languageOptions: { value: LanguageSetting; label: string; flag: string }[] = LANGUAGES.map((l) => ({
    value: l.code,
    label: l.nativeName,
    flag: l.flag,
  }));

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + Spacing.md, Spacing.lg),
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} emoji="⚙️" />

        {/* Sprache */}
        <SectionLabel text={t("settings.language")} />
        <Card style={styles.group}>
          {languageOptions.map((opt, i) => {
            const selected = opt.value === lang;
            return (
              <Pressable
                key={opt.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={opt.label}
                onPress={() => {
                  tapHaptic();
                  setLanguage(opt.value);
                }}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                  pressed && { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <AppText style={styles.flag}>{opt.flag}</AppText>
                <AppText variant="bodyStrong" style={styles.flex}>
                  {opt.label}
                </AppText>
                {selected && (
                  <Feather name="check-circle" size={24} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </Card>

        {/* Aussehen */}
        <SectionLabel text={t("settings.appearance")} />
        <Segmented<ThemeMode>
          value={scheme}
          onChange={setThemeMode}
          options={[
            { value: "light", label: t("settings.theme.light") },
            { value: "dark", label: t("settings.theme.dark") },
          ]}
        />

        {/* Allgemein */}
        <SectionLabel text={t("settings.general")} />
        <Card style={styles.group}>
          <SwitchRow
            icon={soundEnabled ? "volume-2" : "volume-x"}
            title={t("settings.sound")}
            subtitle={t(soundEnabled ? "settings.sound.on" : "settings.sound.off")}
            value={soundEnabled}
            onChange={toggleSound}
          />
          <SwitchRow
            icon="music"
            title={t("settings.music")}
            subtitle={t(musicEnabled ? "settings.music.on" : "settings.music.off")}
            value={musicEnabled}
            onChange={toggleMusic}
            divider
          />
          <SwitchRow
            icon="wind"
            title={t("settings.reduceMotion")}
            subtitle={t("settings.reduceMotion.desc")}
            value={reduceMotionSetting}
            onChange={setReduceMotion}
            divider
          />
          <SwitchRow
            icon="book-open"
            title={t("settings.learnReason")}
            subtitle={t("settings.learnReason.desc")}
            value={learnReason}
            onChange={setLearnReason}
          />
        </Card>

        {/* Daten */}
        <SectionLabel text={t("settings.data")} />
        <Card style={styles.group}>
          {/* Harmlos, daher ohne Rückfrage: Tipps erscheinen im Spiel erneut */}
          <ActionRow
            icon="help-circle"
            title={t("settings.showTips")}
            subtitle={t("settings.showTips.desc")}
            onPress={async () => {
              await resetSeenTips();
              Alert.alert(t("settings.done"));
            }}
          />
          <ActionRow
            icon="trash-2"
            title={t("settings.resetScores")}
            subtitle={t("settings.resetScores.desc")}
            divider
            onPress={() =>
              confirmDelete(
                t("settings.resetScores"),
                t("settings.resetScores.confirm"),
                highscoreKeys,
              )
            }
          />
          <ActionRow
            icon="alert-triangle"
            title={t("settings.resetAll")}
            subtitle={t("settings.resetAll.desc")}
            danger
            divider
            onPress={() =>
              confirmDelete(t("settings.resetAll"), t("settings.resetAll.confirm"), [
                ...highscoreKeys,
                StorageKeys.TOTAL_XP,
                StorageKeys.LEVEL,
                StorageKeys.STREAK_COUNT,
                StorageKeys.STREAK_LAST_DATE,
                StorageKeys.STREAK_RESCUE,
                StorageKeys.TOTAL_CORRECT,
                StorageKeys.TOTAL_PLAYED,
              ])
            }
          />
        </Card>

        {/* Datenschutz: Rechtstexte (erscheinen, sobald die Adressen in constants/legal.ts stehen) und
            Online-Daten löschen (Pflicht für die Stores: der Spieler muss seine Daten selbst entfernen können) */}
        <SectionLabel text={t("settings.privacy")} />
        <Card style={styles.group}>
          {privacyUrl ? (
            <ActionRow
              icon="shield"
              title={t("settings.privacyPolicy")}
              subtitle={t("settings.privacyPolicy.desc")}
              onPress={() => void WebBrowser.openBrowserAsync(privacyUrl)}
            />
          ) : null}
          {imprintUrl ? (
            <ActionRow
              icon="info"
              title={t("settings.imprint")}
              subtitle={t("settings.imprint.desc")}
              divider={!!privacyUrl}
              onPress={() => void WebBrowser.openBrowserAsync(imprintUrl)}
            />
          ) : null}
          <ActionRow
            icon="file-text"
            title={t("settings.licenses")}
            subtitle={t("settings.licenses.desc")}
            divider={!!privacyUrl || !!imprintUrl}
            onPress={() => router.push("/lizenzen")}
          />
          <ActionRow
            icon="cloud-off"
            title={t("settings.deleteOnline")}
            subtitle={t("settings.deleteOnline.desc")}
            danger
            divider
            onPress={() =>
              Alert.alert(t("settings.deleteOnline"), t("settings.deleteOnline.confirm"), [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("settings.reset.button"),
                  style: "destructive",
                  onPress: async () => {
                    const ok = await deleteOnlineData();
                    Alert.alert(ok ? t("settings.deleteOnline.done") : t("settings.deleteOnline.fail"));
                  },
                },
              ])
            }
          />
        </Card>

        {/* Über die App: Version (für Rückfragen und Store-Prüfung) */}
        <AppText variant="caption" tone="textMuted" center style={styles.version}>
          {t("settings.version", { v: Constants.expoConfig?.version ?? "1.0.0" })}
        </AppText>

        {/* „Konto/Abmelden“ ausgeblendet (ROADMAP R7e): es gibt noch keine echte Anmeldung –
            die Seiten app/login.tsx und app/register.tsx sind nur Platzhalter */}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <AppText
      variant="overline"
      tone="textMuted"
      accessibilityRole="header"
      style={styles.sectionLabel}
    >
      {text.toUpperCase()}
    </AppText>
  );
}

function RowIcon({ icon, danger }: { icon: IconName; danger?: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.iconChip,
        { backgroundColor: danger ? colors.warningSoft : colors.surfaceAlt },
      ]}
    >
      <Feather name={icon} size={20} color={danger ? colors.danger : colors.text} />
    </View>
  );
}

function SwitchRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
  divider,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
  divider?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.row,
        divider && { borderTopWidth: 1, borderTopColor: colors.border },
      ]}
    >
      <RowIcon icon={icon} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" tone="textMuted">
          {subtitle}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  danger,
  divider,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  danger?: boolean;
  divider?: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        divider && { borderTopWidth: 1, borderTopColor: colors.border },
        pressed && { backgroundColor: colors.surfaceAlt },
      ]}
    >
      <RowIcon icon={icon} danger={danger} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong" tone={danger ? "danger" : "text"}>
          {title}
        </AppText>
        <AppText variant="caption" tone="textMuted">
          {subtitle}
        </AppText>
      </View>
      <Feather name="chevron-right" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md + 4 },
  flex: { flex: 1 },
  version: { marginTop: Spacing.lg },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },

  sectionLabel: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  group: { padding: 0, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: TOUCH_MIN + 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  flag: { fontSize: 24, lineHeight: 30 },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
