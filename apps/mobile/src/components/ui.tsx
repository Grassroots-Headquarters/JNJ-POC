import type { ReactNode } from "react";
import { Pressable, Text, TextInput, View, type PressableProps, type TextInputProps } from "react-native";

/** Demo `.primary` button. */
export function PrimaryButton({ title, disabled, ...props }: PressableProps & { title: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`w-full items-center rounded-xl bg-sky p-3.5 ${disabled ? "opacity-45" : ""}`}
      {...props}
    >
      <Text className="text-[15px] font-semibold text-[#04131C]">{title}</Text>
    </Pressable>
  );
}

/** Demo `.ghost` button. */
export function GhostButton({ title, disabled, ...props }: PressableProps & { title: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`items-center rounded-[10px] border border-border px-3 py-2 ${disabled ? "opacity-45" : ""}`}
      {...props}
    >
      <Text className="text-[13px] font-medium text-fg">{title}</Text>
    </Pressable>
  );
}

/** Demo text action in the top bar (`.act` / `.back`). */
export function BarAction({ title, ...props }: PressableProps & { title: string }) {
  return (
    <Pressable accessibilityRole="button" {...props}>
      <Text className="text-[15px] font-semibold text-sky">{title}</Text>
    </Pressable>
  );
}

/** Demo `label.f`: caption above the control. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-[13px] text-muted">{label}</Text>
      {children}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#64748B"
      className="w-full rounded-[10px] border border-border bg-bg p-3 text-[15px] text-fg"
      {...props}
    />
  );
}

/** Demo `.note` (amber) and `.toast` (green). */
export function Note({ children, tone = "warning" }: { children: ReactNode; tone?: "warning" | "success" }) {
  const classes = tone === "warning" ? "border-amber/45 bg-amber/10" : "border-green/45 bg-green/10";
  return (
    <View accessibilityRole={tone === "warning" ? "alert" : undefined} className={`rounded-xl border px-3 py-2.5 ${classes}`}>
      <Text className="text-[13px] text-fg">{children}</Text>
    </View>
  );
}

/** Demo `.bar`: the screen's top bar. */
export function Bar({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <View className="min-h-[60px] flex-row items-center gap-2.5 border-b border-border px-4">
      {left}
      <Text className="flex-1 text-[17px] font-semibold text-fg" numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}
