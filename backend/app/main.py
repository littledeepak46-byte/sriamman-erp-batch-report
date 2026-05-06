from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, customers, vehicles, materials, design_mix, deliveries

app = FastAPI(
    title="Sri Amman RMC Batching ERP",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(vehicles.router, prefix="/api")
app.include_router(materials.router, prefix="/api")
app.include_router(design_mix.router, prefix="/api")
app.include_router(deliveries.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SARMC Batching ERP"}
