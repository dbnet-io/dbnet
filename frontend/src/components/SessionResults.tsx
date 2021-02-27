import * as React from "react";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

interface Props {}

export const SessionResults: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
    const [customers, setCustomers] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
  ///////////////////////////  EFFECTS  ///////////////////////////
  React.useEffect(() => {
    setCustomers([
      {
          "id": 1000,
          "name": "James Butt",
          "country": {
          "name": "Algeria",
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
  }, []);

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////
  return (
    <div>
      <DataTable
        value={customers}
        rowHover={true}
        scrollable={true}
        scrollHeight="200px"
        loading={loading}
        resizableColumns={true}
        className="p-datatable-sm p-datatable-gridlines"
        style={{fontSize: '12px'}}
      >
          <Column field="name" header="Name"></Column>
          <Column field="country.name" header="Country"></Column>
          <Column field="representative.name" header="Representative"></Column>
          <Column field="status" header="Status"></Column>
      </DataTable>
    </div>
  );
};