import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";

// Exam preparation — the major exams NUVORA prepares learners for, with
// factual paper descriptions. Detailed subject-by-subject matrices live on the
// web (/exam-prep); here we keep the hub native and route into the in-app
// subjects catalogue and the web booking flow.

const EXAMS = [
  {
    code: "JAMB",
    name: "UTME (JAMB)",
    level: "University admission — Nigeria",
    desc: "Computer-based test: compulsory Use of English plus three subjects for your course. 180 objective questions in 2 hours, scored out of 400.",
  },
  {
    code: "WAEC",
    name: "WASSCE (WAEC)",
    level: "Secondary leaving — Nigeria & West Africa",
    desc: "Written papers (objective + theory) with practicals in relevant subjects. Grades A1–F9; university entry usually needs credits in five subjects including English and Mathematics.",
  },
  {
    code: "NECO",
    name: "SSCE (NECO)",
    level: "Secondary leaving — Nigeria",
    desc: "Written papers with practicals where applicable, in June/July and November/December sessions. Closely mirrors the WAEC syllabus.",
  },
  {
    code: "IGCSE",
    name: "International GCSE",
    level: "International (Years 10–11, ages 14–16)",
    desc: "Cambridge or Pearson Edexcel. Most learners take 5–9 subjects; Mathematics and English are typical requirements for further study.",
  },
  {
    code: "A-Level",
    name: "Advanced Level",
    level: "Pre-university (ages 16–18)",
    desc: "Linear written exams; learners usually take 3–4 subjects. Universities make offers based on predicted and final grades.",
  },
];

export default function ExamPrepScreen() {
  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Exam season, handled"
        title="Exam preparation"
        subtitle="Revision cohorts, past-paper practice and mocks for WAEC, NECO, JAMB, IGCSE and A-Level."
      />

      {EXAMS.map((e) => (
        <Card key={e.code} padded style={styles.card}>
          <View style={styles.cardTop}>
            <AppText variant="h1" style={{ color: colors.navy }}>{e.code}</AppText>
            <View style={styles.levelPill}>
              <AppText variant="caption" style={{ color: colors.navy, fontWeight: "700" }}>{e.level}</AppText>
            </View>
          </View>
          <AppText variant="h3" style={{ marginTop: 4 }}>{e.name}</AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 6, lineHeight: 19 }}>
            {e.desc}
          </AppText>
        </Card>
      ))}

      <View style={styles.cta}>
        <Button label="Browse subjects" full onPress={() => router.push("/subjects" as never)} />
        <View style={{ height: 10 }} />
        <Button
          label="Explore programmes on the web"
          variant="secondary"
          full
          onPress={() => router.push("/account" as never)}
        />
      </View>

      <Card padded style={{ marginTop: 16, flexDirection: "row", alignItems: "center" }}>
        <Ionicons name="information-circle-outline" size={18} color={colors.navy} />
        <AppText variant="caption" style={{ color: colors.ink[500], marginLeft: 10, flex: 1 }}>
          Subject-by-subject exam guides (paper structure and topics for each exam) are on the web at nuvora.com/exam-prep.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  levelPill: {
    backgroundColor: colors.goldLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: "55%",
  },
  cta: { marginTop: 8 },
});
