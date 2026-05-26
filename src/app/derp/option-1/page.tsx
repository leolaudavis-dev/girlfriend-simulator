"use client";

import { useRouter } from "next/navigation";
import { WordPage } from "../../_components/WordPage";

export default function DerpOption1Route() {
  const router = useRouter();
  return <WordPage onBack={() => router.push("/derp")} />;
}
