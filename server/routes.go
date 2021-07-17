package server

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/flarco/dbio"
	"github.com/flarco/dbio/connection"
	"github.com/flarco/dbio/database"
	"github.com/flarco/dbio/iop"
	"github.com/flarco/g"
	"github.com/flarco/scruto/store"
	"github.com/labstack/echo/v4"
	"github.com/slingdata-io/sling/core/sling"
	"github.com/spf13/cast"
)

func GetSettings(c echo.Context) (err error) {
	m := g.M(
		"homeDir", HomeDir,
	)

	return c.JSON(http.StatusOK, m)
}

func GetConnections(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get connection request")
	}

	LoadConnections()

	conns := g.M()
	for k, conn := range Connections {
		conns[k] = g.M(
			"name", conn.Conn.Info().Name,
			"type", conn.Conn.Info().Type,
			"database", conn.Conn.Info().Database,
			"dbt", conn.Conn.Data["dbt"],
		)
	}

	return c.JSON(http.StatusOK, g.M("conns", conns))
}

func GetDatabases(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get databases request")
	}

	rf := func(c database.Connection, req Request) (data iop.Dataset, err error) {
		sql, ok := c.Template().Metadata["databases"]
		if !ok {
			err = g.Error("no template found for getting databases for %s", c.GetType())
			return
		}
		data, err = c.Query(sql)
		if err != nil {
			err = g.Error(err, "could not query databases")
			return
		}
		return
	}

	data, err := ProcessRequest(req, rf)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get databases")
	}

	return c.JSON(http.StatusOK, data.ToJSONMap())
}

func GetSchemata(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get schemata request")
	}

	rf := func(c database.Connection, req Request) (iop.Dataset, error) {
		schemaTablesColumns := []store.TableColumn{}
		dbQ := store.Db.Where("conn = ? and database = ?", strings.ToLower(req.Conn), strings.ToLower(req.Database))
		load := func() error {
			err := dbQ.Order("schema_name, table_name").Find(&schemaTablesColumns).Error
			if err != nil {
				return g.Error(err, "could not query schemata")
			}
			return nil
		}

		err = load()
		if len(schemaTablesColumns) == 0 || req.Procedure == "refresh" {
			// delete old entries
			err = dbQ.Delete(&store.SchemaTable{}).Error
			g.LogError(err, "could not delete old schemata for %s/%s", strings.ToLower(req.Conn), strings.ToLower(req.Database))

			err = LoadSchemata(req.Conn, req.Database)
			if err != nil {
				return iop.Dataset{}, g.Error(err, "could not get schemata")
			}

			err = load()
			if err != nil {
				return iop.Dataset{}, g.Error(err, "could not query schemata")
			}
		}

		columns := []string{"schema_name", "table_name", "table_is_view", "column_id", "column_name", "column_type"}
		data := iop.NewDataset(iop.NewColumnsFromFields(columns...))

		for _, tableColumn := range schemaTablesColumns {
			row := []interface{}{
				tableColumn.SchemaName, tableColumn.TableName,
				tableColumn.TableIsView, tableColumn.ID,
				tableColumn.Name, tableColumn.Type,
			}
			data.Rows = append(data.Rows, row)
		}

		return data, nil
	}

	data, err := ProcessRequest(req, rf)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get schemas for %s", req.Database)
	}

	return c.JSON(http.StatusOK, data.ToJSONMap())
}

func GetSchemas(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get schemata request")
	}

	rf := func(c database.Connection, req Request) (iop.Dataset, error) {
		return c.GetSchemas()
	}

	data, err := ProcessRequest(req, rf)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get schemas for %s", req.Database)
	}

	return c.JSON(http.StatusOK, data.ToJSONMap())
}

func GetTables(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get tables request")
	}

	rf := func(c database.Connection, req Request) (data iop.Dataset, err error) {
		data = iop.NewDataset(iop.NewColumnsFromFields("name", "is_view"))
		tablesData, err := c.GetTables(req.Schema)
		if err != nil {
			err = g.Error(err, "could not get tables")
			return
		}
		for _, r := range tablesData.Rows {
			data.Append(iop.Row(r[0], false))
		}

		viewsData, err := c.GetViews(req.Schema)
		if err != nil {
			err = g.Error(err, "could not get views")
			return
		}
		for _, r := range viewsData.Rows {
			data.Append(iop.Row(r[0], true))
		}

		// delete old entries
		err = store.Db.Where(
			"conn = ? and database = ? and schema_name = ?",
			strings.ToLower(req.Conn), strings.ToLower(req.Database), strings.ToLower(req.Schema),
		).Delete(&store.SchemaTable{}).Error

		g.LogError(
			err, "could not delete old tables for %s/%s/%s",
			strings.ToLower(req.Conn), strings.ToLower(req.Database), strings.ToLower(req.Schema),
		)

		// to store
		schemaTables := make([]store.SchemaTable, len(data.Rows))
		for i, r := range data.Rows {
			schemaTables[i] = store.SchemaTable{
				Conn:       strings.ToLower(req.Conn),
				Database:   strings.ToLower(req.Database),
				SchemaName: strings.ToLower(req.Schema),
				TableName:  strings.ToLower(cast.ToString(r[0])),
				IsView:     cast.ToBool(r[1]),
			}
		}

		if len(schemaTables) > 0 {
			Sync("schema_tables", &schemaTables, "conn", "database", "schema_name", "table_name", "is_view")
		}

		return data, nil
	}

	data, err := ProcessRequest(req, rf)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get schemas for %s", req.Database)
	}

	return c.JSON(http.StatusOK, data.ToJSONMap())
}

// GetColuumns returns a list of columns in a table for a connection
func GetColumns(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get tables request")
	}

	rf := func(c database.Connection, req Request) (data iop.Dataset, err error) {
		tableColumns := []store.TableColumn{}
		store.Db.
			Where(`conn = ? and database = ? and schema_name = ? 
			and table_name = ?`, strings.ToLower(req.Conn), strings.ToLower(req.Database),
				strings.ToLower(req.Schema), strings.ToLower(req.Table)).
			Order("id").Find(&tableColumns)

		if len(tableColumns) == 0 || req.Procedure == "refresh" {
			table := g.F("%s.%s", req.Schema, req.Table)
			data, err = c.GetColumnsFull(table)
			if err != nil {
				err = g.Error(err, "could not get columns")
				return
			}

			// to store
			tableColumns = make([]store.TableColumn, len(data.Rows))
			for i, r := range data.Rows {
				tableColumns[i] = store.TableColumn{
					Conn:       strings.ToLower(req.Conn),
					Database:   strings.ToLower(req.Database),
					SchemaName: strings.ToLower(req.Schema),
					TableName:  strings.ToLower(req.Table),
					Name:       strings.ToLower(cast.ToString(r[2])),
					ID:         i + 1,
					Type:       strings.ToLower(cast.ToString(r[3])),
					Precision:  0,
					Scale:      0,
				}
			}

			if len(tableColumns) > 0 {
				Sync(
					"table_columns", &tableColumns, "conn",
					"database", "schema_name", "table_name",
					"name", "id", "type", "precision", "scale",
				)
			} else {
				err = g.Error("No columns found for table %s", table)
			}
		} else {
			data.Columns = iop.NewColumnsFromFields("schema_name", "table_name", "column_name", "data_type", "position")
			for _, col := range tableColumns {
				row := []interface{}{col.SchemaName, col.TableName, col.Name, col.Type, col.ID}
				data.Rows = append(data.Rows, row)
			}
		}

		return
	}

	data, err := ProcessRequest(req, rf)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get schemas for %s", req.Database)
	}

	return c.JSON(http.StatusOK, data.ToJSONMap())
}

// GetAnalysisSQL returns a sql text from an analysis template
func GetAnalysisSQL(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get analysis sql request")
	}

	// get connection
	conn, err := GetConnInstance(req.Conn, req.Database)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not get conn %s", req.Conn)
	}

	template, ok := conn.Template().Analysis[req.Procedure]
	if !ok {
		err = g.Error("did not find Analysis: " + req.Procedure)
		return g.ErrJSON(http.StatusNotFound, err)
	}

	data := g.M()
	err = g.Unmarshal(g.Marshal(req.Data), &data)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not unmarshal")
	}

	sql := g.Rm(template, data)
	return c.JSON(http.StatusOK, g.M("sql", sql))
}

// GetHistory returns a a list of queries from the history.
func GetHistory(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get history request")
	}

	entries := []store.Query{}
	conns := strings.Split(req.Conn, ",")
	switch req.Procedure {
	case "get_latest":
		err = store.Db.Order("time desc").Limit(100).
			Where("conn in (?)", conns).Find(&entries).Error

	case "search":
		whereValues := []interface{}{conns}
		orArr := []string{}
		for _, orStr := range strings.Split(req.Name, ",") {
			andWhere := []string{}
			for _, word := range strings.Split(orStr, " ") {
				andWhere = append(andWhere, g.F("lower(text) like ?"))
				whereValues = append(whereValues, g.F("%%%s%%", strings.ToLower(strings.TrimSpace(word))))
			}
			orArr = append(orArr, "("+strings.Join(andWhere, " and ")+")")
		}
		whereStr := g.F("conn in (?) and (%s)", strings.Join(orArr, " or "))
		err = store.Db.Order("time desc").Limit(100).
			Where(whereStr, whereValues...).Find(&entries).Error
	}

	if err != nil {
		err = g.Error(err, "could not %s history", req.Procedure)
		return
	}

	return c.JSON(200, g.M("history", entries))
}

func PostCancelQuery(c echo.Context) (err error) {
	query := NewQuery(context.Background())
	if err = c.Bind(query); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid cancel query request")
	}

	mux.Lock()
	q, ok := Queries[query.ID]
	mux.Unlock()
	if !ok {
		err = g.Error("could not find query %s", query.ID)
		return g.ErrJSON(http.StatusInternalServerError, err, "could not find query %s", query.ID)
	}

	q.Close(true)

	query.Status = store.QueryStatusCancelled
	query.Rows = nil
	Sync("queries", query, "status")

	mux.Lock()
	delete(Queries, query.ID)
	mux.Unlock()

	return c.JSON(http.StatusOK, g.ToMap(query))
}

func PostSubmitQuery(c echo.Context) (err error) {

	query := NewQuery(context.Background())
	if err = c.Bind(query); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid get sql rows request")
	}

	if query.Limit == 0 {
		query.Limit = 5000
	}

	if c.Request().Header.Get("DbNet-Continue") != "" {
		// pick up where left off

		mux.Lock()
		var ok bool
		qId := query.ID
		query, ok = Queries[query.ID]
		mux.Unlock()
		if !ok {
			return g.ErrJSON(http.StatusInternalServerError, g.Error("could not find query %s to continue", qId))
		}
	} else {
		// submit
		err = doSubmitSQL(query)
		if err != nil {
			return g.ErrJSON(http.StatusInternalServerError, err, "could not query conn %s", query.Conn)
		}
	}

	ticker := time.NewTicker(90 * time.Second)
	defer ticker.Stop()

	result := g.ToMap(query)
	status := 200
	if query.Wait {
		select {
		case <-query.Done:
			result, err = query.ProcessResult()
			if err != nil {
				result["err"] = g.ErrMsgSimple(err)
				return c.JSON(500, result)
			}
		case <-ticker.C:
			status = 202 // when status is 202, follow request with header "DbNet-Continue"
		}
	}

	return c.JSON(status, result)
}

// GetLoadSession loads session from store
func GetLoadSession(c echo.Context) (err error) {

	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "could not unmarshal request")
	}

	session := store.Session{Conn: req.Conn, Name: req.Name}
	err = store.Db.First(&session).Error
	if err != nil {
		if !strings.Contains(err.Error(), "record not found") {
			return g.ErrJSON(http.StatusInternalServerError, err, "could not load session")
		}
		err = nil // create new session
		session.Data = g.M("connection", g.M("name", req.Conn))
	}

	return c.JSON(200, session.Data)
}

// PostSaveSession saves a session to store
func PostSaveSession(c echo.Context) (err error) {

	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "could not unmarshal request")
	}

	data := g.M()
	err = g.Unmarshal(g.Marshal(req.Data), &data)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not unmarshal session data")
	}

	session := store.Session{
		Conn: req.Conn, Name: req.Name, Data: data,
	}
	err = Sync("sessions", &session)
	if err != nil {
		return g.ErrJSON(http.StatusInternalServerError, err, "could not save session")
	}

	return c.JSON(200, g.M())
}

// PostFileOperation operates with the file system
func PostFileOperation(c echo.Context) (err error) {
	req := FileRequest{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "could not unmarshal file request")
	}

	data := g.M()
	switch req.Operation {
	case OperationList:
		var items []FileItem
		items, err = req.List()
		data["items"] = items
	case OperationRead:
		var file FileItem
		file, err = req.Read()
		data["file"] = file
	case OperationWrite:
		err = req.Write()
	case OperationDelete:
		err = req.Delete()
	}
	if err != nil {
		err = g.Error(err, "error performing %s", req.Operation)
		return g.ErrJSON(http.StatusInternalServerError, err)
	}

	return c.JSON(200, data)
}

// PostSubmitDbt submits an RPC commands to a dbt server
// https://docs.getdbt.com/reference/commands/rpc
func PostSubmitDbt(c echo.Context) (err error) {
	req := Request{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid submit DBT request")
	}

	m := g.M()
	err = g.Unmarshal(g.Marshal(req.Data), &m)
	if err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid submit DBT request")
	}

	profile := cast.ToString(m["profile"])
	projDir := cast.ToString(m["projDir"])

	key := strings.ToLower(g.F("%s|%s", profile, projDir))

	mux.Lock()
	s, ok := DbtServers[key]
	mux.Unlock()
	if !ok {
		s = NewDbtServer(projDir, profile)
		err = s.Launch()
		if err != nil {
			err = g.Error(err, "could not launch dbt server")
			return g.ErrJSON(http.StatusInternalServerError, err)
		}
	} else {
		s.Refresh()
		time.Sleep(1 * time.Second)
	}

	dbtReq := dbtRequest{}
	err = g.Unmarshal(g.Marshal(m["request"]), &dbtReq)
	if err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid submit DBT request")
	}

	dbtResp, err := s.Submit(dbtReq)
	if err != nil {
		err = g.Error(err, "error performing RPC request: %s", req.Procedure)
		return g.ErrJSON(http.StatusInternalServerError, err)
	}

	return c.JSON(200, dbtResp)
}

type JobRequestConn struct {
	Type     dbio.Type `json:"type"`
	Name     string    `json:"name"`
	Database string    `json:"database"`
}

type JobRequest struct {
	ID     string         `json:"id"`
	Source JobRequestConn `json:"source"`
	Target JobRequestConn `json:"target"`
	Config g.Map          `json:"config"`
}

// idNumber return the id as a number
func (jr *JobRequest) idNumber() int {
	var result strings.Builder
	for i := 0; i < len(jr.ID); i++ {
		b := jr.ID[i]
		if '0' <= b && b <= '9' {
			result.WriteByte(b)
		}
	}
	return cast.ToInt(result.String())
}

// PostSubmitExtractLoadJob submits an extract / load job
func PostSubmitExtractLoadJob(c echo.Context) (err error) {
	req := JobRequest{}
	if err = c.Bind(&req); err != nil {
		return g.ErrJSON(http.StatusBadRequest, err, "invalid extract / load job request")
	}

	var job *store.Job
	if c.Request().Header.Get("DbNet-Continue") != "" {
		// pick up where left off
		mux.Lock()
		var ok bool
		job, ok = Jobs[req.ID]
		mux.Unlock()
		if !ok {
			return g.ErrJSON(http.StatusInternalServerError, g.Error("could not find job %s to continue", req.ID))
		}
	} else {
		// get conn creds
		var srcConn, tgtConn connection.Connection
		if req.Source.Type.IsDb() {
			srcConn, err = GetConnObject(req.Source.Name, req.Source.Database)
			if err != nil {
				return g.ErrJSON(http.StatusBadRequest, err, "invalid source conn")
			}
		}

		if req.Target.Type.IsDb() {
			tgtConn, err = GetConnObject(req.Target.Name, req.Target.Database)
			if err != nil {
				return g.ErrJSON(http.StatusBadRequest, err, "invalid target conn")
			}
		}

		// make config
		cfg, err := sling.NewConfig(g.Marshal(req.Config))
		if err != nil {
			return g.ErrJSON(http.StatusBadRequest, err, "invalid extract / load job configuration")
		}

		// set conn creds
		if req.Source.Type.IsDb() {
			cfg.Source.Data = srcConn.Data
			cfg.SrcConn = srcConn
		}
		if req.Target.Type.IsDb() {
			cfg.Target.Data = tgtConn.Data
			cfg.TgtConn = tgtConn
		}

		// submit
		job, err = submitJob(req, cfg)
		if err != nil {
			return g.ErrJSON(http.StatusInternalServerError, err, "error starting extract / load task")
		}
	}

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	select {
	case <-job.Done:
		if err = job.Task.Err; err != nil {
			return c.JSON(500, job.MakeResult())
		}
	case <-ticker.C:
		// when status is 202, follow request with header "DbNet-Continue"
		return c.JSON(202, job.MakeResult())
	}
	return c.JSON(200, job.MakeResult())
}
