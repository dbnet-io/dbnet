<p align="center">
    <img src="https://user-images.githubusercontent.com/7671010/209962426-a849b819-480d-4863-9676-d13a195cc19d.png" height="80">
  </p>

dbNet is a web-based SQL IDE using Go as a backend, and your browser (or electron) as front-end. I built it because I was unsatisfied with the database clients out there. Alot of them are top-heavy, unituitive, slow or expensive. dbNet aims to be smart and useful especially for analysis and simply querying any SQL database.

  
The goal is to make it a great SQL IDE which gives useful context as you hover table and column names for example. It should allow you to ingest files with ease, imagine drag-dropping a CSV file into a schema where dbNet auto-creates the table with proper column types. The other nifty part is that it can run from a shell/terminal on any machine and lets users access the UI from the browser (with `dbnet serve`). 
  
<img width="1241" alt="image" src="https://user-images.githubusercontent.com/7671010/209964766-5c694ee0-ea56-4d0e-8af6-317b070d5dc4.png">


dbNet is in active developement and will be open-sourced soon. Here are some of the databases it connects to:
* Clickhouse
* Google BigQuery
* Google BigTable
* MySQL
* Oracle
* Redshift
* PostgreSQL
* SQLite
* SQL Server
* Snowflake
* DuckDB
* ScyllaDB (coming soon)
* Firebolt (coming soon)
* Databricks (coming soon)

# Installation

## Brew on Mac

```shell
brew install dbnet-io/dbnet/dbnet

# You're good to go!
dbnet -h
```

## Scoop on Windows

```powershell
scoop bucket add dbnet https://github.com/dbnet-io/scoop-dbnet.git
scoop install dbnet

# You're good to go!
dbnet -h
```

## Docker

```powershell
docker pull dbnetio/dbnet

# You're good to go!
docker run --rm -it dbnetio/dbnet -h
```

## Build from source

```powershell
git clone https://github.com/dbnet-io/dbnet.git
cd dbnet

go mod tidy

# Ensure you have npm & yarn installed with NodeJS 16+
bash build.sh

./dbnet -h
```

# Getting Started

See docs at https://flarco.gitbook.io/dbnet.io/getting-started for more details.

## Connections

See details at https://flarco.gitbook.io/dbnet.io/connections/connections.

You should be able to see connections with `dbnet conns list`:

```bash
$ dbnet conns list
+--------------------------+-----------------+-------------------+
| CONN NAME                | CONN TYPE       | SOURCE            |
+--------------------------+-----------------+-------------------+
| FINANCE_BQ               | DB - BigQuery   | dbnet env yaml    |
| LOCALHOST_DEV            | DB - PostgreSQL | dbt profiles yaml |
| MSSQL                    | DB - SQLServer  | dbnet env yaml    |
| MYSQL                    | DB - MySQL      | dbnet env yaml    |
| ORACLE_DB                | DB - Oracle     | env variable      |
| MY_PG                    | DB - PostgreSQL | dbnet env yaml    |
+--------------------------+-----------------+-------------------+
```

## Serve

Run the application with `dbnet serve`.

# Notes
## Electron
- https://github.com/electron/electron-packager
- https://www.electron.build/
- `nativefier -n DbNetClient --counter 'http://localhost:5987/'`

## Icons

https://github.com/jackmordaunt/icns
`cat icon.png | icnsify > icon.icns`
`bash frontend/src-tauri/icons/generate.sh`
