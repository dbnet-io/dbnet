package main_test

import (
	"testing"

	"github.com/flarco/g"
	"github.com/flarco/g/net"
	"github.com/flarco/scruto/server"
	"github.com/flarco/scruto/store"
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

func testSubmitSQL(t *testing.T) {
	m := g.M(
		"conn", "PG_BIONIC_URL",
		"text", "select * from housing.landwatch2 limit 138",
	)
	msg := net.NewMessage(server.MsgTypeSubmitSQL, m)
	rMsg := handleMsg(msg)
	if !assert.NoError(t, rMsg.GetError()) {
		return
	}

	assert.Contains(t, rMsg.Data, "headers")
	assert.Contains(t, rMsg.Data, "rows")
	assert.Contains(t, rMsg.Data, "id")

	m["id"] = rMsg.Data["id"].(string)
	rows := rMsg.Data["rows"].([]interface{})
	headers := rMsg.Data["headers"].([]interface{})

	assert.Len(t, rows, 100)
	assert.Greater(t, len(headers), 1)

	testGetSQLRows(t, m)
}

func testGetSQLRows(t *testing.T, m map[string]interface{}) {
	msg := net.NewMessage(server.MsgTypeGetSQLRows, m)
	rMsg := handleMsg(msg)
	assert.NoError(t, rMsg.GetError())
	rows := rMsg.Data["rows"].([]interface{})
	assert.Len(t, rows, 38)
}

func testCancelSQL(t *testing.T) {
	m := g.M(
		"conn", "PG_BIONIC_URL",
		"text", "select * from housing.landwatch2 limit 138",
	)
	msg := net.NewMessage(server.MsgTypeSubmitSQL, m)
	rMsg := handleMsg(msg)
	if !assert.NoError(t, rMsg.GetError()) {
		return
	}
	rows := rMsg.Data["rows"].([]interface{})
	assert.Len(t, rows, 100)

	m["id"] = rMsg.Data["id"].(string)
	msg = net.NewMessage(server.MsgTypeCancelSQL, m)
	rMsg = handleMsg(msg)
	if !assert.NoError(t, rMsg.GetError()) {
		return
	}

	assert.Equal(t, "cancelled", rMsg.Data["status"].(string))

	// try to get more rows, should create new query id
	msg = net.NewMessage(server.MsgTypeGetSQLRows, m)
	rMsg = handleMsg(msg)
	if assert.NoError(t, rMsg.GetError()) {
		assert.NotEqual(t, rMsg.Data["id"].(string), m["id"])
	}
}

func testGetConnections(t *testing.T) {
	msg := net.NewMessage(server.MsgTypeGetConnections, g.M())
	rMsg := handleMsg(msg)
	assert.NoError(t, rMsg.GetError())
	conns := rMsg.Data["conns"].([]string)
	assert.Greater(t, len(conns), 1)
}

func testGetSchemas(t *testing.T) {
	m := g.M(
		"conn", "PG_BIONIC_URL",
	)
	msg := net.NewMessage(server.MsgTypeGetSchemas, m)
	rMsg := handleMsg(msg)
	assert.NoError(t, rMsg.GetError())
	rows := rMsg.Data["rows"].([][]interface{})
	assert.Greater(t, len(rows), 1)
}

func testGetTables(t *testing.T) {
	m := g.M(
		"conn", "PG_BIONIC_URL",
		"schema", "public",
	)
	msg := net.NewMessage(server.MsgTypeGetTables, m)
	rMsg := handleMsg(msg)
	assert.NoError(t, rMsg.GetError())
	rows := rMsg.Data["rows"].([][]interface{})
	assert.Greater(t, len(rows), 1)

	testGetColumns(t, rows[0][0].(string))
}

func testGetColumns(t *testing.T, tableName string) {
	m := g.M(
		"conn", "PG_BIONIC_URL",
		"schema", "public",
		"table", tableName,
	)
	msg := net.NewMessage(server.MsgTypeGetColumns, m)
	rMsg := handleMsg(msg)
	assert.NoError(t, rMsg.GetError())
	rows := rMsg.Data["rows"].([][]interface{})
	assert.Greater(t, len(rows), 1)
}

func testSaveSession(t *testing.T) {
	m := g.M(
		"conn", "PG_BIONIC_URL",
		"name", "default",
		"data", g.M(
			"test", "ing",
		),
	)
	msg := net.NewMessage(server.MsgTypeSaveSession, m)
	rMsg := handleMsg(msg)
	assert.NoError(t, rMsg.GetError())
}

func testLoadSession(t *testing.T) {
	m := g.M(
		"conn", "PG_BIONIC_URL",
		"name", "default",
	)
	msg := net.NewMessage(server.MsgTypeLoadSession, m)
	rMsg := handleMsg(msg)
	if assert.NoError(t, rMsg.GetError()) {
		assert.Equal(t, "ing", rMsg.Data["test"].(string))
	}
}

func testGetAnalysisSQL(t *testing.T) {}
func testGetHistory(t *testing.T)     {}
