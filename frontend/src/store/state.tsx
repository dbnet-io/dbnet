import { useState } from '@hookstate/core';
import * as React from "react";

export const useHS = useState;
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

