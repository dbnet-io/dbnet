package server

import (
	"context"
	"encoding/base64"
	"io/ioutil"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/slingdata-io/sling-cli/core/sling"
	"github.com/spf13/cast"

	"github.com/flarco/dbio/connection"
	"github.com/flarco/dbio/database"
	"github.com/flarco/dbio/env"
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
	Sync           = store.Sync
	HomeDir        = os.Getenv("DBNET_HOME_DIR")
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

// Connection is a connection
type Connection struct {
	Conn  connection.Connection
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
	Connections, err = ReadConnections()
	if err != nil {
		return err
	}

	return
}

// ReadConnections loads the connections
func ReadConnections() (conns map[string]*Connection, err error) {
	connsMap := map[string]*Connection{}

	connEntries := connection.GetLocalConns()
	for _, entry := range connEntries {
		name := strings.ReplaceAll(strings.ToUpper(entry.Name), "/", "_")
		connsMap[name] = &Connection{
			Conn:  entry.Connection,
			Props: map[string]string{},
		}
	}

	return connsMap, nil
}

// NewQuery creates a Query object
func NewQuery(ctx context.Context) *store.Query {
	q := new(store.Query)
	q.Affected = -1
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

	g.Info("Loading schemata for %s, %s", connName, DbName)
	schemata, err := c.GetSchemata("", "")
	if err != nil {
		err = g.Error(err, "could not get schemata for conn %s, %s", connName, DbName)
		return
	}

	g.Info("Got %d tables for database %s", len(schemata.Tables()), DbName)
	g.Info("Got %d columns for database %s", len(schemata.Columns()), DbName)

	for schemaName, schema := range schemata.Databases[strings.ToLower(DbName)].Schemas {
		// g.Info("%s - %s - %d", DbName, schema.Name, len(schema.Tables))
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

		totalColumns := 0
		for _, table := range schema.Tables {
			tableColumns := make([]store.TableColumn, len(table.Columns))
			for i, col := range table.Columns {
				tableColumns[i] = store.TableColumn{
					Conn:        strings.ToLower(connName),
					Database:    strings.ToLower(DbName),
					SchemaName:  strings.ToLower(schemaName),
					TableName:   strings.ToLower(table.Name),
					TableIsView: table.IsView,
					Name:        strings.ToLower(col.Name),
					ID:          col.Position,
					Type:        col.DbType,
					Precision:   0,
					Scale:       0,
				}
			}
			Sync(
				"table_columns", &tableColumns, "conn",
				"database", "schema_name", "table_name",
				"name", "id", "type", "precision", "scale",
			)
			totalColumns = totalColumns + len(tableColumns)
		}
		g.Debug("Loaded %d columns in %d tables for schema %s.%s", totalColumns, len(schema.Tables), DbName, schemaName)

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

	err = processDbtQuery(query)
	if err != nil {
		query.Error = g.Error(err, "could not compile dbt query")
		query.Err = g.ErrMsg(query.Error)
		return query.Error
	}

	go func() {
		query.Submit(c)

		// expire the query after 10 minutes
		timer := time.NewTimer(time.Duration(10*60) * time.Second)
		go func() {
			<-timer.C
			query.Close(false)
			mux.Lock()
			delete(Queries, query.ID)
			mux.Unlock()
		}()
	}()

	return
}

// processDbtQuery compiles the dbt query as needed
func processDbtQuery(q *store.Query) (err error) {

	conn, err := GetConnObject(q.Conn, q.Database)
	if err != nil {
		return g.Error(err, "could not get query connection")
	}

	if strings.Contains(q.Text, "{{") && strings.Contains(q.Text, "}}") && cast.ToBool(conn.Data["dbt"]) {
		// Is DBT query, need to compile and submit

		profile := cast.ToString(conn.Data["profile"])
		target := cast.ToString(conn.Data["target"])

		s, err := GetOrCreateDbtServer(q.ProjDir, profile, target)
		if err != nil {
			return g.Error(err, "could not get or create dbt server")
		}

		dbtReq := dbtRequest{
			ID:      q.ID,
			JsonRPC: "2.0",
			Method:  "compile_sql",
			Params: map[string]interface{}{
				"timeout": 60,
				"sql":     base64.StdEncoding.EncodeToString([]byte(q.Text)),
				"name":    q.ID,
			},
		}

		dbtResp, err := s.Submit(dbtReq)
		if err != nil {
			return g.Error(err, "error compiling dbt query %s", q.ID)
		}

		resultVal := cast.ToSlice(dbtResp.Result["results"])[0]
		result := g.M()
		err = g.Unmarshal(g.Marshal(resultVal), &result)
		if err != nil {
			return g.Error(err, "error parsing compiled sql for %s", q.ID)
		}

		q.Text = cast.ToString(result["compiled_sql"])
	}

	return nil
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
	data := g.M("application", "DbNet")
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
	os.Setenv("USE_POOL", "TRUE")

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

	// set SetMaxIdleConns
	// conn.Db().SetMaxIdleConns(2)

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

func submitJob(req JobRequest, cfg *sling.Config) (job *store.Job, err error) {

	task := sling.NewTask(req.idNumber(), cfg)
	if task.Err != nil {
		err = g.Error(task.Err, "error creating extract / load task")
		return
	}

	job = NewJob(context.Background())
	job.ID = req.ID
	job.Type = string(task.Type)
	job.Task = task
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
