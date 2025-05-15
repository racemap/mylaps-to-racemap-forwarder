import { Tabs, type TabsProps } from 'antd';
import type { ServerState } from '../../../types';
import { MyLapsForwarderDetails } from './MyLapsForwarderDetails';

type TimingSystemTabsProps = {
  appState: ServerState;
};

export const TimingSystemTabs = ({ appState }: TimingSystemTabsProps) => {
  const items: TabsProps['items'] = [
    {
      key: '1',
      label: 'From MyLaps',
      children: <MyLapsForwarderDetails forwarderState={appState.myLapsForwarder} />,
    },
    {
      key: '2',
      label: 'From ChronoTrack',
      children: 'Content of Tab Pane 2',
    },
    {
      key: '3',
      label: 'From RaceTec',
      children: 'Content of Tab Pane 3',
    },
  ];

  return <Tabs defaultActiveKey="1" items={items} />;
};
