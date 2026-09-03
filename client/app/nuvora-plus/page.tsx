import { permanentRedirect } from "next/navigation";

// /nuvora-plus was renamed to /plus in the YK-Virtual rebrand.
// Keep the old path working for anyone holding an old link.
export default function NuvoraPlusRedirect() {
  permanentRedirect("/plus");
}
