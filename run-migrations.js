#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const PROJECT_REF = 'wpvvfroutebiwckrenmq'
const ADMIN_KEY = 'sb_secret_zWReneWIc-p_tSMCe8iYYQ_X4rA_LuY'
const MIGRATIONS_DIR = path.join(__dirname, 'backend/supabase/migrations')

// Supabase connection string format - intenta con el host correcto
const connectionString = `postgresql://postgres:${ADMIN_KEY}@${PROJECT_REF}.supabase.co:5432/postgres`

async function runMigrations() {
  const client = new Client({ connectionString })

  try {
    await client.connect()
    console.log(`\n✅ Conectado a Supabase\n`)

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort()

    console.log(`📦 Ejecutando ${files.length} migraciones...\n`)

    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file)
      const sql = fs.readFileSync(filePath, 'utf8')

      console.log(`⏳ ${file}...`)
      try {
        await client.query(sql)
        console.log(`✅ ${file}\n`)
      } catch (error) {
        console.log(`❌ ${file}`)
        console.log(`   Error: ${error.message}\n`)
      }
    }

    console.log('✨ Migraciones completadas!\n')
  } catch (error) {
    console.error('❌ Error de conexión:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigrations().catch(console.error)
