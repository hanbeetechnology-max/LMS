import { Seo } from "../lib/Seo";
import { Nav } from "../components/landing/Nav";
import { Hero } from "../components/landing/Hero";
import { AudienceSplit } from "../components/landing/AudienceSplit";
import { Features } from "../components/landing/Features";
import { HowItWorks } from "../components/landing/HowItWorks";
import { CTA } from "../components/landing/CTA";
import { Footer } from "../components/landing/Footer";
import { CustomCursor } from "../components/ui/CustomCursor";

export function LandingPage() {
  return (
    <>
      <CustomCursor />
      <Seo
        title="One Platform for Schools and Students"
        description="HanbeeLms is where schools register, invite students, enter RC F1 tournament teams and follow course progress, with HANBEE staff running courses and verifying schools."
        path="/"
      />
      <div className="rc-theme overflow-x-clip bg-(--color-paper)">
        <Nav />
        <main>
          <Hero />
          <AudienceSplit />
          <Features />
          <HowItWorks />
          <CTA />
        </main>
        <Footer />
      </div>
    </>
  );
}
