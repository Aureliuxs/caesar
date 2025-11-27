'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import BackgroundVideo from '@/components/BackgroundVideo';
import BackgroundFallback from '@/components/BackgroundFallback';
import Section from '@/components/Section';
import FeatureCard from '@/components/FeatureCard';

export default function Home() {
  const [active, setActive] = useState<"home" | "about" | "projects">("home");

  useEffect(() => {
    // Setup intersection observer to track active section
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id as "home" | "about" | "projects";
            setActive(id);
          }
        });
      },
      { threshold: 0.5, rootMargin: '-84px 0px 0px 0px' }
    );

    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Background Layers - Always on unless motion reduced or file missing */}
      <BackgroundVideo />
      <BackgroundFallback />

      {/* Header */}
      <Header active={active} />

      {/* HERO Section */}
      <Section id="home" overlay="light">
        <div className="flex min-h-screen flex-col items-center justify-center text-center -mt-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-tight text-white text-balance"
          >
            Welcome
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
            className="mt-6 text-xl leading-8 text-slate-200 max-w-2xl mx-auto"
          >
            A collection of personal projects made by Aurelius
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="mt-10 flex items-center justify-center gap-x-6 flex-wrap"
          >
            <button className="focus-ring inline-flex items-center rounded-xl bg-white px-6 py-3 text-slate-900 font-semibold hover:bg-slate-100 active:bg-slate-200 transition-colors">
              View Projects
            </button>
            <button className="focus-ring inline-flex items-center rounded-xl border border-white/30 bg-white/10 backdrop-blur px-6 py-3 text-white hover:bg-white/20 transition-colors">
              Learn more
            </button>
          </motion.div>
        </div>
      </Section>

      {/* ABOUT Section */}
      <Section id="about" overlay="dark">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white mb-8">About</h2>

          <div className="prose prose-lg prose-invert max-w-none">
            <p className="text-slate-300 text-lg leading-relaxed mb-6">
              Caesar is a computational physics platform designed to bridge the gap between theoretical concepts
              and interactive exploration. Built for researchers, students, and curious minds who want to
              understand complex systems through hands-on experimentation.
            </p>

            <p className="text-slate-400 leading-relaxed">
              The platform focuses on network theory, quantum systems, and statistical mechanics—areas where
              visualization and parameter manipulation can provide deep insights into underlying mathematical
              structures. Every simulation is designed with reproducibility in mind, ensuring that discoveries
              can be shared and verified across the scientific community.
            </p>
          </div>
        </div>
      </Section>

      {/* PROJECTS Section */}
      <Section id="projects" overlay="dark">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold tracking-tight text-white mb-4">Projects</h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Interactive simulations and analysis tools for exploring complex networks and quantum systems
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <FeatureCard
              title="Particle Physics Simulation"
              imageSrc="/images/features/particles.jpg"
              imageAlt="Particle system with gravity and collisions"
              href="/simulations/test-simulation.html"
            />
            <FeatureCard
              title="Quantum network communication"
              imageSrc="/images/features/quantum.jpg"
              imageAlt="Quantum entanglement network diagram"
              href="/sim/quantum-network"
            />
            <FeatureCard
              title="Misinformation propagation"
              imageSrc="/images/features/misinformation.jpg"
              imageAlt="Network visualization of misinformation spread"
            />
            <FeatureCard
              title="Graph neural networks"
              imageSrc="/images/features/gnn.jpg"
              imageAlt="Graph neural network architecture"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
