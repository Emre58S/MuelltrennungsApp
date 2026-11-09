// Datei: app/lizenzen.tsx
//
// Open-Source-Lizenzen: Liste der Bausteine, auf denen die App aufbaut (constants/licenses.ts, erzeugt mit
// tools/make-licenses.mjs). Die MIT- und BSD-Lizenzen verlangen, dass auf Urheber und Lizenz hingewiesen wird.

import * as WebBrowser from "expo-web-browser";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { LICENSES } from "@/constants/licenses";
import { Spacing } from "@/constants/theme";
import { useAppTheme, useI18n } from "@/providers/app-settings";

export default function LizenzenScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top + Spacing.md, Spacing.lg), paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <PageHeader title={t("licenses.title")} subtitle={t("licenses.subtitle")} emoji="📜" />
        <AppText variant="caption" tone="textSecondary">
          {t("licenses.own")}
        </AppText>
        <Card style={styles.group}>
          {LICENSES.map((row, i) => (
            <Pressable
              key={row.name}
              accessibilityRole={row.url ? "link" : "text"}
              accessibilityLabel={`${row.name} ${row.version}, ${row.license}`}
              disabled={!row.url}
              onPress={() => void WebBrowser.openBrowserAsync(row.url)}
              style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            >
              <View style={styles.flex}>
                <AppText variant="label" numberOfLines={1}>
                  {row.name}
                </AppText>
                <AppText variant="caption" tone="textMuted">
                  {row.version}
                </AppText>
              </View>
              <AppText variant="caption" tone="textSecondary">
                {row.license}
              </AppText>
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md + 4, gap: Spacing.md },
  group: { padding: 0, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, minHeight: 48 },
  flex: { flex: 1 },
});
