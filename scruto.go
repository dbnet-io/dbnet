package main

import (
	"github.com/flarco/scruto/server"
	"github.com/flarco/scruto/store"
)

func init() {
	store.InitDB("file:./test.db")
}

func main() {
	go store.Loop()
	srv := server.NewServer()
	srv.Start()
}
