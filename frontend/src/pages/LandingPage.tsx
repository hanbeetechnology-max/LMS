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
        title="One LMS for Staff and Students"
        description="HanbeeLms is a learning management system built for two roles: staff who create and run courses, and students who learn, attend, and connect — all in one async platform."
        path="/"
      />
      <div className="rc-theme bg-(--color-paper)">
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
