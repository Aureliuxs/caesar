# Development Troubleshooting

## Server Health Check

Check server status at any time:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2025-10-15T12:15:08.719Z",
  "version": "1.0.0"
}
```

## SSR vs Client-Only Components

### Important: All graph generators and 3D rendering are client-only

The quantum network builder uses:
- **Client-side graph generation**: All network generators (lattice, flowers, small-world) run exclusively in the browser
- **Client-side rendering**: Canvas and 3D rendering with WebGL/rotation controls
- **No SSR generation**: Graphs are never generated during server-side rendering to prevent:
  - Memory exhaustion from large graph generation
  - `window`/`document` access errors
  - Canvas/WebGL API unavailability

### Architecture

All interactive components are marked with `'use client'`:
- `/src/app/sim/quantum-network/page.tsx` - Main workspace (client component)
- `/components/sim/GraphCanvas.tsx` - Canvas renderer with 3D support
- `/components/sim/ControlStrip.tsx` - Parameter controls

### Development Best Practices

1. **Never import generators in server components**
   ```typescript
   // ❌ Don't do this in server components
   import { generateLattice } from '@/lib/graph/generators/lattice';

   // ✅ Only import in 'use client' components
   'use client';
   import { generateLattice } from '@/lib/graph/generators/lattice';
   ```

2. **Guard browser APIs**
   ```typescript
   // Safe pattern for optional browser APIs
   if (typeof window !== 'undefined') {
     // Use window, document, canvas, etc.
   }
   ```

3. **Parameter Validation**
   All generators validate input before processing:
   - Lattice: `size >= 2`
   - Flowers: `u >= 2`, `v >= u`, `generations >= 1`
   - Node count caps: Maximum 100 nodes per graph

## Common Issues

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Restart server
npm run dev
```

### Build Errors

```bash
# Clean Next.js cache
rm -rf .next

# Rebuild
npm run build
```

### Type Errors

```bash
# Run type check without building
npx tsc --noEmit
```

## Testing New Features

After implementing new graph types or rendering features:

1. **Test SSR safety**: Load `/sim/quantum-network` - should return 200
2. **Test client generation**:
   - Square lattice: 2D N=3 with wrap
   - Square lattice: 3D N=4 with wrap (verify 50% opacity on wrap edges)
   - Triangular lattice: 2D N=8 with wrap (verify spherical embedding)
   - Hexagonal lattice: 2D N=8 with wrap (verify degree 3)
   - (U,V) Flowers: (2,3) n=5 2D Radial
   - (U,V) Flowers: (2,5) n=4 3D Concentric

3. **Verify 3D controls**:
   - Rotation orb appears for 3D graphs
   - Ctrl+Drag rotates the view
   - Hint overlay appears and dismisses on interaction
   - Zoom is smooth and exponential

4. **Check console**: No errors should appear in browser devtools

## Monitoring

Watch server logs during development:
```bash
npm run dev
```

Look for:
- ✓ Compiled routes successfully
- GET requests returning 200
- No runtime errors or unhandled promise rejections
