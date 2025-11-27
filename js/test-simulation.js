// Test Simulation - Particle System with Gravity and Collisions
// Pure vanilla JavaScript physics simulation

class Particle {
    constructor(x, y, vx, vy, radius, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.color = color;
    }

    update(gravity, damping, canvasWidth, canvasHeight, dt) {
        // Apply gravity
        this.vy += gravity * dt;

        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Wall collisions with damping
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx = -this.vx * damping;
        } else if (this.x + this.radius > canvasWidth) {
            this.x = canvasWidth - this.radius;
            this.vx = -this.vx * damping;
        }

        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy = -this.vy * damping;
        } else if (this.y + this.radius > canvasHeight) {
            this.y = canvasHeight - this.radius;
            this.vy = -this.vy * damping;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

class Simulation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.gravity = 9.8;
        this.damping = 0.8;
        this.particleCount = 50;
        this.isPaused = false;
        this.lastTime = performance.now();

        this.init();
    }

    init() {
        this.particles = [];
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a',
            '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e2'
        ];

        for (let i = 0; i < this.particleCount; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * (this.canvas.height * 0.5);
            const vx = (Math.random() - 0.5) * 100;
            const vy = (Math.random() - 0.5) * 100;
            const radius = 5 + Math.random() * 5;
            const color = colors[Math.floor(Math.random() * colors.length)];

            this.particles.push(new Particle(x, y, vx, vy, radius, color));
        }
    }

    update() {
        if (this.isPaused) return;

        const currentTime = performance.now();
        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap dt to prevent large jumps
        this.lastTime = currentTime;

        this.particles.forEach(particle => {
            particle.update(
                this.gravity,
                this.damping,
                this.canvas.width,
                this.canvas.height,
                dt
            );
        });
    }

    draw() {
        // Clear canvas with fade effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw particles
        this.particles.forEach(particle => particle.draw(this.ctx));

        // Draw info text
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`Particles: ${this.particles.length}`, 10, 20);
        this.ctx.fillText(`Gravity: ${this.gravity.toFixed(1)}`, 10, 40);
        this.ctx.fillText(`Damping: ${this.damping.toFixed(2)}`, 10, 60);
        if (this.isPaused) {
            this.ctx.fillText('PAUSED', 10, 80);
        }
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    setGravity(value) {
        this.gravity = parseFloat(value);
    }

    setParticleCount(value) {
        this.particleCount = parseInt(value);
        this.init();
    }

    setDamping(value) {
        this.damping = parseFloat(value);
    }

    reset() {
        this.init();
        this.lastTime = performance.now();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.lastTime = performance.now(); // Reset time to prevent jump
        }
        return this.isPaused;
    }
}

// Initialize simulation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    const simulation = new Simulation(canvas);

    // Start animation loop
    simulation.animate();

    // Set up controls
    const gravitySlider = document.getElementById('gravitySlider');
    const gravityValue = document.getElementById('gravityValue');
    const particleCountSlider = document.getElementById('particleCountSlider');
    const particleCountValue = document.getElementById('particleCountValue');
    const bounceDampingSlider = document.getElementById('bounceDampingSlider');
    const bounceDampingValue = document.getElementById('bounceDampingValue');
    const resetBtn = document.getElementById('resetBtn');
    const pauseBtn = document.getElementById('pauseBtn');

    // Gravity control
    gravitySlider.addEventListener('input', (e) => {
        const value = e.target.value;
        gravityValue.textContent = parseFloat(value).toFixed(1);
        simulation.setGravity(value);
    });

    // Particle count control
    particleCountSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        particleCountValue.textContent = value;
        simulation.setParticleCount(value);
    });

    // Bounce damping control
    bounceDampingSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        bounceDampingValue.textContent = parseFloat(value).toFixed(2);
        simulation.setDamping(value);
    });

    // Reset button
    resetBtn.addEventListener('click', () => {
        simulation.reset();
    });

    // Pause button
    pauseBtn.addEventListener('click', () => {
        const isPaused = simulation.togglePause();
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        // You could add canvas resize logic here if needed
    });
});
