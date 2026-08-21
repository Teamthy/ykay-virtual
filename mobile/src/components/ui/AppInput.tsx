import { forwardRef, useState } from "react";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { radius, type } from "@/src/lib/theme";

// Premium input — consistent styling, focus ring, optional label + icon.
// Theme-aware surface/border/text.

type Props = TextInputProps & { label?: string };

export const AppInput = forwardRef<TextInput, Props>(function AppInput(
  { label, style, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={isDark ? colors.ink[400] : colors.ink[300]}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: focused ? colors.greenDark : colors.ink[100],
            color: colors.ink[900],
          },
          focused && styles.inputFocused,
          style,
        ]}
        accessibilityLabel={label || rest.placeholder}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { marginBottom: 6 },
  input: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: type.body,
  },
  inputFocused: {
    shadowColor: "#4CCB31",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
});
