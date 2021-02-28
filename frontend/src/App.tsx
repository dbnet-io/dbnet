import React, { RefObject, useRef } from 'react';
import logo from './primereact-logo.png';
import './App.css';
import { Menubar } from 'primereact/menubar';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Splitter, SplitterPanel } from 'primereact/splitter';

import 'primereact/resources/primereact.min.css';
// import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/themes/saga-green/theme.css';
// import 'primereact/resources/themes/bootstrap4-dark-purple/theme.css';
// import 'primereact/resources/themes/bootstrap4-light-purple/theme.css';
import 'primeicons/primeicons.css';
import { LeftPane } from './panes/LeftPane';
import { RightPane } from './panes/RightPane';
import { Toast } from 'primereact/toast';
import { Sessions } from './components/Sessions';

interface Props {}
interface State {
    count: number;
}

const items = [
  {
     label:'File',
     icon:'pi pi-fw pi-file',
     items:[
        {
           label:'New',
           icon:'pi pi-fw pi-plus',
           items:[
              {
                 label:'Bookmark',
                 icon:'pi pi-fw pi-bookmark'
              },
              {
                 label:'Video',
                 icon:'pi pi-fw pi-video'
              },

           ]
        },
        {
           label:'Delete',
           icon:'pi pi-fw pi-trash'
        },
        {
           separator:true
        },
        {
           label:'Export',
           icon:'pi pi-fw pi-external-link'
        }
     ]
  },
  {
     label:'Edit',
     icon:'pi pi-fw pi-pencil',
     items:[
        {
           label:'Left',
           icon:'pi pi-fw pi-align-left'
        },
        {
           label:'Right',
           icon:'pi pi-fw pi-align-right'
        },
        {
           label:'Center',
           icon:'pi pi-fw pi-align-center'
        },
        {
           label:'Justify',
           icon:'pi pi-fw pi-align-justify'
        },

     ]
  },
  {
     label:'Users',
     icon:'pi pi-fw pi-user',
     items:[
        {
           label:'New',
           icon:'pi pi-fw pi-user-plus',

        },
        {
           label:'Delete',
           icon:'pi pi-fw pi-user-minus',

        },
        {
           label:'Search',
           icon:'pi pi-fw pi-users',
           items:[
              {
                 label:'Filter',
                 icon:'pi pi-fw pi-filter',
                 items:[
                    {
                       label:'Print',
                       icon:'pi pi-fw pi-print'
                    }
                 ]
              },
              {
                 icon:'pi pi-fw pi-bars',
                 label:'List'
              }
           ]
        }
     ]
  },
  {
     label:'Events',
     icon:'pi pi-fw pi-calendar',
     items:[
        {
           label:'Edit',
           icon:'pi pi-fw pi-pencil',
           items:[
              {
                 label:'Save',
                 icon:'pi pi-fw pi-calendar-plus'
              },
              {
                 label:'Delete',
                 icon:'pi pi-fw pi-calendar-minus'
              },

           ]
        },
        {
           label:'Archieve',
           icon:'pi pi-fw pi-calendar-times',
           items:[
              {
                 label:'Remove',
                 icon:'pi pi-fw pi-calendar-minus'
              }
           ]
        }
     ]
  },
  {
     label:'Quit',
     icon:'pi pi-fw pi-power-off'
  }
];


// this is to extends the window global functions
declare global {
  interface Window {
    toast: RefObject<Toast>
  }
}

export const App = () => {
  const toast = useRef<Toast>(null);
  window.toast = toast

  const splitterHeight = `${Math.floor(window.innerHeight - 60)}px`

  const end = () => <InputText className="p-inputtext-sm p-md-2" placeholder="Search" type="text" />
  
  return (
      <div className="App">
          <Menubar style={{fontSize: '0.8rem', padding: '0'}} model={items} end={end} />
          
          <Splitter style={{height: splitterHeight}} className="p-mb-5" stateKey={"splitter"} stateStorage={"local"}>
            <SplitterPanel className="p-d-flex p-ai-center p-jc-center">
              <LeftPane/>
            </SplitterPanel>
            <SplitterPanel className="p-d-flex p-ai-center p-jc-center">
              <RightPane/>
              {/* <Sessions/> */}
            </SplitterPanel>
          </Splitter>
      </div>
  );
}

