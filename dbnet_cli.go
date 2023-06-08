package main

import (
	"os"
	"runtime"
	"strings"
	"time"

	"github.com/dbnet-io/dbnet/env"
	"github.com/dbnet-io/dbnet/server"
	"github.com/dbnet-io/dbnet/store"
	"github.com/dbrest-io/dbrest/state"
	"github.com/denisbrodbeck/machineid"
	"github.com/flarco/dbio/connection"
	"github.com/flarco/g"
	"github.com/flarco/g/net"
	"github.com/integrii/flaggy"
	"github.com/kardianos/osext"
	"github.com/skratchdot/open-golang/open"
	"github.com/spf13/cast"
)

var telemetryMap = g.M("start_time", time.Now().UnixMicro())

var cliServe = &g.CliSC{
	Name:                "serve",
	Description:         "launch the dbnet server",
	ExecuteWithoutFlags: true,
	ExecProcess:         serve,
	Flags: []g.Flag{
		{
			Name:        "host",
			Type:        "string",
			Description: "The host to use. (default: 0.0.0.0)",
		},
		{
			Name:        "port",
			Type:        "string",
			Description: "The port to use (default: 5897)",
		},
	},
}

var cliConns = &g.CliSC{
	Name:        "conns",
	Singular:    "local connection",
	Description: "list & test local connections",
	SubComs: []*g.CliSC{
		{
			Name:        "list",
			Description: "list local connections detected",
		},
		{
			Name:        "test",
			Description: "test a local connection",
			PosFlags: []g.Flag{
				{
					Name:        "name",
					ShortName:   "",
					Type:        "string",
					Description: "The name of the connection to test",
				},
			},
		},
	},
	ExecProcess: conns,
}

var cliExec = &g.CliSC{
	Name:        "exec",
	Description: "execute a SQL query",
	ExecProcess: exec,
	PosFlags: []g.Flag{
		{
			Name:        "conn",
			Type:        "string",
			Description: "The connection name",
		},
	},
	Flags: []g.Flag{
		{
			Name:        "query",
			Type:        "string",
			Description: "The SQL query to execute",
		},
		{
			Name:        "file",
			Type:        "string",
			Description: "The SQL file to execute",
		},
	},
}

func serve(c *g.CliSC) (ok bool, err error) {
	if port, ok := c.Vals["port"]; ok {
		os.Setenv("PORT", cast.ToString(port))
	}

	if host, ok := c.Vals["host"]; ok {
		os.Setenv("HOST", cast.ToString(host))
	}

	if len(connection.GetLocalConns(true)) == 0 {
		g.Warn("No connections have been defined. Please create some proper environment variables. See https://docs.dbnet.io for more details.")
		return true, g.Error("No connections have been defined")
	} else if conns := connection.GetLocalConns(false); len(conns) == 1 {
		telemetryMap["conn_type"] = conns[0].Connection.Type.String()
	}

	go store.Loop()

	go telemetry("serve")
	go checkVersion()

	srv := server.NewServer()
	g.Info("Serving @ %s", srv.Hostname())

	go func() {
		if !isApp {
			time.Sleep(100 * time.Millisecond)
			openBrowser(srv.Port)
		}
	}()

	srv.Start()

	<-ctx.Ctx.Done()

	return true, nil
}

func exec(c *g.CliSC) (ok bool, err error) {

	var sql string
	if query, ok := c.Vals["query"]; ok {
		sql = cast.ToString(query)
	} else if file, ok := c.Vals["file"]; ok {
		filePath := cast.ToString(file)
		if g.PathExists(filePath) {
			content, err := os.ReadFile(filePath)
			if err != nil {
				return true, g.Error(err, "error reading file")
			}
			sql = string(content)
		} else {
			return true, g.Error("%s does not exist", filePath)
		}
	} else {
		return false, g.Error("Must specify query or file (with --query or --file)")
	}

	connName := cast.ToString(c.Vals["conn"])
	start := time.Now()
	conn, err := state.GetConnInstance(connName, "")
	if err != nil {
		g.LogFatal(err, "could not get database connection")
	}

	g.Info("Executing...")

	_, err = conn.Exec(sql)
	end := time.Now()

	telemetryMap["conn_type"] = conn.GetType().String()
	telemetryMap["end_time"] = end.UnixMicro()

	telemetry("exec")

	g.LogFatal(err, "could not execute query")

	g.Info("Successful! Duration: %d seconds", end.Unix()-start.Unix())

	return true, nil
}

func conns(c *g.CliSC) (ok bool, err error) {
	ok = true

	ef := env.LoadDbNetEnvFile()
	ec := connection.EnvConns{EnvFile: &ef}

	switch c.UsedSC() {

	case "list":
		println(ec.List())

	case "test":
		name := cast.ToString(c.Vals["name"])
		ok, err = ec.Test(name)
		if err != nil {
			return ok, g.Error(err, "could not test %s", name)
		} else if ok {
			g.Info("success!") // successfully connected
		}

	default:
		return false, nil
	}
	return ok, nil
}

func cliInit() int {
	// init CLI
	flaggy.SetName("dbnet")
	flaggy.SetDescription("A database client that lets your SQL superpowers shine | https://github.com/dbnet-io/dbnet")
	flaggy.SetVersion(env.Version)
	flaggy.DefaultParser.ShowHelpOnUnexpected = true
	flaggy.DefaultParser.AdditionalHelpPrepend = "Version " + env.Version

	// make CLI sub-commands
	cliConns.Make().Add()
	cliServe.Make().Add()
	cliExec.Make().Add()

	for _, cli := range g.CliArr {
		flaggy.AttachSubcommand(cli.Sc, 1)
	}

	flaggy.ShowHelpOnUnexpectedDisable()
	flaggy.Parse()

	ok, err := g.CliProcess()
	if err != nil {
		g.LogFatal(err)
	} else if !ok {
		flaggy.ShowHelp("")
	}

	return 0
}

func telemetry(action string) {
	// set DBNET_TELEMETRY=FALSE to disable
	if val := os.Getenv("DBNET_TELEMETRY"); val != "" {
		if !cast.ToBool(val) {
			return
		}
	}

	// deterministic anonymous ID generated per machine
	machineID, _ := machineid.ProtectedID("dbnet")

	payload := g.M(
		"version", env.Version,
		"os", runtime.GOOS,
		"action", action,
		"machine_id", machineID,
	)

	for k, v := range telemetryMap {
		payload[k] = v
	}

	net.ClientDo("POST", env.RudderstackURL, strings.NewReader(g.Marshal(payload)), nil)

}

func checkVersion() {
	if env.Version == "dev" {
		return
	}

	instruction := "Please download here: https://docs.dbnet.io/installation"
	execFileName, _ := osext.Executable()
	switch {
	case strings.Contains(execFileName, "homebrew"):
		instruction = "Please run `brew upgrade dbnet-io/dbnet/dbnet`"
	case strings.Contains(execFileName, "scoop"):
		instruction = "Please run `scoop update dbnet`"
	case execFileName == "/dbnet/dbnet" && os.Getenv("HOME") == "/dbnet":
		instruction = "Please run `docker pull dbnetio/dbnet` and recreate your container"
	}

	const url = "https://api.github.com/repos/dbnet-io/dbnet/tags"
	_, respB, _ := net.ClientDo("GET", url, nil, nil)
	arr := []map[string]any{}
	g.JSONUnmarshal(respB, &arr)
	if len(arr) > 0 && arr[0] != nil {
		latest := cast.ToString(arr[0]["name"])
		isNew, err := g.CompareVersions(state.Version, latest)
		if err != nil {
			g.DebugLow("Error comparing versions: %s", err.Error())
		} else if isNew {
			g.Warn("FYI there is a new dbnet version released (%s). %s", latest, instruction)
		}
	}
}

func openBrowser(port string) {
	open.Run(g.F("http://localhost:%s", port))
}
