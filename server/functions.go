package server

import (
	"context"
	"io/ioutil"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/slingdata-io/sling/core/elt"
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
	DbtServers   = map[string]*DbtServer{}
	Queries      = map[string]*store.Query{}
	Jobs         = map[string]*store.Job{}
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

// DefaultDB returns the default database
func (c *Connection) DefaultDB() string {
	return c.Conn.Info().Database
}

func LoadConnections() (err error) {
	eG := g.ErrorGroup{}
	HomeDir = os.Getenv("DBNET_DIR")

	Connections, err = ReadConnections()
	eG.Capture(err)

	DbtConnections, err := ReadDbtConnections()
	eG.Capture(err)

	for k, conn := range DbtConnections {
		Connections[k] = conn
	}

	if eG.Err() != nil {
		return eG.Err()
	}

	return
}

// ReadConnections loads the connections
func ReadConnections() (conns map[string]*Connection, err error) {
	conns = map[string]*Connection{}
	path := HomeDir + "/.dbnet.yaml"

	profile := map[string]map[string]interface{}{}
	file, err := os.Open(path)
	if err != nil {
		err = g.Error(err, "error reading from yaml")
		return
	}

	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		err = g.Error(err, "error reading bytes from yaml")
		return
	}

	err = yaml.Unmarshal(bytes, profile)
	if err != nil {
		err = g.Error(err, "error parsing yaml string")
		return
	}

	if connections, ok := profile["connections"]; ok {
		for name, v := range connections {
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
				g.Trace("found connection from YAML: " + name)
			default:
				g.Warn("did not handle %s", name)
			}
		}
	}
	return
}

func ReadDbtConnections() (conns map[string]*Connection, err error) {
	conns = map[string]*Connection{}

	profileDir := strings.TrimSuffix(os.Getenv("DBT_PROFILES_DIR"), "/")
	if profileDir == "" {
		profileDir = g.UserHomeDir() + "/.dbt"
	}
	path := profileDir + "/profiles.yml"
	if !g.PathExists(path) {
		return
	}

	file, err := os.Open(path)
	if err != nil {
		err = g.Error(err, "error reading from yaml: %s", path)
		return
	}

	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		err = g.Error(err, "error reading bytes from yaml: %s", path)
		return
	}

	type ProfileConn struct {
		Target  string           `json:"target" yaml:"target"`
		Outputs map[string]g.Map `json:"outputs" yaml:"outputs"`
	}

	dbtProfile := map[string]ProfileConn{}
	err = yaml.Unmarshal(bytes, &dbtProfile)
	if err != nil {
		err = g.Error(err, "error parsing yaml string")
		return
	}

	for pName, pc := range dbtProfile {
		for target, data := range pc.Outputs {
			connName := strings.ToUpper(pName + "/" + target)
			data["dbt"] = true

			conn, err := connection.NewConnectionFromMap(
				g.M("name", connName, "data", data, "type", data["type"]),
			)
			if err != nil {
				g.Warn("could not load dbt connection %s", connName)
				g.LogError(err)
				continue
			}

			conns[connName] = &Connection{
				Conn:  &conn,
				Props: map[string]string{},
			}
			g.Trace("found connection from dbt profiles YAMML: " + connName)
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
	c, err := GetConnInstance(req.Conn, req.Database)
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

	c, err := GetConnInstance(connName, DbName)
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
	c, err := GetConnInstance(query.Conn, query.Database)
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
				query.Context.Cancel()
				if query.Result != nil {
					query.Result.Close()
				}
				mux.Lock()
				delete(Queries, query.ID)
				mux.Unlock()
			}
		}()
	}()

	return
}

// GetConnInstance gets the connection object
func GetConnObject(connName, databaseName string) (connObj connection.Connection, err error) {
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
	connObj, err = connection.NewConnectionFromMap(g.M("name", c.Conn.Name, "data", data, "type", c.Conn.Type))
	if err != nil {
		err = g.Error(err, "could not load connection %s", c.Conn.Name)
		return
	}
	return
}

// GetConnInstance gets the connection instance
func GetConnInstance(connName, databaseName string) (conn database.Connection, err error) {
	mux.Lock()
	c := Connections[connName]
	mux.Unlock()

	connObj, err := GetConnObject(connName, databaseName)
	if err != nil {
		err = g.Error(err, "could not load connection %s", connName)
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

// NewJob creates a Job object
func NewJob(ctx context.Context) *store.Job {
	j := store.Job{
		Context: g.NewContext(ctx),
		Request: g.M(),
		Result:  g.M(),
		Done:    make(chan struct{}),
	}
	return &j
}

func submitJob(req JobRequest, cfg elt.Config) (job *store.Job, err error) {

	task := elt.NewTask(req.idNumber(), cfg)
	if task.Err != nil {
		err = g.Error(task.Err, "error creating extract / load task")
		return
	}

	job = NewJob(context.Background())
	job.ID = req.ID
	job.Type = string(task.Type)
	job.Task = &task
	job.Status = job.Task.Status
	g.Unmarshal(g.Marshal(req), &job.Request)
	job.Time = time.Now().Unix()

	mux.Lock()
	Jobs[job.ID] = job
	mux.Unlock()

	Sync("jobs", job)

	go func() {
		defer Sync("jobs", job)
		defer func() { job.Done <- struct{}{} }()
		job.Task.Execute()
		job.Status = job.Task.Status
		job.Err = g.ErrMsg(job.Task.Err)
		job.Duration = (float64(time.Now().UnixNano()/1000000) - float64(job.Time)) / 1000
		job.Result = job.MakeResult()

		// delete from map
		timer := time.NewTimer(10 * time.Second)
		go func() {
			select {
			case <-timer.C:
				mux.Lock()
				delete(Jobs, job.ID)
				mux.Unlock()
			}
		}()
	}()

	return
}
