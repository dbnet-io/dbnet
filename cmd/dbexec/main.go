package main

import (
	"bufio"
	"flag"
	"io"
	"os"
	"time"

	"github.com/dbrest-io/dbrest/state"
	"github.com/flarco/g"
)

func main() {
	if stat, _ := os.Stdin.Stat(); (stat.Mode() & os.ModeCharDevice) == 0 {
		start := time.Now()
		connNamePtr := flag.String("conn", "", "a string")
		flag.Parse()

		sqlB, _ := io.ReadAll(bufio.NewReader(os.Stdin))
		sql := string(sqlB)
		connName := *connNamePtr
		if connName == "" {
			g.Warn("Did not provide flag: -conn")
			return
		}

		conn, err := state.GetConnInstance(connName, "")
		if err != nil {
			g.LogFatal(err, "could not get database connection")
		}

		g.Info("Executing...")

		_, err = conn.Exec(sql)
		if err != nil {
			g.LogFatal(err, "could not execute query")
		}
		end := time.Now()

		g.Info("Successful! Duration: %d seconds", end.Unix()-start.Unix())
	} else {
		g.Warn("Did not provide a query via STDIN")
	}
}
