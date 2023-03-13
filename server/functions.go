package server

import (
	"io/ioutil"
	"os"
	"strings"

	"github.com/dbnet-io/dbnet/store"
	dbRestServer "github.com/dbrest-io/dbrest/server"
	dbRestState "github.com/dbrest-io/dbrest/state"
	"github.com/flarco/dbio/env"
	"github.com/flarco/dbio/iop"
	"github.com/flarco/g"
	"github.com/labstack/echo/v5"
)

var (
	// Connections is all connections
	// Sync syncs to store
	Sync           = store.Sync
	HomeDir        = ""
	HomeDirEnvFile = ""
)

func init() {
	HomeDir = env.SetHomeDir("dbnet")
	HomeDirEnvFile = env.GetEnvFilePath(HomeDir)

	// create env file if not exists
	os.MkdirAll(HomeDir, 0755)
	if HomeDir != "" && !g.PathExists(HomeDirEnvFile) {
		defaultEnvBytes, _ := env.EnvFolder.ReadFile("default.env.yaml")
		defaultEnvBytes = append([]byte("# See https://docs.dbnet.io/\n"), defaultEnvBytes...)
		ioutil.WriteFile(HomeDirEnvFile, defaultEnvBytes, 0644)
	}

	// other sources of creds
	env.SetHomeDir("sling")  // https://github.com/slingdata-io/sling
	env.SetHomeDir("dbrest") // https://github.com/dbrest-io/dbrest
}

func queryMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) (err error) {
		reqErr := next(c) // process to get response
		if query, ok := c.Get("query").(*dbRestState.Query); ok && query != nil {
			req := c.Get("request").(*dbRestServer.Request)
			go g.LogError(processQuery(req, query), "could not process query")
		}
		return reqErr
	}
}

func schemataMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) (err error) {
		reqErr := next(c) // process to get response

		if data, ok := c.Get("data").(*iop.Dataset); ok && data != nil {
			req := c.Get("request").(*dbRestServer.Request)
			go g.LogError(processSchemataData(req, data), "could not process schemata data")
		}

		return reqErr
	}
}

func processQuery(req *dbRestServer.Request, query *dbRestState.Query) (err error) {
	return
}

func processSchemataData(req *dbRestServer.Request, data *iop.Dataset) (err error) {
	return

	// save to db
	urlPath := req.URL().Path

	err = store.Conn.Begin()
	if err != nil {
		return err
	}

	switch {
	case strings.HasSuffix(urlPath, "/.tables"):
		// insert in temp table
		err = store.Conn.CreateTemporaryTable("temp_table", data.Columns)
		if err != nil {
			return err
		}

		_, err = store.Conn.InsertBatchStream("temp_table", data.Stream())
		if err != nil {

		}

		// depending on level, delete from final table when is not in temp table
		// insert from temp table into final table
		// delete from temp table
		switch {
		case req.Schema == "":
			// connection level tables
			_, err = store.Conn.Exec(`delete from schema_tables where connection = ? and database = ?`, req.Connection, req.Database)
			if err != nil {
				return err
			}
		case req.Schema != "":
			// schema level tables
			_, err = store.Conn.Exec(`delete from schema_tables where connection = ? and database = ? and schema_name = ?`, req.Connection, req.Database, req.Schema)
			if err != nil {
				return err
			}
		}

		// insert

		// err = tx.Exec(...)

	case req.Schema == "" && strings.HasSuffix(urlPath, "/.columns"):
		// connection level columns
	case req.Schema != "" && req.Table == "" &&
		strings.HasSuffix(urlPath, "/.columns"):
		// schema level columns
	case req.Schema != "" && req.Table != "" &&
		strings.HasSuffix(urlPath, "/.columns"):
		// table level columns
	}

	err = store.Conn.Commit()
	if err != nil {

	}

	return
}
