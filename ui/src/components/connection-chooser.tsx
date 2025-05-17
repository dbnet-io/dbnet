"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Connection {
  id: string
  name: string
}

// TODO: Replace with dynamic connections list
const connections: Connection[] = [
  { id: "CLICKHOUSE_TOP", name: "CLICKHOUSE_TOP" },
  { id: "POSTGRES_MAIN", name: "PostgreSQL Main DB" },
  { id: "MYSQL_REPLICA", name: "MySQL Replica" },
  { id: "SNOWFLAKE_DW", name: "Snowflake Data Warehouse" },
]

export function ConnectionChooser() {
  const [selectedConnection, setSelectedConnection] = React.useState<string>("CLICKHOUSE_TOP")

  return (
    <Select defaultValue="CLICKHOUSE_TOP" onValueChange={setSelectedConnection} value={selectedConnection}>
      <SelectTrigger className="w-[200px] cursor-pointer">
        <SelectValue placeholder="Select a connection" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Connections</SelectLabel>
          {connections.map((connection) => (
            <SelectItem key={connection.id} value={connection.id} className="cursor-pointer">
              {connection.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
} 