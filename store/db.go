package store

import (
	"github.com/flarco/dbio/database"
	"github.com/flarco/g"
	"github.com/jmoiron/sqlx"
	"gorm.io/gorm"
)

var (
	// Db is the maing databse connection
	Db  *gorm.DB
	dbx *sqlx.DB

	// DropAll signifies to drop all tables and recreate them
	DropAll = true
)

// InitDB initializes the database
func InitDB(dbURL string) {
	var err error

	conn, err := database.NewConn(dbURL)
	g.LogFatal(err, "Could not initialize database connection")

	Db, err = conn.GetGormConn(&gorm.Config{})
	g.LogFatal(err, "Could not connect to database")

	allTables := []interface{}{
		&SchemaTable{},
		&TableColumn{},
		&Query{},
		&Session{},
	}

	for _, table := range allTables {
		dryDB := Db.Session(&gorm.Session{DryRun: true})
		tableName := dryDB.Find(table).Statement.Table
		if DropAll == true {
			Db.Exec(g.F(`drop table if exists "%s" cascade`, tableName))
		}
		g.Debug("Creating table: " + tableName)
		err = Db.AutoMigrate(table)
		g.LogFatal(err, "error AutoMigrating table: "+tableName)
	}

}
