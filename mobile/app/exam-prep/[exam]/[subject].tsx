import { router, useLocalSearchParams } from "expo-router";
import { Linking, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import {
  getExam,
  getSubject,
  type ExamSubject,
} from "@/src/lib/exam-prep-data";

// Exam-prep subject screen — one screen per exam × subject (mirrors the web
// /exam-prep/[exam]/[subject] page). Factual paper structure + board-agnostic
// syllabus themes, with links to the subject catalogue and the web.

export default function ExamPrepSubjectScreen() {
  const { exam: examSlug, subject: subjectSlug } = useLocalSearchParams<{
    exam: string;
    subject: string;
  }>();

  const exam = getExam(examSlug ?? "");
  const subject = getSubject(subjectSlug ?? "");
  const valid = Boolean(exam && subject && exam.subjects.includes(subject.slug));

  if (!valid) {
    return (
      <Screen scroll>
        <ScreenHeader eyebrow="Exam preparation" title="Not found" />
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            This exam subject combination isn't in the catalogue.
          </AppText>
        </Card>
        <View style={{ marginTop: 16 }}>
          <Button label="Back to exam preparation" variant="secondary" full onPress={() => router.replace("/exam-prep" as never)} />
        </View>
      </Screen>
    );
  }

  const related = exam!.subjects
    .filter((s) => s !== subject!.slug)
    .map((s) => getSubject(s))
    .filter((s): s is ExamSubject => Boolean(s));

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow={exam!.name}
        title={`${subject!.name} — ${exam!.code}`}
        subtitle={exam!.fullName}
      />

      {/* About this paper */}
      <Card padded style={styles.card}>
        <AppText variant="h3" style={styles.cardTitle}>About this paper</AppText>
        <AppText variant="caption" style={{ color: colors.ink[500], marginTop: 4 }}>
          {exam!.level} · {exam!.format}
        </AppText>
        <View style={{ height: 10 }} />
        {exam!.structure.map((line) => (
          <View key={line} style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <AppText variant="bodySm" style={{ color: colors.ink[700], marginLeft: 8, flex: 1, lineHeight: 19 }}>
              {line}
            </AppText>
          </View>
        ))}
        <View style={styles.gradingBox}>
          <AppText variant="bodySm" style={{ color: colors.ink[700], lineHeight: 19 }}>{exam!.grading}</AppText>
        </View>
      </Card>

      {/* What the subject covers */}
      <Card padded style={styles.card}>
        <AppText variant="h3" style={styles.cardTitle}>What {subject!.name} covers</AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[700], marginTop: 6, lineHeight: 20 }}>
          {subject!.overview}
        </AppText>
        <View style={styles.topics}>
          {subject!.topics.map((topic) => (
            <View key={topic} style={styles.topicChip}>
              <View style={styles.topicDot} />
              <AppText variant="caption" style={{ color: colors.ink[700], fontWeight: "600" }}>{topic}</AppText>
            </View>
          ))}
        </View>
      </Card>

      {/* Skills */}
      <Card padded style={styles.card}>
        <AppText variant="h3" style={styles.cardTitle}>Skills the paper rewards</AppText>
        <View style={{ marginTop: 6 }}>
          {subject!.skills.map((skill) => (
            <View key={skill} style={styles.checkRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <AppText variant="bodySm" style={{ color: colors.ink[700], marginLeft: 8, flex: 1, lineHeight: 19 }}>
                {skill}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      {/* How NUVORA prepares you */}
      <Card padded style={styles.navyCard}>
        <AppText variant="h3" style={{ color: colors.white }}>How NUVORA prepares you</AppText>
        <View style={{ marginTop: 10 }}>
          {[
            "Vetted subject specialists matched to your syllabus",
            "Past-paper practice mapped to each topic",
            "Timed mocks with feedback and a predicted-grade view",
            "Weekly progress reports for parents",
          ].map((line) => (
            <AppText key={line} variant="bodySm" style={{ color: "rgba(255,255,255,0.85)", marginTop: 6, lineHeight: 19 }}>
              · {line}
            </AppText>
          ))}
        </View>
        <View style={{ height: 14 }} />
        <Button label={`Explore ${subject!.name} tutors`} full onPress={() => router.push(`/subjects/${subject!.catalogueSlug}` as never)} />
        <View style={{ height: 10 }} />
        <Button
          label="Join a revision cohort"
          variant="secondary"
          full
          onPress={() => void Linking.openURL("https://nuvora.com/programmes")}
        />
      </Card>

      {/* Other subjects */}
      {related.length > 0 && (
        <View style={styles.related}>
          <AppText variant="label" style={{ color: colors.goldDark, letterSpacing: 1.1, fontSize: 12, marginBottom: 10 }}>
            OTHER {exam!.code} SUBJECTS
          </AppText>
          <View style={styles.topics}>
            {related.map((r) => (
              <Card
                key={r.slug}
                onPress={() => router.push(`/exam-prep/${exam!.slug}/${r.slug}` as never)}
                padded
                style={styles.relChip}
              >
                <AppText variant="caption" style={{ color: colors.navy, fontWeight: "700" }}>{r.name}</AppText>
              </Card>
            ))}
          </View>
          <AppText
            variant="bodySm"
            style={{ color: colors.navy, fontWeight: "700", marginTop: 14 }}
            onPress={() => router.replace("/exam-prep" as never)}
          >
            ← Back to Exam preparation
          </AppText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  cardTitle: { color: colors.navy },
  checkRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  gradingBox: {
    backgroundColor: colors.ink[50],
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  topics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.ink[100],
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  topicDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.goldDark },
  navyCard: { backgroundColor: colors.navy, marginBottom: 12 },
  related: { marginTop: 8 },
  relChip: { paddingVertical: 8, paddingHorizontal: 12 },
});
