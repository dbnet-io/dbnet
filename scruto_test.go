package main_test

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

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
	go srv.EchoServer.Start(":" + srv.Port)
	time.Sleep(1 * time.Second)
	testSubmitSQL(t)
	testGetConnections(t)
	testGetSchemas(t)
	testGetTables(t)
	testCancelSQL(t)
	testSaveSession(t)
	testLoadSession(t)
	testGetHistory(t)
}

func handleMsg(msg net.Message) net.Message {
	return server.Handlers[msg.Type](msg)
}

func postRequest(route server.RouteName, data1 map[string]interface{}) (data2 map[string]interface{}, err error) {
	headers := map[string]string{"Content-Type": "application/json"}
	url := g.F("http://localhost:%s%s", srv.Port, route.String())
	g.P(url)
	_, respBytes, err := net.ClientDo("POST", url, strings.NewReader(g.Marshal(data1)), headers, 5)
	if err != nil {
		err = g.Error(err)
		return
	}
	err = g.Unmarshal(string(respBytes), &data2)
	if err != nil {
		err = g.Error(err)
		return
	}
	return
}

func getRequest(route server.RouteName, data1 map[string]interface{}) (data2 map[string]interface{}, err error) {
	headers := map[string]string{"Content-Type": "application/json"}
	vals := url.Values{}
	for k, v := range data1 {
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
	url := g.F("http://localhost:%s%s?%s", srv.Port, route.String(), vals.Encode())
	g.P(url)
	_, respBytes, err := net.ClientDo("GET", url, nil, headers, 5)
	if err != nil {
		err = g.Error(err)
		return
	}
	err = g.Unmarshal(string(respBytes), &data2)
	if err != nil {
		err = g.Error(err)
		return
	}
	return
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
	data, err := postRequest(server.RouteSubmitSQL, m)
	if !g.AssertNoError(t, err) {
		return
	}

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
	data, err := getRequest(server.RouteGetSQLRows, m)
	if !g.AssertNoError(t, err) {
		return
	}
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

	data, err := postRequest(server.RouteSubmitSQL, m)
	if !g.AssertNoError(t, err) {
		return
	}
	if assert.NotEmpty(t, data) {
		m["id"] = data["id"].(string)
	}

	data, err = postRequest(server.RouteCancelSQL, m)
	if !g.AssertNoError(t, err) {
		return
	}
	assert.Equal(t, "cancelled", data["status"].(string))

	// try to get more rows, should create new query id
	m["wait"] = true
	data, err = postRequest(server.RouteSubmitSQL, m)
	if !g.AssertNoError(t, err) {
		return
	}
	assert.EqualValues(t, store.QueryStatusCompleted, data["status"].(string))
}

func testGetConnections(t *testing.T) {
	m := g.M("id", g.NewTsID())
	data, err := getRequest(server.RouteGetConnections, m)
	if !g.AssertNoError(t, err) {
		return
	}
	conns := data["conns"].([]interface{})
	assert.Greater(t, len(conns), 1)
}

func testGetSchemas(t *testing.T) {
	m := g.M(
		"id", g.NewTsID(),
		"conn", "PG_BIONIC",
	)
	data, err := getRequest(server.RouteGetSchemas, m)
	if !g.AssertNoError(t, err) {
		return
	}
	rows := data["rows"].([]interface{})
	assert.Greater(t, len(rows), 1)
}

func testGetTables(t *testing.T) {
	m := g.M(
		"id", g.NewTsID(),
		"conn", "PG_BIONIC",
		"schema", "public",
	)
	data, err := getRequest(server.RouteGetTables, m)
	if !g.AssertNoError(t, err) {
		return
	}
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
	data, err := getRequest(server.RouteGetColumns, m)
	if !g.AssertNoError(t, err) {
		return
	}
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
	_, err := postRequest(server.RouteSaveSession, m)
	g.AssertNoError(t, err)
}

func testLoadSession(t *testing.T) {
	m := g.M(
		"id", g.NewTsID(),
		"conn", "PG_BIONIC",
		"name", "default",
	)
	data, err := getRequest(server.RouteLoadSession, m)
	if !g.AssertNoError(t, err) {
		return
	}
	if assert.NoError(t, err) {
		assert.Equal(t, "ing", data["test"].(string))
	}
}

func testGetAnalysisSQL(t *testing.T) {}

func testGetHistory(t *testing.T) {
	m := g.M(
		"id", g.NewTsID(),
		"conn", "PG_BIONIC",
		"procedure", "get_latest",
	)
	data, err := getRequest(server.RouteGetHistory, m)
	if !g.AssertNoError(t, err) {
		return
	}
	assert.Greater(t, len(cast.ToSlice(data["history"])), 1)

	m = g.M(
		"id", g.NewTsID(),
		"conn", "PG_BIONIC",
		"procedure", "search",
		"name", "select",
	)
	data, err = getRequest(server.RouteGetHistory, m)
	if !g.AssertNoError(t, err) {
		return
	}
	assert.Greater(t, len(cast.ToSlice(data["history"])), 1)
	g.P(data)
}
