#!/usr/bin/env bash
# Corre las pruebas de la base de datos contra un PostgreSQL local.
# Uso: tests/db/run.sh   (variables opcionales: PGHOST, PGPORT, PGUSER)
# Cada prueba corre en una transacción que se deshace al final.
set -euo pipefail

cd "$(dirname "$0")/../.."
export PGHOST="${PGHOST:-/tmp}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-postgres}"
DB="agrovia_test"

psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
PSQL=(psql -q -X -v ON_ERROR_STOP=1 -d "$DB")

"${PSQL[@]}" -f tests/db/supabase_stub.sql >/dev/null
for f in supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$f" >/dev/null 2> >(grep -v NOTICE >&2) || { echo "FALLÓ la migración $f"; exit 1; }
done
"${PSQL[@]}" -f tests/db/helpers.sql >/dev/null

pass=0; fail=0
for t in tests/db/test_*.sql; do
  if out=$( { echo "begin;"; cat "$t"; echo "rollback;"; } | "${PSQL[@]}" 2>&1 ); then
    echo "  ok    $(basename "$t" .sql)"
    pass=$((pass + 1))
  else
    echo "  FALLA $(basename "$t" .sql)"
    echo "$out" | grep -E "ERROR|DETAIL|CONTEXT" | head -5 | sed 's/^/          /'
    fail=$((fail + 1))
  fi
done
echo
echo "$pass pruebas ok, $fail con fallas"
[ "$fail" -eq 0 ]
