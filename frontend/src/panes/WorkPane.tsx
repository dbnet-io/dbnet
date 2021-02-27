import * as React from "react";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { SessionInput } from "../components/SessionInput";
import { SessionResults } from "../components/SessionResults";

interface Props {}

export const WorkPane: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////
  return (
      <Splitter style={{height: '450px'}} layout="vertical">
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center">
          <SessionInput/>
        </SplitterPanel>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center">
            <SessionResults/>
        </SplitterPanel>
      </Splitter>
  );
};