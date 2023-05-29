set -e  # exit on error


go mod edit -dropreplace='github.com/flarco/g' go.mod
go mod edit -dropreplace='github.com/flarco/dbio' go.mod
go mod edit -dropreplace='github.com/dbrest-io/dbrest' go.mod
go mod edit -dropreplace='github.com/slingdata-io/sling-cli' go.mod
go get github.com/flarco/g@HEAD
go get github.com/flarco/dbio@HEAD
go get github.com/slingdata-io/sling-cli@HEAD
go get github.com/dbrest-io/dbrest@HEAD