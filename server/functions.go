package server

import (
	"context"
	"io/ioutil"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/spf13/cast"
	"gopkg.in/yaml.v3"

	"github.com/flarco/dbio/connection"
	"github.com/flarco/dbio/database"
	"github.com/flarco/dbio/iop"
	"github.com/flarco/g"
	"github.com/flarco/scruto/store"
)

var (
	// Connections is all connections
	Connections  = map[string]*Connection{}
	Queries      = map[string]*store.Query{}
	mux          sync.Mutex
	defaultLimit = 100
	// Sync syncs to store
	Sync    = store.Sync
	HomeDir = os.Getenv("DBNET_DIR")
)

// Connection is a connection
type Connection struct {
	Conn  *connection.Connection
	Props map[string]string // to cache vars
}

// Request is the typical request struct
type Request struct {
	Name      string      `json:"name" query:"name"`
	Conn      string      `json:"conn" query:"conn"`
	Database  string      `json:"database" query:"database"`
	Schema    string      `json:"schema" query:"schema"`
	Table     string      `json:"table" query:"table"`
	Procedure string      `json:"procedure" query:"procedure"`
	Data      interface{} `json:"data" query:"data"`
}

func init() {

	loadConnections()

	// for key, val := range g.KVArrToMap(os.Environ()...) {
	// 	if !strings.Contains(val, ":/") {
	// 		continue
	// 	}
	// 	conn, err := connection.NewConnectionFromURL(key, val)
	// 	if err != nil {
	// 		continue
	// 	}
	// 	Connections[key] = &Connection{Conn: &conn, Queries: map[string]*store.Query{}, Props: map[string]string{}}
	// }
}

// func (c *Connection) Databases() (dbs []string, err error) {

// }

// DefaultDB returns the default database
func (c *Connection) DefaultDB() string {
	return c.Conn.Info().Database
}

func loadConnections() (err error) {
	Connections, err = LoadProfile(HomeDir + "/profile.yaml")
	return err
}

// LoadProfile loads the profile from the `profile.yaml` file in the home dir
func LoadProfile(path string) (conns map[string]*Connection, err error) {
	conns = map[string]*Connection{}
	profile := map[string]map[string]interface{}{}
	file, err := os.Open(path)
	if err != nil {
		err = g.Error(err, "error reading profile")
		return
	}

	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		err = g.Error(err, "error reading profile bytes")
		return
	}

	err = yaml.Unmarshal(bytes, profile)
	if err != nil {
		err = g.Error(err, "error parsing profile string")
		return
	}

	if dbs, ok := profile["databases"]; ok {
		for name, v := range dbs {
			switch v.(type) {
			case map[string]interface{}:
				data := v.(map[string]interface{})
				if n := cast.ToString(data["name"]); n != "" {
					data["name"] = name
				}

				conn, err := connection.NewConnectionFromMap(g.M("name", name, "data", data, "type", data["type"]))
				if err != nil {
					g.Warn("could not load connection %s", name)
					g.LogError(err)
					continue
				}

				conns[name] = &Connection{
					Conn:  &conn,
					Props: map[string]string{},
				}
				g.Trace("found in profile: " + name)
			default:
				g.Warn("did not handle %s", name)
			}
		}
	}
	return
}

// NewQuery creates a Query object
func NewQuery(ctx context.Context) *store.Query {
	q := new(store.Query)
	q.Context = g.NewContext(ctx)
	q.Done = make(chan struct{})
	return q
}

// ReqFunction is the request function type
type ReqFunction func(c database.Connection, req Request) (iop.Dataset, error)

// ProcessRequestFromMsg processes the request with the given function
func ProcessRequestFromMsg(msg Message, reqFunc ReqFunction) (data iop.Dataset, err error) {
	req := Request{}
	err = g.Unmarshal(g.Marshal(msg.Data), &req)
	if err != nil {
		err = g.Error(err, "could not unmarshal request")
		return
	}

	return ProcessRequest(req, reqFunc)
}

// ProcessRequest processes the request with the given function
func ProcessRequest(req Request, reqFunc ReqFunction) (data iop.Dataset, err error) {
	c, err := GetConn(req.Conn, req.Database)
	if err != nil {
		err = g.Error(err, "could not get conn %s", req.Conn)
		return
	}

	return reqFunc(c, req)
}

// LoadSchemata should:
// 1. load all schemas
// 2. load all objects in each schema
func LoadSchemata(connName, DbName string) (err error) {

	c, err := GetConn(connName, DbName)
	if err != nil {
		err = g.Error(err, "could not get conn %s", connName)
		return
	}

	s, err := c.GetSchemas()
	if err != nil {
		err = g.Error(err, "could not get schemas for conn %s", connName)
		return
	}

	for _, r := range s.Rows {
		schemaName := cast.ToString(r[0])
		g.Info("loading schema " + schemaName)
		schema, err := c.GetSchemaObjects(schemaName)
		if err != nil {
			err = g.Error(err, "could not get schema %s", schemaName)
			break
		}

		// to store
		schemaTables := make([]store.SchemaTable, len(schema.Tables))
		totColumns := 0
		i := 0
		for _, table := range schema.Tables {
			totColumns = totColumns + len(table.Columns)
			schemaTables[i] = store.SchemaTable{
				Conn:       strings.ToLower(connName),
				Database:   strings.ToLower(DbName),
				SchemaName: strings.ToLower(schemaName),
				TableName:  strings.ToLower(table.Name),
				IsView:     table.IsView,
			}
			i++
		}

		if len(schemaTables) > 0 {
			Sync("schema_tables", &schemaTables, "conn", "database", "schema_name", "table_name", "is_view")
		}

		for _, table := range schema.Tables {
			tableColumns := make([]store.TableColumn, len(table.Columns))
			for i, col := range table.Columns {
				tableColumns[i] = store.TableColumn{
					Conn:       strings.ToLower(connName),
					Database:   strings.ToLower(DbName),
					SchemaName: strings.ToLower(schemaName),
					TableName:  strings.ToLower(table.Name),
					Name:       strings.ToLower(col.Name),
					ID:         col.Position,
					Type:       strings.ToLower(col.Type),
					Precision:  0,
					Scale:      0,
				}
			}
			Sync(
				"table_columns", &tableColumns, "conn",
				"database", "schema_name", "table_name",
				"name", "id", "type", "precision", "scale",
			)
		}

		if totColumns == 0 {
			err = g.Error("No columns found for conn %s", connName)
		}
	}
	return
}

// 1. open cursor and do not close result (to not pull all rows)
// 2. put DS in mem when client pulls more rows?
// 3. handle multiple statements ?
// 4. how to get addional rows?
func doSubmitSQL(query *store.Query) (err error) {

	// get connection
	c, err := GetConn(query.Conn, query.Database)
	if err != nil {
		err = g.Error(err, "could not get conn %s", query.Conn)
		return
	}

	mux.Lock()
	Queries[query.ID] = query
	mux.Unlock()

	Sync("queries", query)

	go func() {
		query.Submit(c)

		// expire the query after 10 minutes
		timer := time.NewTimer(time.Duration(10*60) * time.Second)
		go func() {
			select {
			case <-timer.C:
				mux.Lock()
				delete(Queries, query.ID)
				mux.Unlock()
			}
		}()
	}()

	return
}

// GetConn gets the connection
func GetConn(connName, databaseName string) (conn database.Connection, err error) {
	mux.Lock()
	c, ok := Connections[connName]
	mux.Unlock()
	if !ok {
		err = g.Error("could not find conn %s", connName)
		return
	}

	// create new connection with specific database
	data := g.M()
	for k, v := range c.Conn.Data {
		data[k] = v
	}
	if databaseName != "" {
		data["database"] = strings.ToLower(databaseName)
	}
	delete(data, "url")
	delete(data, "schema")
	connObj, err := connection.NewConnectionFromMap(g.M("name", c.Conn.Name, "data", data, "type", c.Conn.Type))
	if err != nil {
		err = g.Error(err, "could not load connection %s", c.Conn.Name)
		return
	}

	// connect or use pool
	os.Setenv("DBIO_USE_POOL", "TRUE")

	// init connection
	props := append(g.MapToKVArr(c.Props), g.MapToKVArr(connObj.DataS())...)
	conn, err = database.NewConn(connObj.URL(), props...)
	if err != nil {
		err = g.Error(err, "could not initialize database connection '%s' / '%s' with provided credentials/url.", connName, databaseName)
		return
	}
	err = conn.Connect()
	if err != nil {
		err = g.Error(err, "could not connect with provided credentials/url")
		return
	}
	c.Props = conn.Props()

	return
}
