# Geology Reconstruction API (Minimal)

Endpoints:
- POST /api/geology/reconstruct/preview -> { jobId }
- POST /api/geology/reconstruct/commit -> { jobId }
- GET  /api/geology/jobs/{jobId}/status -> { status, progress }
- GET  /api/geology/jobs/{jobId}/result -> { threeJsData, quality, metadata }

Payload (preview/commit):
- hash, domain{ nx,ny,nz, bounds }, boreholes[], waterHead{}, algorithm, algorithmParams, options{}

This module currently simulates GemPy+meshing. Replace pipeline._simulate_gempy_and_mesh with the real pipeline.
