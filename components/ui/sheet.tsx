// Datei: components/ui/sheet.tsx
// Blatt von unten (z. B. „Zufallsgegner · Freund herausfordern“). Tippen auf den
// dunklen Rand oder auf „Schließen“ macht es zu; Android-Zurück ebenfalls.

import { type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Radius, Spacing } from "@/constants/theme";
import { useAppTheme, useI18n } from "@/providers/app-settings";

import { AppText } from "./app-text";

export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Mit Eingabefeld: die Tastatur schiebt das Blatt nach oben, statt es zu verdecken */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.avoid}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.close")}
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, paddingBottom: insets.bottom + Spacing.md },
        ]}
      >
        <View style={[styles.grip, { backgroundColor: colors.border }]} />
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        <View style={styles.body}>{children}</View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avoid: { flex: 1 },
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.md + 4,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  grip: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, marginBottom: Spacing.sm },
  body: { gap: Spacing.sm },
});
