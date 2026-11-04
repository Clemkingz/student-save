import { redirect } from "next/navigation";

// The landing page now lives at "/". Keep old /landing links working.
export default function LandingRedirect() {
  redirect("/");
}
