package main

import (
	"os"
	"path"

	"github.com/dbnet-io/dbnet/server"
	"github.com/dbnet-io/dbnet/store"
	"github.com/dbrest-io/dbrest/state"
	"github.com/flarco/g"
	"github.com/skratchdot/open-golang/open"
)

func init() {
	if os.Getenv("DBNET_DIR") == "" {
		os.Setenv("DBNET_DIR", path.Join(g.UserHomeDir(), "dbnet"))
		os.MkdirAll(os.Getenv("DBNET_DIR"), 0755)
	}

	store.InitDB()
}

func main() {
	state.NoRestriction = true // allow all on dbREST
	go store.Loop()
	srv := server.NewServer()
	srv.Start()
}

func openBrowser(port int) {
	open.Run(g.F("http://localhost:%d", port))
}
