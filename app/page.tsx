import fossils from "@/data/fossils.json";
import { FossilExplorer } from "@/components/fossil-explorer";
import type { FossilRecord } from "@/lib/types";

export default function Home() {
  return <FossilExplorer fossils={fossils as FossilRecord[]} />;
}
