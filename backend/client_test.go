package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
	g "github.com/flarco/gxutil"
)


func TestPG(t *testing.T) {

	PostgresURL := ""
	conn := g.GetConn(PostgresURL)
	err := conn.Connect()
	assert.NoError(t, err)

}