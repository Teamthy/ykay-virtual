import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { fonts, radius, spacing, type } from "@/src/lib/theme";
import { apiFetch, getAdminOverview, sendAdminTestEmail, type AdminOverview } from "@/src/lib/api";

// Admin console (mobile) — a read-only operations command center built on
// /admin/overview. The dominant fact is REVENUE IN ESCROW; the needs-attention
// queues (vetting, joins, tickets, leads, payouts) follow, then today's
// classes and recent audit activity. Mutations stay desktop-first on the web;
// SUPER_ADMIN additionally gets the email-delivery test.

type Me = { id: string; email: string; roles: string[] };

function fmtMoney(v: number): string {
  return `₦${Number(v).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminConsole() {
  const { colors } = useTheme();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await apiFetch<Me>("/auth/me").catch(() => ({ data: { id: "", email: "", roles: [] as string[] } }));
      setIsSuper((me.data.roles ?? []).includes("SUPER_ADMIN"));
      setOverview(await getAdminOverview());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the admin overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const testEmail = async () => {
    setTesting(true);
    try {
      const res = await sendAdminTestEmail();
      Alert.alert("Test email sent", `Delivered to ${res.to} via ${res.provider || "the active provider"}.`);
    } catch (e) {
      Alert.alert("Could not send", e instanceof Error ? e.message : "Check the email provider settings.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll>
        <Skeleton height={150} />
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={76} style={{ flex: 1 }} />
          ))}
        </View>
        <Skeleton height={72} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }
  if (error || !overview) {
    return (
      <Screen scroll>
        <ErrorState
          title="Admin access required"
          message={error ?? "This console is for platform admins. Log in with an admin account to see operations."}
          onRetry={() => void load()}
        />
      </Screen>
    );
  }

  const s = overview.stats;
  const attention = [
    { label: "Tutor vetting", value: overview.vetting_submitted, href: "/admin", icon: "shield-outline" },
    { label: "Cohort join requests", value: overview.joins_pending, href: "/admin", icon: "people-outline" },
    { label: "Open tickets", value: overview.tickets_open, href: "/admin", icon: "chatbox-ellipses-outline" },
    { label: "New leads", value: overview.leads_new, href: "/admin", icon: "person-add-outline" },
  ].filter((a) => a.value > 0);
  const clean = attention.length === 0;

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow={isSuper ? "SUPER ADMIN" : "ADMIN"}
        title="Operations"
        subtitle="Platform health at a glance. Mutations run on the web console."
      />

      {/* B. Primary card — revenue in escrow is the dominant fact */}
      <Animated.View entering={FadeIn.delay(60).duration(240)}>
        <LinearGradient colors={[colors.navy, colors.navyDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <AppText variant="label" style={styles.heroEyebrow}>
            REVENUE IN ESCROW
          </AppText>
          <AppText variant="display" style={styles.heroAmount}>
            {fmtMoney(s.revenue_in_escrow)}
          </AppText>
          <View style={styles.heroSubRow}>
            <AppText style={styles.heroCap}>Paid out {fmtMoney(s.revenue_paid_out)}</AppText>
            <View style={styles.heroDot} />
            <AppText style={styles.heroCap}>{s.orders_paid} paid orders</AppText>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* C. Key metrics */}
      <Animated.View entering={FadeIn.delay(100).duration(240)} style={styles.grid}>
        {[
          { label: "USERS", value: String(s.users), sub: `${s.active_users} active` },
          { label: "TUTORS", value: String(s.tutors_approved), sub: `${s.tutors_pending} pending` },
          { label: "LESSONS TODAY", value: String(s.lessons_today), sub: `${s.lessons_this_week} this week` },
          { label: "PAYOUTS PENDING", value: fmtMoney(overview.payouts_pending_total), sub: "" },
        ].map((m) => (
          <Card key={m.label} padded style={styles.metricCard}>
            <AppText variant="caption" style={{ color: colors.ink[400], letterSpacing: 0.8 }}>
              {m.label}
            </AppText>
            <AppText variant="h2" style={{ color: colors.deep, marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>
              {m.value}
            </AppText>
            {m.sub ? (
              <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                {m.sub}
              </AppText>
            ) : null}
          </Card>
        ))}
      </Animated.View>

      {/* D. Needs attention */}
      <Animated.View entering={FadeIn.delay(140).duration(240)}>
        <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
          NEEDS ATTENTION
        </AppText>
        {clean ? (
          <Card padded style={styles.cleanCard}>
            <Ionicons name="checkmark-circle" size={22} color={colors.greenDark} />
            <AppText variant="heading" style={{ marginLeft: spacing.sm }}>
              All queues are clear
            </AppText>
          </Card>
        ) : (
          <View style={styles.attention}>
            {attention.map((a) => (
              <Card key={a.label} padded style={styles.attentionRow}>
                <View style={[styles.attentionIcon, { backgroundColor: colors.greenLight }]}>
                  <Ionicons name={a.icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.deep} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <AppText variant="heading">{a.label}</AppText>
                  <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                    Review on the web console
                  </AppText>
                </View>
                <AppText variant="h3" style={{ color: colors.warning }}>
                  {a.value}
                </AppText>
              </Card>
            ))}
          </View>
        )}
      </Animated.View>

      {/* E. Today's classes */}
      <Animated.View entering={FadeIn.delay(180).duration(240)}>
        <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
          TODAY'S CLASSES
        </AppText>
        {overview.lessons_today.length === 0 ? (
          <EmptyState icon="calendar-outline" title="No classes today" description="Scheduled lessons for today will appear here." />
        ) : (
          <View style={styles.attention}>
            {overview.lessons_today.slice(0, 5).map((l) => (
              <Card key={l.id} padded style={styles.attentionRow}>
                <View style={[styles.attentionIcon, { backgroundColor: colors.greenLight }]}>
                  <Ionicons name="videocam-outline" size={16} color={colors.deep} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <AppText variant="heading" numberOfLines={1}>
                    {l.title}
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                    {fmtTime(l.start_at)}
                  </AppText>
                </View>
              </Card>
            ))}
          </View>
        )}
      </Animated.View>

      {/* F. Recent activity (audit feed) */}
      <Animated.View entering={FadeIn.delay(220).duration(240)}>
        <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
          RECENT ACTIVITY
        </AppText>
        {overview.recent_audit.length === 0 ? (
          <EmptyState icon="pulse-outline" title="No activity yet" description="Admin and payment actions will appear in the audit feed." />
        ) : (
          <View style={styles.attention}>
            {overview.recent_audit.slice(0, 6).map((a) => (
              <Card key={a.id} padded style={styles.auditRow}>
                <AppText variant="label" style={{ color: colors.deep }}>
                  {a.action}
                </AppText>
                <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                  {a.target_type} · {new Date(a.created_at).toLocaleString("en-NG")}
                </AppText>
              </Card>
            ))}
          </View>
        )}
      </Animated.View>

      {/* G. Super admin: email delivery test */}
      {isSuper && (
        <Animated.View entering={FadeIn.delay(260).duration(240)}>
          <Card padded style={styles.emailCard}>
            <AppText variant="h3">Email delivery test</AppText>
            <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 4, lineHeight: 19 }}>
              Sends a branded test email to your own address so you can verify codes, receipts and notifications reach users.
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => void testEmail()}
              disabled={testing}
              style={[styles.emailCta, { backgroundColor: colors.green, opacity: testing ? 0.6 : 1 }]}
            >
              <AppText style={{ color: colors.ink[950], fontFamily: fonts.bodyBold, fontWeight: "700" }}>
                {testing ? "Sending…" : "Send test email to myself"}
              </AppText>
            </Pressable>
          </Card>
        </Animated.View>
      )}

      <AppText variant="caption" style={{ color: colors.ink[400], textAlign: "center", marginTop: spacing.xl }}>
        Full console (cohorts, vetting, payouts, exports) lives on the web — desktop-first by design.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: spacing.lg,
  },
  heroEyebrow: { color: "#70F250", letterSpacing: 1.4, fontSize: type.caption },
  heroAmount: { color: "#FFFFFF", fontSize: 38, marginTop: spacing.xs },
  heroSubRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, flexWrap: "wrap" },
  heroCap: { color: "rgba(255,255,255,0.72)", fontSize: type.bodySm },
  heroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.4)" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  metricCard: { flexGrow: 1, flexBasis: "46%", maxWidth: "48.5%" },
  section: { letterSpacing: 1.1, fontSize: type.caption, marginTop: spacing.sm, marginBottom: spacing.sm },
  attention: { gap: spacing.sm },
  attentionRow: { flexDirection: "row", alignItems: "center", marginBottom: 0 },
  attentionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cleanCard: { flexDirection: "row", alignItems: "center" },
  auditRow: { marginBottom: 0 },
  emailCard: { marginTop: spacing.lg },
  emailCta: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
});
