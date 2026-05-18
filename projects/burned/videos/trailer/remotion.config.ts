import { Config } from '@remotion/cli/config';

// Point at BURNED's public/ so staticFile() reads game assets directly.
// All trailer-only assets land under public/trailer/ per Phase 0 ADR #15.
Config.setPublicDir('../../public');
