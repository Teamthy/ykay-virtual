import { LoaderScreen } from "@/components/ui/LoaderScreen";

// Root route-segment loader — every page without its own loading.tsx shows
// this branded screen while its data resolves.
export default function Loading() {
  return <LoaderScreen />;
}
