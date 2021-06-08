set -e  # exit on error

go mod edit -dropreplace='github.com/flarco/g' go.mod
go mod edit -dropreplace='github.com/flarco/dbio' go.mod
go mod edit -dropreplace='github.com/slingdata-io/sling' go.mod
go get github.com/flarco/g@HEAD
go get github.com/flarco/dbio@HEAD
go get github.com/slingdata-io/sling@HEAD