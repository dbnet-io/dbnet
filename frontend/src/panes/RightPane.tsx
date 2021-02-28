import * as React from "react";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { QueryPanel } from "../components/QueryPanel";
import { QueryTable } from "../components/QueryTable";

interface Props {}

export const RightPane: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////
  return (
      // <Splitter id="work-pane" layout="vertical">
      //   <SplitterPanel className="p-d-flex p-ai-center p-jc-center" style={{overflowY: "hidden", height: "200px", minHeight:"110px"}}>
      //     <QueryPanel/>
      //   </SplitterPanel>
      //   <SplitterPanel className="p-d-flex p-ai-center p-jc-center" style={{overflowY: "scroll", height: "200px", minHeight:"100px"}}>
      //       <QueryTable/>
      //   </SplitterPanel>
      // </Splitter>
      <QueryPanel/>
  );
};