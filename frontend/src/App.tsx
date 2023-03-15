import React, { RefObject, useRef, useLayoutEffect, useState } from 'react';
import './App.css';

import 'primereact/resources/primereact.min.css';
import 'primeflex/primeflex.min.css';
// import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/themes/saga-green/theme.css';
// import 'primereact/resources/themes/bootstrap4-dark-purple/theme.css';
// import 'primereact/resources/themes/bootstrap4-light-purple/theme.css';
import 'primeicons/primeicons.css';
import { Toast } from 'primereact/toast';
import { JSpreadsheet, ObjectAny } from './utilities/interfaces';
import { DbNet } from './state/dbnet';
import { HashRouter, Route } from 'react-router-dom';
import { Default } from './Default';

// this is to extends the window global functions
declare global {
  interface Window {
    toast: RefObject<Toast>
    dbnet: DbNet
    table: JSpreadsheet
    callbacks: ObjectAny
  }
}

export const App = () => {
  const toast = useRef<Toast>(null);
  window.toast = toast
  window.table = useRef<JSpreadsheet>(null).current as JSpreadsheet;
  window.callbacks = {}

  ///////////////////////////  HOOKS  ///////////////////////////
  useWindowSize()

  const location = window.location
  const state = React.useRef<DbNet>(new DbNet({ connectionName: location?.hash }))
  window.dbnet = state.current
  
  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(() => {
    // Init()
  }, [])// eslint-disable-line

  ///////////////////////////  FUNCTIONS  ///////////////////////////

  ///////////////////////////  JSX  ///////////////////////////

  return <>
    <Toast ref={toast} />
    <HashRouter>
      <Route path="*" render={() => <Default/>} />
    </HashRouter>
  </>
  
}

function useWindowSize() {
  const [size, setSize] = useState([0, 0]);
  useLayoutEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  return size;
}
