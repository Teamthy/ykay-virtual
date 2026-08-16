import { forwardRef, useState } from "react";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { AppText } from "@/src/components/ui/AppText";
import { colors, radius, type } from "@/src/lib/theme";

// Premium input — consistent styling, focus ring, optional label + icon.

type Props = TextInputProps & { label?: string };

export const AppInput = forwardRef<TextInput, Props>(function AppInput(
  { label, style, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.ink[300]}
        style={[
          styles.input,
          focused && styles.inputFocused,
          style,
        ]}
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
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.ink[100],
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: type.body,
    color: colors.ink[900],
  },
  inputFocused: {
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
});
