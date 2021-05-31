package main

import (
	"os"

	"github.com/flarco/g"
	"github.com/flarco/scruto/server"
	"github.com/flarco/scruto/store"
)

func init() {
	if os.Getenv("DBNET_DIR") == "" {
		os.Setenv("DBNET_DIR", g.UserHomeDir()+"/dbnet")
		os.MkdirAll(os.Getenv("DBNET_DIR"), 0755)
	}

	g.LogError(server.LoadConnections())
	store.InitDB()
}

func main() {
	go store.Loop()
	srv := server.NewServer()
	srv.Start()
}
