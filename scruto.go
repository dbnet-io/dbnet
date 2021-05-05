package main

import (
	"github.com/flarco/scruto/server"
	"github.com/flarco/scruto/store"
)

func main() {
	store.InitDB("file:./test.db")
	go store.Loop()
	srv := server.NewServer()
	srv.EchoServer.Logger.Fatal(srv.EchoServer.Start(":" + srv.Port))
}