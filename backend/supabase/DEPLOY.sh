#!/bin/bash
# CannaTrack Supabase Migrations Deployment Script
# Usage: ./DEPLOY.sh

set -e

echo "=========================================="
echo "CannaTrack Supabase Deployment"
echo "=========================================="

PROJECT_REF="wpvvfroutebiwckrenmq"
MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/migrations"

echo ""
echo "Project: $PROJECT_REF"
echo "Migrations Dir: $MIGRATIONS_DIR"
echo ""

# Check if migrations exist
echo "Checking migrations..."
migrations=(
  "20260424_01_init_schema.sql"
  "20260424_02_nutrition_tables.sql"
  "20260424_03_gamification.sql"
  "20260424_04_rls_policies.sql"
)

for migration in "${migrations[@]}"; do
  if [ ! -f "$MIGRATIONS_DIR/$migration" ]; then
    echo "✗ Missing: $migration"
    exit 1
  fi
  echo "✓ $migration"
done

echo ""
echo "All migrations found!"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Supabase CLI not found. Please install:"
  echo "  npm install -g supabase"
  exit 1
fi

echo "Using Supabase CLI..."
echo ""

# Link project
echo "Linking to project..."
cd "$(dirname "${BASH_SOURCE[0]}")"
supabase link --project-ref $PROJECT_REF

# Push migrations
echo ""
echo "Pushing migrations..."
supabase db push

echo ""
echo "✓ Deployment complete!"
echo ""
echo "Verify in dashboard:"
echo "  https://$PROJECT_REF.supabase.co/dashboard"
