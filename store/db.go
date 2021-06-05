package store

import (
	"os"
	"time"

	"github.com/flarco/dbio/database"
	"github.com/flarco/g"
	"github.com/jmoiron/sqlx"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	// Db is the maing databse connection
	Db  *gorm.DB
	dbx *sqlx.DB

	// DropAll signifies to drop all tables and recreate them
	DropAll = false
)

// InitDB initializes the database
func InitDB() {
	var err error

	dbURL := g.F("file:%s/.storage.db", os.Getenv("DBNET_DIR"))
	conn, err := database.NewConn(dbURL)
	g.LogFatal(err, "Could not initialize sqlite connection: %s", dbURL)

	Db, err = conn.GetGormConn(&gorm.Config{})
	g.LogFatal(err, "Could not connect to sqlite database: %s", dbURL)

	allTables := []interface{}{
		&SchemaTable{},
		&TableColumn{},
		&Job{},
		&Query{},
		&QueryRow{},
		&Session{},
	}

	for _, table := range allTables {
		dryDB := Db.Session(&gorm.Session{DryRun: true})
		tableName := dryDB.Find(table).Statement.Table
		if DropAll == true {
			Db.Exec(g.F(`drop table if exists "%s"`, tableName))
		}
		g.Debug("Creating table: " + tableName)
		err = Db.AutoMigrate(table)
		g.LogFatal(err, "error AutoMigrating table: "+tableName)
	}

	// go g.LogFatal(CleanupTasks(), "error running db cleanup tasks")
}

// Sync syncs to the store
func Sync(table string, obj interface{}, fields ...string) (err error) {
	pks := map[string][]string{
		"schema_tables": {"conn", "database", "schema_name", "table_name"},
		"table_columns": {"conn", "database", "schema_name", "table_name", "name"},
		"queries":       {"id"},
		"query_rows":    {"id", "row_num"},
		"jobs":          {"id"},
		"sessions":      {"conn", "name"},
	}

	conflictClause := clause.OnConflict{UpdateAll: true}
	if len(fields) > 0 {
		conflictClause = clause.OnConflict{
			DoUpdates: clause.AssignmentColumns(fields),
		}

		if pk, ok := pks[table]; ok {
			cols := make([]clause.Column, len(pk))
			for i, k := range pk {
				cols[i] = clause.Column{Name: k}
			}
			conflictClause.Columns = cols
		}
	}

	err = Db.Clauses(conflictClause).Create(obj).Error
	if err != nil {
		err = g.Error(err)
		g.LogError(err)
	}
	return
}

// RemoveOld removes old non-existent tables/columns
func RemoveOld(table, conn, schemaName, tableName, columnName string) (err error) {

	// pks := map[string][]string{
	// 	"schema_tables": []string{"conn", "schema_name", "table_name"},
	// 	"table_columns": []string{"conn", "schema_name", "table_name", "name"},
	// }
	// pk, ok := pks[table]
	// if !ok {
	// 	return g.Error("Wrong table: " + table)
	// }

	err = Db.Exec("delete from %s where updated_dt < ( select max(updated_dt) from %s where (fields) = )", table).Error

	return err

}

// CleanupTasks cleans up the db
func CleanupTasks() (err error) {
	// delete query row data older than 1 month
	// oldMark := time.Now().Add(-30*24*time.Hour).UnixNano() / 1000000
	// err = Db.Exec(`update queries set rows = null where time < ?`, oldMark).Error
	// if err != nil {
	// 	return g.Error(err, "could not delete old queries")
	// }

	// vacuum
	err = Db.Exec(`vacuum`).Error
	if err != nil {
		return g.Error(err, "could not vacuum")
	}

	return
}

// Loop loops interval functions
func Loop() {
	ticker60Minute := time.NewTicker(60 * time.Minute)
	defer ticker60Minute.Stop()
	for {
		select {
		case <-ticker60Minute.C:
			g.LogError(CleanupTasks())
		}
	}
}
