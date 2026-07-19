import { PortfolioGuide } from "@/components/PortfolioGuide";
import { HomeGlyphRow } from "@/components/motion/HomeGlyphRow";

export default function Home() {
  return (
    <div className="home-ask">
      <PortfolioGuide />
      <HomeGlyphRow />
    </div>
  );
}
