import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@/src/lib/theme";
import { recordLessonProgress, getLessonProgress } from "@/src/lib/api";
import { getCachedVideoUri } from "@/src/lib/offline-video";

// In-app on-demand lesson video player (expo-video).
// - Streams `video_url` natively inside the app (or plays the cached local
//   file when the lesson was downloaded for offline playback).
// - Resumes from the student's last `position_seconds` (000035 progress).
// - Records watch progress on play and periodically (throttled).

type Props = {
  lessonId: string;
  videoUrl: string;
  style?: object;
};

export function VideoPlayer({ lessonId, videoUrl, style }: Props) {
  const [playSource, setPlaySource] = useState(videoUrl);
  const player = useVideoPlayer(playSource, (p) => {
    p.loop = false;
  });
  const [ready, setReady] = useState(false);
  const lastSaved = useRef(0);
  const endedRef = useRef(false);

  // Prefer a locally cached copy (offline download) when one exists.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedVideoUri(lessonId);
      if (!cancelled && cached) setPlaySource(cached);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  // Resume from last position once the player is ready.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prog = await getLessonProgress(lessonId);
        if (!cancelled && prog && prog.position_seconds > 0) {
          player.currentTime = prog.position_seconds;
        }
      } catch {
        // ignore — start from 0
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, player]);

  // Mark watched and persist position (throttled to ~5s) + on end.
  useEffect(() => {
    const save = async (pos: number, ended: boolean) => {
      if (Date.now() - lastSaved.current < 5000 && !ended) return;
      lastSaved.current = Date.now();
      try {
        await recordLessonProgress(lessonId, { watched: true, position_seconds: Math.floor(pos) });
      } catch {
        // non-fatal
      }
    };
    const interval = setInterval(() => {
      const t = player.currentTime;
      const d = player.duration;
      const ended = d > 0 && t >= d - 0.5;
      if (ended && !endedRef.current) {
        endedRef.current = true;
        void save(d, true);
      } else {
        void save(t, false);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [lessonId, player]);

  if (!ready) {
    return <View style={[styles.placeholder, style]} />;
  }

  return (
    <View style={[styles.wrap, style]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        allowsFullscreen
        nativeControls
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden", backgroundColor: colors.navy },
  video: { width: "100%", height: "100%" },
  placeholder: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.navy },
});
