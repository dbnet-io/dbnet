module github.com/flarco/scruto

go 1.16

require (
	github.com/Joker/jade v1.0.0 // indirect
	github.com/flarco/dbio v0.0.3
	github.com/flarco/g v0.0.2
	github.com/flosch/pongo2 v0.0.0-20190707114632-bbf5a6c351f4 // indirect
	github.com/gavv/monotime v0.0.0-20190418164738-30dba4353424 // indirect
	github.com/getsentry/sentry-go v0.11.0 // indirect
	github.com/gorilla/schema v1.1.0 // indirect
	github.com/gorilla/websocket v1.4.2
	github.com/iris-contrib/formBinder v5.0.0+incompatible // indirect
	github.com/iris-contrib/httpexpect v0.0.0-20180314041918-ebe99fcebbce // indirect
	github.com/jmoiron/sqlx v1.2.0
	github.com/kataras/iris v11.1.1+incompatible // indirect
	github.com/labstack/echo/v4 v4.2.2
	github.com/mitchellh/go-homedir v1.1.0 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.1 // indirect
	github.com/slingdata-io/sling v0.78.0
	github.com/spf13/cast v1.3.1
	github.com/stretchr/testify v1.7.0
	github.com/xeipuuv/gojsonpointer v0.0.0-20190809123943-df4f5c81cb3b // indirect
	gopkg.in/yaml.v2 v2.3.0
	gopkg.in/yaml.v3 v3.0.0-20210107192922-496545a6307b
	gorm.io/gorm v1.20.7
)

replace github.com/flarco/g => ../g

replace github.com/flarco/dbio => ../dbio

replace github.com/slingdata-io/sling => ../sling
