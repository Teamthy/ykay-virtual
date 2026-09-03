import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { listLearners, type Learner } from "@/src/lib/account";

// LearnerContext — the parent's active learner. Parents with several children
// pin one learner; every learner-scoped screen (lessons, progress, LMS) then
// filters to that child via student_profile_id. The selection persists on
// device. Non-parents always see themselves (no selection).

type LearnerContextValue = {
  learners: Learner[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  ready: boolean;
};

const STORAGE_KEY = "ykv_selected_learner";

const LearnerContext = createContext<LearnerContextValue>({
  learners: [],
  selectedId: null,
  setSelectedId: () => {},
  ready: false,
});

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await listLearners();
        setLearners(list);
        if (list.length > 0) {
          const saved = await AsyncStorage.getItem(STORAGE_KEY).catch(
            () => null,
          );
          setSelectedIdState(
            saved && list.some((l) => l.id === saved) ? saved : list[0].id,
          );
        }
      } catch {
        // no session / no learners — parent switcher simply won't render
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id ?? "").catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ learners, selectedId, setSelectedId, ready }),
    [learners, selectedId, setSelectedId, ready],
  );

  return (
    <LearnerContext.Provider value={value}>{children}</LearnerContext.Provider>
  );
}

export function useLearner(): LearnerContextValue {
  return useContext(LearnerContext);
}
