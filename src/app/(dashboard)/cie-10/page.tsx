import { Cie10View } from "@/components/cie10/Cie10View";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function Cie10Page() {
  await requireSessionDoctor();
  return <Cie10View />;
}
