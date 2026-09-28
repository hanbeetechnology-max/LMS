"use client";

import { useScroll, useTransform, motion } from "framer-motion";
import Navbar from "@/components/Navbar/Navbar";
import Hero from "@/components/Hero/Hero";

export default function Home() {
  const { scrollY } = useScroll();


  return (
    <main style={{ backgroundColor: "#000", position: "relative" }}>
      <Navbar />

      {/* Hero section */}
      <Hero />

      {/* The upcoming part of the page */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          background: "linear-gradient(rgba(10, 10, 12, 0.4), rgba(10, 10, 12, 0.7)), url('/images/clouds-bg.png') center/cover no-repeat", // Dark tint over clouds for a seamless merge
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          /* Cloud like dispersion - Exact 35vh fade to match the overlap! */
          marginTop: "-35vh",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.05) 10vh, rgba(0,0,0,0.3) 20vh, rgba(0,0,0,0.8) 30vh, black 35vh)",
          maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.05) 10vh, rgba(0,0,0,0.3) 20vh, rgba(0,0,0,0.8) 30vh, black 35vh)",
          padding: "calc(120px + 35vh) 40px 160px 40px",
          pointerEvents: "none", // Prevent this transparent layer from stealing clicks from the Hero CTA
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 0.9] }}
          style={{ textAlign: "center", maxWidth: "800px", pointerEvents: "auto" }}
        >
          <h2 style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 300,
            color: "#fff",
            marginBottom: "24px",
            letterSpacing: "-1px"
          }}>
            Beyond Standard Learning
          </h2>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(18px, 2vw, 22px)",
            color: "rgba(255, 255, 255, 0.6)",
            lineHeight: 1.6
          }}>
            Experience an LMS built for doers. From mastering core engineering concepts to building and programming your own FC remote-controlled racing cars, Hanbee bridges the gap between theory and adrenaline-pumping reality.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "24px",
          width: "100%",
          maxWidth: "1200px",
          marginTop: "80px",
          pointerEvents: "auto"
        }}>
          {[
            {
              title: "Led By Track Pros",
              desc: "Learn directly from engineering veterans who design real-world flight controllers and autonomous systems.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            },
            {
              title: "Live Progress Telemetry",
              desc: "Monitor your learning milestones just like live race telemetry. Visualize your growth from novice to track-ready.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            },
            {
              title: "Pit-Stop Mentorship",
              desc: "Get 1-on-1 guidance when debugging your RC car's code or tuning its FC for maximum speed and control.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            },
            {
              title: "Code, Build, Race",
              desc: "Access our immersive LMS anywhere. Learn the theory at home, then take your skills straight to the asphalt.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            }
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: "easeOut" }}
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "24px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                transition: "transform 0.3s ease, background 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
              }}
            >
              <div style={{ color: "#fff", width: "48px", height: "48px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {feature.icon}
              </div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "22px", fontWeight: 400, color: "#fff" }}>
                {feature.title}
              </h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "rgba(255, 255, 255, 0.5)", lineHeight: 1.5 }}>
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
