import { ObjectAny } from "../utilities/interfaces"
import { HotTable } from '@handsontable/react';

export class ResultTable {
  instanceRef: React.MutableRefObject<any>
  constructor(instanceRef: React.MutableRefObject<any>, data: ObjectAny = {}) {
    this.instanceRef = instanceRef
  }

  get instance() {
    const ht = this.instanceRef.current as HotTable
    return ht?.hotInstance
  }
}