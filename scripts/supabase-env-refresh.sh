#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
EDITOR_DIR="$ROOT_DIR/apps/editor"
ACTIVE_ENV="$EDITOR_DIR/.env.local"
LOCAL_ENV="$EDITOR_DIR/.env.local.local"
REMOTE_ENV="$EDITOR_DIR/.env.local.remote"
PROJECT_REF_FILE="$ROOT_DIR/supabase/.temp/project-ref"

DEFAULT_BUCKET="game-assets"
DEFAULT_PROVIDER="supabase"
DEFAULT_AUTH_ENABLED="true"
DEFAULT_AUTH_REDIRECT="http://localhost:5173/editor"

usage() {
  echo "Usage: $0 [local|remote]" >&2
}

read_env_value() {
  env_file="$1"
  var_name="$2"
  if [ ! -f "$env_file" ]; then
    echo ""
    return 0
  fi

  awk -v key="$var_name" -F= '
    $1 == key {
      print substr($0, index($0, "=") + 1)
      found = 1
      exit
    }
    END {
      if (!found) {
        print ""
      }
    }
  ' "$env_file"
}

parse_json_field() {
  field_name="$1"
  node -e '
    const fs = require("fs")
    const input = fs.readFileSync(0, "utf8")
    const payload = JSON.parse(input)
    const key = process.argv[1]
    const value = payload[key]
    process.stdout.write(typeof value === "string" ? value : "")
  ' "$field_name"
}

parse_anon_key_from_api_keys() {
  node -e '
    const fs = require("fs")
    const input = fs.readFileSync(0, "utf8")
    const rows = JSON.parse(input)
    const anon = Array.isArray(rows)
      ? rows.find((row) => row && row.name === "anon")
      : null
    const key = anon && typeof anon.api_key === "string" ? anon.api_key : ""
    process.stdout.write(key)
  '
}

write_target_env() {
  target_file="$1"
  supabase_url="$2"
  anon_key="$3"

  share_api_base_url=$(read_env_value "$target_file" "VITE_SHARE_API_BASE_URL")
  if [ -z "$share_api_base_url" ]; then
    share_api_base_url=$(read_env_value "$ACTIVE_ENV" "VITE_SHARE_API_BASE_URL")
  fi

  tmp_file=$(mktemp)
  {
    echo "VITE_ASSET_STORAGE_PROVIDER=$DEFAULT_PROVIDER"
    echo "VITE_SUPABASE_URL=$supabase_url"
    echo "VITE_SUPABASE_ANON_KEY=$anon_key"
    echo "VITE_SUPABASE_BUCKET=$DEFAULT_BUCKET"
    echo "VITE_ENABLE_SUPABASE_AUTH=$DEFAULT_AUTH_ENABLED"
    echo "VITE_SUPABASE_AUTH_REDIRECT_TO=$DEFAULT_AUTH_REDIRECT"
    if [ -n "$share_api_base_url" ]; then
      echo "VITE_SHARE_API_BASE_URL=$share_api_base_url"
    fi
  } > "$tmp_file"

  mv "$tmp_file" "$target_file"
  echo "Refreshed $target_file"
}

refresh_local() {
  raw_status=$(supabase status -o json)
  status_json=$(printf '%s\n' "$raw_status" | sed -n '/^{/,$p')
  if [ -z "$status_json" ]; then
    echo "ERROR: Could not parse JSON from 'supabase status -o json'" >&2
    exit 1
  fi

  local_url=$(printf '%s' "$status_json" | parse_json_field "API_URL")
  local_anon_key=$(printf '%s' "$status_json" | parse_json_field "ANON_KEY")

  if [ -z "$local_url" ] || [ -z "$local_anon_key" ]; then
    echo "ERROR: Local Supabase status did not return API_URL/ANON_KEY" >&2
    exit 1
  fi

  write_target_env "$LOCAL_ENV" "$local_url" "$local_anon_key"
}

refresh_remote() {
  if [ ! -f "$PROJECT_REF_FILE" ]; then
    echo "ERROR: Missing linked project ref file: $PROJECT_REF_FILE" >&2
    exit 1
  fi

  project_ref=$(tr -d '[:space:]' < "$PROJECT_REF_FILE")
  if [ -z "$project_ref" ]; then
    echo "ERROR: Empty project ref in $PROJECT_REF_FILE" >&2
    exit 1
  fi

  api_keys_json=$(supabase projects api-keys --project-ref "$project_ref" --output json)
  remote_anon_key=$(printf '%s' "$api_keys_json" | parse_anon_key_from_api_keys)
  remote_url="https://${project_ref}.supabase.co"

  if [ -z "$remote_anon_key" ]; then
    echo "ERROR: Could not resolve anon key for project '$project_ref'" >&2
    exit 1
  fi

  write_target_env "$REMOTE_ENV" "$remote_url" "$remote_anon_key"
}

command="${1:-}"
case "$command" in
  local)
    refresh_local
    ;;
  remote)
    refresh_remote
    ;;
  *)
    usage
    exit 1
    ;;
esac
