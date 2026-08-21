import { LoaderScreen } from "@/components/ui/LoaderScreen";

// Admin segment loader — the operations console loads with the same branded
// screen (kept separate so admin can copy-tune the label).
export default function AdminLoading() {
  return <LoaderScreen label="Loading console" />;
}
