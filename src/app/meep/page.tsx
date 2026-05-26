"use client";

import { useRouter } from "next/navigation";
import { AboutPage } from "../_components/AboutPage";

export default function MeepRoute() {
  const router = useRouter();
  return <AboutPage onClose={() => router.push("/")} />;
}
