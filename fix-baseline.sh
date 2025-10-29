#!/bin/bash
# Quick fix script for baseline issue

echo "🔧 Fixing database baseline issue..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Try to mark migration as applied (if table exists)
echo "✅ Marking migration as applied..."
npx prisma migrate resolve --applied 20240530213853_create_session_table || echo "⚠️ Migration resolve failed, might need manual setup"

echo "✨ Done! Try deploying again."

