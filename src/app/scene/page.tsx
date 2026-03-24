import Link from "next/link";

import { DynamicSceneWrapper } from "@/components/3d/DynamicSceneWrapper";
import { SceneDemo } from "@/components/3d/SceneDemo";
import { testSceneFraming } from "@/components/3d/hero-framing";
import { siteConfig } from "../../../site.config";

export default function ScenePage() {
  const { background, acidAccent } = siteConfig.colors;

  return (
    <div className="relative min-h-screen bg-background">
      <p className="absolute left-4 top-4 z-10 max-w-xs font-mono text-xs leading-relaxed text-muted">
        GLB + WebGL smoke test.{" "}
        <Link href="/" className="text-acid-accent hover:underline">
          Home
        </Link>
      </p>
      <DynamicSceneWrapper
        className="touch-none"
        cameraPosition={[...testSceneFraming.cameraPosition]}
        fov={testSceneFraming.fov}
        lookAt={[...testSceneFraming.lookAt]}
        model={{ ...testSceneFraming.model }}
      >
        <SceneDemo accentColor={acidAccent} backgroundColor={background} />
      </DynamicSceneWrapper>
    </div>
  );
}
