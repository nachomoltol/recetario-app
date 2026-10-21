#!/usr/bin/env node
/**
 * Script de diagnóstico de variables de entorno y conectividad con Supabase.
 * Ejecutar con: node scripts/verify-env.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Cargar variables de .env.local si existen y no están ya en process.env
const envLocalPath = path.join(projectRoot, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

console.log('🔍 [DIAGNÓSTICO] Verificando variables de entorno en producción / local...');
console.log('----------------------------------------------------------------------');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

let hasErrors = false;

// 1. NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL: NO DEFINIDA.');
  hasErrors = true;
} else if (!supabaseUrl.startsWith('https://')) {
  console.warn(`⚠️ NEXT_PUBLIC_SUPABASE_URL: Formato sospechoso (${supabaseUrl}).`);
} else {
  console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);
}

// 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!anonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY: NO DEFINIDA.');
  hasErrors = true;
} else if (anonKey.split('.').length !== 3) {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY: No parece un JWT válido (debe tener 3 segmentos separados por punto).');
} else {
  console.log(`✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: Presente (${anonKey.slice(0, 12)}...${anonKey.slice(-6)})`);
}

// 3. SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY: No definida (algunas acciones como bypass de RLS o admin requerirán clave de servicio).');
} else if (serviceRoleKey.includes('tu-service-role-key')) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY: Contiene el valor por defecto de plantilla ("tu-service-role-key-aqui"). El servidor ignorará esta clave por seguridad.');
} else {
  console.log(`✅ SUPABASE_SERVICE_ROLE_KEY: Configurada (${serviceRoleKey.slice(0, 10)}...)`);
}

// 4. GEMINI_API_KEY
if (!geminiApiKey) {
  console.warn('⚠️ GEMINI_API_KEY: No definida (la extracción con IA fallará).');
} else {
  console.log(`✅ GEMINI_API_KEY: Configurada (${geminiApiKey.slice(0, 8)}...)`);
}

// 5. Test de Conectividad con Supabase
if (supabaseUrl && anonKey) {
  console.log('\n🌐 Probando conectividad HTTP con Supabase...');
  try {
    const testUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`;
    const res = await fetch(testUrl, {
      headers: {
        apikey: anonKey,
      },
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Conexión con Supabase exitosa (${data.name || 'GoTrue'} v${data.version || ''}).`);
    } else {
      console.warn(`⚠️ Respuesta inesperada de Supabase: HTTP ${res.status} ${res.statusText}`);
    }
  } catch (netErr) {
    console.error('❌ Error de red conectando con Supabase:', netErr.message);
    hasErrors = true;
  }
}

console.log('----------------------------------------------------------------------');
if (hasErrors) {
  console.error('❌ El diagnóstico ha detectado fallos críticos de configuración.');
  process.exit(1);
} else {
  console.log('🎉 Diagnóstico completado sin fallos críticos.');
}
