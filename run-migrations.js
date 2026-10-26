#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const MIGRATIONS_DIR = path.join(__dirname, 'backend/supabase/migrations')

// La cadena de conexion viene de una variable de entorno: NUNCA se escribe en
// este archivo (el repo es publico). Se obtiene en Supabase > Project Settings >
// Database > Connection string.
//
// OJO: aplica TODAS las migraciones en orden y sigue aunque alguna falle. Pensado
// para un proyecto nuevo/vacio (por ejemplo uno de pruebas), no para produccion.
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('Falta DATABASE_URL (cadena de conexion de Postgres de Supabase).')
  process.exit(1)
}

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
