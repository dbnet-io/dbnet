package main_test

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/flarco/g"
	"github.com/flarco/g/net"
	"github.com/flarco/scruto/server"
	"github.com/flarco/scruto/store"
	"github.com/labstack/echo/v4"
	"github.com/spf13/cast"
	"github.com/stretchr/testify/assert"
)

var (
	srv = server.NewServer()
)

func TestExport(t *testing.T) {
	store.InitDB("file:./test.db")
}

func TestAll(t *testing.T) {
	// go srv.EchoServer.Logger.Fatal(srv.EchoServer.Start(":" + srv.Port))
	// time.Sleep(3 * time.Second)
	testSubmitSQL(t)
	testGetConnections(t)
	testGetSchemas(t)
	testGetTables(t)
	testCancelSQL(t)
	testSaveSession(t)
	testLoadSession(t)
}

func handleMsg(msg net.Message) net.Message {
	return server.Handlers[msg.Type](msg)
}

func newPostRequest(handler func(echo.Context) error, data map[string]interface{}) (*httptest.ResponseRecorder, error) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(g.Marshal(data)))
	g.P(req.URL.String())
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	return rec, handler(c)
}

func newGetRequest(handler func(echo.Context) error, data map[string]interface{}) (*httptest.ResponseRecorder, error) {
	vals := url.Values{}
	for k, v := range data {
		switch v.(type) {
		case map[string]interface{}:
			v = string(g.MarshalMap(v.(map[string]interface{})))
		}
		val := cast.ToString(v)
		if val == "" {
			continue
		}
		vals.Set(k, val)
	}
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/?"+vals.Encode(), nil)
	g.P(req.URL.String())
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	return rec, handler(c)
}

func testSubmitSQL(t *testing.T) {
	m := g.M(
		"id", g.NewTsID(),
		"conn", "PG_BIONIC",
		"text", "select * from housing.landwatch2 limit 138",
		"wait", true,
	)
	rec, err := newPostRequest(server.PostSubmitQuery, m)
	if !g.AssertNoError(t, err) {
		return
	}

	data := g.M()
	g.Unmarshal(rec.Body.String(), &data)
	assert.Contains(t, data, "headers")
	assert.Contains(t, data, "rows")
	if !assert.Contains(t, data, "id") {
		return
	}

	m["id"] = data["id"].(string)
	rows := data["rows"].([]interface{})
	headers := data["headers"].([]interface{})

	assert.Len(t, rows, 100)
	assert.Greater(t, len(headers), 1)

	testGetSQLRows(t, m)
}

func testGetSQLRows(t *testing.T, m map[string]interface{}) {
	rec, err := newGetRequest(server.GetSQLRows, m)
	if !g.AssertNoError(t, err) {
		return
	}
	data := g.M()
	g.Unmarshal(rec.Body.String(), &data)
	rows := data["rows"].([]interface{})
	assert.Len(t, rows, 38)
}

func testCancelSQL(t *testing.T) {
	m := g.M(
		"id", g.NewTsID(),
		"conn", "PG_BIONIC",
		"text", "select pg_sleep(1)",
		"wait", false,
	)

	rec, err := newPostRequest(server.PostSubmitQuery, m)
	if !g.AssertNoError(t, err) {
		return
	}
	data := g.M()
	g.Unmarshal(rec.Body.String(), &data)
	if assert.NotEmpty(t, data) {
		m["id"] = data["id"].(string)
	}

	rec, err = newPostRequest(server.PostCancelQuery, m)
	if !g.AssertNoError(t, err) {
		return
	}
	data = g.M()
	g.Unmarshal(rec.Body.String(), &data)
	assert.Equal(t, "cancelled", data["status"].(string))

	// try to get more rows, should create new query id
	m["wait"] = true
	rec, err = newPostRequest(server.PostSubmitQuery, m)
	if !g.AssertNoError(t, err) {
		return
	}
	data = g.M()
	g.Unmarshal(rec.Body.String(), &data)
	assert.EqualValues(t, store.QueryStatusCompleted, data["status"].(string))
}

func testGetConnections(t *testing.T) {
	m := g.M("id", g.NewTsID())
	rec, err := newGetRequest(server.GetConnections, m)
	if !g.AssertNoError(t, err) {
		return
	}
	data := g.M()
	g.Unmarshal(rec.Body.String(), &data)
	conns := data["conns"].([]interface{})
	assert.Greater(t, len(conns), 1)
}

func testGetSchemas(t *testing.T) {
	m := g.M(
		"id", g.NewTsID(),
		"conn", "PG_BIONIC",
	)
	rec, err := newGetRequest(server.GetSchemas, m)
	if !g.AssertNoError(t, err) {
		return
	}
	data := g.M()
	g.Unmarshal(rec.Body.String(), &data)
	rows := data["rows"].([]interface{})
	assert.Greater(t, len(rows), 1)
}

func testGetTables(t *testing.T) {
	m := g.M(
		"id", g.NewTsID(),
		"conn", "PG_BIONIC",
		"schema", "public",
	)
	rec, err := newGetRequest(server.GetTables, m)
	if !g.AssertNoError(t, err) {
		return
	}
	data := g.M()
	g.Unmarshal(rec.Body.String(), &data)
	rows := data["rows"].([]interface{})
	if assert.Greater(t, len(rows), 1) {
		schema := rows[0].([]interface{})[0].(string)
		testGetColumns(t, schema)
	}
}

func testGetColumns(t *testing.T, tableName string) {
	m := g.M(
		"id", g.NewTsID(),
		"conn", "PG_BIONIC",
		"schema", "public",
		"table", tableName,
	)
	rec, err := newGetRequest(server.GetColumns, m)
	if !g.AssertNoError(t, err) {
		return
	}
	data := g.M()
	g.Unmarshal(rec.Body.String(), &data)
	rows := data["rows"].([]interface{})
	assert.Greater(t, len(rows), 1)
}

func testSaveSession(t *testing.T) {
	m := g.M(
		"id", g.NewTsID(),
		"conn", "PG_BIONIC",
		"name", "default",
		"data", g.M(
			"test", "ing",
		),
	)
	_, err := newPostRequest(server.PostSaveSession, m)
	g.AssertNoError(t, err)
}

func testLoadSession(t *testing.T) {
	m := g.M(
		"id", g.NewTsID(),
		"conn", "PG_BIONIC",
		"name", "default",
	)
	rec, err := newGetRequest(server.GetLoadSession, m)
	if !g.AssertNoError(t, err) {
		return
	}
	data := g.M()
	err = g.Unmarshal(rec.Body.String(), &data)
	if assert.NoError(t, err) {
		assert.Equal(t, "ing", data["test"].(string))
	}
}

func testGetAnalysisSQL(t *testing.T) {}
func testGetHistory(t *testing.T)     {}
