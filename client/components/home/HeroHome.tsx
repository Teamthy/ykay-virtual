import { HomeHero } from "./HomeHero";
import { Rail } from "./Rail";

/** Home hero composition: light editorial stage + drifting programme rail. */
export function HeroHome() {
  return (
    <section className="w-full max-w-[100vw] overflow-x-clip">
      <HomeHero />
      <Rail />
    </section>
  );
}
