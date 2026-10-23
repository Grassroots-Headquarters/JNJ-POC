import { normalisePhone, requestLoginCode, verifyLoginCode } from "@jnj/shared";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConnectedStatus } from "@/components/connected-status";
import { Bar, BarAction, Field, GhostButton, Input, Note, PrimaryButton } from "@/components/ui";
import { supabase } from "@/lib/supabase";

/** SMS code login: mobile number, then the 6-digit code. */
export default function LoginScreen() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [mobile, setMobile] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setError(null);
    setNotice(null);
    const normalised = normalisePhone(mobile);
    if (!normalised) {
      setError("Enter a mobile number like 07700 900123.");
      return;
    }
    setBusy(true);
    try {
      await requestLoginCode(supabase, normalised);
      setPhone(normalised);
      setCode("");
      if (step === "code") setNotice(`We texted a new code to ${mobile.trim()}.`);
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function logIn() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await verifyLoginCode(supabase, phone, code.trim());
      // The session change moves the router onto My jobs.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log in.");
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        {step === "phone" ? (
          <>
            <Bar title="Log in" />
            <ScrollView contentContainerClassName="flex-grow justify-center gap-4 p-4">
              <View className="items-center gap-1">
                <Text className="text-xl font-bold text-fg">Site App</Text>
                <Text className="text-xs text-faint">Mobile app</Text>
              </View>
              <View className="gap-3">
                <Field label="Mobile number">
                  <Input
                    aria-label="Mobile number"
                    inputMode="tel"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    placeholder="07700 900123"
                    value={mobile}
                    onChangeText={setMobile}
                    onSubmitEditing={sendCode}
                  />
                </Field>
                {error && <Note>{error}</Note>}
                <PrimaryButton title="Send login code" onPress={sendCode} disabled={busy} />
              </View>
              <ConnectedStatus />
            </ScrollView>
          </>
        ) : (
          <>
            <Bar title="Enter code" left={<BarAction title="‹ Back" onPress={() => setStep("phone")} />} />
            <ScrollView contentContainerClassName="flex-grow justify-center gap-4 p-4">
              <Text className="text-center text-[13px] text-muted">We texted a 6-digit code to {mobile.trim()}</Text>
              <View className="gap-3">
                <Input
                  aria-label="Login code"
                  inputMode="numeric"
                  keyboardType="number-pad"
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  className="w-full rounded-[10px] border border-border bg-bg p-3 text-center text-[28px] font-semibold tracking-[8px] text-fg"
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
                  onSubmitEditing={logIn}
                  autoFocus
                />
                {notice && <Note tone="success">{notice}</Note>}
                {error && <Note>{error}</Note>}
                <PrimaryButton title="Log in" onPress={logIn} disabled={busy || code.length < 6} />
                <GhostButton title="Send a new code" onPress={sendCode} disabled={busy} />
              </View>
            </ScrollView>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
