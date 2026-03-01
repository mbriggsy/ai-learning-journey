# Code Style and Conventions

## File Naming
- Engine files: camelCase (car.ts, vec2.ts, formatTime.ts) or lowercase single word (track.ts, world.ts, types.ts, constants.ts)
- Renderer files: PascalCase classes (CameraController.ts, TrackRenderer.ts)
- AI files: kebab-case (ai-config.ts, bridge-server.ts)
- Test files: mirror source structure with .test.ts suffix

## Naming Conventions
- Interfaces: PascalCase (WorldState, CarState, Vec2)
- Constants objects: UPPER_CASE (CAR, TIRE, STEER, INPUT_RATES)
- Module-level private constants: UPPER_SNAKE_CASE or camelCase (SAMPLES_PER_SEGMENT, LOW_SPEED_GUARD)
- Functions: camelCase (createWorld, stepWorld, buildTrack)
- Enums: PascalCase with PascalCase members (Surface.Road, GamePhase.Racing)

## Code Style
- TypeScript strict mode always on
- JSDoc comments with @param and @returns on all public functions
- File-level doc block at top describing the module
- Import type keyword for type-only imports
- Pure functions, immutable state patterns in engine
- `as const` on constant objects
- `as const satisfies Type` on typed constant objects
- No classes in engine (pure functions only); classes used in renderer
