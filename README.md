# Caesar – Computational Physics Simulations

A Next.js web application showcasing interactive computational physics simulations and personal projects.

## Overview

Caesar is a collection of browser-based physics simulations and projects designed for education and exploration. Each project is interactive, featuring a modern UI with video backgrounds and smooth animations.

## Project Structure

This is a Next.js 15 application with the following structure:

```
caesar/
├── src/app/              # Next.js app router pages
│   ├── page.tsx         # Main landing page
│   ├── layout.tsx       # Root layout
│   └── globals.css      # Global styles
├── components/          # React components
│   ├── Header.tsx       # Navigation header
│   ├── BackgroundVideo.tsx
│   └── FeatureCard.tsx  # Project cards
├── public/              # Static assets
│   ├── bg/             # Background videos
│   └── images/         # Project images
└── lib/                # Utilities and helpers
```

## How to Use

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Visit http://localhost:3000
```

### Build for Production

```bash
npm run build
npm start
```

## Deployment

This Next.js app is configured for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Vercel will auto-detect Next.js and configure build settings
3. Every push to `main` triggers automatic deployment

## Adding New Projects

1. Add project card to `src/app/page.tsx` in the Projects section
2. Add project image to `public/images/features/`
3. Create new page in `src/app/` if needed

## Current Projects

- **Particle Physics Simulation**: Real-time particle system with gravity and collisions
- **Quantum Network Communication**: Network visualization (coming soon)
- **Additional projects**: Placeholders for future simulations

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React 19** - UI library

## Features

- Video background with fallback support
- Smooth scroll navigation
- Fade-in animations
- Responsive design
- Accessibility support (respects `prefers-reduced-motion`)
