import { Accordion, AccordionTab } from 'primereact/accordion';
import { Card } from 'primereact/card';
import * as React from "react";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-pgsql";

import { useHS } from '../store/state';
import { ObjectString } from '../utilities/interfaces';

interface Props {}

export const Sessions: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const sqls = useHS<ObjectString>({})
  const loading = useHS(false)
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

  const Editor = (props: {name: string}) => {

    const sql = useHS('')
    return (
      // <textarea 
      //   value={sql.get()}
      //   onChange={(e) => sql.set(e.target.value)}
      //   style={{width:"100%", height:"500px", fontSize:'12px'}}
      //   className="code"
      // />
      <AceEditor
        width="100%"
        height="300px"
        placeholder="Placeholder Text"
        mode="pgsql"
        theme="github"
        name={props.name || 'sql'}
        onChange={(v) => sql.set(v)}
        // fontSize={14}
        showPrintMargin={true}
        showGutter={true}
        // highlightActiveLine={true}
        value={ sql.get() }
        setOptions={{
          enableBasicAutocompletion: false,
          enableLiveAutocompletion: false,
          enableSnippets: false,
          showLineNumbers: true,
          tabSize: 2,
        }}
      />
    )
  }

  const results = () => {
    return (
      <DataTable
        emptyMessage="No records returned."
        value={customers}
        rowHover={true}
        scrollable={true}
        scrollHeight={"400px"}
        loading={loading.get()}
        resizableColumns={true}
        className="p-datatable-sm p-datatable-gridlines"
        style={{fontSize: '12px', fontFamily: 'monospace'}}
      >
          <Column field="name" header="name" sortable/>
          <Column field="country.name" header="country" sortable/>
          <Column field="representative.name" header="representative" sortable/>
          <Column field="status" header="status" sortable/>
      </DataTable>
    )
  }

  const query = (queryName: string) => {
    return (
      <>

        <Splitter layout="vertical">
          <SplitterPanel className="p-d-flex p-ai-center p-jc-center" style={{overflowY: "hidden", height: "200px", minHeight:"100px"}}>
            <Splitter className="p-mb-5">
                <SplitterPanel className="p-d-flex p-ai-center p-jc-center">
                  <Editor name={'sql-'+queryName}/>
                </SplitterPanel>
                <SplitterPanel className="p-d-flex p-ai-center p-jc-center">
                    { results() }
                </SplitterPanel>
            </Splitter>
          </SplitterPanel>
          <SplitterPanel className="p-d-flex p-ai-center p-jc-center" style={{overflowY: "hidden"}}>
          </SplitterPanel>
        </Splitter>
      </>
    )
  }
  ///////////////////////////  JSX  ///////////////////////////
  return (
    <div style={{width: '100%', overflowY: "scroll"}}>
      <Accordion activeIndex={null} multiple>
        <AccordionTab header="Query 1">
            { query('1') }
        </AccordionTab>
        <AccordionTab header="Query 2">
            { query('2') }
        </AccordionTab>
        <AccordionTab header="Query 3">
            { query('3') }
        </AccordionTab>
        <AccordionTab header="Query 4">
            { query('4') }
        </AccordionTab>
      </Accordion>
    </div>
  );
};