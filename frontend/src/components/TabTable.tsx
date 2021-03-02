import * as React from "react";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import './TabTable.css'
import { store, useGlobalState } from "../store/state";

import { State } from "@hookstate/core";
interface Props {
  loading: State<boolean>
  headers: State<string[]>
  rows: State<any[]>
}


export const TabTable: React.FC<Props> = React.memo((props) => {

  ///////////////////////////  HOOKS  ///////////////////////////
  const [customers, setCustomers] = React.useState<any[]>([]);
  ///////////////////////////  EFFECTS  ///////////////////////////
  React.useEffect(() => {
    let data : any[] = []
    for (let index = 0; index < 100; index++) {
      data = data.concat([
        {
            "id": 1000,
            "name": "James Butt",
            "country": {
            "name": `{}`,
            "code": "dz"
            },
            "company": "Benton, John B Jr",
            "date": "2015-09-13",
            "status": "unqualified",
            "activity": 17,
            "representative": {
            "name": "Ioni Bowcher",
            "image": "ionibowcher.png"
            }
        },
        {
            "id": 1001,
            "name": "Josephine Darakjy",
            "country": {
            "name": "Egypt",
            "code": "eg"
            },
            "company": "Chanay, Jeffrey A Esq",
            "date": "2019-02-09",
            "status": "proposal",
            "activity": 0,
            "representative": {
            "name": "Amy Elsner",
            "image": "amyelsner.png"
            }
        },
        {
            "id": 1002,
            "name": "Art Venere",
            "country": {
            "name": "Panama",
            "code": "pa"
            },
            "company": "Chemel, James L Cpa",
            "date": "2017-05-13",
            "status": "qualified",
            "activity": 63,
            "representative": {
            "name": "Asiya Javayant",
            "image": "asiyajavayant.png"
            }
        },])
    }
    setCustomers(data)
  }, []);

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  
  ///////////////////////////  JSX  ///////////////////////////
  return (
    <div>        
      <DataTable
        emptyMessage="No records returned."
        value={customers}
        rowHover={true}
        scrollable={true}
        scrollHeight={store().app.tableScrollHeight.get()}
        loading={props.loading.get()}
        resizableColumns={true}
        className="p-datatable-sm p-datatable-gridlines"
        style={{fontSize: '12px', padding: '4px', fontFamily: 'monospace'}}
      >
        {
          props.headers.get().map(
            h => {
              return (
                <Column field={h} header={h} sortable/>
              )
            }
          )
        }
      </DataTable>
    </div>
  );
})
