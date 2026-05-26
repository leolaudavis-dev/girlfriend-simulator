"use client";

import { useRouter } from "next/navigation";
import { LambPage } from "../../_components/LambPage";

export default function DerpShrekRoute() {
  const router = useRouter();
  return <LambPage onBack={() => router.push("/derp")} />;
}
