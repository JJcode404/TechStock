#!/bin/bash

# ============================================================================
# TechStock Database Backup & Restore Script
# ============================================================================
# Usage:
#   ./backup-restore.sh backup              # Create a backup
#   ./backup-restore.sh restore <filename>  # Restore from backup
#   ./backup-restore.sh list                # List all backups
#   ./backup-restore.sh verify              # Verify database integrity
# ============================================================================

set -e

# Database configuration (from .env)
DB_USER="jj"
DB_PASSWORD="september"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="techstock"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y-%m-%dT%H-%M-%S-%3NZ)

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function: Create backup
backup_database() {
    log_info "Starting database backup..."
    
    BACKUP_FILE="$BACKUP_DIR/$DB_NAME-$TIMESTAMP.dump"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log_info "Created backups directory"
    fi
    
    export PGPASSWORD=$DB_PASSWORD
    
    if pg_dump -U $DB_USER -h $DB_HOST -p $DB_PORT $DB_NAME > "$BACKUP_FILE"; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_success "Database backed up successfully!"
        log_success "File: $BACKUP_FILE (Size: $SIZE)"
    else
        log_error "Backup failed!"
        exit 1
    fi
    
    unset PGPASSWORD
}

# Function: List backups
list_backups() {
    log_info "Available backups:"
    echo ""
    if [ -d "$BACKUP_DIR" ]; then
        ls -lh "$BACKUP_DIR"/*.dump 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || log_error "No backup files found"
    else
        log_error "Backups directory not found"
    fi
}

# Function: Restore backup
restore_database() {
    BACKUP_FILE=$1
    
    if [ -z "$BACKUP_FILE" ]; then
        log_error "Please specify a backup file"
        log_info "Usage: ./backup-restore.sh restore <filename>"
        exit 1
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    log_warning "⚠️  This will replace all data in the database '$DB_NAME'"
    log_warning "⚠️  Make sure you have a backup!"
    read -p "Are you sure you want to restore? (type 'yes' to confirm): " -r
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    export PGPASSWORD=$DB_PASSWORD
    
    log_info "Dropping existing database..."
    dropdb -U $DB_USER -h $DB_HOST -p $DB_PORT $DB_NAME 2>/dev/null || log_info "Database didn't exist or already dropped"
    
    log_info "Creating new database..."
    createdb -U $DB_USER -h $DB_HOST -p $DB_PORT $DB_NAME
    
    log_info "Restoring from backup: $BACKUP_FILE"
    if psql -U $DB_USER -h $DB_HOST -p $DB_PORT $DB_NAME < "$BACKUP_FILE"; then
        log_success "Database restored successfully!"
    else
        log_error "Restore failed!"
        exit 1
    fi
    
    unset PGPASSWORD
}

# Function: Verify database
verify_database() {
    log_info "Verifying database integrity..."
    
    export PGPASSWORD=$DB_PASSWORD
    
    # Check if database exists and is accessible
    if psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database connection successful"
        
        # Get table counts
        log_info "Database statistics:"
        psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME << EOF
\echo ''
SELECT 'Tables: ' || count(*) as info FROM information_schema.tables WHERE table_schema = 'public';
SELECT 'Categories: ' || count(*) as info FROM categories WHERE "isDeleted" = false;
SELECT 'Products: ' || count(*) as info FROM products WHERE "isDeleted" = false;
SELECT 'Sales: ' || count(*) as info FROM sales WHERE "isDeleted" = false;
SELECT 'Database Size: ' || pg_size_pretty(pg_database_size('$DB_NAME')) as info;
\echo ''
EOF
    else
        log_error "Cannot connect to database"
        exit 1
    fi
    
    unset PGPASSWORD
}

# Main script logic
case "$1" in
    backup)
        backup_database
        ;;
    restore)
        restore_database "$2"
        ;;
    list)
        list_backups
        ;;
    verify)
        verify_database
        ;;
    *)
        echo "TechStock Database Backup & Restore Script"
        echo ""
        echo "Usage: $0 {backup|restore|list|verify} [options]"
        echo ""
        echo "Commands:"
        echo "  backup              Create a new database backup"
        echo "  restore <file>      Restore from a backup file"
        echo "  list                List all available backups"
        echo "  verify              Verify database integrity"
        echo ""
        echo "Examples:"
        echo "  $0 backup"
        echo "  $0 restore backups/techstock-2026-08-16T11-58-38-835Z.dump"
        echo "  $0 list"
        echo "  $0 verify"
        exit 1
        ;;
esac
