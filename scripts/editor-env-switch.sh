#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
EDITOR_DIR="$ROOT_DIR/apps/editor"
ACTIVE_ENV="$EDITOR_DIR/.env.local"
LOCAL_ENV="$EDITOR_DIR/.env.local.local"
REMOTE_ENV="$EDITOR_DIR/.env.local.remote"

REQUIRED_VARS="VITE_ASSET_STORAGE_PROVIDER VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_SUPABASE_BUCKET VITE_ENABLE_SUPABASE_AUTH VITE_SUPABASE_AUTH_REDIRECT_TO"

usage() {
  echo "Usage: $0 [local|remote|status]" >&2
}

read_env_value() {
  env_file="$1"
  var_name="$2"
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

validate_env_file() {
  env_file="$1"
  for var_name in $REQUIRED_VARS; do
    value=$(read_env_value "$env_file" "$var_name")
    if [ -z "$value" ]; then
      echo "ERROR: Missing required variable '$var_name' in $env_file" >&2
      exit 1
    fi
  done
}

switch_target() {
  target="$1"
  case "$target" in
    local)
      source_env="$LOCAL_ENV"
      ;;
    remote)
      source_env="$REMOTE_ENV"
      ;;
    *)
      usage
      exit 1
      ;;
  esac

  if [ ! -f "$source_env" ]; then
    echo "ERROR: Missing $source_env" >&2
    exit 1
  fi

  validate_env_file "$source_env"
  cp "$source_env" "$ACTIVE_ENV"
  echo "Switched editor environment to '$target' ($ACTIVE_ENV)"
}

print_status() {
  if [ ! -f "$ACTIVE_ENV" ]; then
    echo "active_target=missing"
    echo "path=$ACTIVE_ENV"
    exit 0
  fi

  active_target="custom"
  if [ -f "$LOCAL_ENV" ] && cmp -s "$ACTIVE_ENV" "$LOCAL_ENV"; then
    active_target="local"
  elif [ -f "$REMOTE_ENV" ] && cmp -s "$ACTIVE_ENV" "$REMOTE_ENV"; then
    active_target="remote"
  fi

  current_url=$(read_env_value "$ACTIVE_ENV" "VITE_SUPABASE_URL")
  echo "active_target=$active_target"
  echo "path=$ACTIVE_ENV"
  if [ -n "$current_url" ]; then
    echo "VITE_SUPABASE_URL=$current_url"
  fi
}

command="${1:-status}"
case "$command" in
  local|remote)
    switch_target "$command"
    ;;
  status)
    print_status
    ;;
  *)
    usage
    exit 1
    ;;
esac
