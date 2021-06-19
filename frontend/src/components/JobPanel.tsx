import { State } from "@hookstate/core";
import { Button } from "primereact/button";
import { MenuItem } from "primereact/components/menuitem/MenuItem";
import { Dialog } from "primereact/dialog";
import { ListBox } from "primereact/listbox";
import { Steps } from 'primereact/steps';
import * as React from "react";
import { accessStore, Job, JobRequestConn, useHS } from "../store/state";
import { jsonClone } from "../utilities/methods";

const store = accessStore()

interface Props { }

export const JobPanel: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const jobPanel = useHS(store.jobPanel)
  const job = useHS(store.jobPanel.job)
  const show = useHS(store.jobPanel.show)
  const activeIndex = useHS(-1);
  const dialogWidth = useHS((window.innerWidth) * 4 / 7)


  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const getStepName = () => {
    if (jobPanel.dialogMode.get() === 'new') {
      if (activeIndex.get() === 0) return 'Connections'
      if (activeIndex.get() === 1) return 'Source'
      if (activeIndex.get() === 2) return 'Target'
      if (activeIndex.get() === 3) return 'Execute'
      if (activeIndex.get() === 4) return 'Progress'
    } else if (jobPanel.dialogMode.get() === 'new') {
      if (activeIndex.get() === 0) return 'Choose Job'
      if (activeIndex.get() === 1) return 'Execute'
      if (activeIndex.get() === 2) return 'Progress'
    }
    return undefined
  }

  const nextAction = () => {
    let currentStep = getStepName()
    if (currentStep === 'Connections') {
      // validate
      activeIndex.set(v => v + 1)
    } else if (currentStep === 'Source') {
      activeIndex.set(v => v + 1)
    } else if (currentStep === 'Target') {
      activeIndex.set(v => v + 1)
    } else if (currentStep === 'Execute') {
      activeIndex.set(v => v + 1)
    }
  }

  ///////////////////////////  JSX  ///////////////////////////

  /*
    - Create new
      1. choose source / target
      2. Choose source stream
        a. File
          - Choose local
        b. DB
          - Choose Table or SQL
      3. Choose target object
        a. File
        b. DB
      4. Execute
        a. And create another
      5. Progress

    - Re-run
      1. Choose old job
      2. Execute
      3. Progress
  */
  const StepChooseConnections = () => {

    const listBoxTemplate = (data: JobRequestConn) => (
      <div className="p-clearfix p-as-center" style={{}}>
        <img
          src={'assets/connections/' + data.type + '.png'}
          height="20px" alt={data.type}
          style={{ display: 'inline-block', margin: '2px 0 2px 2px' }}
        />
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: '12px',
          fontFamily: 'monospace',
          margin: '0 0 0 10px',
          paddingBottom: '-5px',
        }}>
          {data.name}
        </span>
      </div>
    )
    return <>
      <div className="p-grid">
        <div className="p-col" style={{ maxWidth: '15rem' }}>
          <h3>Source</h3>
          <ListBox
            value={job.request.source.get()}
            options={store.connections.get().map(v => jsonClone(v))}
            onChange={(e) => { job.request.source.set(e.value) }}
            filter={false}
            multiple={false}
            optionLabel="name"
            listStyle={{ minHeight: '150px', maxHeight: '250px' }}
            style={{ width: '14rem' }}
            itemTemplate={listBoxTemplate}
            tooltip="Select a source Database or File Connection"
            tooltipOptions={{ position: 'left' }}
          />
        </div>
        <div className="p-col">
          <h3>Target</h3>
          <ListBox
            value={job.request.target.get()}
            options={store.connections.get().map(v => jsonClone(v))}
            onChange={(e) => { job.request.target.set(e.value) }}
            filter={false}
            multiple={false}
            optionLabel="name"
            listStyle={{ minHeight: '150px', maxHeight: '250px' }}
            style={{ width: '14rem' }}
            itemTemplate={listBoxTemplate}
            tooltip="Select a target Database or File Connection"
            tooltipOptions={{ position: 'right' }}
          />
        </div>
      </div>
    </>
  }

  const StepChooseSourceStream = () => {
    return <></>
  }

  const StepChooseTargetObject = () => {
    return <></>
  }

  const StepExecute = (props: { stepsModel: State<MenuItem[]> }) => {
    const submit = () => { // eslint-disable-line
      let len = props.stepsModel.length
      for (let i = 0; i < len - 1; i++) {
        const step = props.stepsModel[i]; // eslint-disable-line
        props.stepsModel[0].disabled.set(true)
      }
      props.stepsModel[len - 1].disabled.set(false) // last is progress
    }
    return <></>
  }


  const StepProgress = () => {
    return <></>
  }

  const StepJob = () => {
    return <></>
  }

  const NewJobSteps = () => {
    const stepsModel = useHS<MenuItem[]>([
      { label: 'Connections' },
      { label: 'Source' },
      { label: 'Target' },
      { label: 'Execute' },
      { label: 'Progress', disabled: true },
    ])

    return <>
      <Steps
        model={stepsModel.get()}
        activeIndex={activeIndex.get()}
        onSelect={(e) => activeIndex.set(e.index)}
        readOnly={false}
        style={{ paddingTop: '10px', paddingBottom: '10px' }}
      />
      { activeIndex.get() === 0 ? <StepChooseConnections /> : null}
      { activeIndex.get() === 1 ? <StepChooseSourceStream /> : null}
      { activeIndex.get() === 2 ? <StepChooseTargetObject /> : null}
      { activeIndex.get() === 3 ? <StepExecute stepsModel={stepsModel} /> : null}
      { activeIndex.get() === 4 ? <StepProgress /> : null}
    </>
  }

  const OldJobSteps = () => {

    const stepsModel = useHS<MenuItem[]>([
      { label: 'Choose Job' },
      { label: 'Execute' },
      { label: 'Progress', disabled: true },
    ])

    return <>
      <Steps
        model={stepsModel.get()}
        activeIndex={activeIndex.get()}
        onSelect={(e) => activeIndex.set(e.index)}
        readOnly={false}
        style={{ paddingTop: '10px', paddingBottom: '10px' }}
      />
      { activeIndex.get() === 0 ? <StepJob /> : null}
      { activeIndex.get() === 1 ? <StepExecute stepsModel={stepsModel} /> : null}
      { activeIndex.get() === 2 ? <StepProgress /> : null}
    </>
  }

  const footer = () => {
    return <div style={{ textAlign: 'center' }}>
      {
        jobPanel.dialogMode.get() !== undefined ?
          <>
            <Button
              label="Next"
              onClick={() => {
                nextAction()
              }}
              className=""
            />
            <Button
              label="Reset"
              onClick={() => {
                jobPanel.dialogMode.set(undefined)
              }}
              className="p-button-danger"
            />
          </>
          :
          null
      }
    </div>
  }

  return (
    <Dialog
      visible={show.get()}
      header="Extract / Load"
      onHide={() => { show.set(false) }}
      style={{ width: `${dialogWidth.get()}px` }}
      footer={footer()}
    >
      {
        jobPanel.dialogMode.get() !== undefined ?
          jobPanel.dialogMode.get() === 'old' ? <OldJobSteps /> : <NewJobSteps />
          :
          <div
            style={{ textAlign: 'center' }}
          >

            <Button
              label="Create New Job"
              icon="pi pi-arrow-circle-right"
              className="p-button-lg"
              onClick={() => {
                job.set(new Job())
                activeIndex.set(0)
                jobPanel.dialogMode.set('new')
              }}
            />
            <br />
            <br />
            <Button
              label="Re-run Past Job"
              icon="pi pi-refresh"
              className="p-button-lg p-button-info"
              onClick={() => {
                activeIndex.set(0)
                jobPanel.dialogMode.set('old')
              }}
            />
          </div>

      }
    </Dialog>
  )
}