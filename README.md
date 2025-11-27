# Caesar – Computational Physics Simulations

A static website showcasing interactive computational physics simulations built with vanilla JavaScript. No frameworks, no build tools – just pure HTML, CSS, and JavaScript that runs anywhere.

## Overview

Caesar is a collection of browser-based physics simulations designed for education and exploration. Each simulation is interactive, allowing you to adjust parameters in real-time and observe how physical systems behave.

## Project Structure

```
caesar/
├── index.html              # Landing page with simulation listings
├── styles.css              # Site-wide styling
├── simulations/            # Individual simulation pages
│   └── test-simulation.html
└── js/                     # JavaScript for each simulation
    └── test-simulation.js
```

## How to Use

### Local Development

Simply open `index.html` in any modern web browser. No server required!

```bash
# Option 1: Open directly
open index.html

# Option 2: Use a simple HTTP server (optional)
python3 -m http.server 8000
# Then visit http://localhost:8000
```

### Deployment

This is a static site that can be deployed to any static hosting service:

- **Vercel**: Connect your git repository and deploy
- **Netlify**: Drag and drop the folder or connect via git
- **GitHub Pages**: Push to a repository and enable GitHub Pages

No build step needed – just deploy the files as-is.

## Adding New Simulations

1. Create a new HTML file in `simulations/` (e.g., `pendulum.html`)
2. Create corresponding JavaScript in `js/` (e.g., `pendulum.js`)
3. Link the stylesheet: `<link rel="stylesheet" href="../styles.css">`
4. Add a simulation card to `index.html`

## Current Simulations

- **Test Simulation**: Particle system with gravity, collision detection, and adjustable physics parameters

## Tech Stack

- Pure HTML5
- Vanilla JavaScript (ES6+)
- CSS3 with modern features
- Canvas API for graphics

## Philosophy

This project deliberately avoids frameworks and build tools to:
- Maximize portability and longevity
- Minimize dependencies and maintenance burden
- Keep the codebase accessible to learners
- Ensure fast load times and simple deployment
