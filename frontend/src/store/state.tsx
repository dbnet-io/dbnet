import { ObjectAny, ObjectString } from "../utilities/interfaces";
import { createState, useState, State } from '@hookstate/core';
import { createRef } from "react";
import { Toast } from "primereact/toast";
import { createBrowserHistory } from "history";
import * as React from "react";


export const masterToast = createRef<Toast>()

export const history = createBrowserHistory()


class Store {
  constructor() {}
}

export const useHookState = useState;

export const globalState = createState<Store>(new Store());

const wrapState = (s: State<Store>) => (s)

export const accessGlobalState = () => wrapState(globalState)
export const useGlobalState = () => wrapState(useState(globalState))
export const store = () => accessGlobalState()


export interface Variable<S> {
  get: () => S;
  set: (val: S | ((prevState: S) => S)) => void;
  put: (doPut: ((prevState: S) => void)) => void;
}

export function useVariable<S>(initialState: S | (() => S)): Variable<S> {
  const [value, setValue] = React.useState<S>(initialState)
  let putValue = (doPut: ((prevState: S) => void)) => {
    setValue(
      S => {
        doPut(S)
        return S
      }
    )
  }

  return {
    get: () => value,
    set: setValue,
    put: putValue,
  }
}