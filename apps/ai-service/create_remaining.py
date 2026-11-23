#!/usr/bin/env python3
"""Create remaining files"""
import os

base = "C:/Users/BIT/Desktop/VetPulse/apps/ai-service"

# .env file
env_content = """AI_PROVIDER=mock
MODEL_PATH=/app/model
LOG_LEVEL=INFO
"""
with open(os.path.join(base, ".env"), "w") as f:
    f.write(env_content)
print("Created .env")

# model/.gitkeep
with open(os.path.join(base, "model/.gitkeep"), "w") as f:
    f.write("")
print("Created model/.gitkeep")

# model/artifacts/.gitkeep
with open(os.path.join(base, "model/artifacts/.gitkeep"), "w") as f:
    f.write("")
print("Created model/artifacts/.gitkeep")

print("All remaining files created!")
