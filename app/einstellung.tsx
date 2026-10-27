// Datei: app/einstellung.tsx — Design v2
//
// Aussehen und Sprache stehen oben: Wer kein Deutsch kann, muss die
// Sprache sofort finden. Sprachen werden in ihrer eigenen Schrift gezeigt.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { type ComponentProps, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { PageHeader } from "@/components/ui/page-header";
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
  setBoolean,
  StorageKeys,
} from "@/utils/storage";
import { setSfxEnabled } from "@/utils/sfx";

type IconName = ComponentProps<typeof Feather>["name"];

export default function EinstellungenScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const {
    themeMode,
    setThemeMode,
    languageSetting,
    setLanguage,
    reduceMotionSetting,
    setReduceMotion,
  } = useAppSettings();
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    let active = true;
    getBoolean(StorageKeys.SOUND_ENABLED, true).then((sound) => {
      if (active) setSoundEnabled(sound);
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

  const confirmLogout = () => {
    Alert.alert(t("settings.logout"), t("settings.logout.confirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.logout"),
        style: "destructive",
        onPress: () => router.replace("/login"),
      },
    ]);
  };

  const languageOptions: { value: LanguageSetting; label: string; flag: string }[] =
    [
      { value: "system", label: t("settings.language.system"), flag: "📱" },
      ...LANGUAGES.map((l) => ({ value: l.code, label: l.nativeName, flag: l.flag })),
    ];

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
            const selected = opt.value === languageSetting;
            return (
              <Pressable
                key={opt.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={opt.label}
                onPress={() => setLanguage(opt.value)}
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
          value={themeMode}
          onChange={setThemeMode}
          options={[
            { value: "system", label: t("settings.theme.system") },
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
            icon="wind"
            title={t("settings.reduceMotion")}
            subtitle={t("settings.reduceMotion.desc")}
            value={reduceMotionSetting}
            onChange={setReduceMotion}
            divider
          />
        </Card>

        {/* Daten */}
        <SectionLabel text={t("settings.data")} />
        <Card style={styles.group}>
          <ActionRow
            icon="trash-2"
            title={t("settings.resetScores")}
            subtitle={t("settings.resetScores.desc")}
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
                StorageKeys.TOTAL_CORRECT,
                StorageKeys.TOTAL_PLAYED,
              ])
            }
          />
        </Card>

        {/* Konto */}
        <SectionLabel text={t("settings.account")} />
        <Card style={styles.group}>
          <ActionRow
            icon="log-out"
            title={t("settings.logout")}
            subtitle={t("settings.logout.desc")}
            onPress={confirmLogout}
          />
        </Card>
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
