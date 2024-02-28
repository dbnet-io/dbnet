package env

import (
	"os"

	env "github.com/slingdata-io/sling-cli/core/dbio/env"
)

var (
	HomeDir        = os.Getenv("DBNET_HOME_DIR")
	HomeDirEnvFile = ""
	Env            = &env.EnvFile{}
	RudderstackURL = ""
)

func init() {

	HomeDir = env.SetHomeDir("dbnet")
	HomeDirEnvFile = env.GetEnvFilePath(HomeDir)

	// other sources of creds
	env.SetHomeDir("sling")  // https://github.com/slingdata-io/sling
	env.SetHomeDir("dbrest") // https://github.com/dbrest-io/dbrest

	// create home dir
	os.MkdirAll(HomeDir, 0755)
}

func LoadDbNetEnvFile() (ef env.EnvFile) {
	ef = env.LoadEnvFile(HomeDirEnvFile)
	Env = &ef
	Env.TopComment = "# Environment Credentials for dbNet\n# See https://docs.dbnet.io/\n"
	return
}
