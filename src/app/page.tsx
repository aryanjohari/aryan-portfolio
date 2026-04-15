import { AdaptiveBackground } from "@/components/background/AdaptiveBackground";
import { HelloWorldLayer } from "@/components/HelloWorldLayer";

export default function Home() {
  return (
    <div className="relative min-h-dvh">
      <AdaptiveBackground />
      <HelloWorldLayer />
    </div>
  );
}
